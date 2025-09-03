# -*- coding: utf-8 -*-

import json
import logging
from datetime import datetime

from odoo import http, _
from odoo.http import request
from odoo.exceptions import ValidationError, UserError, AccessError

_logger = logging.getLogger(__name__)


class DriverproAPIController(http.Controller):
    """API Controller para el cliente de choferes"""

    def _authenticate_driver(self):
        """Valida que el usuario sea un chofer autenticado"""
        if not request.env.user or request.env.user._is_public():
            return {'error': 'Usuario no autenticado', 'code': 401}
        
        # Verificar que el usuario pertenezca al grupo de choferes
        if not request.env.user.has_group('driverpro.group_portal_driver'):
            return {'error': 'Acceso denegado - Usuario no es chofer', 'code': 403}
        
        return {'success': True, 'user_id': request.env.user.id}

    def _json_response(self, data, status=200):
        """Retorna respuesta JSON"""
        response = request.make_response(
            json.dumps(data, default=str, ensure_ascii=False),
            headers=[('Content-Type', 'application/json; charset=utf-8')]
        )
        response.status_code = status
        return response

    @http.route('/driverpro/api/me/assignment', type='http', auth='user', methods=['GET'], csrf=False)
    def get_current_assignment(self):
        """Obtiene la asignación actual del chofer"""
        try:
            auth_result = self._authenticate_driver()
            if 'error' in auth_result:
                return self._json_response(auth_result, auth_result['code'])

            user_id = auth_result['user_id']
            
            # Buscar asignación activa
            assignment = request.env['driverpro.assignment'].search([
                ('driver_id', '=', user_id),
                ('state', '=', 'active')
            ], limit=1)

            if not assignment:
                return self._json_response({
                    'error': 'No hay asignación activa para este chofer',
                    'code': 404
                }, 404)

            # Construir respuesta
            data = {
                'assignment_id': assignment.id,
                'driver': {
                    'id': assignment.driver_id.id,
                    'name': assignment.driver_id.name,
                    'email': assignment.driver_id.email
                },
                'vehicle': {
                    'id': assignment.vehicle_id.id,
                    'name': assignment.vehicle_id.name,
                    'license_plate': assignment.vehicle_id.license_plate,
                    'model': assignment.vehicle_id.model_id.name if assignment.vehicle_id.model_id else None
                },
                'card': {
                    'id': assignment.card_id.id,
                    'name': assignment.card_id.name,
                    'balance': assignment.card_id.balance
                } if assignment.card_id else None,
                'validity': {
                    'start': assignment.date_start.isoformat() if assignment.date_start else None,
                    'end': assignment.date_end.isoformat() if assignment.date_end else None
                }
            }

            return self._json_response({'success': True, 'data': data})

        except Exception as e:
            _logger.error(f"Error en get_current_assignment: {str(e)}")
            return self._json_response({
                'error': 'Error interno del servidor',
                'message': str(e),
                'code': 500
            }, 500)

    @http.route('/driverpro/api/trips', type='http', auth='user', methods=['GET'], csrf=False)
    def get_trips(self, state=None, limit=None, offset=None):
        """Obtiene los viajes del chofer"""
        try:
            auth_result = self._authenticate_driver()
            if 'error' in auth_result:
                return self._json_response(auth_result, auth_result['code'])

            user_id = auth_result['user_id']

            # Construir dominio
            domain = [('driver_id', '=', user_id)]
            if state:
                domain.append(('state', '=', state))

            # Convertir parámetros
            try:
                limit = int(limit) if limit else 50
                offset = int(offset) if offset else 0
            except ValueError:
                return self._json_response({
                    'error': 'Parámetros limit/offset deben ser números enteros',
                    'code': 400
                }, 400)

            # Buscar viajes
            trips = request.env['driverpro.trip'].search(
                domain, 
                limit=limit, 
                offset=offset, 
                order='create_date desc'
            )

            # Construir respuesta
            trips_data = []
            for trip in trips:
                trip_data = {
                    'id': trip.id,
                    'name': trip.name,
                    'state': trip.state,
                    'origin': trip.origin,
                    'destination': trip.destination,
                    'passenger_count': trip.passenger_count,
                    'passenger_reference': trip.passenger_reference,
                    'start_datetime': trip.start_datetime.isoformat() if trip.start_datetime else None,
                    'end_datetime': trip.end_datetime.isoformat() if trip.end_datetime else None,
                    'duration': trip.duration,
                    'pause_duration': trip.pause_duration,
                    'effective_duration': trip.effective_duration,
                    'consumed_credits': trip.consumed_credits,
                    'amount': trip.amount,
                    'currency': trip.currency_id.name if trip.currency_id else None,
                    'payment_method': trip.payment_method,
                    'payment_reference': trip.payment_reference,
                    'is_paused': trip.is_paused,
                    'pause_count': trip.pause_count,
                    'comments': trip.comments,
                    'vehicle': {
                        'id': trip.vehicle_id.id,
                        'name': trip.vehicle_id.name,
                        'license_plate': trip.vehicle_id.license_plate
                    },
                    'card': {
                        'id': trip.card_id.id,
                        'name': trip.card_id.name
                    } if trip.card_id else None
                }
                trips_data.append(trip_data)

            return self._json_response({
                'success': True,
                'data': trips_data,
                'count': len(trips_data),
                'total': request.env['driverpro.trip'].search_count(domain)
            })

        except Exception as e:
            _logger.error(f"Error en get_trips: {str(e)}")
            return self._json_response({
                'error': 'Error interno del servidor',
                'message': str(e),
                'code': 500
            }, 500)

    @http.route('/driverpro/api/trips/create', type='json', auth='user', methods=['POST'], csrf=False)
    def create_trip(self, **kwargs):
        """Crea un nuevo viaje"""
        try:
            auth_result = self._authenticate_driver()
            if 'error' in auth_result:
                return auth_result

            user_id = auth_result['user_id']

            # Validar campos requeridos
            required_fields = ['origin', 'destination']
            for field in required_fields:
                if not kwargs.get(field):
                    return {
                        'error': f'Campo requerido: {field}',
                        'code': 400
                    }

            # Obtener asignación activa
            assignment = request.env['driverpro.assignment'].search([
                ('driver_id', '=', user_id),
                ('state', '=', 'active')
            ], limit=1)

            if not assignment:
                return {
                    'error': 'No hay asignación activa para crear viajes',
                    'code': 404
                }

            # Crear viaje
            trip_vals = {
                'driver_id': user_id,
                'vehicle_id': assignment.vehicle_id.id,
                'card_id': assignment.card_id.id if assignment.card_id else False,
                'origin': kwargs.get('origin'),
                'destination': kwargs.get('destination'),
                'passenger_count': kwargs.get('passenger_count', 1),
                'passenger_reference': kwargs.get('passenger_reference'),
                'comments': kwargs.get('comments'),
                'payment_method': kwargs.get('payment_method'),
                'amount': kwargs.get('amount', 0.0),
                'payment_reference': kwargs.get('payment_reference')
            }

            trip = request.env['driverpro.trip'].create(trip_vals)

            return {
                'success': True,
                'data': {
                    'trip_id': trip.id,
                    'name': trip.name,
                    'state': trip.state
                }
            }

        except ValidationError as e:
            return {
                'error': 'Error de validación',
                'message': str(e),
                'code': 400
            }
        except Exception as e:
            _logger.error(f"Error en create_trip: {str(e)}")
            return {
                'error': 'Error interno del servidor',
                'message': str(e),
                'code': 500
            }

    @http.route('/driverpro/api/trips/<int:trip_id>/start', type='json', auth='user', methods=['POST'], csrf=False)
    def start_trip(self, trip_id, **kwargs):
        """Inicia un viaje"""
        return self._trip_action(trip_id, 'action_start', **kwargs)

    @http.route('/driverpro/api/trips/<int:trip_id>/pause', type='json', auth='user', methods=['POST'], csrf=False)
    def pause_trip(self, trip_id, **kwargs):
        """Pausa un viaje"""
        return self._trip_action(trip_id, 'action_pause', **kwargs)

    @http.route('/driverpro/api/trips/<int:trip_id>/resume', type='json', auth='user', methods=['POST'], csrf=False)
    def resume_trip(self, trip_id, **kwargs):
        """Reanuda un viaje"""
        return self._trip_action(trip_id, 'action_resume', **kwargs)

    @http.route('/driverpro/api/trips/<int:trip_id>/done', type='json', auth='user', methods=['POST'], csrf=False)
    def finish_trip(self, trip_id, **kwargs):
        """Finaliza un viaje"""
        return self._trip_action(trip_id, 'action_done', **kwargs)

    @http.route('/driverpro/api/trips/<int:trip_id>/cancel', type='json', auth='user', methods=['POST'], csrf=False)
    def cancel_trip(self, trip_id, **kwargs):
        """Cancela un viaje"""
        return self._trip_action(trip_id, 'action_cancel', **kwargs)

    def _trip_action(self, trip_id, action, **kwargs):
        """Ejecuta una acción en un viaje"""
        try:
            auth_result = self._authenticate_driver()
            if 'error' in auth_result:
                return auth_result

            user_id = auth_result['user_id']

            # Buscar el viaje
            trip = request.env['driverpro.trip'].search([
                ('id', '=', trip_id),
                ('driver_id', '=', user_id)
            ])

            if not trip:
                return {
                    'error': 'Viaje no encontrado o sin permisos',
                    'code': 404
                }

            # Ejecutar acción
            if action == 'action_start':
                trip.action_start()
            elif action == 'action_pause':
                reason_id = kwargs.get('reason_id')
                notes = kwargs.get('notes')
                trip.action_pause(reason_id=reason_id, notes=notes)
            elif action == 'action_resume':
                trip.action_resume()
            elif action == 'action_done':
                trip.action_done()
            elif action == 'action_cancel':
                refund_credit = kwargs.get('refund_credit', False)
                trip.action_cancel(refund_credit=refund_credit)
            else:
                return {
                    'error': f'Acción no válida: {action}',
                    'code': 400
                }

            return {
                'success': True,
                'data': {
                    'trip_id': trip.id,
                    'name': trip.name,
                    'state': trip.state,
                    'message': f'Acción {action} ejecutada exitosamente'
                }
            }

        except UserError as e:
            return {
                'error': 'Error de usuario',
                'message': str(e),
                'code': 400
            }
        except ValidationError as e:
            return {
                'error': 'Error de validación',
                'message': str(e),
                'code': 400
            }
        except Exception as e:
            _logger.error(f"Error en _trip_action ({action}): {str(e)}")
            return {
                'error': 'Error interno del servidor',
                'message': str(e),
                'code': 500
            }

    @http.route('/driverpro/api/pause-reasons', type='http', auth='user', methods=['GET'], csrf=False)
    def get_pause_reasons(self):
        """Obtiene los motivos de pausa disponibles"""
        try:
            auth_result = self._authenticate_driver()
            if 'error' in auth_result:
                return self._json_response(auth_result, auth_result['code'])

            # Buscar motivos activos
            reasons = request.env['driverpro.pause.reason'].search([
                ('active', '=', True)
            ])

            reasons_data = []
            for reason in reasons:
                reasons_data.append({
                    'id': reason.id,
                    'name': reason.name,
                    'code': reason.code,
                    'description': reason.description
                })

            return self._json_response({
                'success': True,
                'data': reasons_data
            })

        except Exception as e:
            _logger.error(f"Error en get_pause_reasons: {str(e)}")
            return self._json_response({
                'error': 'Error interno del servidor',
                'message': str(e),
                'code': 500
            }, 500)

    @http.route('/driverpro/api/health', type='http', auth='none', methods=['GET'], csrf=False)
    def health_check(self):
        """Endpoint de health check"""
        return self._json_response({
            'status': 'ok',
            'timestamp': datetime.now().isoformat(),
            'service': 'Driver Pro API'
        })
