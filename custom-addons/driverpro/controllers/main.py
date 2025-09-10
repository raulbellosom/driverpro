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
    def get_trips(self, state=None, page=None, limit=None, offset=None):
        """Obtiene los viajes del chofer con paginación"""
        try:
            auth_result = self._authenticate_driver()
            if 'error' in auth_result:
                return self._json_response(auth_result, auth_result['code'])

            user_id = auth_result['user_id']

            # Parámetros de paginación
            try:
                if page:
                    page = int(page)
                    limit = int(limit) if limit else 10
                    offset = (page - 1) * limit
                else:
                    limit = int(limit) if limit else 50
                    offset = int(offset) if offset else 0
            except ValueError:
                return self._json_response({
                    'error': 'Parámetros de paginación deben ser números enteros',
                    'code': 400
                }, 400)

            # Filtro de fecha: última semana para mejor rendimiento
            from datetime import datetime, timedelta
            week_ago = datetime.now() - timedelta(days=7)

            # Construir dominio
            domain = [
                ('driver_id', '=', user_id),
                ('create_date', '>=', week_ago.strftime('%Y-%m-%d %H:%M:%S'))
            ]
            if state:
                domain.append(('state', '=', state))

            # Contar total
            total_count = request.env['driverpro.trip'].search_count(domain)

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
                'pagination': {
                    'page': page if page else 1,
                    'limit': limit,
                    'total': total_count,
                    'pages': (total_count + limit - 1) // limit  # Ceiling division
                } if page else {
                    'count': len(trips_data),
                    'total': total_count,
                    'limit': limit,
                    'offset': offset
                }
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
                if 'is_recharge_trip' in data:
                    data['is_recharge_trip'] = data['is_recharge_trip'].lower() == 'true'
                if 'empty_wait_limit_minutes' in data:
                    data['empty_wait_limit_minutes'] = int(data['empty_wait_limit_minutes'])

            # Validar campos requeridos según el tipo de viaje
            trip_type = data.get('trip_type', 'normal')
            
            if trip_type == 'empty':
                # Para viajes vacíos, no requerimos origen ni destino
                if not data.get('empty_wait_limit_minutes'):
                    data['empty_wait_limit_minutes'] = 60  # Default 1 hora
            else:
                # Para viajes normales y con recarga, requerimos origen y destino
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

            # Agregar campos específicos según el tipo de viaje
            if trip_type == 'empty':
                trip_vals.update({
                    'is_empty_trip': True,
                    'empty_wait_limit_minutes': data.get('empty_wait_limit_minutes', 60),
                    'origin': 'Búsqueda de clientes',
                    'destination': 'Por definir',
                    'passenger_count': 0,
                })
            else:
                trip_vals.update({
                    'origin': data.get('origin'),
                    'destination': data.get('destination'),
                    'passenger_count': data.get('passenger_count', 1),
                    'passenger_reference': data.get('passenger_reference'),
                    'is_recharge_trip': data.get('is_recharge_trip', trip_type == 'recharge'),
                })

            trip = request.env['driverpro.trip'].create(trip_vals)

            # Iniciar automáticamente los viajes vacíos
            if trip_type == 'empty':
                try:
                    trip.action_start_empty()
                except Exception as e:
                    _logger.warning(f"Error iniciando viaje vacío automáticamente: {e}")
                    # No fallar completamente, solo registrar el warning

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

    @http.route('/driverpro/api/trips/<int:trip_id>/start-empty', type='http', auth='user', methods=['POST'], csrf=False)
    def start_empty_trip(self, trip_id):
        """Inicia un viaje vacío"""
        return self._trip_action(trip_id, 'action_start_empty')

    @http.route('/driverpro/api/trips/<int:trip_id>/convert-to-active', type='http', auth='user', methods=['POST'], csrf=False)
    def convert_empty_to_active(self, trip_id):
        """Convierte un viaje vacío a activo cuando encuentra cliente"""
        # Obtener datos del cliente desde el request
        data = {}
        if request.httprequest.content_type and 'application/json' in request.httprequest.content_type:
            try:
                data = json.loads(request.httprequest.data.decode('utf-8'))
            except:
                data = {}
        else:
            data = dict(request.httprequest.form)
        
        try:
            auth_result = self._authenticate_driver()
            if 'error' in auth_result:
                return self._json_response(auth_result, auth_result['code'])

            user_id = auth_result['user_id']
            
            # Buscar el viaje
            trip = request.env['driverpro.trip'].search([
                ('id', '=', trip_id),
                ('driver_id', '=', user_id)
            ], limit=1)

            if not trip:
                return self._json_response({
                    'error': 'Viaje no encontrado o no autorizado',
                    'code': 404
                }, 404)

            # Preparar datos de conversión
            trip_data = {}
            
            # Datos obligatorios
            for field in ['client_name', 'origin', 'destination']:
                if data.get(field):
                    trip_data[field] = data[field]
            
            # Datos opcionales
            if data.get('passenger_count'):
                trip_data['passenger_count'] = int(data['passenger_count'])
            if data.get('passenger_reference'):
                trip_data['passenger_reference'] = data['passenger_reference']
            if data.get('is_recharge_trip'):
                trip_data['is_recharge_trip'] = bool(data['is_recharge_trip'])
            if data.get('payment_method'):
                trip_data['payment_method'] = data['payment_method']
            if data.get('amount_mxn'):
                trip_data['amount_mxn'] = float(data['amount_mxn'])

            # Convertir a activo con todos los datos
            trip.action_convert_empty_to_active(trip_data)

            return self._json_response({
                'success': True,
                'data': {
                    'trip_id': trip.id,
                    'name': trip.name,
                    'state': trip.state,
                    'is_recharge_trip': trip.is_recharge_trip,
                    'message': 'Viaje convertido exitosamente'
                }
            })

        except Exception as e:
            _logger.error(f"Error en convert_empty_to_active: {str(e)}")
            return self._json_response({
                'error': 'Error interno del servidor',
                'message': str(e),
                'code': 500
            }, 500)

    @http.route('/driverpro/api/trips/<int:trip_id>/cancel-empty', type='http', auth='user', methods=['POST'], csrf=False)
    def cancel_empty_trip(self, trip_id):
        """Cancela un viaje vacío"""
        return self._trip_action(trip_id, 'action_cancel_empty')

    @http.route('/driverpro/api/empty-trips/create', type='http', auth='user', methods=['POST'], csrf=False)
    def create_empty_trip(self):
        """Crea una nueva búsqueda de clientes"""
        try:
            auth_result = self._authenticate_driver()
            if 'error' in auth_result:
                return self._json_response(auth_result, auth_result['code'])

            user_id = auth_result['user_id']
            user = request.env.user
            partner = user.partner_id

            # Verificar si ya tiene una búsqueda activa
            existing_search = request.env['driverpro.empty_trip'].search([
                ('driver_id', '=', user_id),
                ('state', '=', 'searching')
            ], limit=1)

            if existing_search:
                return self._json_response({
                    'error': 'Ya tienes una búsqueda activa',
                    'message': 'Solo puedes tener una búsqueda activa a la vez. Cancela o convierte la búsqueda actual antes de crear una nueva.',
                    'code': 409,
                    'existing_search_id': existing_search.id,
                    'existing_search_name': existing_search.name
                }, 409)

            # Obtener datos del request
            if request.httprequest.content_type and 'application/json' in request.httprequest.content_type:
                data = json.loads(request.httprequest.data.decode('utf-8'))
            else:
                data = dict(request.httprequest.form)
                if 'wait_limit_minutes' in data:
                    data['wait_limit_minutes'] = int(data['wait_limit_minutes'])

            # Buscar vehículo asignado en Fleet
            vehicle = request.env['fleet.vehicle'].search([
                ('driver_id', '=', partner.id)
            ], limit=1)

            if not vehicle:
                return self._json_response({
                    'error': 'No hay vehículo asignado en Fleet',
                    'code': 404
                }, 404)

            # Crear búsqueda
            search_vals = {
                'driver_id': user_id,
                'vehicle_id': vehicle.id,
                'search_location': data.get('search_location', 'Búsqueda de clientes'),
                'wait_limit_minutes': data.get('wait_limit_minutes', 60),
                'comments': data.get('comments', ''),
            }

            empty_trip = request.env['driverpro.empty_trip'].create(search_vals)

            # Iniciar búsqueda automáticamente
            empty_trip.action_start_search()

            return self._json_response({
                'success': True,
                'data': {
                    'search_id': empty_trip.id,
                    'name': empty_trip.name,
                    'state': empty_trip.state,
                    'wait_limit_minutes': empty_trip.wait_limit_minutes,
                    'time_remaining': empty_trip.time_remaining
                }
            })

        except Exception as e:
            _logger.error(f"Error en create_empty_trip: {str(e)}")
            return self._json_response({
                'error': 'Error interno del servidor',
                'message': str(e),
                'code': 500
            }, 500)

    @http.route('/driverpro/api/empty-trips', type='http', auth='user', methods=['GET'], csrf=False)
    def get_empty_trips(self):
        """Obtiene las búsquedas del chofer con paginación"""
        try:
            auth_result = self._authenticate_driver()
            if 'error' in auth_result:
                return self._json_response(auth_result, auth_result['code'])

            user_id = auth_result['user_id']
            
            # Parámetros de paginación
            page = int(request.httprequest.args.get('page', 1))
            limit = int(request.httprequest.args.get('limit', 10))
            offset = (page - 1) * limit

            # Filtro de fecha: última semana
            from datetime import datetime, timedelta
            week_ago = datetime.now() - timedelta(days=7)

            # Buscar búsquedas del chofer (última semana, paginado)
            domain = [
                ('driver_id', '=', user_id),
                ('create_date', '>=', week_ago.strftime('%Y-%m-%d %H:%M:%S'))
            ]
            
            # Contar total
            total_count = request.env['driverpro.empty_trip'].search_count(domain)
            
            # Obtener registros paginados
            empty_trips = request.env['driverpro.empty_trip'].search(
                domain,
                order='create_date desc',
                limit=limit,
                offset=offset
            )

            trips_data = []
            for trip in empty_trips:
                # Calcular tiempo restante con conversión de timezone
                time_remaining = 0
                wait_limit_time = None
                
                if trip.started_at and trip.wait_limit_minutes > 0:
                    from datetime import datetime, timedelta
                    # Convertir started_at a timezone del usuario
                    started_local = self._convert_to_user_timezone(trip.started_at)
                    started = started_local.replace(tzinfo=None)  # Para cálculo sin tz
                    limit_time = started + timedelta(minutes=trip.wait_limit_minutes)
                    wait_limit_time = limit_time.isoformat()
                    
                    if trip.state == 'searching':
                        # Usar hora local del usuario para el cálculo
                        user_tz = request.env.user.tz or 'America/Mexico_City'
                        timezone = pytz.timezone(user_tz)
                        now_local = datetime.now(timezone).replace(tzinfo=None)
                        
                        if now_local < limit_time:
                            diff = limit_time - now_local
                            time_remaining = int(diff.total_seconds() / 60)  # en minutos

                # Datos del vehículo (reemplaza assignment_data)
                vehicle_data = None
                if trip.vehicle_id:
                    vehicle_data = {
                        'id': trip.vehicle_id.id,
                        'license_plate': trip.vehicle_id.license_plate,
                        'brand': trip.vehicle_id.brand_id.name if trip.vehicle_id.brand_id else '',
                        'model': trip.vehicle_id.model_id.name if trip.vehicle_id.model_id else '',
                    }

                trips_data.append({
                    'id': trip.id,
                    'search_number': trip.name,
                    'state': trip.state,
                    'search_location': trip.search_location,
                    'wait_limit_minutes': trip.wait_limit_minutes,
                    'wait_limit_time': wait_limit_time,
                    'time_remaining': time_remaining,
                    'create_date': self._convert_to_user_timezone(trip.create_date).isoformat() if trip.create_date else None,
                    'started_at': self._convert_to_user_timezone(trip.started_at).isoformat() if trip.started_at else None,
                    'converted_at': self._convert_to_user_timezone(trip.converted_at).isoformat() if trip.converted_at else None,
                    'cancelled_at': self._convert_to_user_timezone(trip.cancelled_at).isoformat() if trip.cancelled_at else None,
                    'converted_trip_id': trip.converted_trip_id.id if trip.converted_trip_id else None,
                    'converted_trip_name': trip.converted_trip_id.name if trip.converted_trip_id else None,
                    'comments': getattr(trip, 'comments', ''),
                    'vehicle_id': vehicle_data,
                })

            return self._json_response({
                'success': True,
                'data': trips_data,
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': total_count,
                    'pages': (total_count + limit - 1) // limit  # Ceiling division
                }
            })

        except Exception as e:
            _logger.error(f"Error en get_empty_trips: {str(e)}")
            return self._json_response({
                'error': 'Error interno del servidor',
                'message': str(e),
                'code': 500
            }, 500)

    @http.route('/driverpro/api/empty-trips/<int:search_id>/convert', type='http', auth='user', methods=['POST'], csrf=False)
    def convert_empty_trip(self, search_id):
        """Convierte búsqueda a viaje normal"""
        try:
            auth_result = self._authenticate_driver()
            if 'error' in auth_result:
                return self._json_response(auth_result, auth_result['code'])

            user_id = auth_result['user_id']

            # Buscar la búsqueda
            empty_trip = request.env['driverpro.empty_trip'].search([
                ('id', '=', search_id),
                ('driver_id', '=', user_id)
            ], limit=1)

            if not empty_trip:
                return self._json_response({
                    'error': 'Búsqueda no encontrada',
                    'code': 404
                }, 404)

            # Convertir a viaje normal
            result = empty_trip.action_convert_to_trip()

            return self._json_response({
                'success': True,
                'data': {
                    'trip_id': result['res_id'],
                    'message': 'Búsqueda convertida a viaje exitosamente'
                }
            })

        except Exception as e:
            _logger.error(f"Error en convert_empty_trip: {str(e)}")
            return self._json_response({
                'error': str(e),
                'code': 500
            }, 500)

    @http.route('/driverpro/api/empty-trips/<int:search_id>/cancel', type='http', auth='user', methods=['POST'], csrf=False)
    def cancel_empty_trip(self, search_id):
        """Cancela una búsqueda"""
        try:
            auth_result = self._authenticate_driver()
            if 'error' in auth_result:
                return self._json_response(auth_result, auth_result['code'])

            user_id = auth_result['user_id']

            # Buscar la búsqueda
            empty_trip = request.env['driverpro.empty_trip'].search([
                ('id', '=', search_id),
                ('driver_id', '=', user_id)
            ], limit=1)

            if not empty_trip:
                return self._json_response({
                    'error': 'Búsqueda no encontrada',
                    'code': 404
                }, 404)

            # Cancelar búsqueda
            empty_trip.action_cancel_search()

            return self._json_response({
                'success': True,
                'data': {
                    'message': 'Búsqueda cancelada exitosamente'
                }
            })

        except Exception as e:
            _logger.error(f"Error en cancel_empty_trip: {str(e)}")
            return self._json_response({
                'error': str(e),
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
