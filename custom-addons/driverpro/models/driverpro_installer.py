# -*- coding: utf-8 -*-

from odoo import models, fields, api, _
import logging

_logger = logging.getLogger(__name__)


class DriverproInstaller(models.TransientModel):
    """Asistente de configuración post-instalación Driver Pro v2.0"""
    _name = 'driverpro.installer'
    _description = 'Configuración Driver Pro v2.0'

    @api.model
    def check_fleet_configuration(self):
        """Verifica la configuración del módulo Fleet"""
        issues = []
        
        # Verificar vehículos sin conductor
        vehicles_without_driver = self.env['fleet.vehicle'].search([
            ('active', '=', True),
            ('driver_id', '=', False)
        ])
        
        if vehicles_without_driver:
            issues.append({
                'type': 'warning',
                'title': _('Vehículos sin Conductor'),
                'message': _('Se encontraron %d vehículos activos sin conductor asignado. '
                           'Es recomendable asignar conductores en Fleet > Configuración > Vehículos.') % len(vehicles_without_driver),
                'vehicles': vehicles_without_driver.mapped('name')
            })
        
        # Verificar vehículos con conductor pero sin usuario asociado
        vehicles_with_driver = self.env['fleet.vehicle'].search([
            ('active', '=', True),
            ('driver_id', '!=', False)
        ])
        
        vehicles_without_user = []
        vehicles_without_card = []
        
        for vehicle in vehicles_with_driver:
            # Verificar si hay usuario asociado al partner del conductor
            user = self.env['res.users'].search([
                ('partner_id', '=', vehicle.driver_id.id),
                ('active', '=', True)
            ], limit=1)
            
            if not user:
                vehicles_without_user.append(vehicle)
                continue
            
            # Verificar tarjeta activa asociada al vehículo
            card = self.env['driverpro.card'].search([
                ('vehicle_id', '=', vehicle.id),
                ('active', '=', True)
            ], limit=1)
            
            if not card:
                vehicles_without_card.append(vehicle)
        
        if vehicles_without_user:
            issues.append({
                'type': 'warning',
                'title': _('Conductores sin Usuario'),
                'message': _('Se encontraron %d vehículos con conductor que no tienen usuario asociado. '
                           'Es necesario crear usuarios para estos conductores.') % len(vehicles_without_user),
                'vehicles': [v.name + ' (Conductor: ' + v.driver_id.name + ')' for v in vehicles_without_user]
            })
        
        if vehicles_without_card:
            issues.append({
                'type': 'warning', 
                'title': _('Vehículos sin Tarjeta'),
                'message': _('Se encontraron %d vehículos con conductor pero sin tarjeta activa. '
                           'Es necesario asignar tarjetas en Driver Pro > Tarjetas.') % len(vehicles_without_card),
                'vehicles': [v.name for v in vehicles_without_card]
            })
        
        # Verificar configuración exitosa
        properly_configured = len(vehicles_with_driver) - len(vehicles_without_user) - len(vehicles_without_card)
        if properly_configured > 0:
            issues.append({
                'type': 'success',
                'title': _('Configuración Correcta'),
                'message': _('Se encontraron %d vehículos correctamente configurados '
                           '(con conductor, usuario asociado y tarjeta activa).') % properly_configured,
                'vehicles': []
            })
        
        return issues

    @api.model
    def migration_report(self):
        """Genera reporte de migración de v1 a v2"""
        report = {
            'migration_completed': True,
            'fleet_integration': True,
            'issues': self.check_fleet_configuration(),
            'recommendations': []
        }
        
        # Agregar recomendaciones
        if any(issue['type'] == 'warning' for issue in report['issues']):
            report['recommendations'].extend([
                _('1. Revisa la configuración de vehículos en Fleet > Configuración > Vehículos'),
                _('2. Asigna conductores (contactos) a todos los vehículos activos'),
                _('3. Crea usuarios para los conductores si no existen: Configuración > Usuarios y Compañías > Usuarios'),
                _('4. Vincula los usuarios con los contactos de los conductores'),
                _('5. Crea tarjetas activas para todos los vehículos en Driver Pro > Tarjetas'),
                _('6. Verifica que las tarjetas tengan créditos suficientes'),
                _('7. Prueba crear un viaje para validar la configuración')
            ])
        else:
            report['recommendations'].extend([
                _('✅ La configuración está completa'),
                _('✅ Puedes comenzar a crear viajes en Driver Pro > Operaciones > Viajes'),
                _('💡 Tip: Al seleccionar un chofer (usuario), el vehículo y tarjeta se asignarán automáticamente'),
                _('📋 Nota: El chofer debe ser un usuario vinculado al contacto del conductor en Fleet')
            ])
        
        return report
