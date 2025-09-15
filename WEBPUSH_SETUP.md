# Driver Pro - Configuración de Notificaciones Web Push

Este documento describe cómo configurar las notificaciones Web Push en Driver Pro para que funcionen tanto en el backend (Odoo) como en el frontend (PWA React).

## 📋 Requisitos

- **HTTPS**: Las notificaciones push solo funcionan con HTTPS (requisito del navegador)
- **Navegador compatible**: Chrome, Firefox, Safari 16.4+, Edge
- **PWA instalada**: Para iOS es necesario que la PWA esté instalada en la pantalla de inicio

## 🔧 Configuración del Backend (Odoo)

### 1. Instalar dependencias Python

```bash
pip install pywebpush==2.0.0 cryptography>=41.0.0
```

### 2. Actualizar el módulo Driver Pro

1. Asegúrate de que todos los archivos nuevos estén en su lugar:

   - `models/driverpro_push_subscription.py`
   - `controllers/push_api.py`
   - `utils/push.py`
   - `data/driverpro_vapid_config.xml`

2. Actualizar el módulo en Odoo:
   ```
   Aplicaciones → Driver Pro → Actualizar
   ```

### 3. Verificar configuración VAPID

Las llaves VAPID ya están configuradas automáticamente. Para verificar o cambiar:

1. Ir a **Configuración → Técnico → Parámetros → Parámetros del sistema**
2. Buscar:
   - `driverpro.vapid_public_key`
   - `driverpro.vapid_private_key`
   - `driverpro.vapid_subject`

### 4. Verificar crons

Asegúrate de que estén activos los trabajos cron para alertas:

- **Driver Pro: Verificar alertas de búsquedas** (cada 2-3 minutos)
- **Driver Pro: Enviar notificaciones programadas** (cada 5 minutos)

## 🌐 Configuración del Frontend (PWA)

### 1. Variables de entorno

El archivo `.env` ya está configurado con:

```
VITE_VAPID_PUBLIC_KEY=BOEecnq3Xa9xCQDGa5gBJ7BiWIJhy5EJ7gCDWi7xB4wyuxJgTgGVkK4mNlw51KhLbNKniepDty4xVdRneI1koaM
```

### 2. Service Worker

El Service Worker (`src/sw.js`) ya está configurado para manejar:

- Eventos push
- Clicks en notificaciones
- Navegación automática a viajes

### 3. Verificar HTTPS en desarrollo

Para desarrollo local con HTTPS:

```bash
# Opción 1: Vite con certificado auto-firmado
npm run dev -- --https

# Opción 2: Usar ngrok para túnel HTTPS
npx ngrok http 5173
```

## 📱 Uso de las Notificaciones

### 1. Activar notificaciones

1. En la app, buscar el ícono de campana en la navegación superior
2. Hacer clic en **"Activar Push"**
3. Aceptar permisos cuando el navegador lo solicite

### 2. Tipos de notificaciones

El sistema enviará notificaciones push para:

- **Asignación de viaje**: Cuando se asigna un nuevo viaje al chofer
- **Recordatorio de viaje programado**: 15 minutos antes del viaje
- **Alertas de búsqueda**:
  - 30 minutos antes de que expire
  - 15 minutos antes de que expire
  - 5 minutos antes de que expire

### 3. Comportamiento

- **App abierta**: Se muestran toasts + notificaciones push
- **App cerrada/background**: Solo notificaciones push
- **Click en notificación**: Abre la app y navega al viaje correspondiente

## 🔍 Pruebas y Debugging

### 1. Probar notificaciones

En el botón de notificaciones, usar **"Prueba de Notificación"** para verificar que funciona.

### 2. Verificar en consola del navegador

```javascript
// Verificar registro del service worker
navigator.serviceWorker.getRegistrations().then(console.log);

// Verificar suscripción push
navigator.serviceWorker.ready
  .then((reg) => reg.pushManager.getSubscription())
  .then(console.log);

// Verificar permisos
console.log("Notification permission:", Notification.permission);
```

### 3. Logs del servidor

Los logs de Odoo mostrarán:

- Suscripciones registradas/actualizadas
- Notificaciones push enviadas exitosamente
- Suscripciones marcadas como fallidas

### 4. Errores comunes

**"No soportado"**: Verificar HTTPS y navegador compatible
**"Permiso denegado"**: Usuario debe re-permitir notificaciones en configuración del navegador
**"VAPID no configurado"**: Verificar parámetros del sistema en Odoo
**"Error 410/404"**: Suscripción inválida, se auto-deshabilita

## 📱 Configuración específica por plataforma

### Android (Chrome/Edge)

- ✅ Funciona inmediatamente con permisos concedidos
- ✅ Funciona en background sin instalar PWA

### iOS (Safari 16.4+)

- ⚠️ **Requiere PWA instalada** (Add to Home Screen)
- ✅ Funciona después de instalación y permisos concedidos
- ⚠️ Solo en iOS 16.4 o superior

### Desktop

- ✅ Chrome, Firefox, Edge: funcionan perfectamente
- ✅ Safari: requiere configuración adicional de permisos

## 🔄 Actualización de llaves VAPID

Si necesitas cambiar las llaves VAPID:

1. Generar nuevas llaves:

   ```bash
   npx web-push generate-vapid-keys
   ```

2. Actualizar en Odoo (Parámetros del sistema)
3. Actualizar en frontend (archivo `.env`)
4. Reiniciar servicios
5. Los usuarios necesitarán volver a suscribirse

## 🚨 Consideraciones de Seguridad

- ⚠️ **NUNCA** exponer la clave privada VAPID
- 🔒 Mantener las llaves VAPID seguras en el servidor
- 🔄 Rotar llaves periódicamente (recomendado cada 6-12 meses)
- 📝 Auditar logs de notificaciones push regularmente

## 🎯 Próximas mejoras

- [ ] Panel de administración para gestionar suscripciones
- [ ] Estadísticas de entrega de notificaciones
- [ ] Notificaciones personalizadas por tipo de usuario
- [ ] Integración con notificaciones por email como fallback
- [ ] Soporte para Rich Notifications con imágenes/acciones
