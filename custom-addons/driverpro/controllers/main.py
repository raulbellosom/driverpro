# -*- coding: utf-8 -*-

import json
import logging
from datetime import datetime
import pytz

from odoo import http, _
from odoo.http import request
from odoo.exceptions import ValidationError, UserError, AccessError

_logger = logging.getLogger(__name__)


class DriverproAPIController(http.Controller):
    """API Controller para el cliente de choferes"""

    def _convert_to_user_timezone(self, datetime_utc):
        """Convierte datetime UTC a la zona horaria del usuario"""
        if not datetime_utc:
            return None
        
        try:
            # Obtener la zona horaria del usuario, por defecto México (UTC-6)
            user_tz = request.env.user.tz or 'America/Mexico_City'
            timezone = pytz.timezone(user_tz)
            
            # Convertir de UTC a la zona horaria del usuario
            if datetime_utc.tzinfo is None:
                # Si no tiene timezone info, asumir que es UTC
                datetime_utc = pytz.UTC.localize(datetime_utc)
            
            local_dt = datetime_utc.astimezone(timezone)
            return local_dt
        except Exception as e:
            _logger.warning(f"Error convirtiendo zona horaria: {e}")
            return datetime_utc

    def _authenticate_driver(self):
        """Valida que el usuario sea un chofer autenticado"""
        if not request.env.user or request.env.user._is_public():
            return {'error': 'Usuario no autenticado', 'code': 401}
        
        # Solo verificamos que el usuario esté autenticado, sin grupo específico por ahora
        return {'success': True, 'user_id': request.env.user.id}

    def _json_response(self, data, status=200):
        """Retorna respuesta JSON"""
        response = request.make_response(
            json.dumps(data, default=str, ensure_ascii=False),
            headers=[('Content-Type', 'application/json; charset=utf-8')]
        )
        response.status_code = status
        return response

    @http.route('/driverpro/api/test', type='http', auth='none', methods=['GET'], csrf=False)
    def test_connection(self):
        """Endpoint de prueba sin autenticación"""
        return self._json_response({
            'status': 'ok',
            'message': 'DriverPro API funcionando correctamente',
            'timestamp': datetime.now().isoformat()
        })

    @http.route('/driverpro/api/me/assignment', type='http', auth='user', methods=['GET'], csrf=False)
    def get_current_assignment(self):
        """Obtiene la asignación actual del chofer usando Fleet"""
        try:
            auth_result = self._authenticate_driver()
            if 'error' in auth_result:
                return self._json_response(auth_result, auth_result['code'])

            user_id = auth_result['user_id']
            user = request.env.user
            
            # Buscar el partner asociado al usuario
            partner = user.partner_id
            if not partner:
                return self._json_response({
                    'error': 'Usuario sin partner asociado',
                    'code': 404
                }, 404)

            # Buscar vehículo asignado en Fleet
            vehicle = request.env['fleet.vehicle'].search([
                ('driver_id', '=', partner.id)
            ], limit=1)

            if not vehicle:
                return self._json_response({
                    'error': 'No hay vehículo asignado en Fleet',
                    'code': 404
                }, 404)

            # Buscar tarjeta activa asociada al vehículo
            card = request.env['driverpro.card'].search([
                ('vehicle_id', '=', vehicle.id),
                ('active', '=', True)
            ], limit=1)

            warnings = []
            if not card:
                warnings.append("No hay tarjeta asignada al vehículo")
            elif card.balance <= 0:
                warnings.append(f"Saldo insuficiente en tarjeta: {card.balance} créditos")

            # Construir respuesta
            data = {
                'driver': {
                    'id': partner.id,
                    'name': partner.name,
                    'email': partner.email
                },
                'vehicle': {
                    'id': vehicle.id,
                    'name': vehicle.name,
                    'license_plate': vehicle.license_plate,
                    'model': vehicle.model_id.name if vehicle.model_id else None
                },
                'card': {
                    'id': card.id,
                    'name': card.name,
                    'balance': card.balance
                } if card else None,
                'warnings': warnings
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
                    'start_datetime': self._convert_to_user_timezone(trip.start_datetime).isoformat() if trip.start_datetime else None,
                    'end_datetime': self._convert_to_user_timezone(trip.end_datetime).isoformat() if trip.end_datetime else None,
                    'duration': trip.duration,
                    'pause_duration': trip.pause_duration,
                    'effective_duration': trip.effective_duration,
                    'consumed_credits': trip.consumed_credits,
                    'amount_mxn': trip.amount_mxn,
                    'amount_usd': trip.amount_usd,
                    'total_amount_mxn': trip.total_amount_mxn,
                    'payment_in_usd': trip.payment_in_usd,
                    'exchange_rate': trip.exchange_rate,
                    'payment_method': trip.payment_method,
                    'payment_reference': trip.payment_reference,
                    'is_paused': trip.is_paused,
                    'pause_count': trip.pause_count,
                    'comments': trip.comments,
                    'is_scheduled': trip.is_scheduled,
                    'scheduled_datetime': self._convert_to_user_timezone(trip.scheduled_datetime).isoformat() if trip.scheduled_datetime else None,
                    'vehicle': {
                        'id': trip.vehicle_id.id,
                        'name': trip.vehicle_id.name,
                        'license_plate': trip.vehicle_id.license_plate
                    } if trip.vehicle_id else None,
                    'card': {
                        'id': trip.card_id.id,
                        'name': trip.card_id.name,
                        'balance': trip.card_id.balance
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

    @http.route('/driverpro/api/trips/create', type='http', auth='user', methods=['POST'], csrf=False)
    def create_trip(self):
        """Crea un nuevo viaje con soporte para archivos"""
        try:
            auth_result = self._authenticate_driver()
            if 'error' in auth_result:
                return self._json_response(auth_result, auth_result['code'])

            user_id = auth_result['user_id']
            user = request.env.user
            partner = user.partner_id

            # Obtener datos desde el request (puede ser JSON o FormData)
            if request.httprequest.content_type and 'application/json' in request.httprequest.content_type:
                # Request JSON
                data = json.loads(request.httprequest.data.decode('utf-8'))
            else:
                # Request con FormData (para archivos)
                data = dict(request.httprequest.form)
                
                # Convertir valores de string a los tipos correctos
                if 'passenger_count' in data:
                    data['passenger_count'] = int(data['passenger_count'])
                if 'amount_mxn' in data:
                    data['amount_mxn'] = float(data['amount_mxn'])
                if 'amount_usd' in data:
                    data['amount_usd'] = float(data['amount_usd'])
                if 'exchange_rate' in data:
                    data['exchange_rate'] = float(data['exchange_rate'])
                if 'payment_in_usd' in data:
                    data['payment_in_usd'] = data['payment_in_usd'].lower() == 'true'
                if 'is_scheduled' in data:
                    data['is_scheduled'] = data['is_scheduled'].lower() == 'true'

            # Validar campos requeridos
            required_fields = ['origin', 'destination']
            for field in required_fields:
                if not data.get(field):
                    return self._json_response({
                        'error': f'Campo requerido: {field}',
                        'code': 400
                    }, 400)

            # Buscar vehículo asignado en Fleet
            vehicle = request.env['fleet.vehicle'].search([
                ('driver_id', '=', partner.id)
            ], limit=1)

            if not vehicle:
                return self._json_response({
                    'error': 'No hay vehículo asignado en Fleet',
                    'code': 404
                }, 404)

            # Buscar tarjeta activa asociada al vehículo
            card = request.env['driverpro.card'].search([
                ('vehicle_id', '=', vehicle.id),
                ('active', '=', True)
            ], limit=1)

            # Crear viaje
            trip_vals = {
                'driver_id': user_id,
                'vehicle_id': vehicle.id,
                'card_id': card.id if card else False,
                'origin': data.get('origin'),
                'destination': data.get('destination'),
                'passenger_count': data.get('passenger_count', 1),
                'passenger_reference': data.get('passenger_reference'),
                'comments': data.get('comments'),
                'payment_method': data.get('payment_method', 'cash'),
                'amount_mxn': data.get('amount_mxn', 0.0),
                'amount_usd': data.get('amount_usd', 0.0),
                'payment_in_usd': data.get('payment_in_usd', False),
                'exchange_rate': data.get('exchange_rate', 1.0),
                'is_scheduled': data.get('is_scheduled', False),
                'scheduled_datetime': data.get('scheduled_datetime'),
                'payment_reference': data.get('payment_reference')
            }

            trip = request.env['driverpro.trip'].create(trip_vals)

            # Manejar archivos adjuntos si los hay
            files_uploaded = []
            if request.httprequest.files:
                for file_key in request.httprequest.files:
                    file_item = request.httprequest.files[file_key]
                    if file_item and file_item.filename:
                        try:
                            # Crear attachment en Odoo
                            attachment = request.env['ir.attachment'].create({
                                'name': file_item.filename,
                                'type': 'binary',
                                'datas': file_item.read(),
                                'res_model': 'driverpro.trip',
                                'res_id': trip.id,
                                'mimetype': file_item.content_type
                            })
                            files_uploaded.append({
                                'name': file_item.filename,
                                'id': attachment.id,
                                'size': len(attachment.datas) if attachment.datas else 0
                            })
                        except Exception as e:
                            _logger.warning(f"Error subiendo archivo {file_item.filename}: {e}")

            return self._json_response({
                'success': True,
                'data': {
                    'trip_id': trip.id,
                    'name': trip.name,
                    'state': trip.state,
                    'card_available_credits': card.balance if card else 0,
                    'card_credits_warning': 'Saldo insuficiente para iniciar viaje' if not card or card.balance <= 0 else None,
                    'files_uploaded': files_uploaded,
                    'files_count': len(files_uploaded)
                }
            })

        except ValidationError as e:
            return self._json_response({
                'error': 'Error de validación',
                'message': str(e),
                'code': 400
            }, 400)
        except Exception as e:
            _logger.error(f"Error en create_trip: {str(e)}")
            return self._json_response({
                'error': 'Error interno del servidor',
                'message': str(e),
                'code': 500
            }, 500)

    @http.route('/driverpro/api/trips/<int:trip_id>/start', type='http', auth='user', methods=['POST'], csrf=False)
    def start_trip(self, trip_id):
        """Inicia un viaje"""
        return self._trip_action(trip_id, 'action_start')

    @http.route('/driverpro/api/trips/<int:trip_id>/pause', type='http', auth='user', methods=['POST'], csrf=False)
    def pause_trip(self, trip_id):
        """Pausa un viaje"""
        # Obtener datos del request HTTP
        data = {}
        if request.httprequest.content_type and 'application/json' in request.httprequest.content_type:
            try:
                data = json.loads(request.httprequest.data.decode('utf-8'))
            except:
                data = {}
        else:
            data = dict(request.httprequest.form)
        
        return self._trip_action(trip_id, 'action_pause', data)

    @http.route('/driverpro/api/trips/<int:trip_id>/resume', type='http', auth='user', methods=['POST'], csrf=False)
    def resume_trip(self, trip_id):
        """Reanuda un viaje"""
        return self._trip_action(trip_id, 'action_resume')

    @http.route('/driverpro/api/trips/<int:trip_id>/done', type='http', auth='user', methods=['POST'], csrf=False)
    def finish_trip(self, trip_id):
        """Finaliza un viaje"""
        return self._trip_action(trip_id, 'action_done')

    @http.route('/driverpro/api/trips/<int:trip_id>/cancel', type='http', auth='user', methods=['POST'], csrf=False)
    def cancel_trip(self, trip_id):
        """Cancela un viaje"""
        # Obtener datos del request HTTP
        data = {}
        if request.httprequest.content_type and 'application/json' in request.httprequest.content_type:
            try:
                data = json.loads(request.httprequest.data.decode('utf-8'))
            except:
                data = {}
        else:
            data = dict(request.httprequest.form)
        
        return self._trip_action(trip_id, 'action_cancel', data)

    def _trip_action(self, trip_id, action, data=None):
        """Ejecuta una acción en un viaje"""
        try:
            auth_result = self._authenticate_driver()
            if 'error' in auth_result:
                return self._json_response(auth_result, auth_result['code'])

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
                reason_id = data.get('reason_id') if data else None
                notes = data.get('notes') if data else None
                trip.action_pause(reason_id=reason_id, notes=notes)
            elif action == 'action_resume':
                trip.action_resume()
            elif action == 'action_done':
                trip.action_done()
            elif action == 'action_cancel':
                # Para el frontend de choferes, solo cancelar sin opciones de reembolso
                # El reembolso se maneja desde la plataforma de Odoo
                trip.action_cancel()
            else:
                return self._json_response({
                    'error': f'Acción no válida: {action}',
                    'code': 400
                }, 400)

            return self._json_response({
                'success': True,
                'data': {
                    'trip_id': trip.id,
                    'name': trip.name,
                    'state': trip.state,
                    'message': f'Acción {action} ejecutada exitosamente'
                }
            })

        except UserError as e:
            return self._json_response({
                'error': 'Error de usuario',
                'message': str(e),
                'code': 400
            }, 400)
        except ValidationError as e:
            return self._json_response({
                'error': 'Error de validación',
                'message': str(e),
                'code': 400
            }, 400)
        except Exception as e:
            _logger.error(f"Error en _trip_action ({action}): {str(e)}")
            return self._json_response({
                'error': 'Error interno del servidor',
                'message': str(e),
                'code': 500
            }, 500)

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
