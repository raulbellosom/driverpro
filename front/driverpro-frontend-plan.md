# DriverPro — Frontend de Choferes (PWA) · Plan Técnico
**Fecha:** 2025-09-03

Este documento define el plan técnico para construir un **frontend exclusivo para choferes** (PWA) que consume la API del módulo Odoo **DriverPro** y permite: **iniciar sesión**, **ver viajes (hoy / programados / historial)**, **ver vehículo y tarjeta asignados**, y **crear/iniciar/pausar/reanudar/terminar/cancelar** viajes respetando las reglas de negocio (validación de recargas, estados, etc.).

---

## 1) Objetivos y Alcance
- **Usuarios:** grupo `group_portal_driver` (choferes).
- **Funcionalidades clave:**
  - Inicio de sesión contra Odoo.
  - Home con tabs/cards/tablas: **Hoy**, **Programados**, **Historial**.
  - Visualización de **Vehículo asignado** y **Tarjeta de recargas** (saldo).
  - **Viaje rápido** (formulario → resumen → acciones).
  - Acciones de viaje: **Iniciar**, **Pausar**, **Reanudar**, **Terminar**, **Cancelar** (con opción de reembolso de recarga).
- **Reglas de negocio críticas:**
  - El **vehículo** se asigna al **conductor (res.partner)** desde **Fleet**.
  - El **usuario (res.users)** del chofer debe estar **vinculado** a su `partner_id`.
  - El **vehículo** debe tener **tarjeta activa** (`driverpro.card`) **con saldo** para **iniciar** un viaje.
  - Se permite **crear** viajes en **borrador** aun sin saldo (solo warning); **no se puede iniciar** sin saldo.

---

## 2) Stack Frontend
- **React + Vite** (React 19).
- **TailwindCSS 4.1** (ya en `package.json`).
- **Motion** (`motion/react`) para animaciones.
- **Lucide React** para íconos.
- **react-responsive** para helpers de responsividad.
- **Vite PWA Plugin** para instalación offline básica.
- **@tanstack/react-query** para *server state* (caché, reintentos, sincronización).
- **axios** como cliente HTTP (cookies, `withCredentials`).
- **zod** + **react-hook-form** para validaciones UX.
- (Opcional) **idb-keyval** + persistencia de React Query para *offline queue*.

> El proyecto ya está inicializado. Añadiremos dependencias: `axios @tanstack/react-query react-hook-form zod lucide-react react-responsive vite-plugin-pwa`

---
## 3) Arquitectura de Autenticación (Odoo)
- **Sesiones de Odoo (auth='user')**: los endpoints del controlador usan auth por **sesión** y llevan `csrf=False`.
- **Flujo recomendado:**
  1. `POST /web/session/authenticate` (JSON-RPC de Odoo) con `{db, login, password}`.
  2. Odoo devuelve **cookie** de sesión (`session_id`). Guardamos cookie (automática vía `withCredentials`).
  3. Las llamadas a `/driverpro/api/*` ya funcionan con esa sesión.
- **CORS / Cookies:**
  - Ideal: **mismo dominio** o **subdominio** con *reverse proxy* Nginx para evitar problemas con `SameSite`.
  - Si dominios distintos: habilitar CORS para orígenes específicos, cookies **Secure** + `SameSite=None` en Odoo/Nginx.

---

## 4) Modelos y Datos (Odoo)

### 4.1 `driverpro.trip`
**Estados** (`state`): `draft`, `active`, `paused`, `done`, `cancelled`
**Pago** (`payment_method`): `cash`, `card`, `transfer`, `other`

**Relaciones M2O:** driver_id→res.users, vehicle_id→fleet.vehicle, card_id→driverpro.card, current_pause_id→driverpro.trip.pause, company_id→res.company

**Campos relevantes (partial):**
amount_mxn, amount_usd, attachment_count, card_available_credits, card_credits_warning, comments, consumed_credits, credit_consumed, credit_refunded, destination, duration, effective_duration, end_datetime, exchange_rate, is_paused, is_scheduled, name, origin, passenger_count, passenger_reference, pause_count, pause_duration, payment_in_usd, payment_method, payment_reference, scheduled_datetime, scheduled_notification_sent, start_datetime, state, total_amount_mxn

**Acciones del modelo (clave):** `action_start`, `action_pause`, `action_resume`, `action_done`, `action_cancel`, `action_refund_credit`.
**Helper:** `get_driver_vehicle_info(driver_id)` para derivar vehículo y tarjeta vía Fleet.


### 4.2 `driverpro.card`
- Campos (subset): `name` (número), `active`, `vehicle_id (fleet.vehicle)`, `balance`, `recharge_total`, `consumed_total`, `movement_ids`, `trip_ids`, etc.
- Acción clave: `consume_credit(amount=1.0, reference=str)`.

### 4.3 Pausas
- `driverpro.trip.pause`: `trip_id`, `reason_id (driverpro.pause.reason)`, `start_datetime`, `end_datetime`, `duration`, `notes`.
- `driverpro.pause.reason`: `name`, `code`, `active`.

---

## 5) API disponible / requerida (Controlador Odoo)

### 5.1 Rutas actuales detectadas
- `GET` /driverpro/api/me/assignment  _(type: http, auth: user)_
- `GET` /driverpro/api/trips  _(type: http, auth: user)_
- `POST` /driverpro/api/trips/create  _(type: json, auth: user)_
- `POST` /driverpro/api/trips/<int:trip_id>/start  _(type: json, auth: user)_
- `POST` /driverpro/api/trips/<int:trip_id>/pause  _(type: json, auth: user)_
- `POST` /driverpro/api/trips/<int:trip_id>/resume  _(type: json, auth: user)_
- `POST` /driverpro/api/trips/<int:trip_id>/done  _(type: json, auth: user)_
- `POST` /driverpro/api/trips/<int:trip_id>/cancel  _(type: json, auth: user)_
- `GET` /driverpro/api/pause-reasons  _(type: http, auth: user)_
- `GET` /driverpro/api/health  _(type: http, auth: none)_

> Todas con `csrf=False`. **Auth:** `user` implica sesión activa.
> **Nota:** Si `driverpro.assignment` fue eliminado (migración v2), actualizar `/me/assignment` para consultar Fleet + helper del modelo `trip`.

### 5.2 Contratos propuestos

**Login (Odoo estándar):** `POST /web/session/authenticate` (JSON-RPC).

**GET `/driverpro/api/health`** → ping/estado.

**GET `/driverpro/api/me/assignment`** (o `/me/vehicle` actualizado):
```json
{ "success": true, "data": {
  "driver": { "id": 123, "name": "Juan", "email": "juan@..." },
  "vehicle": { "id": 45, "name": "Unidad 12", "license_plate": "ABC123", "model": "..." },
  "card": { "id": 77, "name": "TARJ-0001", "balance": 3.0 },
  "warnings": ["..."]
} }
```

**GET `/driverpro/api/trips?state=<draft|active|paused|done|cancelled>&limit=&offset=`** → lista de viajes del chofer.

**POST `/driverpro/api/trips/create`**
```json
{
  "origin": "Hotel X",
  "destination": "Aeropuerto PVR",
  "passenger_count": 2,
  "passenger_reference": "ABC-22",
  "comments": "<p>Fragil</p>",
  "payment_method": "cash",
  "payment_in_usd": false,
  "amount_mxn": 450,
  "exchange_rate": 17.0,
  "is_scheduled": true,
  "scheduled_datetime": "2025-09-02T10:30:00"
}
```

**POST `/driverpro/api/trips/<id>/start|pause|resume|done|cancel`**
- `pause`: `{ "reason_id": 3, "notes": "..." }`
- `cancel`: `{ "refund_credit": true }`

---

## 6) UX / Flujo de Pantallas

### 6.1 Login
- Form `{ usuario / contraseña }` → JSON-RPC Odoo → sesión creada.
- Manejo de errores y link a recuperación desde Odoo portal.

### 6.2 Home (Trips)
- Tarjeta de **Asignación**: vehículo + tarjeta (saldo) con warnings si faltan requisitos.
- Tabs:
  - **Hoy**: activos + borradores/scheduled de hoy.
  - **Programados**: borradores `is_scheduled` (próximos 7 días).
  - **Historial**: `done` y `cancelled` (últimos 30 días).
- Acciones contextuales en cada card/fila (start/pause/resume/done/cancel).
- Botón **Viaje rápido**.

### 6.3 Wizard Viaje Rápido
1) **Formulario** (zod): requeridos `origin`, `destination`; resto opcional.
   - Warning si `card.balance <= 0` (se permite borrador, no iniciar).
2) **Resumen**: lectura + acciones (**Guardar borrador**, **Crear e Iniciar** si hay saldo).
3) **Detalle** (opcional) en `/trips/:id` con timeline y pausas.

---

## 7) Rutas SPA
- `/login`
- `/` (hoy/programados/historial)
- `/trips/:id` (detalle)
- `/new` (opcional wizard como página; o modal en `/`)

---

## 8) Componentes UI (Tailwind + Motion + Lucide)
- `VehicleCard`, `CardBadge` (saldo y estados).
- `TripCard` / `TripRow` (acciones inline con animación).
- `Tabs` (Hoy/Programados/Historial).
- `QuickTripForm` + `QuickTripReview`.
- `PauseModal`, `ConfirmDialog`.
- `HeaderNav`, `UserMenu`, `EmptyState`, `Skeletons`.

---

## 9) Cliente HTTP + React Query (patrones)
- `axios` global con `withCredentials: true`.
- Query keys: `["me"]`, `["trips", {state, range}]`, `["pause-reasons"]`.
- Mutations: `createTrip`, `tripAction(id, action, body?)`.
- Invalidar/refetch tras `start/resume/done/cancel`.
- Persistencia opcional en IndexedDB para *offline retry*.

---

## 10) PWA
- `vite-plugin-pwa` con `autoUpdate` y *runtime caching* `network-first` para `/driverpro/api/*`.
- Manifest, íconos, pantalla de offline, sincronización opcional de acciones.

---

## 11) Seguridad / Infra
- Preferir **mismo dominio** (Nginx reverse proxy) para cookies sin fricción.
- Si CORS: permitir origen de la PWA, `credentials: true`, cookies `Secure + SameSite=None`.
- Confirmar permisos de `group_portal_driver` sobre `driverpro.trip`.

---

## 12) Roadmap
1. Infra (dominio / proxy / CORS)
2. Auth (login + persistencia)
3. Asignación (vehículo/tarjeta) + warnings
4. Listado (tabs) + acciones
5. Wizard viaje rápido (form + resumen)
6. PWA (manifest + SW + caché)
7. Pulido visual y QA con choferes

---

### Anexo A — Campos detectados (parcial)
**Trip (driverpro.trip):** amount_mxn, amount_usd, attachment_count, card_available_credits, card_credits_warning, comments, consumed_credits, credit_consumed, credit_refunded, destination, duration, effective_duration, end_datetime, exchange_rate, is_paused, is_scheduled, name, origin, passenger_count, passenger_reference, pause_count, pause_duration, payment_in_usd, payment_method, payment_reference, scheduled_datetime, scheduled_notification_sent, start_datetime, state, total_amount_mxn
**Trip M2O:** driver_id→res.users, vehicle_id→fleet.vehicle, card_id→driverpro.card, current_pause_id→driverpro.trip.pause, company_id→res.company
**Card (driverpro.card):** active, balance, create_date, name, notes, recharge_count, total_consumption, total_recharges, trip_count

---

**Fin**
