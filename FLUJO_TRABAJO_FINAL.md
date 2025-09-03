# Mejoras Implementadas - Validaciones de Recargas y Viajes (Versión Final)

## Resumen de Cambios

Se implementaron mejoras significativas al sistema de Driver Pro para validar las recargas de tarjetas y mejorar el flujo de creación de viajes, corrigiendo el error de validación de vehículo y implementando un flujo de trabajo más robusto.

## 🔧 **Flujo de Trabajo Corregido**

### **1. Creación del Viaje (Estado: Borrador)**

- ✅ Se puede crear con chofer, vehículo, tarjeta, origen y destino
- ✅ **NO se requiere vehículo asignado** para guardar (error corregido)
- ✅ **NO se consumen recargas** al crear
- ✅ Se genera **folio automático** del viaje (TRIP-000001, etc.)
- ✅ Vehículo y tarjeta pueden editarse manualmente en borrador

### **2. Guardar el Viaje**

- ✅ Una vez guardado, aparecen los botones de estado
- ✅ Botón "Iniciar Viaje" solo visible después de guardar
- ✅ Validaciones mínimas para guardar (solo chofer requerido)

### **3. Iniciar el Viaje (Botón "Iniciar Viaje")**

- ✅ Valida que tenga vehículo asignado
- ✅ Valida que tenga tarjeta con recargas
- ✅ **Consume exactamente 1 recarga** (solo una vez)
- ✅ Cambia estado a "Activo"
- ✅ Solo se puede hacer una vez por viaje

### **4. Cancelar Viaje**

- ✅ Botón "Cancelar" disponible desde cualquier estado
- ✅ **NO reembolsa automáticamente** la recarga

### **5. Recuperar Recarga (Nuevo)**

- ✅ Botón "Recuperar Recarga" solo en viajes cancelados
- ✅ Solo aparece si ya se consumió una recarga
- ✅ Solo se puede hacer **una vez** por viaje
- ✅ Requiere confirmación del usuario

## 📊 **Cambios en Modelos**

### **`models/driverpro_trip.py`**

#### **Nuevos campos de control:**

```python
credit_consumed = fields.Boolean(
    string='Recarga Consumida',
    default=False,
    tracking=True,
    help="Indica si ya se consumió una recarga para este viaje"
)

credit_refunded = fields.Boolean(
    string='Recarga Reembolsada',
    default=False,
    tracking=True,
    help="Indica si ya se reembolsó la recarga de este viaje"
)
```

#### **Validaciones corregidas:**

- ✅ **Eliminada validación obligatoria de vehículo al crear**
- ✅ Vehículo solo requerido al iniciar viaje
- ✅ Validación de recarga consumida para estados activos
- ✅ Folio automático mejorado

#### **Método `action_start()` mejorado:**

```python
def action_start(self):
    # Valida que no se haya consumido previamente
    if trip.credit_consumed:
        raise UserError(_('Este viaje ya consumió una recarga previamente.'))

    # Consume recarga y marca como consumida
    trip.credit_consumed = True
```

#### **Nuevo método `action_refund_credit()`:**

```python
def action_refund_credit(self):
    # Solo para viajes cancelados con recarga consumida
    # Marca como reembolsada (solo una vez)
    trip.credit_refunded = True
```

## 🎨 **Cambios en Vistas**

### **`views/driverpro_trip_views.xml`**

#### **Botones del header:**

```xml
<!-- Iniciar solo después de guardar -->
<button name="action_start" string="Iniciar Viaje"
        invisible="state != 'draft' or not id"/>

<!-- Recuperar recarga solo en cancelados -->
<button name="action_refund_credit" string="Recuperar Recarga"
        invisible="state != 'cancelled' or not credit_consumed or credit_refunded"
        confirm="¿Está seguro de que desea recuperar la recarga?"/>
```

#### **Campos editables:**

- ✅ `vehicle_id` y `card_id` editables en estado borrador
- ✅ Campos de control de recargas visibles
- ✅ Lista con columnas de estado de recargas

## 🛡️ **Validaciones Implementadas**

### **1. Al Crear (Estado: Borrador)**

```python
@api.constrains('driver_id')
def _check_driver_required(self):
    # Solo chofer requerido
```

### **2. Al Iniciar (Estado: Activo)**

```python
@api.constrains('state', 'driver_id', 'vehicle_id')
def _check_driver_vehicle_for_start(self):
    # Vehículo y asignación requeridos solo para estados activos
```

### **3. Control de Recargas**

```python
@api.constrains('state', 'card_id', 'credit_consumed')
def _check_card_credits_for_start(self):
    # Estados activos requieren recarga consumida
```

## 🔄 **Estados y Transiciones**

| Estado        | Crear | Guardar | Iniciar | Pausar | Reanudar | Finalizar | Cancelar | Recuperar |
| ------------- | ----- | ------- | ------- | ------ | -------- | --------- | -------- | --------- |
| **Borrador**  | ✅    | ✅      | ✅\*    | ❌     | ❌       | ❌        | ✅       | ❌        |
| **Activo**    | ❌    | ❌      | ❌      | ✅     | ❌       | ✅        | ✅       | ❌        |
| **Pausado**   | ❌    | ❌      | ❌      | ❌     | ✅       | ✅        | ✅       | ❌        |
| **Terminado** | ❌    | ❌      | ❌      | ❌     | ❌       | ❌        | ❌       | ❌        |
| **Cancelado** | ❌    | ❌      | ❌      | ❌     | ❌       | ❌        | ❌       | ✅\*\*    |

\*Solo si hay recargas disponibles y nunca se consumió antes
\*\*Solo si se consumió recarga y no se reembolsó antes

## 🎯 **Errores Corregidos**

### **1. Error de validación de vehículo:**

```
❌ ANTES: "Debe seleccionar un vehículo para el viaje"
✅ AHORA: Solo valida vehículo al iniciar, no al crear
```

### **2. Flujo de recargas:**

```
❌ ANTES: Se consumían al crear
✅ AHORA: Se consumen solo al iniciar
```

### **3. Generación de folio:**

```
❌ ANTES: Manual
✅ AHORA: Automático (TRIP-000001, TRIP-000002, etc.)
```

### **4. Control de reembolsos:**

```
❌ ANTES: Automático al cancelar
✅ AHORA: Manual con botón específico y confirmación
```

## 📋 **Pruebas Recomendadas**

### **Escenario 1: Flujo Normal**

1. ✅ Crear viaje con solo chofer → Se guarda correctamente
2. ✅ Agregar vehículo y tarjeta → Aparece botón "Iniciar"
3. ✅ Hacer clic en "Iniciar" → Consume 1 recarga
4. ✅ Verificar que no se puede iniciar dos veces

### **Escenario 2: Sin Recargas**

1. ✅ Crear viaje con tarjeta sin saldo → Se permite
2. ✅ Intentar iniciar → Error claro sobre falta de recargas
3. ✅ Recargar tarjeta → Permitir iniciar

### **Escenario 3: Cancelación y Reembolso**

1. ✅ Iniciar viaje (consume recarga)
2. ✅ Cancelar viaje → Aparece botón "Recuperar Recarga"
3. ✅ Recuperar recarga → Se reembolsa y no se puede hacer dos veces

### **Escenario 4: Permisos**

1. ✅ Usuario normal → No puede editar recargas confirmadas
2. ✅ Administrador → Puede editar recargas confirmadas

## 🎉 **Resultado Final**

El sistema ahora funciona exactamente como solicitaste:

1. ✅ **Crear viaje** con datos mínimos (no requiere vehículo)
2. ✅ **Guardar primero**, luego aparecen botones de estado
3. ✅ **Iniciar viaje** consume recarga (solo una vez)
4. ✅ **Cancelar** y luego **recuperar recarga** (separado y controlado)
5. ✅ **Folio automático** para cada viaje
6. ✅ **Restricciones de administrador** para recargas
7. ✅ **Error de vehículo corregido**
