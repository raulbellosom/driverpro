# -*- coding: utf-8 -*-

from odoo import models, fields, api, _
from odoo.exceptions import ValidationError, UserError
from datetime import datetime, timedelta


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
    
    comments = fields.Html(
        string='Comentarios',
        help="Comentarios y notas del viaje con formato enriquecido"
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
    
    currency_id = fields.Many2one(
        'res.currency',
        string='Moneda',
        default=lambda self: self.env.company.currency_id
    )
    
    amount = fields.Monetary(
        string='Monto',
        currency_field='currency_id'
    )
    
    payment_reference = fields.Char(
        string='Referencia de Pago'
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

    @api.model
    def create(self, vals):
        """Asignar secuencia al crear"""
        if not vals.get('name') or vals.get('name') in ('/', _('Nuevo')):
            vals['name'] = self.env['ir.sequence'].next_by_code('driverpro.trip') or 'TRIP-001'
        return super().create(vals)

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

    @api.constrains('driver_id', 'vehicle_id')
    def _check_driver_vehicle_consistency(self):
        """Valida que el chofer y vehículo sean consistentes con Fleet"""
        for trip in self:
            # Validar que el vehículo esté asignado
            if not trip.vehicle_id:
                raise ValidationError(
                    _('Debe seleccionar un vehículo para el viaje. '
                      'Verifique que el chofer %s tenga un vehículo asignado en Fleet.') % 
                    (trip.driver_id.name if trip.driver_id else 'seleccionado')
                )
            
            if trip.driver_id and trip.vehicle_id:
                # El driver_id en fleet.vehicle es un res.partner, no res.users
                expected_partner = trip.driver_id.partner_id
                if not expected_partner:
                    raise ValidationError(
                        _('El usuario %s no tiene un contacto asociado. '
                          'Verifique la configuración del usuario.') % trip.driver_id.name
                    )
                
                if trip.vehicle_id.driver_id != expected_partner:
                    raise ValidationError(
                        _('El vehículo %s no está asignado al chofer %s en el módulo de Flota. '
                          'Por favor, asigne el vehículo al contacto %s en Fleet o seleccione el vehículo correcto.') % 
                        (trip.vehicle_id.name, trip.driver_id.name, expected_partner.name)
                    )

    @api.constrains('state', 'start_datetime', 'end_datetime')
    def _check_datetime_consistency(self):
        """Valida consistencia de fechas"""
        for trip in self:
            if trip.start_datetime and trip.end_datetime:
                if trip.start_datetime >= trip.end_datetime:
                    raise ValidationError(_('La fecha de fin debe ser posterior a la fecha de inicio.'))

    def action_start(self):
        """Inicia el viaje"""
        for trip in self:
            if trip.state != 'draft':
                raise UserError(_('Solo se pueden iniciar viajes en borrador.'))
            
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
            
            # Validar que la tarjeta tiene créditos suficientes
            if trip.card_id.balance <= 0:
                raise UserError(_('La tarjeta %s no tiene créditos suficientes para iniciar el viaje.') % trip.card_id.name)
            
            # Consumir crédito de la tarjeta
            try:
                trip.card_id.consume_credit(
                    amount=1.0,
                    reference=_('Viaje: %s') % trip.name
                )
                trip.consumed_credits = 1.0
            except UserError as e:
                raise UserError(_('Error al consumir crédito: %s') % str(e))
            
            # Actualizar estado y tiempo
            trip.write({
                'state': 'active',
                'start_datetime': fields.Datetime.now()
            })
            
            trip.message_post(body=_('Viaje iniciado. Crédito consumido: %s') % trip.consumed_credits)

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

    def action_cancel(self, refund_credit=False):
        """Cancela el viaje"""
        for trip in self:
            if trip.state == 'done':
                raise UserError(_('No se pueden cancelar viajes terminados.'))
            
            # Reembolsar crédito si se solicita y el viaje había consumido
            if refund_credit and trip.consumed_credits > 0 and trip.card_id:
                self.env['driverpro.card.movement'].create({
                    'card_id': trip.card_id.id,
                    'movement_type': 'in',
                    'amount': trip.consumed_credits,
                    'reference': _('Reembolso por cancelación: %s') % trip.name,
                    'movement_date': fields.Datetime.now(),
                    'trip_id': trip.id
                })
            
            # Finalizar pausas activas
            active_pauses = trip.pause_ids.filtered('is_active')
            for pause in active_pauses:
                pause.action_end()
            
            trip.state = 'cancelled'
            trip.message_post(body=_('Viaje cancelado. Reembolso: %s') % ('Sí' if refund_credit else 'No'))

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
