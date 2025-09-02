# DriverPro v2.0.0 - Guía de Migración

## Cambios Principales

### ✅ Eliminación del Modelo de Asignaciones

- Se ha eliminado el modelo `driverpro.assignment`
- Ya no es necesario gestionar asignaciones por separado
- La funcionalidad se maneja directamente con el módulo Fleet de Odoo

### ✅ Integración Completa con Fleet

- Los vehículos se asignan a conductores directamente en **Fleet > Configuración > Vehículos**
- **IMPORTANTE**: El conductor en Fleet debe ser un contacto (res.partner)
- Los usuarios deben estar vinculados con los contactos de los conductores
- Al seleccionar un chofer (usuario) en un viaje, el vehículo se asigna automáticamente
- La tarjeta se asigna automáticamente basándose en el vehículo

### ✅ Flujo Simplificado de Creación de Viajes

1. **Seleccionar Chofer**: Elige el chofer del viaje (debe ser un usuario activo)
2. **Validación Automática**: El sistema verifica:
   - Que el usuario tenga un contacto asociado
   - Que el contacto tenga un vehículo asignado en Fleet
   - Que el vehículo tenga una tarjeta activa
3. **Asignación Automática**: El sistema asigna automáticamente:
   - El vehículo asociado al contacto del usuario (desde Fleet)
   - La tarjeta asociada al vehículo
4. **Completar Viaje**: Agregar origen, destino y otros detalles
5. **Iniciar Viaje**: El sistema consume automáticamente el crédito

## Instrucciones de Migración

### Antes de la Actualización

1. **Exportar datos de asignaciones** (si es necesario):

   ```
   Menú: DriverPro > Operaciones > Asignaciones
   Exportar: Lista → Exportar → CSV/Excel
   ```

2. **Verificar asignaciones en Fleet**:
   - Ir a **Fleet > Configuración > Vehículos**
   - Asegurar que cada vehículo tenga asignado un conductor
   - Campo: "Conductor" debe estar lleno para cada vehículo activo

### Después de la Actualización

1. **Verificar configuración de usuarios y contactos**:

   - **Configuración > Usuarios y Compañías > Usuarios**
   - Cada chofer debe ser un usuario activo
   - Cada usuario debe tener un contacto asociado (campo "Contacto relacionado")

2. **Verificar asignaciones en Fleet**:

   - **Fleet > Configuración > Vehículos**
   - Cada vehículo debe tener un conductor asignado (contacto, no usuario)
   - El conductor debe corresponder al contacto del usuario chofer

3. **Verificar tarjetas activas**:

   - **DriverPro > Tarjetas > Todas las Tarjetas**
   - Confirmar que cada vehículo tenga una tarjeta activa

4. **Probar creación de viajes**:
   - **DriverPro > Operaciones > Viajes**
   - Crear un viaje de prueba seleccionando un chofer (usuario)
   - Verificar que vehículo y tarjeta se asignen automáticamente

### ⚠️ Configuración Requerida para Choferes

**IMPORTANTE**: Para que un usuario pueda ser chofer, debe cumplir:

1. **Usuario activo** en el sistema
2. **Contacto asociado** (Partner) vinculado al usuario
3. **Vehículo asignado** al contacto en Fleet
4. **Tarjeta activa** asignada al vehículo

**Ejemplo de configuración**:

```
Usuario: Juan Pérez (res.users)
├── Contacto asociado: Juan Pérez (res.partner)
    └── Vehículo en Fleet: Taxi 001
        └── Tarjeta: CARD-001 (activa)
```

## Beneficios del Nuevo Sistema

### 🚀 Simplicidad

- Un solo lugar para gestionar asignaciones (Fleet)
- Menos pasos para crear viajes
- Menor posibilidad de errores

### 🔄 Automatización

- Asignación automática de vehículo al seleccionar conductor
- Asignación automática de tarjeta al seleccionar vehículo
- Validaciones automáticas de consistencia

### 📱 Mejor UX

- Interfaz más limpia y clara
- Mensajes de ayuda y advertencias mejorados
- Flujo de trabajo más intuitivo

## Validaciones Automáticas

El sistema ahora incluye validaciones mejoradas:

- **Conductor sin vehículo**: Advertencia si el conductor no tiene vehículo asignado en Fleet
- **Vehículo sin tarjeta**: Advertencia si el vehículo no tiene tarjeta activa
- **Tarjeta sin créditos**: Advertencia si la tarjeta no tiene créditos suficientes
- **Consistencia**: Validación automática de la relación conductor-vehículo

## Archivos de Respaldo

Los siguientes archivos fueron respaldados (no eliminados):

- `models/driverpro_assignment.py.bak`
- `views/driverpro_assignment_views.xml.bak`

Estos archivos contienen el código anterior por si necesitas referencias.

## Soporte

Para dudas o problemas con la migración, contactar al equipo de desarrollo.
