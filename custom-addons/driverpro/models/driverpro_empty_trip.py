# -*- coding: utf-8 -*-

from odoo import models, fields, api, _
from odoo.exceptions import UserError, ValidationError
from datetime import datetime, timedelta
import pytz
import logging

_logger = logging.getLogger(__name__)


class DriverproEmptyTrip(models.Model):
    _name = 'driverpro.empty_trip'
    _description = 'Viajes Vacíos - Búsqueda de Clientes'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'create_date desc'
    _rec_name = 'name'

    name = fields.Char(
        string='Número',
        required=True,
        copy=False,
        readonly=True,
        index=True,
        default='/',
        tracking=True
    )

    # Estados específicos para viajes vacíos
    state = fields.Selection([
        ('searching', 'Buscando Cliente'),
        ('converted', 'Convertido a Viaje'),
        ('cancelled', 'Cancelado')
    ], string='Estado', default='searching', tracking=True)

    # Relaciones principales
    driver_id = fields.Many2one(
        'res.users',
        string='Chofer',
        required=True,
        tracking=True
    )

    vehicle_id = fields.Many2one(
        'fleet.vehicle',
        string='Vehículo',
        tracking=True
    )

    # Configuración del viaje vacío
    search_location = fields.Text(
        string='Ubicación de Búsqueda',
        help="Descripción de dónde está buscando clientes (aeropuerto, zona, etc.)"
    )

    wait_limit_minutes = fields.Integer(
        string='Límite de Tiempo (min)',
        default=60,
        help="Tiempo máximo de búsqueda antes de cancelación automática"
    )

    comments = fields.Text(
        string='Comentarios',
        help="Comentarios adicionales sobre la búsqueda"
    )

    started_at = fields.Datetime(
        string='Iniciado el',
        tracking=True
    )

    # Tiempo restante calculado
    time_remaining = fields.Integer(
        string='Tiempo Restante (min)',
        compute='_compute_time_remaining',
        store=False
    )

    # Alertas enviadas
    alert_30_sent = fields.Boolean('Alerta 30min enviada', default=False)
    alert_15_sent = fields.Boolean('Alerta 15min enviada', default=False)
    alert_5_sent = fields.Boolean('Alerta 5min enviada', default=False)

    # Información de conversión
    converted_trip_id = fields.Many2one(
        'driverpro.trip',
        string='Viaje Convertido',
        readonly=True
    )

    converted_at = fields.Datetime(
        string='Convertido el',
        readonly=True
    )

    cancelled_at = fields.Datetime(
        string='Cancelado el',
        readonly=True
    )

    company_id = fields.Many2one(
        'res.company',
        string='Compañía',
        required=True,
        default=lambda self: self.env.company
    )

    @api.model
    def create(self, vals):
        if vals.get('name', '/') == '/':
            vals['name'] = self.env['ir.sequence'].next_by_code('driverpro.empty_trip') or '/'
        return super().create(vals)

    def _convert_to_user_timezone(self, datetime_utc, user=None):
        """Convierte datetime UTC a la zona horaria del usuario"""
        if not datetime_utc:
            return None
        
        try:
            # Usar el usuario especificado o el usuario actual del driver
            target_user = user or self.driver_id
            if not target_user:
                target_user = self.env.user
            
            # Obtener la zona horaria del usuario, por defecto México (UTC-6)
            user_tz = target_user.tz or 'America/Mexico_City'
            timezone = pytz.timezone(user_tz)
            
            # Convertir de UTC a la zona horaria del usuario
            if datetime_utc.tzinfo is None:
                # Si no tiene timezone info, asumir que es UTC
                datetime_utc = pytz.UTC.localize(datetime_utc)
            
            local_dt = datetime_utc.astimezone(timezone)
            return local_dt
        except Exception:
            # En caso de error, devolver la fecha original
            return datetime_utc

    @api.depends('started_at', 'wait_limit_minutes', 'state')
    def _compute_time_remaining(self):
        """Calcula el tiempo restante en minutos"""
        for record in self:
            if record.state != 'searching' or not record.started_at:
                record.time_remaining = 0
                continue

            now = fields.Datetime.now()
            elapsed = (now - record.started_at).total_seconds() / 60
            remaining = record.wait_limit_minutes - elapsed
            record.time_remaining = max(0, int(remaining))

    def action_start_search(self):
        """Inicia la búsqueda de clientes"""
        for record in self:
            if record.state != 'searching':
                raise UserError(_('Solo se pueden iniciar búsquedas en estado inicial.'))

            # Validaciones básicas
            if not record.vehicle_id:
                raise UserError(_('Debe seleccionar un vehículo.'))

            if not record.driver_id.partner_id:
                raise UserError(_('El usuario no tiene un contacto asociado.'))

            if record.vehicle_id.driver_id != record.driver_id.partner_id:
                raise UserError(_('El chofer no tiene asignado este vehículo en Fleet.'))

            record.write({
                'started_at': fields.Datetime.now(),
                'alert_30_sent': False,
                'alert_15_sent': False,
                'alert_5_sent': False,
            })

            record.message_post(body=_('Búsqueda de clientes iniciada. Límite: %s minutos') % record.wait_limit_minutes)
            
            # Notificación vía bus
            record._notify_driver('success', 
                                '🔍 Búsqueda iniciada',
                                f'Búsqueda {record.name} activa por {record.wait_limit_minutes} minutos')

    def action_convert_to_trip(self):
        """Convierte el viaje vacío a un viaje normal en borrador"""
        for record in self:
            if record.state != 'searching':
                raise UserError(_('Solo se pueden convertir búsquedas activas.'))

            # Crear viaje normal en borrador
            trip_vals = {
                'driver_id': record.driver_id.id,
                'vehicle_id': record.vehicle_id.id,
                'card_id': self._get_vehicle_card(record.vehicle_id.id),
                'origin': 'Aeropuerto',  # Origen por defecto para viajes convertidos desde búsqueda
                'destination': '',  # Se completará en el formulario
                'comments': f"Convertido desde búsqueda: {record.name}",
                'state': 'draft'
            }

            trip = self.env['driverpro.trip'].create(trip_vals)

            # Actualizar el viaje vacío
            record.write({
                'state': 'converted',
                'converted_trip_id': trip.id,
                'converted_at': fields.Datetime.now()
            })

            record.message_post(body=_('Convertido a viaje %s') % trip.name)
            
            # Notificación vía bus
            record._notify_driver('success', 
                                '✅ Cliente encontrado',
                                f'Búsqueda {record.name} convertida a viaje {trip.name}',
                                {'trip_id': trip.id, 'trip_name': trip.name})
            
            return {
                'type': 'ir.actions.act_window',
                'res_model': 'driverpro.trip',
                'res_id': trip.id,
                'view_mode': 'form',
                'target': 'current',
                'context': {'from_empty_trip': True}
            }

    def action_cancel_search(self):
        """Cancela la búsqueda de clientes"""
        for record in self:
            if record.state not in ['searching']:
                raise UserError(_('Solo se pueden cancelar búsquedas activas.'))

            record.write({
                'state': 'cancelled',
                'cancelled_at': fields.Datetime.now()
            })

            elapsed_time = 0
            if record.started_at:
                elapsed = (fields.Datetime.now() - record.started_at).total_seconds() / 60
                elapsed_time = int(elapsed)

            record.message_post(body=_('Búsqueda cancelada. Tiempo transcurrido: %s minutos') % elapsed_time)
            
            # Notificación vía bus
            record._notify_driver('info', 
                                '❌ Búsqueda cancelada',
                                f'Búsqueda {record.name} cancelada después de {elapsed_time} minutos')

    def _get_vehicle_card(self, vehicle_id):
        """Obtiene la tarjeta activa del vehículo"""
        if not vehicle_id:
            return False
        
        card = self.env['driverpro.card'].search([
            ('vehicle_id', '=', vehicle_id),
            ('active', '=', True)
        ], limit=1)
        
        return card.id if card else False

    @api.model
    def check_time_alerts(self):
        """Método para verificar y enviar alertas (ejecutado por cron)"""
        searching_trips = self.search([('state', '=', 'searching')])
        alerts_sent = 0

        for trip in searching_trips:
            if trip.time_remaining <= 0:
                # Tiempo agotado - cancelar automáticamente
                trip.action_cancel_search()
                trip.message_post(body=_('Búsqueda cancelada automáticamente por tiempo agotado.'))
                alerts_sent += 1
            elif trip.time_remaining <= 5 and not trip.alert_5_sent:
                trip.alert_5_sent = True
                trip._send_alert(5)
                alerts_sent += 1
            elif trip.time_remaining <= 15 and not trip.alert_15_sent:
                trip.alert_15_sent = True
                trip._send_alert(15)
                alerts_sent += 1
            elif trip.time_remaining <= 30 and not trip.alert_30_sent:
                trip.alert_30_sent = True
                trip._send_alert(30)
                alerts_sent += 1

        return alerts_sent

    @api.model
    def auto_cancel_expired(self):
        """Método para auto-cancelar búsquedas expiradas (ejecutado por cron cada 2 minutos)"""
        from datetime import datetime, timedelta
        
        # Buscar búsquedas activas
        searching_trips = self.search([('state', '=', 'searching')])
        cancelled_count = 0

        for trip in searching_trips:
            if trip.started_at and trip.wait_limit_minutes > 0:
                # Calcular si ha expirado
                started = trip.started_at
                limit_time = started + timedelta(minutes=trip.wait_limit_minutes)
                now = datetime.now()
                
                if now > limit_time:
                    # Tiempo agotado - cancelar automáticamente
                    trip.write({
                        'state': 'cancelled',
                        'cancelled_at': fields.Datetime.now()
                    })
                    
                    elapsed_time = int((now - started).total_seconds() / 60)
                    trip.message_post(body=_(
                        'Búsqueda cancelada automáticamente por tiempo expirado. '
                        'Tiempo transcurrido: %s minutos (límite: %s minutos)'
                    ) % (elapsed_time, trip.wait_limit_minutes))
                    
                    # Notificación vía bus
                    trip._notify_driver('warning', 
                                      '⏰ Tiempo expirado',
                                      f'Búsqueda {trip.name} cancelada automáticamente por tiempo expirado')
                    
                    cancelled_count += 1

        if cancelled_count > 0:
            _logger.info(f"Auto-canceladas {cancelled_count} búsquedas expiradas")
        
        return cancelled_count

    def _send_alert(self, minutes_remaining):
        """Envía alerta de tiempo restante"""
        message = _('⚠️ ALERTA BÚSQUEDA: Quedan %s minutos - %s') % (minutes_remaining, self.name)
        
        if self.driver_id:
            self.message_post(
                body=message,
                partner_ids=[self.driver_id.partner_id.id] if self.driver_id.partner_id else [],
                message_type='notification'
            )
            
            # Enviar notificación vía bus para el frontend
            self._notify_driver('warning', 
                               f'⚠️ Tiempo restante: {minutes_remaining} min',
                               f'Tu búsqueda {self.name} está por expirar')

    def _notify_driver(self, notification_type, title, body, extra_data=None):
        """Envía notificación al conductor vía bus"""
        if not self.driver_id:
            return
        
        try:
            message = {
                "type": f"empty_trip_{notification_type}",
                "title": title,
                "body": body,
                "timestamp": fields.Datetime.now().isoformat(),
                "search_id": self.id,
                "search_name": self.name,
                "user_id": self.driver_id.id
            }
            
            if extra_data:
                message.update(extra_data)
            
            # Enviar notificación específica al usuario usando nuestro canal estándar
            self.env['bus.bus']._sendone(
                f'driverpro_notifications_{self.driver_id.id}',
                'notification',
                message
            )
            
            _logger.info(f"Notificación de búsqueda enviada al usuario {self.driver_id.id}: {title}")
            
        except Exception as e:
            _logger.error(f"Error enviando notificación de búsqueda: {str(e)}")
