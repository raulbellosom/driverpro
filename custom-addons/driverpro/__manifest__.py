{
    'name': 'Driver Pro',
    'version': '18.0.2.0.0',
    'summary': 'Gestión avanzada de flotillas de transporte',
    'description': """
        Driver Pro - Módulo de gestión de flotillas
        ==========================================
        
        Este módulo extiende las capacidades del módulo Fleet de Odoo para proporcionar:
        
        * Control de tarjetas de recarga de viajes ligadas a vehículos
        * Gestión de recargas con historial y archivos adjuntos
        * Registro y control de viajes con estados avanzados
        * Integración completa con Fleet para asignación automática de vehículos
        * API JSON para cliente externo de choferes
        * Reportes y estadísticas completas de viajes
        
        Version 2.0.0 - Refactorización Mayor:
        * Eliminado modelo de asignaciones redundante
        * Integración directa con módulo Fleet de Odoo
        * Asignación automática: chofer → vehículo → tarjeta
        * Interfaz simplificada con validaciones mejoradas
    """,
    'author': 'RacoonDevs',
    'website': 'https://racoondevs.com',
    'category': 'Fleet',
    'license': 'LGPL-3',
    'depends': [
        'base',
        'fleet',
        'portal',
    ],
    'data': [
        # Security - Los grupos primero, luego los accesos
        'security/driverpro_security.xml',
        'security/ir.model.access.csv',
        
        # Data
        'data/driverpro_sequence.xml',
        'data/driverpro_data.xml',
        
        # Views - Las acciones primero, luego los menús
        'views/driverpro_card_views.xml',
        'views/driverpro_trip_views.xml',
        # 'views/driverpro_assignment_views.xml',  # Deshabilitado - se usa Fleet directamente
        'views/driverpro_menu.xml',
    ],
    'demo': [],
    'qweb': [],
    'installable': True,
    'auto_install': False,
    'application': True,
    'sequence': 10,
    'icon': '/driverpro/static/description/icon_2.png',
}
