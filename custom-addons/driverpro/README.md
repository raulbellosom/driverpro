# DriverPro - Módulo de Gestión de Flotillas

DriverPro es un módulo personalizado de Odoo para empresas que administran flotillas de transporte. Extiende las funcionalidades del módulo estándar de Fleet con características avanzadas para la gestión de viajes, tarjetas de recarga y asignaciones dinámicas.

## Características Principales

### 🚗 Gestión de Tarjetas

- **Tarjetas ligadas a vehículos** (no a conductores)
- **Recargas con historial** completo y archivos adjuntos
- **Control de saldos** automático con movimientos detallados
- **Soporte para facturas** PDF y XML

### 🛣️ Control de Viajes

- **Estados avanzados**: draft, active, paused, done, cancelled
- **Pausas con motivos** configurables
- **Consumo automático** de créditos al iniciar viajes
- **Seguimiento de tiempos** con duración efectiva
- **Información de pagos** y pasajeros

### 👥 Asignaciones Dinámicas

- **Vehículo ↔ Chofer** por períodos específicos
- **Validación de solapamientos** automática
- **Estados automáticos** basados en fechas
- **Historial completo** de asignaciones

### 🔌 API JSON Completa

- **Endpoints RESTful** para cliente externo
- **Autenticación segura** con grupos de usuario
- **CRUD completo** de viajes
- **Gestión de estados** en tiempo real

## Modelos Incluidos

### Tarjetas y Recargas

- `driverpro.card` - Tarjetas principales
- `driverpro.card.recharge` - Recargas de créditos
- `driverpro.card.movement` - Libro mayor de movimientos
- `driverpro.card.assignment` - Historial tarjeta-vehículo

### Viajes y Pausas

- `driverpro.trip` - Viajes realizados
- `driverpro.trip.pause` - Pausas durante viajes
- `driverpro.pause.reason` - Catálogo de motivos

### Asignaciones

- `driverpro.assignment` - Asignaciones vehículo-chofer

## Seguridad

### Grupos de Usuario

- **DriverPro Manager**: Control total del sistema
- **DriverPro User**: Usuario interno con permisos limitados
- **Portal Driver**: Chofer con acceso solo a API

### Reglas de Acceso

- **Multicompañía**: Separación por compañía
- **Chofer**: Solo ve sus propios viajes y asignaciones
- **Administrador**: Ve todo dentro de su compañía

## API Endpoints

### Autenticación

```
GET /driverpro/api/health - Health check (sin auth)
```

### Asignaciones

```
GET /driverpro/api/me/assignment - Asignación actual del chofer
```

### Viajes

```
GET /driverpro/api/trips - Listar viajes del chofer
POST /driverpro/api/trips/create - Crear nuevo viaje
POST /driverpro/api/trips/{id}/start - Iniciar viaje
POST /driverpro/api/trips/{id}/pause - Pausar viaje
POST /driverpro/api/trips/{id}/resume - Reanudar viaje
POST /driverpro/api/trips/{id}/done - Finalizar viaje
POST /driverpro/api/trips/{id}/cancel - Cancelar viaje
```

### Catálogos

```
GET /driverpro/api/pause-reasons - Motivos de pausa
```

## Flujo de Trabajo

1. **Administrador** crea vehículos y tarjetas
2. **Administrador** registra recargas en las tarjetas
3. **Administrador** crea asignaciones vehículo-chofer
4. **Chofer** accede al cliente externo (no Odoo UI)
5. **Sistema** valida asignación activa
6. **Chofer** crea y gestiona viajes vía API
7. **Sistema** consume créditos automáticamente
8. **Administrador** monitorea desde Odoo

## Instalación

1. Copiar el módulo a `custom-addons/driverpro/`
2. Actualizar lista de módulos
3. Instalar "DriverPro"
4. Configurar grupos de usuario
5. Crear vehículos, tarjetas y asignaciones

## Configuración Inicial

### 1. Crear Usuarios Choferes

```python
# En el backend de Odoo
user = self.env['res.users'].create({
    'name': 'Juan Pérez',
    'login': 'juan.perez@empresa.com',
    'groups_id': [(4, self.env.ref('driverpro.group_portal_driver').id)]
})
```

### 2. Crear Vehículos

- Ir a Fleet → Vehículos
- Crear vehículos con placas y modelos

### 3. Crear Tarjetas

- Ir a DriverPro → Tarjetas → Todas las Tarjetas
- Asignar tarjetas a vehículos

### 4. Registrar Recargas

- Ir a DriverPro → Tarjetas → Recargas
- Confirmar recargas para activar créditos

### 5. Crear Asignaciones

- Ir a DriverPro → Operaciones → Asignaciones
- Asignar chofer + vehículo + tarjeta por período

## Desarrollo Futuro

- **Cliente React/Vue** para choferes
- **Backend Node.js/Python** para lógica de negocio
- **Reportes avanzados** y dashboards
- **Integración GPS** y mapas
- **Notificaciones push** en tiempo real
- **Encuestas de satisfacción** post-viaje

## Dependencias

- `base` - Framework base de Odoo
- `fleet` - Módulo de flotillas estándar
- `portal` - Acceso portal para usuarios externos

## Versión

- **Odoo**: 18.0+
- **DriverPro**: 1.0.0
- **Licencia**: LGPL-3

## Soporte

Para soporte técnico o consultas sobre el módulo, contactar a **RacoonDevs**.
