# -*- coding: utf-8 -*-

from odoo import http
from odoo.http import request
import json
import logging

_logger = logging.getLogger(__name__)


class DriverProNotifications(http.Controller):

    @http.route('/driverpro/api/me', type='json', auth='user', methods=['POST'], csrf=False)
    def get_user_info(self):
        """Devuelve información del usuario para suscripción al bus"""
        try:
            user = request.env.user
            partner = user.partner_id
            
            return {
                'success': True,
                'data': {
                    'db': request.env.cr.dbname,
                    'uid': user.id,
                    'partner_id': partner.id,
                    'name': user.name,
                    'login': user.login,
                }
            }
            
        except Exception as e:
            _logger.error(f"Error in get_user_info: {str(e)}")
            return {
                'success': False,
                'error': 'Error interno del servidor',
                'message': str(e),
                'code': 500
            }

    @http.route('/driverpro/api/check-notifications', type='http', auth='user', methods=['POST'], csrf=False)
    def check_notifications(self):
        """Endpoint alternativo para verificar notificaciones cuando longpolling no está disponible"""
        try:
            # Por ahora, solo retornamos array vacío para que el test del bus funcione
            # En el futuro se puede implementar un sistema de polling corto
            response_data = {
                'jsonrpc': '2.0',
                'result': [],  # Sin notificaciones pendientes
                'id': None
            }
            
            return request.make_response(
                json.dumps(response_data),
                headers=[
                    ('Content-Type', 'application/json'),
                    ('Access-Control-Allow-Origin', '*'),
                    ('Access-Control-Allow-Methods', 'POST, GET, OPTIONS'),
                    ('Access-Control-Allow-Headers', 'Content-Type')
                ]
            )
            
        except Exception as e:
            _logger.error(f"Error in check_notifications: {str(e)}")
            error_response = {
                'jsonrpc': '2.0',
                'error': {
                    'code': 500,
                    'message': 'Error interno del servidor',
                    'data': str(e)
                },
                'id': None
            }
            
            return request.make_response(
                json.dumps(error_response),
                headers=[
                    ('Content-Type', 'application/json'),
                    ('Access-Control-Allow-Origin', '*')
                ],
                status=500
            )

    @http.route('/driverpro/api/notify', type='http', auth='user', methods=['POST'], csrf=False)
    def send_notification(self):
        """Envía una notificación al partner actual (para pruebas)"""
        try:
            # Obtener datos del request
            if request.httprequest.content_type and 'application/json' in request.httprequest.content_type:
                payload = json.loads(request.httprequest.data.decode('utf-8'))
            else:
                payload = dict(request.httprequest.form)

            user = request.env.user
            partner = user.partner_id
            
            # Mensaje por defecto
            message = payload or {
                "type": "info",
                "title": "Driver Pro",
                "body": "Nueva notificación",
                "timestamp": request.env['ir.fields'].datetime.now().isoformat()
            }
            
            # Enviar al bus
            request.env['bus.bus']._sendone(partner, 'driverpro.notify', message)
            
            data = {
                'success': True,
                'message': 'Notificación enviada',
                'data': message
            }
            
            response = request.make_response(
                json.dumps(data, default=str, ensure_ascii=False),
                headers=[('Content-Type', 'application/json; charset=utf-8')]
            )
            return response
            
        except Exception as e:
            _logger.error(f"Error in send_notification: {str(e)}")
            data = {
                'success': False,
                'error': 'Error interno del servidor',
                'message': str(e),
                'code': 500
            }
            response = request.make_response(
                json.dumps(data, default=str, ensure_ascii=False),
                headers=[('Content-Type', 'application/json; charset=utf-8')]
            )
            response.status_code = 500
            return response

    def _notify_user(self, partner, notification_type, title, body, extra_data=None):
        """Helper para enviar notificaciones desde otros módulos"""
        message = {
            "type": notification_type,
            "title": title,
            "body": body,
            "timestamp": request.env['ir.fields'].datetime.now().isoformat()
        }
        
        if extra_data:
            message.update(extra_data)
            
        request.env['bus.bus']._sendone(partner, 'driverpro.notify', message)
        return message

    @http.route('/driverpro/api/simulate-events', type='http', auth='user', methods=['POST'], csrf=False)
    def simulate_system_events(self):
        """Simula eventos del sistema para testing"""
        try:
            user = request.env.user
            partner = user.partner_id
            
            # Simular diferentes tipos de eventos
            events = [
                {
                    "type": "warning",
                    "title": "⏰ Viaje Próximo",
                    "body": f"Tu viaje programado comenzará en 15 minutos. Prepárate para salir."
                },
                {
                    "type": "success", 
                    "title": "🚗 Nuevo Viaje Asignado",
                    "body": f"Se te ha asignado un nuevo viaje. Revisa los detalles en tu panel."
                },
                {
                    "type": "warning",
                    "title": "⏳ Búsqueda por Vencer", 
                    "body": f"Tu búsqueda de cliente está por vencer en 5 minutos. ¿Necesitas más tiempo?"
                },
                {
                    "type": "info",
                    "title": "📱 Actualización Disponible",
                    "body": f"Nueva versión de la app disponible con mejoras y correcciones."
                },
                {
                    "type": "error",
                    "title": "🚨 Problema Técnico",
                    "body": f"Se detectó un problema menor. El equipo técnico está trabajando en ello."
                }
            ]
            
            # Enviar cada evento con un pequeño delay
            import threading
            import time
            
            def send_delayed_notifications():
                for i, event in enumerate(events):
                    time.sleep(i * 2)  # 2 segundos entre notificaciones
                    event["timestamp"] = request.env['ir.fields'].datetime.now().isoformat()
                    request.env['bus.bus']._sendone(partner, 'driverpro.notify', event)
                    _logger.info(f"Sent simulated event: {event['title']}")
            
            # Ejecutar en hilo separado para no bloquear la respuesta
            thread = threading.Thread(target=send_delayed_notifications)
            thread.daemon = True
            thread.start()
            
            data = {
                'success': True,
                'message': 'Simulación de eventos iniciada',
                'events_count': len(events)
            }
            
            response = request.make_response(
                json.dumps(data, default=str, ensure_ascii=False),
                headers=[('Content-Type', 'application/json; charset=utf-8')]
            )
            return response
            
        except Exception as e:
            _logger.error(f"Error in simulate_system_events: {str(e)}")
            data = {
                'success': False,
                'error': 'Error interno del servidor',
                'message': str(e),
                'code': 500
            }
            response = request.make_response(
                json.dumps(data, default=str, ensure_ascii=False),
                headers=[('Content-Type', 'application/json; charset=utf-8')]
            )
            response.status_code = 500
            return response
