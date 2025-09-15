# DriverPro — Sistema de Notificaciones en Tiempo Real (Email + Bus + **Web Push PWA**)

Este documento consolida **todo** lo que debemos implementar y ajustar tanto en **Odoo (backend)** como en el **frontend PWA (React + Vite)** para activar un sistema de notificaciones en tiempo real que funcione:

- **En app abierta**: mediante bus/polling (como ya existe en Odoo).
- **En background o app cerrada (PWA instalada)**: mediante **Web Push** (Push API + Service Worker + VAPID).
- **Sin descompensaciones horarias**: respetando `user.tz` (por defecto: `America/Mexico_City`) en backend y renderizado consistente en frontend.

---

## 0) Visión general

1. **Backend (Odoo):**
   - Nuevo modelo para **suscripciones Web Push** por dispositivo.
   - Endpoints JSON para **subscribe/unsubscribe**.
   - Utilidad para **enviar notificaciones Web Push** con **VAPID**.
   - Integrar envíos en eventos clave: **asignación de viaje**, **recordatorios programados**, **alertas 30/15/5** para viajes de búsqueda.
   - Correcciones de **zona horaria**: cálculos en UTC, formato de salida en `user.tz`.

2. **Frontend (PWA):**
   - Cambiar Vite PWA a **estrategia `injectManifest`**.
   - Crear **Service Worker** `src/sw.js` con listeners de `push` y `notificationclick`.
   - Hook `useWebPush` para **solicitar permisos** y **suscribirse** usando **VAPID public key**.
   - Integrar botón/flujo para **activar/desactivar** notificaciones.
   - Helpers para **fechas/horas** que eviten descompensación.

3. **Configuración**:
   - Generar y guardar **llaves VAPID** (privada en Odoo; pública en Frontend).
   - Asegurar **HTTPS** y que la PWA **se instale** (iOS exige instalación para Web Push).

---

## 1) Backend Odoo (módulo `driverpro`)

### 1.1. Modelo: `driverpro.push_subscription`
```python
# -*- coding: utf-8 -*-
from odoo import models, fields, api

class DriverProPushSubscription(models.Model):
    _name = 'driverpro.push_subscription'
    _description = 'Suscripciones Web Push por dispositivo'

    user_id = fields.Many2one('res.users', required=True, index=True)
    endpoint = fields.Char(required=True)
    p256dh = fields.Char(required=True)
    auth = fields.Char(required=True)
    user_agent = fields.Char()
    enabled = fields.Boolean(default=True)
    last_seen = fields.Datetime()
    app = fields.Selection([('driver','DriverPro-Driver'), ('admin','DriverPro-Admin')], default='driver')

    _sql_constraints = [
        ('endpoint_uniq', 'unique(endpoint)', 'Esta suscripción ya existe'),
    ]

    @api.model
    def upsert_subscription(self, user, payload):
        vals = {
            'user_id': user.id,
            'endpoint': payload.get('endpoint'),
            'p256dh': payload.get('keys', {}).get('p256dh'),
            'auth': payload.get('keys', {}).get('auth'),
            'user_agent': payload.get('user_agent'),
            'enabled': True,
            'last_seen': fields.Datetime.now(),
            'app': payload.get('app') or 'driver',
        }
        rec = self.search([('endpoint', '=', vals['endpoint'])], limit=1)
        if rec:
            rec.write(vals)
            return rec
        return self.create(vals)
```

Permisos (`security/ir.model.access.csv`):
```
access_driverpro_push_subscription_user,access_driverpro_push_subscription_user,model_driverpro_push_subscription,base.group_user,1,1,1,1
```

### 1.2. Controlador REST para (un)subscribe
```python
from odoo import http
from odoo.http import request

class DriverProPushAPI(http.Controller):

    @http.route('/driverpro/api/push/subscribe', type='json', auth='user', methods=['POST'], csrf=False)
    def push_subscribe(self, **kw):
        data = request.jsonrequest or {}
        sub = data.get('subscription')
        if not sub or not sub.get('endpoint'):
            return {'success': False, 'error': 'Suscripción inválida'}

        rec = request.env['driverpro.push_subscription'].sudo().upsert_subscription(
            request.env.user, {
                'endpoint': sub.get('endpoint'),
                'keys': sub.get('keys', {}),
                'user_agent': request.httprequest.headers.get('User-Agent'),
                'app': data.get('app') or 'driver'
            }
        )
        return {'success': True, 'id': rec.id}

    @http.route('/driverpro/api/push/unsubscribe', type='json', auth='user', methods=['POST'], csrf=False)
    def push_unsubscribe(self, **kw):
        data = request.jsonrequest or {}
        endpoint = data.get('endpoint')
        if not endpoint:
            return {'success': False, 'error': 'Endpoint requerido'}

        rec = request.env['driverpro.push_subscription'].sudo().search([('endpoint', '=', endpoint)], limit=1)
        if rec:
            rec.sudo().write({'enabled': False})
        return {'success': True}
```

### 1.3. Utilidad de envío Web Push con VAPID
Dependencias:
```
pywebpush==2.0.0
cryptography>=41.0.0
```

```python
from pywebpush import webpush, WebPushException

def send_web_push(env, user, payload):
    ICP = env['ir.config_parameter'].sudo()
    vapid_pub = ICP.get_param('driverpro.vapid_public_key')
    vapid_priv = ICP.get_param('driverpro.vapid_private_key')
    subject = ICP.get_param('driverpro.vapid_subject') or 'mailto:support@example.com'
    if not (vapid_pub and vapid_priv):
        return 0

    subs = env['driverpro.push_subscription'].sudo().search([('user_id','=',user.id), ('enabled','=',True)])
    for s in subs:
        try:
            webpush(
                subscription_info={"endpoint": s.endpoint, "keys": {"p256dh": s.p256dh, "auth": s.auth}},
                data=env.json.dumps(payload),
                vapid_private_key=vapid_priv,
                vapid_claims={"sub": subject}
            )
        except WebPushException:
            s.write({'enabled': False})
```

### 1.4. Disparadores de notificaciones
- Al **asignar viaje** → push “Nuevo viaje asignado”.
- En cron, alertas **30/15/5 min** antes de expirar un viaje.
- Flags `alert_30_sent`, `alert_15_sent`, `alert_5_sent` en modelo.

### 1.5. Zona horaria
- Guardar en **UTC**.
- Calcular en **UTC**.
- Convertir a **`user.tz`** en salidas al frontend.

---

## 2) Frontend PWA (React + Vite)

### 2.1. vite.config.js
```js
VitePWA({
  strategies: "injectManifest",
  srcDir: "src",
  filename: "sw.js",
  registerType: "autoUpdate",
  devOptions: { enabled: true },
  manifest: {
    name: "Driver Pro - Chofer",
    short_name: "Driver Pro",
    display: "standalone",
    orientation: "portrait",
    scope: "/",
    start_url: "/",
    icons: [
      { src: "web-app-manifest-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "web-app-manifest-512x512.png", sizes: "512x512", type: "image/png" }
    ]
  }
})
```

### 2.2. Service Worker `src/sw.js`
```js
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data.json(); } catch {}
  const title = data.title || "Driver Pro";
  const options = { body: data.body || "", data };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const d = event.notification.data || {};
  const url = d.trip_id ? `/trip/${d.trip_id}` : "/";
  event.waitUntil(clients.openWindow(url));
});
```

### 2.3. Hook `useWebPush.js`
```js
import { pushAPI } from "../lib/api";

const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
};

export async function ensurePushSubscription() {
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Permiso denegado");
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY),
  });
  await pushAPI.subscribe({ subscription: sub.toJSON(), app: "driver" });
}
```

### 2.4. Helpers de fecha
```js
export function parseServerDate(s) {
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) {
    return new Date(s.replace(" ", "T") + "Z");
  }
  return new Date(s);
}
```

---

## 3) Configuración

1. Generar llaves:
   ```bash
   npx web-push generate-vapid-keys
   ```
2. Guardar en Odoo (`ir.config_parameter`).
3. Poner la pública en `.env`:
   ```
   VITE_VAPID_PUBLIC_KEY=BK_TU_CLAVE_PUBLICA
   ```
4. Usar **HTTPS** (requisito para Push).

---

## 4) Checklist
- [ ] Backend: modelo + controlador + utilidad push.
- [ ] Cron jobs para 30/15/5 min.
- [ ] Frontend: `vite.config.js` con `injectManifest`, `src/sw.js`, hook de suscripción.
- [ ] Helpers de fechas para evitar descompensación.
- [ ] Pruebas en Android y iOS PWA instalada.
