# -*- coding: utf-8 -*-

from odoo import models, fields, api, _
from odoo.exceptions import ValidationError, UserError


class DriverproCard(models.Model):
    """Tarjeta de recarga ligada a vehículo"""
    _name = 'driverpro.card'
    _description = 'Tarjeta Driver Pro'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'name desc'

    name = fields.Char(
        string='Número de Tarjeta',
        required=True,
        copy=False,
        tracking=True,
        help="Número identificador único de la tarjeta"
    )
    
    active = fields.Boolean(
        string='Activo',
        default=True,
        tracking=True
    )
    
    # Relación con vehículo
    vehicle_id = fields.Many2one(
        'fleet.vehicle',
        string='Vehículo Asignado',
        tracking=True,
        help="Vehículo al que está asignada la tarjeta"
    )
    
    # Saldos y créditos
    balance = fields.Float(
        string='Saldo Actual',
        compute='_compute_balance',
        store=True,
        help="Saldo actual de créditos en la tarjeta"
    )
    
    total_recharges = fields.Float(
        string='Total Recargas',
        compute='_compute_totals',
        store=True,
        help="Total de recargas realizadas"
    )
    
    total_consumption = fields.Float(
        string='Total Consumido',
        compute='_compute_totals',
        store=True,
        help="Total de créditos consumidos"
    )
    
    # Relaciones
    recharge_ids = fields.One2many(
        'driverpro.card.recharge',
        'card_id',
        string='Recargas'
    )
    
    movement_ids = fields.One2many(
        'driverpro.card.movement',
        'card_id',
        string='Movimientos'
    )
    
    assignment_ids = fields.One2many(
        'driverpro.card.assignment',
        'card_id',
        string='Historial de Asignaciones'
    )
    
    trip_ids = fields.One2many(
        'driverpro.trip',
        'card_id',
        string='Viajes'
    )
    
    # Contadores
    recharge_count = fields.Integer(
        string='Número de Recargas',
        compute='_compute_counts',
        store=True
    )
    
    trip_count = fields.Integer(
        string='Número de Viajes',
        compute='_compute_counts',
        store=True
    )
    
    # Campos de auditoría
    company_id = fields.Many2one(
        'res.company',
        string='Compañía',
        default=lambda self: self.env.company,
        required=True
    )
    
    create_date = fields.Datetime(
        string='Fecha de Creación',
        readonly=True
    )
    
    notes = fields.Html(
        string='Notas',
        help="Notas adicionales sobre la tarjeta con formato enriquecido"
    )

    @api.depends('movement_ids.amount', 'movement_ids.movement_type')
    def _compute_balance(self):
        """Calcula el saldo actual basado en movimientos"""
        for card in self:
            total_in = sum(card.movement_ids.filtered(lambda m: m.movement_type == 'in').mapped('amount'))
            total_out = sum(card.movement_ids.filtered(lambda m: m.movement_type == 'out').mapped('amount'))
            card.balance = total_in - total_out

    @api.depends('recharge_ids.amount', 'recharge_ids.state', 'trip_ids.consumed_credits')
    def _compute_totals(self):
        """Calcula totales de recargas y consumo"""
        for card in self:
            # Solo sumar recargas confirmadas
            confirmed_recharges = card.recharge_ids.filtered(lambda r: r.state == 'confirmed')
            card.total_recharges = sum(confirmed_recharges.mapped('amount'))
            card.total_consumption = sum(card.trip_ids.filtered(lambda t: t.state in ['active', 'paused', 'done']).mapped('consumed_credits'))

    @api.depends('recharge_ids', 'trip_ids')
    def _compute_counts(self):
        """Calcula contadores para smart buttons"""
        for card in self:
            card.recharge_count = len(card.recharge_ids)
            card.trip_count = len(card.trip_ids)

    @api.constrains('name')
    def _check_unique_name(self):
        """Valida que el número de tarjeta sea único por compañía"""
        for card in self:
            existing = self.search([
                ('name', '=', card.name),
                ('company_id', '=', card.company_id.id),
                ('id', '!=', card.id)
            ])
            if existing:
                raise ValidationError(_('Ya existe una tarjeta con el número %s en esta compañía.') % card.name)

    def action_view_recharges(self):
        """Acción para ver recargas de la tarjeta"""
        return {
            'name': _('Recargas'),
            'type': 'ir.actions.act_window',
            'res_model': 'driverpro.card.recharge',
            'view_mode': 'list,form',
            'domain': [('card_id', '=', self.id)],
            'context': {'default_card_id': self.id}
        }

    def action_view_trips(self):
        """Acción para ver viajes de la tarjeta"""
        return {
            'name': _('Viajes'),
            'type': 'ir.actions.act_window',
            'res_model': 'driverpro.trip',
            'view_mode': 'list,form',
            'domain': [('card_id', '=', self.id)],
            'context': {'default_card_id': self.id}
        }

    def consume_credit(self, amount=1.0, reference=None):
        """Consume créditos de la tarjeta"""
        if self.balance < amount:
            raise UserError(_('Saldo insuficiente en la tarjeta. Saldo actual: %s') % self.balance)
        
        # Crear movimiento de salida
        self.env['driverpro.card.movement'].create({
            'card_id': self.id,
            'movement_type': 'out',
            'amount': amount,
            'reference': reference or _('Consumo de crédito'),
            'movement_date': fields.Datetime.now()
        })
        
        return True


class DriverproCardRecharge(models.Model):
    """Recarga de créditos en tarjeta"""
    _name = 'driverpro.card.recharge'
    _description = 'Recarga de Tarjeta'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'recharge_date desc'

    name = fields.Char(
        string='Referencia',
        required=True,
        copy=False,
        default='Nueva Recarga'
    )
    
    card_id = fields.Many2one(
        'driverpro.card',
        string='Tarjeta',
        required=True
    )
    
    amount = fields.Integer(
        string='Monto',
        required=True,
        help="Cantidad de créditos a recargar"
    )
    
    recharge_date = fields.Datetime(
        string='Fecha de Recarga',
        default=fields.Datetime.now,
        required=True
    )
    
    state = fields.Selection([
        ('draft', 'Borrador'),
        ('confirmed', 'Confirmado'),
        ('cancelled', 'Cancelado')
    ], string='Estado', default='draft')
    
    # Información de facturación
    invoice_number = fields.Char(
        string='Número de Factura'
    )
    
    invoice_date = fields.Date(
        string='Fecha de Factura'
    )
    
    # Campos binarios para documentos directos
    invoice_pdf = fields.Binary(
        string="Factura (PDF)", 
        attachment=True, 
        help="Archivo PDF de la factura oficial"
    )
    invoice_pdf_filename = fields.Char(string="Nombre archivo PDF")

    invoice_xml = fields.Binary(
        string="XML Fiscal", 
        attachment=True, 
        help="Archivo XML del comprobante fiscal"
    )
    invoice_xml_filename = fields.Char(string="Nombre archivo XML")

    payment_receipt = fields.Binary(
        string="Comprobante de Pago", 
        attachment=True, 
        help="Imagen o PDF del comprobante de pago"
    )
    payment_receipt_filename = fields.Char(string="Nombre archivo comprobante")

    # Campo computado para control de edición
    is_readonly = fields.Boolean(
        string='Solo Lectura',
        compute='_compute_is_readonly',
        help="Indica si el registro es de solo lectura"
    )
    
    company_id = fields.Many2one(
        'res.company',
        string='Compañía',
        default=lambda self: self.env.company,
        required=True
    )
    
    notes = fields.Html(
        string='Notas',
        help="Notas adicionales sobre la recarga con formato enriquecido"
    )

    @api.onchange('card_id')
    def _onchange_card_id(self):
        """Genera el nombre automáticamente cuando se selecciona una tarjeta"""
        if self.card_id and self.name == 'Nueva Recarga':
            # Contar recargas existentes para generar secuencia
            count = self.env['driverpro.card.recharge'].search_count([
                ('card_id', '=', self.card_id.id)
            ]) + 1
            self.name = f"REC-{self.card_id.name}-{count:03d}"

    @api.model_create_multi
    def create(self, vals_list):
        """Override create para generar nombre automático y sincronizar adjuntos"""
        for vals in vals_list:
            if vals.get('card_id') and (vals.get('name') == 'Nueva Recarga' or not vals.get('name')):
                card = self.env['driverpro.card'].browse(vals['card_id'])
                count = self.search_count([('card_id', '=', card.id)]) + 1
                vals['name'] = f"REC-{card.name}-{count:03d}"
        
        records = super().create(vals_list)
        records._sync_main_docs_to_chatter()
        return records

    @api.constrains('invoice_pdf', 'invoice_pdf_filename')
    def _check_invoice_pdf(self):
        """Validar que el archivo PDF sea válido"""
        for record in self:
            if record.invoice_pdf and record.invoice_pdf_filename:
                if not record.invoice_pdf_filename.lower().endswith('.pdf'):
                    raise ValidationError(_("La Factura debe ser un archivo .pdf"))

    @api.constrains('invoice_xml', 'invoice_xml_filename')
    def _check_invoice_xml(self):
        """Validar que el archivo XML sea válido"""
        for record in self:
            if record.invoice_xml and record.invoice_xml_filename:
                if not record.invoice_xml_filename.lower().endswith('.xml'):
                    raise ValidationError(_("El XML fiscal debe ser un archivo .xml"))

    @api.constrains('payment_receipt', 'payment_receipt_filename')
    def _check_payment_receipt(self):
        """Validar que el comprobante sea válido"""
        allowed_extensions = ('.png', '.jpg', '.jpeg', '.pdf')
        for record in self:
            if record.payment_receipt and record.payment_receipt_filename:
                filename_lower = record.payment_receipt_filename.lower()
                if not any(filename_lower.endswith(ext) for ext in allowed_extensions):
                    raise ValidationError(_("El comprobante debe ser imagen (png/jpg/jpeg) o pdf"))

    def _compute_is_readonly(self):
        """Computa si el registro es de solo lectura"""
        for record in self:
            record.is_readonly = record.state in ('confirmed', 'cancelled')

    def write(self, vals):
        """Override write para evitar edición de recargas confirmadas/canceladas y sincronizar adjuntos"""
        for record in self:
            if record.state in ('confirmed', 'cancelled'):
                # Solo administradores pueden modificar recargas confirmadas/canceladas
                if not self.env.user.has_group('driverpro.group_driverpro_manager'):
                    raise UserError(_(
                        'Solo los administradores pueden modificar recargas que están %s. '
                        'Contacte a su administrador si necesita realizar cambios.'
                    ) % ('confirmadas' if record.state == 'confirmed' else 'canceladas'))
                
                # Incluso para administradores, permitir solo cambios en campos específicos
                allowed_fields = {'state', 'notes', 'invoice_number', 'invoice_date', 
                                'invoice_pdf', 'invoice_pdf_filename', 'invoice_xml', 'invoice_xml_filename',
                                'payment_receipt', 'payment_receipt_filename'}
                if set(vals.keys()) - allowed_fields:
                    raise UserError(_(
                        'En recargas %s solo se pueden modificar: Estado, Notas y Documentos. '
                        'No se puede cambiar: monto, tarjeta o fecha de recarga.'
                    ) % ('confirmadas' if record.state == 'confirmed' else 'canceladas'))
        
        res = super().write(vals)
        
        # Si cambiaron archivos o nombres, sincronizar
        fields_touched = {'invoice_pdf', 'invoice_pdf_filename',
                          'invoice_xml', 'invoice_xml_filename',
                          'payment_receipt', 'payment_receipt_filename'}
        if fields_touched & set(vals.keys()):
            self._sync_main_docs_to_chatter()
            
        return res

    def unlink(self):
        """Override unlink para evitar eliminación de recargas confirmadas"""
        for record in self:
            if record.state == 'confirmed':
                # Solo administradores pueden eliminar recargas confirmadas
                if not self.env.user.has_group('driverpro.group_driverpro_manager'):
                    raise UserError(_(
                        'Solo los administradores pueden eliminar recargas confirmadas. '
                        'Contacte a su administrador si necesita eliminar esta recarga.'))
                else:
                    # Incluso para administradores, preguntar confirmación
                    raise UserError(_(
                        'Esta recarga está confirmada y ya generó movimientos en la tarjeta. '
                        'Para eliminarla, primero debe cancelarla y luego podrá eliminarla si es necesario.'))
            elif record.state == 'cancelled':
                # Para recargas canceladas, solo administradores pueden eliminar
                if not self.env.user.has_group('driverpro.group_driverpro_manager'):
                    raise UserError(_(
                        'Solo los administradores pueden eliminar recargas canceladas. '
                        'Contacte a su administrador si necesita eliminar esta recarga.'))
        return super().unlink()

    def action_confirm(self):
        """Confirma la recarga y crea el movimiento"""
        for recharge in self:
            if recharge.state != 'draft':
                raise UserError(_('Solo se pueden confirmar recargas en borrador.'))
            
            # Crear movimiento de entrada
            self.env['driverpro.card.movement'].create({
                'card_id': recharge.card_id.id,
                'movement_type': 'in',
                'amount': recharge.amount,
                'reference': _('Recarga: %s') % recharge.name,
                'movement_date': recharge.recharge_date,
                'recharge_id': recharge.id
            })
            
            recharge.state = 'confirmed'

    def action_cancel(self):
        """Cancela la recarga"""
        for recharge in self:
            if recharge.state == 'confirmed':
                # Buscar y eliminar el movimiento relacionado
                movement = self.env['driverpro.card.movement'].search([
                    ('recharge_id', '=', recharge.id)
                ])
                if movement:
                    movement.unlink()
            
            recharge.state = 'cancelled'

    def _sync_main_docs_to_chatter(self):
        """Sincroniza documentos principales al chatter como adjuntos normales"""
        for rec in self:
            pairs = [
                ('invoice_pdf', 'invoice_pdf_filename'),
                ('invoice_xml', 'invoice_xml_filename'),
                ('payment_receipt', 'payment_receipt_filename'),
            ]
            for data_field, name_field in pairs:
                data = getattr(rec, data_field)
                fname = (getattr(rec, name_field) or '').strip()
                if not (data and fname):
                    continue
                    
                # Verificar si ya existe un adjunto para este archivo en el chatter
                # Buscamos adjuntos que tengan el mismo nombre y sean del campo binario específico
                existing_attachment = rec.env['ir.attachment'].search([
                    ('res_model', '=', rec._name),
                    ('res_id', '=', rec.id),
                    ('res_field', '=', data_field),
                ], limit=1)
                
                if existing_attachment:
                    # Si existe, verificamos si ya está en el chatter
                    existing_message = rec.env['mail.message'].search([
                        ('res_id', '=', rec.id),
                        ('model', '=', rec._name),
                        ('attachment_ids', 'in', existing_attachment.ids),
                    ], limit=1)
                    
                    if not existing_message:
                        # Si no está en el chatter, lo posteamos
                        rec.message_post(
                            body=_("Documento principal agregado: %s") % fname,
                            attachment_ids=[existing_attachment.id],
                            subtype_xmlid="mail.mt_note",
                        )


class DriverproCardMovement(models.Model):
    """Movimientos de la tarjeta (libro mayor)"""
    _name = 'driverpro.card.movement'
    _description = 'Movimiento de Tarjeta'
    _order = 'movement_date desc'

    card_id = fields.Many2one(
        'driverpro.card',
        string='Tarjeta',
        required=True,
        ondelete='cascade'
    )
    
    movement_type = fields.Selection([
        ('in', 'Entrada'),
        ('out', 'Salida')
    ], string='Tipo de Movimiento', required=True)
    
    amount = fields.Float(
        string='Monto',
        required=True
    )
    
    movement_date = fields.Datetime(
        string='Fecha de Movimiento',
        default=fields.Datetime.now,
        required=True
    )
    
    reference = fields.Char(
        string='Referencia',
        required=True
    )
    
    # Relaciones opcionales
    recharge_id = fields.Many2one(
        'driverpro.card.recharge',
        string='Recarga Relacionada'
    )
    
    trip_id = fields.Many2one(
        'driverpro.trip',
        string='Viaje Relacionado'
    )
    
    company_id = fields.Many2one(
        'res.company',
        related='card_id.company_id',
        store=True
    )


class DriverproCardAssignment(models.Model):
    """Historial de asignación tarjeta-vehículo"""
    _name = 'driverpro.card.assignment'
    _description = 'Asignación de Tarjeta a Vehículo'
    _order = 'date_start desc'

    card_id = fields.Many2one(
        'driverpro.card',
        string='Tarjeta',
        required=True,
        ondelete='cascade'
    )
    
    vehicle_id = fields.Many2one(
        'fleet.vehicle',
        string='Vehículo',
        required=True
    )
    
    date_start = fields.Datetime(
        string='Fecha Inicio',
        default=fields.Datetime.now,
        required=True
    )
    
    date_end = fields.Datetime(
        string='Fecha Fin'
    )
    
    active = fields.Boolean(
        string='Activo',
        default=True
    )
    
    notes = fields.Text(
        string='Notas'
    )
    
    company_id = fields.Many2one(
        'res.company',
        related='card_id.company_id',
        store=True
    )

    @api.model
    def create(self, vals):
        """Al crear una nueva asignación, finalizar la anterior"""
        if vals.get('card_id'):
            # Finalizar asignaciones activas de la misma tarjeta
            active_assignments = self.search([
                ('card_id', '=', vals['card_id']),
                ('active', '=', True)
            ])
            active_assignments.write({
                'active': False,
                'date_end': fields.Datetime.now()
            })
        
        return super().create(vals)
