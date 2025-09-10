# -*- coding: utf-8 -*-

from odoo import models, fields, api, _
from odoo.exceptions import ValidationError, UserError
from datetime import datetime, timedelta
import pytz
import logging

_logger = logging.getLogger(__name__)


class DriverproTrip(models.Model):
    """Viajes realizados por choferes"""
    _name = 'driverpro.trip'
    _description = 'Viaje Driver Pro'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'create_date desc'

    name = fields.Char(
        string='Número de Viaje',
        required=True,
        copy=False,
        default='/',
        tracking=True
    )
    
    # Estados del viaje
    state = fields.Selection([
        ('draft', 'Borrador'),
        ('empty', 'Viaje Vacío'),
        ('active', 'Activo'),
        ('paused', 'Pausado'),
        ('done', 'Terminado'),
        ('cancelled', 'Cancelado')
    ], string='Estado', default='draft', tracking=True)
    
    # Relaciones principales
    driver_id = fields.Many2one(
        'res.users',
        string='Chofer',
        required=True,
        tracking=True,
        help="Chofer que realizará el viaje (debe tener vehículo asignado en Fleet)"
    )
    
    vehicle_id = fields.Many2one(
        'fleet.vehicle',
        string='Vehículo',
        tracking=True,
        help="Vehículo asignado automáticamente al chofer desde Fleet"
    )
    
    card_id = fields.Many2one(
        'driverpro.card',
        string='Tarjeta',
        tracking=True,
        help="Tarjeta asociada al vehículo"
    )
    
    # Campo calculado para mostrar las recargas disponibles
    card_available_credits = fields.Float(
        string='Recargas Disponibles',
        related='card_id.balance',
        readonly=True,
        help="Número de recargas disponibles en la tarjeta seleccionada"
    )
    
    # Campo calculado para mostrar warnings
    card_credits_warning = fields.Char(
        string='Estado de Recargas',
        compute='_compute_card_credits_warning',
        help="Información sobre el estado de las recargas de la tarjeta"
    )
    
    # Información del viaje
    origin = fields.Char(
        string='Origen',
        required=True,
        tracking=True
    )
    
    destination = fields.Char(
        string='Destino',
        required=True,
        tracking=True
    )
    
    passenger_count = fields.Integer(
        string='Número de Pasajeros',
        default=1,
        tracking=True
    )
    
    passenger_reference = fields.Char(
        string='Referencia del Pasajero',
        help="Nombre, teléfono o referencia del pasajero"
    )
    
    client_name = fields.Char(
        string='Nombre del Cliente',
        help="Nombre del cliente para viajes convertidos desde vacío"
    )
    
    comments = fields.Html(
        string='Comentarios',
        help="Comentarios y notas del viaje con formato enriquecido"
    )
    
    # Campos para zonas de acceso controlado
    is_recharge_trip = fields.Boolean(
        string='Viaje con Recarga',
        default=False,
        tracking=True,
        help="Marcar si este viaje requiere consumo de recarga (ej: origen en aeropuerto)"
    )

    # Campos para viajes vacíos (búsqueda de cliente en zona)
    is_empty_trip = fields.Boolean(
        string='Viaje Vacío',
        default=False,
        tracking=True,
        help="Marcar si es un viaje vacío para buscar cliente en zona controlada"
    )
    
    empty_wait_limit_minutes = fields.Integer(
        string='Límite de Espera (min)',
        default=120,
        help="Tiempo máximo de espera en minutos para viaje vacío"
    )
    
    empty_started_at = fields.Datetime(
        string='Inicio de Búsqueda',
        help="Fecha y hora cuando se inició la búsqueda de cliente"
    )
    
    empty_time_remaining = fields.Float(
        string='Tiempo Restante (min)',
        compute='_compute_empty_time_remaining',
        help="Tiempo restante en minutos para el viaje vacío"
    )
    
    empty_alert_30_sent = fields.Boolean(
        string='Alerta 30 min Enviada',
        default=False,
        help="Marca si se envió la alerta de 30 minutos"
    )
    
    empty_alert_15_sent = fields.Boolean(
        string='Alerta 15 min Enviada', 
        default=False,
        help="Marca si se envió la alerta de 15 minutos"
    )
    
    empty_alert_5_sent = fields.Boolean(
        string='Alerta 5 min Enviada',
        default=False,
        help="Marca si se envió la alerta de 5 minutos"
    )

    # Campos para archivos adjuntos
    document_ids = fields.Many2many(
        'ir.attachment',
        'driverpro_trip_attachment_rel',
        'trip_id', 'attachment_id',
        string='Archivos del Viaje',
        help="Archivos relacionados con el viaje (fotos, documentos, etc.)"
    )
    
    attachment_count = fields.Integer(
        string='Adjuntos',
        compute='_compute_attachment_count',
        help="Número de archivos adjuntos"
    )
    
    # Información de pago
    payment_method = fields.Selection([
        ('cash', 'Efectivo'),
        ('card', 'Tarjeta'),
        ('transfer', 'Transferencia'),
        ('other', 'Otro')
    ], string='Método de Pago')
    
    # Control de moneda
    payment_in_usd = fields.Boolean(
        string='Pago en USD',
        default=False,
        help="Marcar si el pago incluye montos en dólares estadounidenses"
    )
    
    # Montos por moneda
    amount_mxn = fields.Float(
        string='Monto MXN',
        digits=(16, 2),
        help="Monto en pesos mexicanos"
    )
    
    amount_usd = fields.Float(
        string='Monto USD',
        digits=(16, 2),
        help="Monto en dólares estadounidenses"
    )
    
    # Tipo de cambio para conversión
    exchange_rate = fields.Float(
        string='Tipo de Cambio',
        digits=(16, 4),
        default=20.0,
        help="Tipo de cambio USD a MXN (1 USD = X MXN)"
    )
    
    # Total calculado en MXN
    total_amount_mxn = fields.Float(
        string='Total MXN',
        compute='_compute_total_amount',
        store=True,
        digits=(16, 2),
        help="Total convertido a pesos mexicanos"
    )
    
    payment_reference = fields.Char(
        string='Referencia de Pago'
    )
    
    # Información de citas programadas
    is_scheduled = fields.Boolean(
        string='Viaje Programado',
        default=False,
        tracking=True,
        help="Indica si este viaje tiene una cita programada"
    )
    
    scheduled_datetime = fields.Datetime(
        string='Fecha y Hora de Cita',
        tracking=True,
        help="Fecha y hora programada para la cita"
    )
    
    scheduled_notification_sent = fields.Boolean(
        string='Notificación Enviada',
        default=False,
        help="Indica si ya se envió la notificación de recordatorio"
    )
    
    # Información de tiempos
    start_datetime = fields.Datetime(
        string='Inicio del Viaje',
        tracking=True
    )
    
    end_datetime = fields.Datetime(
        string='Fin del Viaje',
        tracking=True
    )
    
    duration = fields.Float(
        string='Duración (Horas)',
        compute='_compute_duration',
        store=True,
        help="Duración total del viaje en horas"
    )
    
    pause_duration = fields.Float(
        string='Tiempo en Pausa (Horas)',
        compute='_compute_pause_duration',
        store=True,
        help="Tiempo total pausado en horas"
    )
    
    effective_duration = fields.Float(
        string='Duración Efectiva (Horas)',
        compute='_compute_effective_duration',
        store=True,
        help="Duración total menos tiempo pausado"
    )
    
    # Créditos consumidos
    consumed_credits = fields.Float(
        string='Créditos Consumidos',
        default=0.0,
        tracking=True,
        help="Créditos consumidos al iniciar el viaje"
    )
    
    # Control de recargas
    credit_consumed = fields.Boolean(
        string='Recarga Consumida',
        default=False,
        tracking=True,
        help="Indica si ya se consumió una recarga para este viaje"
    )
    
    credit_refunded = fields.Boolean(
        string='Recarga Reembolsada',
        default=False,
        tracking=True,
        help="Indica si ya se reembolsó la recarga de este viaje"
    )
    
    # Relaciones
    pause_ids = fields.One2many(
        'driverpro.trip.pause',
        'trip_id',
        string='Pausas'
    )
    
    # Campos calculados
    pause_count = fields.Integer(
        string='Número de Pausas',
        compute='_compute_pause_count',
        store=True
    )
    
    is_paused = fields.Boolean(
        string='Está Pausado',
        compute='_compute_is_paused'
    )
    
    current_pause_id = fields.Many2one(
        'driverpro.trip.pause',
        string='Pausa Actual',
        compute='_compute_current_pause'
    )
    
    # Campos de auditoría
    company_id = fields.Many2one(
        'res.company',
        string='Compañía',
        default=lambda self: self.env.company,
        required=True
    )

    @api.depends('card_id.balance')
    def _compute_card_credits_warning(self):
        """Calcula el estado de las recargas de la tarjeta"""
        for trip in self:
            if not trip.card_id:
                trip.card_credits_warning = ''
            elif trip.card_id.balance <= 0:
                trip.card_credits_warning = 'Sin recargas disponibles'
            elif trip.card_id.balance <= 5:
                trip.card_credits_warning = f'Pocas recargas ({trip.card_id.balance})'
            else:
                trip.card_credits_warning = f'Recargas disponibles: {trip.card_id.balance}'

    @api.depends('amount_mxn', 'amount_usd', 'exchange_rate', 'payment_in_usd')
    def _compute_total_amount(self):
        """Calcula el total en MXN"""
        for trip in self:
            total_mxn = trip.amount_mxn or 0.0
            # Solo agregar USD al total si está marcado el checkbox y hay monto USD
            if trip.payment_in_usd and trip.amount_usd > 0 and trip.exchange_rate > 0:
                total_mxn += trip.amount_usd * trip.exchange_rate
            trip.total_amount_mxn = total_mxn

    @api.model
    def create(self, vals):
        """Asignar secuencia al crear"""
        if not vals.get('name') or vals.get('name') in ('/', _('Nuevo'), 'New'):
            vals['name'] = self.env['ir.sequence'].next_by_code('driverpro.trip') or 'TRIP-000001'
        
        trip = super().create(vals)
        
        # Enviar notificación si se asigna un driver al crear
        if vals.get('driver_id'):
            try:
                bus_message = {
                    'type': 'trip_created',
                    'title': 'Nuevo Viaje Creado',
                    'body': f'Se ha creado el viaje {trip.name} y se te ha asignado',
                    'trip_id': trip.id,
                    'trip_name': trip.name,
                    'user_id': trip.driver_id.id,
                    'timestamp': fields.Datetime.now().isoformat()
                }
                
                # Enviar notificación específica al usuario
                self.env['bus.bus']._sendone(
                    f'driverpro_notifications_{trip.driver_id.id}',
                    'notification',
                    bus_message
                )
                
                _logger.info(f"Notificación de viaje creado enviada al usuario {trip.driver_id.id} para viaje {trip.name}")
                
            except Exception as e:
                _logger.error(f"Error enviando notificación de viaje creado: {str(e)}")
        
        return trip

    def write(self, vals):
        """Manejar cambios en el viaje, especialmente asignación de driver"""
        result = super().write(vals)
        
        # Si se cambia el driver, enviar notificación al nuevo driver
        if vals.get('driver_id'):
            for trip in self:
                try:
                    bus_message = {
                        'type': 'trip_assigned',
                        'title': 'Viaje Reasignado',
                        'body': f'Se te ha reasignado el viaje {trip.name}',
                        'trip_id': trip.id,
                        'trip_name': trip.name,
                        'user_id': trip.driver_id.id,
                        'timestamp': fields.Datetime.now().isoformat()
                    }
                    
                    # Enviar notificación específica al nuevo usuario
                    self.env['bus.bus']._sendone(
                        f'driverpro_notifications_{trip.driver_id.id}',
                        'notification',
                        bus_message
                    )
                    
                    _logger.info(f"Notificación de reasignación enviada al usuario {trip.driver_id.id} para viaje {trip.name}")
                    
                except Exception as e:
                    _logger.error(f"Error enviando notificación de reasignación: {str(e)}")
        
        return result

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

    @api.model
    def get_driver_vehicle_info(self, driver_id):
        """Obtiene información del vehículo y tarjeta asignados a un chofer"""
        if not driver_id:
            return {}
        
        # Obtener el usuario y su partner asociado
        user = self.env['res.users'].browse(driver_id)
        if not user.exists() or not user.partner_id:
            return {
                'vehicle_id': False, 
                'card_id': False, 
                'warnings': [_('El usuario no existe o no tiene un contacto asociado.')]
            }
        
        # Buscar vehículo asignado al partner en Fleet
        vehicle = self.env['fleet.vehicle'].search([
            ('driver_id', '=', user.partner_id.id),
            ('active', '=', True)
        ], limit=1)
        
        result = {'vehicle_id': False, 'card_id': False, 'warnings': []}
        
        if vehicle:
            result['vehicle_id'] = vehicle.id
            
            # Buscar tarjeta activa para el vehículo
            card = self.env['driverpro.card'].search([
                ('vehicle_id', '=', vehicle.id),
                ('active', '=', True)
            ], limit=1)
            
            if card:
                result['card_id'] = card.id
                if card.balance <= 0:
                    result['warnings'].append(_('La tarjeta %s no tiene créditos suficientes.') % card.name)
            else:
                result['warnings'].append(_('El vehículo %s no tiene una tarjeta activa asignada.') % vehicle.name)
        else:
            result['warnings'].append(_('El chofer %s no tiene ningún vehículo asignado en Fleet.') % user.name)
        
        return result

    @api.onchange('driver_id')
    def _onchange_driver_id(self):
        """Auto-completar vehículo y tarjeta basado en el chofer"""
        if self.driver_id:
            # En Fleet, el driver_id es un res.partner, pero nosotros usamos res.users
            # Necesitamos buscar el partner asociado al usuario
            partner_id = self.driver_id.partner_id.id if self.driver_id.partner_id else False
            
            if not partner_id:
                self.vehicle_id = False
                self.card_id = False
                return {
                    'warning': {
                        'title': _('Advertencia'),
                        'message': _('El usuario %s no tiene un contacto asociado. '
                                   'Verifique la configuración del usuario en: Configuración > Usuarios > %s > Pestaña General > Contacto relacionado') % (self.driver_id.name, self.driver_id.name)
                    }
                }
            
            # Buscar vehículo asignado al partner en el módulo Fleet
            vehicle = self.env['fleet.vehicle'].search([
                ('driver_id', '=', partner_id),
                ('active', '=', True)
            ], limit=1)
            
            if vehicle:
                self.vehicle_id = vehicle
                # Auto-completar tarjeta basada en el vehículo
                card = self.env['driverpro.card'].search([
                    ('vehicle_id', '=', vehicle.id),
                    ('active', '=', True)
                ], limit=1)
                
                if card:
                    self.card_id = card
                    # Validar recargas disponibles y mostrar advertencia
                    if card.balance <= 0:
                        return {
                            'warning': {
                                'title': _('Sin Recargas Disponibles'),
                                'message': _('La tarjeta %s no tiene recargas disponibles (Saldo: %s). '
                                           'Puede crear el viaje en borrador, pero deberá recargar la tarjeta '
                                           'antes de poder iniciarlo.') % (card.name, card.balance)
                            }
                        }
                else:
                    self.card_id = False
                    # Mensaje informativo si no hay tarjeta
                    return {
                        'warning': {
                            'title': _('Advertencia'),
                            'message': _('El vehículo %s no tiene una tarjeta activa asignada. '
                                       'Necesitará crear una tarjeta en: Driver Pro > Tarjetas > Crear') % vehicle.name
                        }
                    }
            else:
                # Limpiar campos si no hay vehículo asignado
                self.vehicle_id = False
                self.card_id = False
                return {
                    'warning': {
                        'title': _('Configuración Requerida'),
                        'message': _('El chofer %s no tiene ningún vehículo asignado en el módulo de Flota.\n\n'
                                   'Para completar la configuración:\n'
                                   '1. Vaya a Fleet > Configuración > Vehículos\n'
                                   '2. Seleccione un vehículo\n'
                                   '3. En el campo "Conductor", seleccione: %s\n'
                                   '4. Guarde el vehículo') % 
                                 (self.driver_id.name, self.driver_id.partner_id.name if self.driver_id.partner_id else 'Contacto del usuario')
                    }
                }
        else:
            # Limpiar campos si no hay chofer seleccionado
            self.vehicle_id = False
            self.card_id = False

    @api.onchange('vehicle_id')
    def _onchange_vehicle_id(self):
        """Auto-completar tarjeta basado en el vehículo"""
        if self.vehicle_id:
            # Verificar que el vehículo tenga el mismo conductor que el seleccionado
            if self.driver_id and self.driver_id.partner_id:
                if self.vehicle_id.driver_id != self.driver_id.partner_id:
                    # Limpiar vehículo si no coincide el conductor
                    self.vehicle_id = False
                    self.card_id = False
                    return {
                        'warning': {
                            'title': _('Advertencia'),
                            'message': _('El vehículo seleccionado no está asignado al chofer %s en el módulo de Flota.') % self.driver_id.name
                        }
                    }
            
            # Buscar tarjeta activa asociada al vehículo
            card = self.env['driverpro.card'].search([
                ('vehicle_id', '=', self.vehicle_id.id),
                ('active', '=', True)
            ], limit=1)
            
            if card:
                self.card_id = card
                # Verificar recargas disponibles
                if card.balance <= 0:
                    return {
                        'warning': {
                            'title': _('Sin Recargas Disponibles'),
                            'message': _('El vehículo %s tiene la tarjeta %s asignada, pero no tiene recargas disponibles (Saldo: %s). '
                                       'Puede crear el viaje en borrador, pero deberá recargar la tarjeta antes de poder iniciarlo.') % 
                                     (self.vehicle_id.name, card.name, card.balance)
                        }
                    }
            else:
                self.card_id = False
                return {
                    'warning': {
                        'title': _('Advertencia'),
                        'message': _('El vehículo %s no tiene una tarjeta activa asignada.') % self.vehicle_id.name
                    }
                }
        else:
            self.card_id = False

    def _compute_attachment_count(self):
        """Cuenta archivos adjuntos"""
        for trip in self:
            # Contar archivos en many2many + adjuntos generales
            count = len(trip.document_ids)
            
            # Adjuntos generales del modelo
            count += self.env['ir.attachment'].search_count([
                ('res_model', '=', self._name),
                ('res_id', '=', trip.id),
                ('id', 'not in', trip.document_ids.ids)
            ])
            
            trip.attachment_count = count

    def action_view_attachments(self):
        """Ver archivos adjuntos"""
        return {
            'name': _('Archivos del Viaje'),
            'type': 'ir.actions.act_window',
            'res_model': 'ir.attachment',
            'view_mode': 'list,form',
            'domain': [('res_model', '=', self._name), ('res_id', '=', self.id)],
            'context': {'default_res_model': self._name, 'default_res_id': self.id}
        }

    @api.depends('start_datetime', 'end_datetime')
    def _compute_duration(self):
        """Calcula la duración total del viaje"""
        for trip in self:
            if trip.start_datetime and trip.end_datetime:
                delta = trip.end_datetime - trip.start_datetime
                trip.duration = delta.total_seconds() / 3600  # Convertir a horas
            else:
                trip.duration = 0.0

    @api.depends('pause_ids.duration')
    def _compute_pause_duration(self):
        """Calcula el tiempo total en pausa"""
        for trip in self:
            trip.pause_duration = sum(trip.pause_ids.mapped('duration'))

    @api.depends('duration', 'pause_duration')
    def _compute_effective_duration(self):
        """Calcula la duración efectiva (sin pausas)"""
        for trip in self:
            trip.effective_duration = trip.duration - trip.pause_duration

    @api.depends('pause_ids')
    def _compute_pause_count(self):
        """Cuenta el número de pausas"""
        for trip in self:
            trip.pause_count = len(trip.pause_ids)

    @api.depends('pause_ids.is_active')
    def _compute_is_paused(self):
        """Determina si el viaje está pausado actualmente"""
        for trip in self:
            trip.is_paused = any(trip.pause_ids.mapped('is_active'))

    @api.depends('pause_ids.is_active')
    def _compute_current_pause(self):
        """Encuentra la pausa actual si existe"""
        for trip in self:
            current_pause = trip.pause_ids.filtered('is_active')
            trip.current_pause_id = current_pause[0] if current_pause else False

    @api.depends('empty_started_at', 'empty_wait_limit_minutes', 'state')
    def _compute_empty_time_remaining(self):
        """Calcula el tiempo restante para viajes vacíos"""
        for trip in self:
            if trip.state == 'empty' and trip.empty_started_at:
                now = fields.Datetime.now()
                elapsed_minutes = (now - trip.empty_started_at).total_seconds() / 60
                trip.empty_time_remaining = max(0, trip.empty_wait_limit_minutes - elapsed_minutes)
            else:
                trip.empty_time_remaining = 0

    @api.constrains('driver_id')
    def _check_driver_required(self):
        """Valida que el chofer esté seleccionado"""
        for trip in self:
            if not trip.driver_id:
                raise ValidationError(_('Debe seleccionar un chofer para el viaje.'))
    
    @api.constrains('state', 'driver_id', 'vehicle_id')
    def _check_driver_vehicle_for_start(self):
        """Valida que el chofer y vehículo sean consistentes para iniciar el viaje"""
        for trip in self:
            # Solo validar para estados que requieren vehículo asignado
            if trip.state in ['active', 'paused', 'done']:
                # Validar que el vehículo esté asignado
                if not trip.vehicle_id:
                    raise ValidationError(
                        _('Debe seleccionar un vehículo para iniciar el viaje. '
                          'Verifique que el chofer %s tenga un vehículo asignado en Fleet.') % 
                        trip.driver_id.name
                    )
                
                # El driver_id en fleet.vehicle es un res.partner, no res.users
                expected_partner = trip.driver_id.partner_id
                if not expected_partner:
                    raise ValidationError(
                        _('El usuario %s no tiene un contacto asociado. '
                          'Verifique la configuración del usuario.') % trip.driver_id.name
                    )
                
                # Verificar que el vehículo esté asignado al chofer correcto
                if trip.vehicle_id.driver_id != expected_partner:
                    raise ValidationError(
                        _('El vehículo %s no está asignado al chofer %s en el módulo de Flota. '
                          'Por favor, asigne el vehículo al contacto %s en Fleet o seleccione el vehículo correcto.') % 
                        (trip.vehicle_id.name, trip.driver_id.name, expected_partner.name)
                    )
    
    @api.constrains('state', 'card_id', 'credit_consumed')
    def _check_card_credits_for_start(self):
        """Valida que se haya consumido una recarga para estados activos (solo para viajes con recarga)"""
        for trip in self:
            # Solo validar para viajes que requieren recarga Y están en estados activos
            if trip.state in ['active', 'paused', 'done'] and trip.is_recharge_trip:
                if not trip.credit_consumed:
                    raise ValidationError(
                        _('No se puede cambiar el estado del viaje con recarga a "%s" sin haber consumido una recarga previamente. '
                          'Debe iniciar el viaje primero para consumir la recarga.') % 
                        dict(self._fields['state'].selection)[trip.state]
                    )

    @api.constrains('state', 'start_datetime', 'end_datetime')
    def _check_datetime_consistency(self):
        """Valida consistencia de fechas"""
        for trip in self:
            if trip.start_datetime and trip.end_datetime:
                if trip.start_datetime >= trip.end_datetime:
                    raise ValidationError(_('La fecha de fin debe ser posterior a la fecha de inicio.'))

    @api.constrains('is_scheduled', 'scheduled_datetime')
    def _check_scheduled_datetime(self):
        """Valida que las citas programadas tengan fecha válida"""
        for trip in self:
            if trip.is_scheduled and not trip.scheduled_datetime:
                raise ValidationError(_('Los viajes programados deben tener una fecha y hora de cita.'))
            
            if trip.scheduled_datetime and trip.scheduled_datetime <= fields.Datetime.now():
                raise ValidationError(_('La fecha de la cita debe ser en el futuro.'))

    @api.constrains('amount_mxn', 'amount_usd', 'payment_in_usd')
    def _check_amounts(self):
        """Valida que al menos un monto sea mayor a cero"""
        for trip in self:
            if trip.amount_mxn < 0 or trip.amount_usd < 0:
                raise ValidationError(_('Los montos no pueden ser negativos.'))
                
            # Si está marcado pago en USD, debe tener monto USD
            if trip.payment_in_usd and trip.amount_usd <= 0:
                raise ValidationError(_('Si marca "Pago en USD", debe especificar un monto en USD mayor a cero.'))

    @api.constrains('exchange_rate', 'payment_in_usd')
    def _check_exchange_rate(self):
        """Valida que el tipo de cambio sea positivo cuando se usa USD"""
        for trip in self:
            # Solo validar tipo de cambio si se está usando USD
            if trip.payment_in_usd and trip.exchange_rate <= 0:
                raise ValidationError(_('El tipo de cambio debe ser mayor a cero cuando se usa pago en USD.'))
        for trip in self:
            if trip.exchange_rate <= 0:
                raise ValidationError(_('El tipo de cambio debe ser mayor a cero.'))

    def action_start(self):
        """Inicia el viaje"""
        for trip in self:
            if trip.state != 'draft':
                raise UserError(_('Solo se pueden iniciar viajes en borrador.'))
            
            # Validar que ya se consumió una recarga o hay recargas disponibles
            if trip.credit_consumed:
                raise UserError(_('Este viaje ya consumió una recarga previamente.'))
            
            # Validar que el chofer tenga el vehículo asignado en Fleet
            if not trip.vehicle_id:
                raise UserError(_('Debe seleccionar un vehículo para el viaje.'))
            
            if not trip.driver_id.partner_id:
                raise UserError(_('El usuario %s no tiene un contacto asociado. '
                                'Verifique la configuración del usuario.') % trip.driver_id.name)
                
            if trip.vehicle_id.driver_id != trip.driver_id.partner_id:
                raise UserError(_('El chofer seleccionado no tiene asignado este vehículo en el módulo de Flota. '
                                'Por favor, asigne el vehículo al contacto %s en Fleet o seleccione el chofer correcto.') % 
                                trip.driver_id.partner_id.name)
            
            # Validar que hay tarjeta asignada
            if not trip.card_id:
                raise UserError(_('No hay tarjeta asignada a este vehículo. '
                                'Por favor, asigne una tarjeta activa al vehículo antes de iniciar el viaje.'))
            
            # Solo validar y consumir créditos si es un viaje con recarga
            if trip.is_recharge_trip:
                # Validar que la tarjeta tiene créditos suficientes
                if trip.card_id.balance <= 0:
                    raise UserError(_('La tarjeta %s no tiene recargas suficientes para este viaje con recarga. '
                                    'Saldo actual: %s. Por favor, realice una recarga antes de continuar.') % 
                                    (trip.card_id.name, trip.card_id.balance))
                
                # Consumir crédito usando el método existente
                try:
                    trip.card_id.consume_credit(
                        amount=1.0,
                        reference=_('Viaje con recarga: %s') % trip.name
                    )
                    trip.consumed_credits = 1.0
                    trip.credit_consumed = True
                except UserError as e:
                    raise UserError(_('Error al consumir recarga: %s') % str(e))
            
            # Actualizar estado y tiempo
            trip.write({
                'state': 'active',
                'start_datetime': fields.Datetime.now()
            })
            
            # Enviar notificación al bus
            try:
                bus_message = {
                    'type': 'trip_assigned',
                    'title': 'Nuevo Viaje Asignado',
                    'body': f'Se te ha asignado el viaje {trip.name}',
                    'trip_id': trip.id,
                    'trip_name': trip.name,
                    'user_id': trip.driver_id.id,
                    'timestamp': fields.Datetime.now().isoformat()
                }
                
                # Enviar notificación específica al usuario
                self.env['bus.bus']._sendone(
                    f'driverpro_notifications_{trip.driver_id.id}',
                    'notification',
                    bus_message
                )
                
                _logger.info(f"Notificación enviada al usuario {trip.driver_id.id} para viaje {trip.name}")
                
            except Exception as e:
                _logger.error(f"Error enviando notificación: {str(e)}")
            
            if trip.is_recharge_trip:
                trip.message_post(body=_('Viaje con recarga iniciado. Recarga consumida: %s') % trip.consumed_credits)
            else:
                trip.message_post(body=_('Viaje iniciado (sin consumo de recarga).'))

    def action_pause(self, reason_id=None, notes=None):
        """Pausa el viaje"""
        for trip in self:
            if trip.state != 'active':
                raise UserError(_('Solo se pueden pausar viajes activos.'))
            
            if trip.is_paused:
                raise UserError(_('El viaje ya está pausado.'))
            
            # Crear nueva pausa
            pause_vals = {
                'trip_id': trip.id,
                'start_datetime': fields.Datetime.now(),
                'is_active': True,
                'notes': notes or ''
            }
            
            if reason_id:
                pause_vals['reason_id'] = reason_id
            
            self.env['driverpro.trip.pause'].create(pause_vals)
            
            trip.state = 'paused'
            trip.message_post(body=_('Viaje pausado.'))

    def action_resume(self):
        """Reanuda el viaje"""
        for trip in self:
            if trip.state != 'paused':
                raise UserError(_('Solo se pueden reanudar viajes pausados.'))
            
            # Finalizar pausa activa
            current_pause = trip.current_pause_id
            if current_pause:
                current_pause.action_end()
            
            trip.state = 'active'
            trip.message_post(body=_('Viaje reanudado.'))

    def action_done(self):
        """Termina el viaje"""
        for trip in self:
            if trip.state not in ['active', 'paused']:
                raise UserError(_('Solo se pueden terminar viajes activos o pausados.'))
            
            # Si está pausado, finalizar la pausa
            if trip.is_paused:
                trip.current_pause_id.action_end()
            
            trip.write({
                'state': 'done',
                'end_datetime': fields.Datetime.now()
            })
            
            trip.message_post(body=_('Viaje terminado. Duración: %s horas') % trip.duration)

    def action_cancel(self):
        """Cancela el viaje"""
        for trip in self:
            if trip.state == 'done':
                raise UserError(_('No se pueden cancelar viajes terminados.'))
            
            # Finalizar pausas activas
            active_pauses = trip.pause_ids.filtered('is_active')
            for pause in active_pauses:
                pause.action_end()
            
            trip.state = 'cancelled'
            trip.message_post(body=_('Viaje cancelado.'))

    def action_refund_credit(self):
        """Reembolsa la recarga consumida por el viaje cancelado"""
        for trip in self:
            if trip.state != 'cancelled':
                raise UserError(_('Solo se puede reembolsar recargas de viajes cancelados.'))
            
            if not trip.credit_consumed:
                raise UserError(_('Este viaje no ha consumido ninguna recarga.'))
            
            if trip.credit_refunded:
                raise UserError(_('La recarga de este viaje ya fue reembolsada previamente.'))
            
            if not trip.card_id:
                raise UserError(_('No se puede reembolsar porque no hay tarjeta asignada.'))
            
            # Crear movimiento de reembolso
            self.env['driverpro.card.movement'].create({
                'card_id': trip.card_id.id,
                'movement_type': 'in',
                'amount': trip.consumed_credits,
                'reference': _('Reembolso por cancelación: %s') % trip.name,
                'movement_date': fields.Datetime.now(),
                'trip_id': trip.id
            })
            
            trip.credit_refunded = True
            trip.message_post(body=_('Recarga reembolsada: %s créditos') % trip.consumed_credits)

    def action_start_empty(self):
        """Inicia un viaje vacío (búsqueda de clientes en aeropuerto/zona)"""
        for trip in self:
            if trip.state != 'draft':
                raise UserError(_('Solo se pueden iniciar viajes vacíos desde borrador.'))
            
            # Validar configuración básica
            if not trip.vehicle_id:
                raise UserError(_('Debe seleccionar un vehículo para el viaje vacío.'))
                
            if not trip.driver_id.partner_id:
                raise UserError(_('El usuario %s no tiene un contacto asociado.') % trip.driver_id.name)
                
            if trip.vehicle_id.driver_id != trip.driver_id.partner_id:
                raise UserError(_('El chofer seleccionado no tiene asignado este vehículo en el módulo de Flota.'))
            
            # No se requiere tarjeta ni validaciones de recarga para viajes vacíos
            if not trip.empty_wait_limit_minutes or trip.empty_wait_limit_minutes <= 0:
                trip.empty_wait_limit_minutes = 60  # Default: 1 hora
            
            # Actualizar estado y tiempos
            trip.write({
                'state': 'empty',
                'is_empty_trip': True,
                'empty_started_at': fields.Datetime.now(),
                'start_datetime': fields.Datetime.now(),
                'empty_alert_30_sent': False,
                'empty_alert_15_sent': False,
                'empty_alert_5_sent': False,
            })
            
            trip.message_post(body=_('Viaje vacío iniciado. Límite de tiempo: %s minutos') % trip.empty_wait_limit_minutes)

    def action_convert_empty_to_active(self, trip_data=None):
        """Convierte un viaje vacío a viaje activo cuando encuentra cliente"""
        for trip in self:
            if trip.state != 'empty':
                raise UserError(_('Solo se pueden convertir viajes en estado vacío.'))
            
            if not trip_data:
                raise UserError(_('Se requiere información del cliente para convertir el viaje.'))
            
            # Validar información mínima requerida
            if not trip_data.get('client_name'):
                raise UserError(_('Debe ingresar el nombre del cliente.'))
            
            if not trip_data.get('origin'):
                raise UserError(_('Debe ingresar el origen del viaje.'))
                
            if not trip_data.get('destination'):
                raise UserError(_('Debe ingresar el destino del viaje.'))
            
            # Actualizar información del viaje
            update_vals = {
                'state': 'active',
                'is_empty_trip': False,
                'empty_started_at': False,  # Limpiar tiempo de vacío
                'client_name': trip_data.get('client_name'),
                'origin': trip_data.get('origin'),
                'destination': trip_data.get('destination'),
                'passenger_count': trip_data.get('passenger_count', 1),
                'passenger_reference': trip_data.get('passenger_reference', ''),
                'is_recharge_trip': trip_data.get('is_recharge_trip', False),
                'payment_method': trip_data.get('payment_method', 'cash'),
                'amount_mxn': trip_data.get('amount_mxn', 0.0),
            }
            
            # Si es viaje con recarga, validar que hay créditos
            if update_vals['is_recharge_trip']:
                if not trip.card_id:
                    raise UserError(_('No hay tarjeta asignada para el viaje con recarga.'))
                if trip.card_id.balance <= 0:
                    raise UserError(_('La tarjeta no tiene recargas suficientes para este viaje con recarga.'))
            
            trip.write(update_vals)
            
            trip_type_text = _('con recarga') if update_vals['is_recharge_trip'] else _('regular')
            message_body = _('Viaje convertido de vacío a %(type)s. Cliente: %(client)s') % {
                'type': trip_type_text,
                'client': trip_data.get('client_name')
            }
            
            trip.message_post(body=message_body)

    def action_cancel_empty(self):
        """Cancela un viaje vacío"""
        for trip in self:
            if trip.state != 'empty':
                raise UserError(_('Solo se pueden cancelar viajes en estado vacío.'))
            
            trip.write({
                'state': 'cancelled',
                'end_datetime': fields.Datetime.now()
            })
            
            trip.message_post(body=_('Viaje vacío cancelado. Tiempo transcurrido: %s minutos') % 
                            (trip.empty_wait_limit_minutes - trip.empty_time_remaining if trip.empty_time_remaining > 0 else trip.empty_wait_limit_minutes))

    @api.model
    def check_empty_trip_alerts(self):
        """Método para verificar y enviar alertas de viajes vacíos (ejecutado por cron)"""
        empty_trips = self.search([
            ('state', '=', 'empty'),
            ('empty_started_at', '!=', False),
        ])
        
        alerts_sent = 0
        
        for trip in empty_trips:
            if trip.empty_time_remaining <= 0:
                # Tiempo agotado - cancelar automáticamente
                trip.action_cancel_empty()
                trip.message_post(body=_('Viaje vacío cancelado automáticamente por tiempo agotado.'))
                alerts_sent += 1
            elif trip.empty_time_remaining <= 5 and not trip.empty_alert_5_sent:
                # Alerta de 5 minutos
                trip.empty_alert_5_sent = True
                trip._send_empty_trip_alert(5)
                alerts_sent += 1
            elif trip.empty_time_remaining <= 15 and not trip.empty_alert_15_sent:
                # Alerta de 15 minutos
                trip.empty_alert_15_sent = True
                trip._send_empty_trip_alert(15)
                alerts_sent += 1
            elif trip.empty_time_remaining <= 30 and not trip.empty_alert_30_sent:
                # Alerta de 30 minutos
                trip.empty_alert_30_sent = True
                trip._send_empty_trip_alert(30)
                alerts_sent += 1
        
        return alerts_sent

    def _send_empty_trip_alert(self, minutes_remaining):
        """Envía alerta de tiempo restante para viaje vacío"""
        message = _('⚠️ ALERTA VIAJE VACÍO: Quedan %s minutos para que se cancele automáticamente el viaje %s') % (minutes_remaining, self.name)
        
        # Notificar al chofer
        if self.driver_id:
            self.message_post(
                body=message,
                partner_ids=[self.driver_id.partner_id.id] if self.driver_id.partner_id else [],
                message_type='notification'
            )
        
        # También registrar en el chatter del viaje
        self.message_post(body=message)

    def action_view_pauses(self):
        """Ver pausas del viaje"""
        return {
            'name': _('Pausas del Viaje'),
            'type': 'ir.actions.act_window',
            'res_model': 'driverpro.trip.pause',
            'view_mode': 'list,form',
            'domain': [('trip_id', '=', self.id)],
            'context': {'default_trip_id': self.id}
        }

    @api.model
    def send_scheduled_notifications(self):
        """Método para enviar notificaciones de viajes programados (ejecutado por cron)"""
        # Buscar viajes programados que necesitan notificación
        notification_time = fields.Datetime.now() + timedelta(minutes=15)
        
        trips_to_notify = self.search([
            ('is_scheduled', '=', True),
            ('scheduled_datetime', '<=', notification_time),
            ('scheduled_datetime', '>=', fields.Datetime.now()),
            ('scheduled_notification_sent', '=', False),
            ('state', '=', 'draft')
        ])
        
        for trip in trips_to_notify:
            trip._send_driver_notification()
            trip.scheduled_notification_sent = True
        
        return len(trips_to_notify)

    def _format_time_remaining(self, minutes):
        """Convierte minutos a formato legible (días, horas, minutos)"""
        if minutes < 0:
            return "Tiempo vencido"
        
        days = minutes // (24 * 60)
        hours = (minutes % (24 * 60)) // 60
        mins = minutes % 60
        
        parts = []
        if days > 0:
            parts.append(f"{days} día{'s' if days != 1 else ''}")
        if hours > 0:
            parts.append(f"{hours} hora{'s' if hours != 1 else ''}")
        if mins > 0 or not parts:  # Mostrar minutos si es lo único o hay minutos restantes
            parts.append(f"{mins} minuto{'s' if mins != 1 else ''}")
        
        return " y ".join(parts)

    def _send_driver_notification(self):
        """Envía notificación al chofer sobre viaje próximo"""
        self.ensure_one()
        
        if not self.driver_id or not self.scheduled_datetime:
            return
        
        # Convertir fecha programada a zona horaria del chofer
        scheduled_local = self._convert_to_user_timezone(self.scheduled_datetime)
        
        time_diff = self.scheduled_datetime - fields.Datetime.now()
        minutes_left = int(time_diff.total_seconds() / 60)
        time_formatted = self._format_time_remaining(minutes_left)
        
        try:
            # Enviar notificación al bus para notificaciones inmediatas
            bus_message = {
                'type': 'scheduled_trip_reminder',
                'title': f'Viaje programado en {time_formatted}',
                'body': f'Viaje de {self.origin} a {self.destination}',
                'trip_id': self.id,
                'trip_name': self.name,
                'user_id': self.driver_id.id,
                'scheduled_datetime': self.scheduled_datetime.isoformat(),
                'minutes_left': minutes_left,
                'timestamp': fields.Datetime.now().isoformat()
            }
            
            # Enviar notificación específica al usuario
            self.env['bus.bus']._sendone(
                f'driverpro_notifications_{self.driver_id.id}',
                'notification',
                bus_message
            )
            
            _logger.info(f"Notificación de viaje programado enviada al usuario {self.driver_id.id} para viaje {self.name}")
            
        except Exception as e:
            _logger.error(f"Error enviando notificación de viaje programado: {str(e)}")
        
        # Enviar mensaje en el chatter
        self.message_post(
            body=_(
                '📧 Notificación enviada al chofer <strong>%s</strong>: Viaje programado en <strong>%s</strong>'
            ) % (self.driver_id.name, time_formatted),
            subtype_xmlid="mail.mt_note",
        )

    @api.onchange('is_scheduled')
    def _onchange_is_scheduled(self):
        """Limpiar fecha de cita si no es programado"""
        if not self.is_scheduled:
            self.scheduled_datetime = False
            self.scheduled_notification_sent = False

    @api.onchange('payment_in_usd')
    def _onchange_payment_in_usd(self):
        """Limpiar campos USD si no está marcado el checkbox"""
        if not self.payment_in_usd:
            self.amount_usd = 0.0
            self.exchange_rate = 20.0
        else:
            # Establecer tipo de cambio por defecto si se activa USD
            if not self.exchange_rate or self.exchange_rate <= 0:
                self.exchange_rate = 20.0

    def action_send_test_notification(self):
        """Envía un recordatorio manual al chofer"""
        self.ensure_one()
        if not self.driver_id:
            raise UserError(_('Debe seleccionar un chofer para enviar el recordatorio.'))
        
        self._send_driver_notification()
        
        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': _('Recordatorio Enviado'),
                'message': _('Se ha enviado un recordatorio manual a %s') % self.driver_id.name,
                'type': 'success',
            }
        }


class DriverproTripPause(models.Model):
    """Pausas durante un viaje"""
    _name = 'driverpro.trip.pause'
    _description = 'Pausa de Viaje'
    _order = 'start_datetime desc'

    trip_id = fields.Many2one(
        'driverpro.trip',
        string='Viaje',
        required=True,
        ondelete='cascade'
    )
    
    reason_id = fields.Many2one(
        'driverpro.pause.reason',
        string='Motivo de Pausa'
    )
    
    start_datetime = fields.Datetime(
        string='Inicio de Pausa',
        required=True,
        default=fields.Datetime.now
    )
    
    end_datetime = fields.Datetime(
        string='Fin de Pausa'
    )
    
    duration = fields.Float(
        string='Duración (Horas)',
        compute='_compute_duration',
        store=True
    )
    
    is_active = fields.Boolean(
        string='Pausa Activa',
        default=True
    )
    
    notes = fields.Text(
        string='Notas'
    )
    
    company_id = fields.Many2one(
        'res.company',
        related='trip_id.company_id',
        store=True
    )

    @api.depends('start_datetime', 'end_datetime')
    def _compute_duration(self):
        """Calcula la duración de la pausa"""
        for pause in self:
            if pause.start_datetime:
                end_time = pause.end_datetime or fields.Datetime.now()
                delta = end_time - pause.start_datetime
                pause.duration = delta.total_seconds() / 3600
            else:
                pause.duration = 0.0

    def action_end(self):
        """Finaliza la pausa"""
        for pause in self:
            if not pause.is_active:
                raise UserError(_('Esta pausa ya ha sido finalizada.'))
            
            pause.write({
                'end_datetime': fields.Datetime.now(),
                'is_active': False
            })


class DriverproPauseReason(models.Model):
    """Catálogo de motivos de pausa"""
    _name = 'driverpro.pause.reason'
    _description = 'Motivo de Pausa'
    _order = 'name'

    name = fields.Char(
        string='Motivo',
        required=True,
        translate=True
    )
    
    code = fields.Char(
        string='Código',
        required=True
    )
    
    active = fields.Boolean(
        string='Activo',
        default=True
    )
    
    description = fields.Text(
        string='Descripción'
    )
    
    company_id = fields.Many2one(
        'res.company',
        string='Compañía',
        default=lambda self: self.env.company
    )

    @api.constrains('code')
    def _check_unique_code(self):
        """Valida que el código sea único por compañía"""
        for reason in self:
            existing = self.search([
                ('code', '=', reason.code),
                ('company_id', '=', reason.company_id.id),
                ('id', '!=', reason.id)
            ])
            if existing:
                raise ValidationError(_('Ya existe un motivo con el código %s en esta compañía.') % reason.code)
