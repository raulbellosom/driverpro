# -*- coding: utf-8 -*-

from odoo import fields
from odoo.tools.safe_eval import safe_eval
import json
import logging

_logger = logging.getLogger(__name__)

try:
    from pywebpush import webpush, WebPushException
    WEBPUSH_AVAILABLE = True
except ImportError:
    WEBPUSH_AVAILABLE = False
    _logger.warning("pywebpush no está instalado. Las notificaciones push no funcionarán.")


def send_web_push(env, user, payload):
    """
    Envía una notificación Web Push a todas las suscripciones activas de un usuario
    
    Args:
        env: Environment de Odoo
        user: res.users record
        payload: dict con los datos de la notificación
        
    Returns:
        int: número de notificaciones enviadas exitosamente
    """
    if not WEBPUSH_AVAILABLE:
        _logger.warning("pywebpush no está disponible. No se pueden enviar notificaciones push.")
        return 0
    
    # Obtener configuración VAPID
    ICP = env['ir.config_parameter'].sudo()
    vapid_pub = ICP.get_param('driverpro.vapid_public_key')
    vapid_priv = ICP.get_param('driverpro.vapid_private_key')
    subject = ICP.get_param('driverpro.vapid_subject') or 'mailto:support@racoondevs.com'
    
    if not (vapid_pub and vapid_priv):
        _logger.warning("VAPID keys no configuradas. No se pueden enviar notificaciones push.")
        return 0
    
    # Obtener suscripciones activas del usuario
    subs = env['driverpro.push_subscription'].sudo().search([
        ('user_id', '=', user.id), 
        ('enabled', '=', True)
    ])
    
    if not subs:
        _logger.info(f"No hay suscripciones activas para el usuario {user.login}")
        return 0
    
    success_count = 0
    failed_count = 0
    
    # Preparar payload JSON
    try:
        data_json = json.dumps(payload, ensure_ascii=False)
    except Exception as e:
        _logger.error(f"Error serializando payload: {str(e)}")
        return 0
    
    for sub in subs:
        try:
            # Preparar información de suscripción
            subscription_info = {
                "endpoint": sub.endpoint,
                "keys": {
                    "p256dh": sub.p256dh,
                    "auth": sub.auth
                }
            }
            
            # Enviar notificación
            webpush(
                subscription_info=subscription_info,
                data=data_json,
                vapid_private_key=vapid_priv,
                vapid_claims={"sub": subject}
            )
            
            success_count += 1
            _logger.info(f"Push enviado exitosamente a {user.login} (endpoint: {sub.endpoint[:50]}...)")
            
            # Actualizar última vez vista
            sub.write({'last_seen': fields.Datetime.now()})
            
        except WebPushException as e:
            failed_count += 1
            error_msg = str(e)
            _logger.warning(f"Error enviando push a {user.login}: {error_msg}")
            
            # Si es un error permanente, deshabilitar la suscripción
            if any(code in error_msg for code in ['410', '404', '403']):
                sub.write({'enabled': False})
                _logger.info(f"Suscripción deshabilitada por error permanente: {sub.endpoint[:50]}...")
                
        except Exception as e:
            failed_count += 1
            _logger.error(f"Error inesperado enviando push a {user.login}: {str(e)}")
    
    _logger.info(f"Push enviado: {success_count} exitosos, {failed_count} fallidos para usuario {user.login}")
    return success_count


def send_web_push_to_multiple_users(env, users, payload):
    """
    Envía una notificación Web Push a múltiples usuarios
    
    Args:
        env: Environment de Odoo
        users: recordset de res.users
        payload: dict con los datos de la notificación
        
    Returns:
        dict: {user_id: count_sent, ...}
    """
    results = {}
    
    for user in users:
        count = send_web_push(env, user, payload)
        results[user.id] = count
    
    return results


def create_trip_notification_payload(trip, notification_type, custom_message=None):
    """
    Crea el payload estándar para notificaciones de viajes
    
    Args:
        trip: record de driverpro.trip o driverpro.empty_trip
        notification_type: tipo de notificación ('assigned', 'reminder', 'alert_30', etc.)
        custom_message: mensaje personalizado opcional
        
    Returns:
        dict: payload para la notificación
    """
    base_payload = {
        "type": notification_type,
        "trip_id": trip.id,
        "timestamp": fields.Datetime.now().isoformat(),
    }
    
    # Mapeo de tipos de notificación a títulos y mensajes
    notification_config = {
        'assigned_trip': {
            'title': 'Nuevo viaje asignado',
            'body': f'Se te ha asignado un nuevo viaje.'
        },
        'scheduled_trip_reminder': {
            'title': 'Recordatorio de viaje',
            'body': 'Tu viaje programado está próximo a comenzar.'
        },
        'empty_trip_30': {
            'title': 'Recordatorio - 30 minutos',
            'body': 'Te quedan 30 minutos para terminar la búsqueda.'
        },
        'empty_trip_15': {
            'title': 'Recordatorio - 15 minutos',
            'body': 'Te quedan 15 minutos para terminar la búsqueda.'
        },
        'empty_trip_5': {
            'title': 'Último aviso - 5 minutos',
            'body': 'Te quedan solo 5 minutos para terminar la búsqueda.'
        },
        'trip_cancelled': {
            'title': 'Viaje cancelado',
            'body': 'Tu viaje ha sido cancelado.'
        },
        'trip_completed': {
            'title': 'Viaje completado',
            'body': 'Tu viaje ha sido marcado como completado.'
        }
    }
    
    config = notification_config.get(notification_type, {
        'title': 'Driver Pro',
        'body': custom_message or 'Tienes una nueva notificación.'
    })
    
    if custom_message:
        config['body'] = custom_message
    
    base_payload.update(config)
    
    return base_payload
