# -*- coding: utf-8 -*-
from odoo import models, fields, api, _
from odoo.exceptions import ValidationError
import logging

_logger = logging.getLogger(__name__)

class DriverProPushSubscription(models.Model):
    _name = 'driverpro.push_subscription'
    _description = 'Suscripciones Web Push por dispositivo'
    _rec_name = 'endpoint'

    user_id = fields.Many2one('res.users', required=True, index=True, ondelete='cascade')
    endpoint = fields.Char(required=True, index=True)
    p256dh = fields.Char(required=True)
    auth = fields.Char(required=True)
    user_agent = fields.Char()
    enabled = fields.Boolean(default=True)
    last_seen = fields.Datetime()
    app = fields.Selection([
        ('driver', 'DriverPro-Driver'), 
        ('admin', 'DriverPro-Admin')
    ], default='driver', required=True)
    created_at = fields.Datetime(default=fields.Datetime.now)

    _sql_constraints = [
        ('endpoint_uniq', 'unique(endpoint)', 'Esta suscripción ya existe'),
    ]

    @api.model
    def upsert_subscription(self, user, payload):
        """Crear o actualizar una suscripción push para un usuario"""
        if not payload.get('endpoint'):
            raise ValidationError("Endpoint requerido")
        
        keys = payload.get('keys', {})
        if not keys.get('p256dh') or not keys.get('auth'):
            raise ValidationError("Claves p256dh y auth requeridas")

        vals = {
            'user_id': user.id,
            'endpoint': payload.get('endpoint'),
            'p256dh': keys.get('p256dh'),
            'auth': keys.get('auth'),
            'user_agent': payload.get('user_agent'),
            'enabled': True,
            'last_seen': fields.Datetime.now(),
            'app': payload.get('app') or 'driver',
        }
        
        # Buscar suscripción existente
        rec = self.search([('endpoint', '=', vals['endpoint'])], limit=1)
        if rec:
            rec.write(vals)
            _logger.info(f"Suscripción push actualizada para usuario {user.login}, endpoint: {vals['endpoint'][:50]}...")
            return rec
        else:
            rec = self.create(vals)
            _logger.info(f"Nueva suscripción push creada para usuario {user.login}, endpoint: {vals['endpoint'][:50]}...")
            return rec

    @api.model
    def get_active_subscriptions(self, user_id=None, app=None):
        """Obtener suscripciones activas"""
        domain = [('enabled', '=', True)]
        if user_id:
            domain.append(('user_id', '=', user_id))
        if app:
            domain.append(('app', '=', app))
        return self.search(domain)

    def mark_as_failed(self):
        """Marcar suscripción como fallida (deshabilitada)"""
        self.ensure_one()
        self.write({'enabled': False})
        _logger.warning(f"Suscripción push marcada como fallida: {self.endpoint[:50]}...")

    def test_subscription(self):
        """Enviar notificación de prueba"""
        self.ensure_one()
        from .utils.push import send_web_push
        
        payload = {
            "type": "test",
            "title": "Driver Pro - Prueba",
            "body": "Esta es una notificación de prueba.",
            "timestamp": fields.Datetime.now().isoformat(),
        }
        
        try:
            result = send_web_push(self.env, self.user_id, payload)
            if result > 0:
                self.message_post(body=_('✅ Notificación de prueba enviada exitosamente'))
            else:
                self.message_post(body=_('❌ No se pudo enviar la notificación de prueba'))
        except Exception as e:
            self.message_post(body=_('❌ Error enviando notificación de prueba: %s') % str(e))
