{
    'name': 'DriverPro',
    'version': '18.0.1.0.0',
    'summary': 'Gestión avanzada de flotillas de transporte',
    'description': """
        DriverPro - Módulo de gestión de flotillas
        ==========================================
        
        Este módulo extiende las capacidades del módulo Fleet de Odoo para proporcionar:
        
        * Control de tarjetas de recarga de viajes ligadas a vehículos
        * Gestión de recargas con historial y archivos adjuntos
        * Registro y control de viajes con estados avanzados
        * Asignación dinámica de vehículos a choferes
        * API JSON para cliente externo de choferes
        * Reportes y estadísticas completas de viajes
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
        # Security
        'security/ir.model.access.csv',
        'security/driverpro_security.xml',
        
        # Data
        'data/driverpro_sequence.xml',
        'data/driverpro_data.xml',
        
        # Views
        'views/driverpro_menu.xml',
        'views/driverpro_card_views.xml',
        'views/driverpro_trip_views.xml',
        'views/driverpro_assignment_views.xml',
    ],
    'demo': [],
    'qweb': [],
    'installable': True,
    'auto_install': False,
    'application': True,
    'sequence': 10,
}
