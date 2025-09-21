# -*- coding: utf-8 -*-

from odoo import http
from odoo.http import request
import json
import logging

_logger = logging.getLogger(__name__)


class DriverProPushAPI(http.Controller):
    """Controlador para manejar suscripciones Web Push"""

    @http.route(['/driverpro/api/push/subscribe', '/web/driverpro/push/subscribe'], 
                type='json', auth='user', methods=['POST'], csrf=False)
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

    @http.route(['/driverpro/api/push/unsubscribe', '/web/driverpro/push/unsubscribe'], 
                type='json', auth='user', methods=['POST'], csrf=False)
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

    @http.route(['/driverpro/api/push/status', '/web/driverpro/push/status'], 
                type='json', auth='user', methods=['POST'], csrf=False)
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

    @http.route(['/driverpro/api/push/test', '/web/driverpro/push/test'], 
                type='json', auth='user', methods=['POST'], csrf=False)
    def push_test(self, **kw):
        """Enviar notificación de prueba"""
        try:
            data = request.jsonrequest or {}
            notification_type = data.get('type', 'test')
            
            # Importar utilidades push
            from ..utils.push import send_web_push
            
            # Configurar payload según el tipo de prueba
            test_payloads = {
                'test': {
                    "type": "test",
                    "title": "Driver Pro - Prueba",
                    "body": "Esta es una notificación de prueba desde el servidor.",
                    "timestamp": request.env['ir.fields'].datetime.now().isoformat(),
                },
                'trip_assigned': {
                    "type": "assigned_trip",
                    "title": "Nuevo viaje asignado",
                    "body": "Se te ha asignado un nuevo viaje de prueba.",
                    "trip_id": 999,
                    "timestamp": request.env['ir.fields'].datetime.now().isoformat(),
                },
                'vehicle_assigned': {
                    "type": "vehicle_assigned",
                    "title": "Vehículo Asignado",
                    "body": "Se te ha asignado un vehículo de prueba.",
                    "vehicle_id": 999,
                    "timestamp": request.env['ir.fields'].datetime.now().isoformat(),
                },
                'trip_reminder': {
                    "type": "scheduled_trip_reminder",
                    "title": "Recordatorio de viaje",
                    "body": "Tu viaje programado de prueba está próximo a comenzar.",
                    "trip_id": 999,
                    "timestamp": request.env['ir.fields'].datetime.now().isoformat(),
                },
                'empty_trip_alert': {
                    "type": "empty_trip_15",
                    "title": "Recordatorio - 15 minutos",
                    "body": "Te quedan 15 minutos para terminar la búsqueda de prueba.",
                    "trip_id": 999,
                    "timestamp": request.env['ir.fields'].datetime.now().isoformat(),
                }
            }
            
            payload = test_payloads.get(notification_type, test_payloads['test'])
            
            # Enviar notificación push
            sent_count = send_web_push(request.env, request.env.user, payload)
            
            if sent_count > 0:
                return {
                    'success': True,
                    'message': f'Notificación de prueba enviada exitosamente a {sent_count} dispositivo(s)',
                    'type': notification_type,
                    'payload': payload
                }
            else:
                return {
                    'success': False,
                    'error': 'No se pudo enviar la notificación. Verifica que tengas suscripciones activas.'
                }
                
        except Exception as e:
            _logger.error(f"Error en push_test: {str(e)}")
            return {
                'success': False, 
                'error': f'Error interno: {str(e)}'
            }
