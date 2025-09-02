# DriverPro – Contexto Inicial de Desarrollo

## 1. Objetivo del Sistema

**DriverPro** es un módulo personalizado de Odoo para empresas que administran flotillas de transporte.  
Busca complementar el módulo estándar de **Flota (fleet)** con:

- Control de **tarjetas de recarga de viajes** (ligadas a vehículos, no a conductores).
- Gestión de **recargas, historial y archivos adjuntos** (facturas PDF, XML).
- Registro y control de **viajes**, con estados y consumo automático de recargas.
- **Asignación dinámica** de vehículos a choferes (por día o periodo).
- Recolección de **estadísticas completas** de viajes para reportes.

El sistema tendrá dos frentes:

1. **Odoo (módulo `driverpro`)** para administradores y back-office.
2. **Cliente aparte (front/back)** para choferes, que consumirá la API de Odoo sin exponerles la interfaz de Odoo.

---

## 2. Estructura del Proyecto

```
driverpro/
├─ back/                  # Backend API del cliente de choferes (futuro)
├─ front/                 # Frontend React/Vite para choferes (futuro)
├─ config/                # Configuraciones (nginx, envs, etc.)
├─ custom-addons/
│  └─ driverpro/          # Módulo Odoo principal
│     ├─ __manifest__.py
│     ├─ __init__.py
│     ├─ models/
│     ├─ security/
│     ├─ views/
│     ├─ data/
│     └─ controllers/
├─ odoo-source/           # Core de Odoo (ignorado en Git si no se usa)
└─ docker-compose.yml     # Stack de Odoo
```

---

## 3. Modelos Clave en `driverpro`

### 3.1 Tarjetas y Recargas

- **`driverpro.card`** → Tarjeta ligada a vehículo.
- **`driverpro.card.recharge`** → Recarga de créditos con adjuntos (factura PDF/XML).
- **`driverpro.card.movement`** → Libro mayor (ingresos/egresos de créditos).
- **`driverpro.card.assignment`** → Histórico de asignación tarjeta ↔ vehículo.

### 3.2 Asignaciones

- **`driverpro.vehicle.assignment`** → Vehículo ↔ chofer (vigencia).

### 3.3 Viajes y Pausas

- **`driverpro.trip`** → Viajes con estados:
  - `draft`, `active`, `paused`, `done`, `cancelled`
- **`driverpro.trip.pause`** → Pausas con motivo.
- **`driverpro.pause.reason`** → Catálogo de motivos.

### 3.4 Campos de viaje

- **Datos de viaje**: origen, destino, pasajeros, referencia pasajero, comentarios.
- **Pagos**: método, divisa, monto, referencia.
- **Tiempos**: inicio, fin, duración, pausas.
- **Relaciones**: vehículo, chofer, tarjeta.

---

## 4. Flujo General

1. **Administrador** crea vehículos, asigna tarjetas, registra recargas.
2. **Chofer** inicia sesión en el **cliente Driverpro** (no Odoo UI).
3. Sistema valida asignación chofer ↔ vehículo ↔ tarjeta.
4. Chofer crea viaje (en borrador).
5. Al iniciar viaje:
   - Se consume **1 crédito** de la tarjeta.
   - Estado cambia a `active`.
6. Viaje puede:
   - **Pausarse** (requiere motivo).
   - **Reanudarse** (continúa).
   - **Finalizarse** (`done`).
   - **Cancelarse** (`cancelled`, con opción a reembolso de crédito).

---

## 5. Seguridad

- **Grupos**:
  - `group_driverpro_manager` → Administradores (control total).
  - `group_driverpro_user` → Usuarios internos.
  - `group_portal_driver` → Choferes (solo API).
- **Reglas de acceso**:
  - Chofer solo ve sus viajes y asignaciones.
  - Admin ve todo dentro de su compañía.
- **Multicompañía** habilitado.

---

## 6. API JSON (para cliente de choferes)

- **`GET /driverpro/api/me/assignment`** → Vehículo + tarjeta asignada.
- **`GET /driverpro/api/trips?state=`** → Viajes del chofer.
- **`POST /driverpro/api/trips/create`** → Crear viaje.
- **`POST /driverpro/api/trips/<id>/start`** → Iniciar viaje (consume 1 crédito).
- **`POST /driverpro/api/trips/<id>/pause|resume|done|cancel`** → Gestionar flujo.

Autenticación: `auth='user'` + token API en `Authorization: Bearer ...`.

---

## 7. Login en Odoo vs Login Externo

- **Odoo ya tiene login** y manejo de usuarios (`res.users`), con grupos y permisos.
- Para choferes, lo recomendable es:
  - **Crear usuarios tipo “interno limitado” o “portal”** con grupo `group_portal_driver`.
  - Restringir **todo acceso a Odoo UI** (menús invisibles, solo API).
  - El **cliente Driverpro** se conecta con credenciales de Odoo vía API (o mejor, token API).
- **No es viable duplicar login** dentro del módulo (duplicar usuarios/contraseñas es inseguro).  
  → Lo mejor es **reusar el login de Odoo** y crear un endpoint que genere tokens de sesión para el cliente externo.

---

## 8. MVP del Módulo `driverpro`

1. Modelos: tarjetas, recargas, movimientos, asignaciones, viajes, pausas.
2. Seguridad: grupos y reglas básicas.
3. Vistas: menús, listas, formularios, kanban de viajes.
4. Lógica: consumo de créditos al iniciar viaje.
5. Chatter para adjuntar archivos en recargas.
6. Secuencias automáticas en viajes.

---

## 9. Próximos pasos

- Implementar **reportes** (pivot/graph) de consumo por tarjeta, vehículo y chofer.
- Integrar **API JSON** para el cliente de choferes.
- Desarrollar **front/back** en carpetas correspondientes.
- Extender métricas (estadísticas por tiempo, encuestas de satisfacción futuras).
