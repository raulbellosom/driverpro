# -*- coding: utf-8 -*-

from odoo import models, fields, api, _
import logging

_logger = logging.getLogger(__name__)


class FleetVehicle(models.Model):
    _inherit = 'fleet.vehicle'

    def write(self, vals):
        """Extender write para notificar cuando se asigna un conductor al vehículo"""
        result = super().write(vals)
        
        # Si se cambia el conductor, enviar notificación
        if vals.get('driver_id'):
            for vehicle in self:
                # Solo notificar si hay un conductor asignado y tiene usuario en el sistema
                if vehicle.driver_id:
                    user = self.env['res.users'].search([
                        ('partner_id', '=', vehicle.driver_id.id)
                    ], limit=1)
                    
                    if user:
                        try:
                            # Enviar notificación vía bus
                            bus_message = {
                                'type': 'vehicle_assigned',
                                'title': 'Vehículo Asignado',
                                'body': f'Se te ha asignado el vehículo {vehicle.name} ({vehicle.license_plate})',
                                'vehicle_id': vehicle.id,
                                'vehicle_name': vehicle.name,
                                'license_plate': vehicle.license_plate,
                                'user_id': user.id,
                                'timestamp': fields.Datetime.now().isoformat()
                            }
                            
                            # Enviar notificación específica al usuario (bus)
                            self.env['bus.bus']._sendone(
                                f'driverpro_notifications_{user.id}',
                                'notification',
                                bus_message
                            )
                            
                            # Enviar notificación push
                            try:
                                from ..utils.push import send_web_push
                                push_payload = {
                                    "type": "vehicle_assigned",
                                    "title": "Vehículo Asignado - Driver Pro",
                                    "body": f"Se te ha asignado el vehículo {vehicle.name} ({vehicle.license_plate})",
                                    "vehicle_id": vehicle.id,
                                    "timestamp": fields.Datetime.now().isoformat(),
                                }
                                send_web_push(self.env, user, push_payload)
                                
                                _logger.info(f"Notificación de asignación de vehículo enviada al usuario {user.login} para vehículo {vehicle.name}")
                                
                            except Exception as e:
                                _logger.error(f"Error enviando notificación push de vehículo: {str(e)}")
                            
                        except Exception as e:
                            _logger.error(f"Error enviando notificación de asignación de vehículo: {str(e)}")
        
        return result