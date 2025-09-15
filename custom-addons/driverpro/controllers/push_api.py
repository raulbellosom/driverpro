# -*- coding: utf-8 -*-

from odoo import http
from odoo.http import request
import json
import logging

_logger = logging.getLogger(__name__)


class DriverProPushAPI(http.Controller):
    """Controlador para manejar suscripciones Web Push"""

    @http.route('/driverpro/api/push/subscribe', type='json', auth='user', methods=['POST', 'GET'], csrf=False)
    def push_subscribe(self, **kw):
        """Suscribir un dispositivo a notificaciones push"""
        try:
            data = request.jsonrequest or {}
            sub = data.get('subscription')
            
            if not sub or not sub.get('endpoint'):
                return {
                    'success': False, 
                    'error': 'Suscripción inválida: se requiere endpoint'
                }

            # Crear o actualizar suscripción
            rec = request.env['driverpro.push_subscription'].sudo().upsert_subscription(
                request.env.user, {
                    'endpoint': sub.get('endpoint'),
                    'keys': sub.get('keys', {}),
                    'user_agent': request.httprequest.headers.get('User-Agent'),
                    'app': data.get('app') or 'driver'
                }
            )
            
            return {
                'success': True, 
                'id': rec.id,
                'message': 'Suscripción registrada exitosamente'
            }
            
        except Exception as e:
            _logger.error(f"Error en push_subscribe: {str(e)}")
            return {
                'success': False, 
                'error': f'Error interno: {str(e)}'
            }

    @http.route('/driverpro/api/push/unsubscribe', type='json', auth='user', methods=['POST', 'GET'], csrf=False)
    def push_unsubscribe(self, **kw):
        """Desuscribir un dispositivo de notificaciones push"""
        try:
            data = request.jsonrequest or {}
            endpoint = data.get('endpoint')
            
            if not endpoint:
                return {
                    'success': False, 
                    'error': 'Se requiere endpoint para desuscribir'
                }

            # Buscar y deshabilitar suscripción
            rec = request.env['driverpro.push_subscription'].sudo().search([
                ('endpoint', '=', endpoint)
            ], limit=1)
            
            if rec:
                rec.sudo().write({'enabled': False})
                message = 'Suscripción deshabilitada exitosamente'
            else:
                message = 'No se encontró la suscripción'
            
            return {
                'success': True,
                'message': message
            }
            
        except Exception as e:
            _logger.error(f"Error en push_unsubscribe: {str(e)}")
            return {
                'success': False, 
                'error': f'Error interno: {str(e)}'
            }

    @http.route('/driverpro/api/push/status', type='json', auth='user', methods=['POST', 'GET'], csrf=False)
    def push_status(self, **kw):
        """Obtener estado de suscripciones push del usuario"""
        try:
            user = request.env.user
            subscriptions = request.env['driverpro.push_subscription'].sudo().search([
                ('user_id', '=', user.id),
                ('enabled', '=', True)
            ])
            
            data = []
            for sub in subscriptions:
                data.append({
                    'id': sub.id,
                    'app': sub.app,
                    'user_agent': sub.user_agent,
                    'last_seen': sub.last_seen,
                    'created_at': sub.created_at
                })
            
            return {
                'success': True,
                'subscriptions': data,
                'count': len(data)
            }
            
        except Exception as e:
            _logger.error(f"Error en push_status: {str(e)}")
            return {
                'success': False, 
                'error': f'Error interno: {str(e)}'
            }
