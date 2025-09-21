// Service Worker para Driver Pro PWA
// Maneja notificaciones push y cache offline

import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";

// Limpiar caches viejos y precargar archivos
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Configuración específica para iOS (usando self.navigator en SW)
const ua = (self.navigator && self.navigator.userAgent) || "";
const isIOSSafari = /iPad|iPhone|iPod/.test(ua);

// Manejar notificaciones push
self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    console.log("Error parsing push data:", e);
  }

  const title = data.title || "Driver Pro";
  const options = {
    body: data.body || "Tienes una nueva notificación.",
    icon: "/logo.png",
    badge: "/favicon-96x96.png",
    data: data, // útil en notificationclick
    vibrate: [100, 50, 100], // vibración en dispositivos compatibles
    requireInteraction: false, // no requiere interacción para desaparecer
    actions: data.actions || [], // acciones personalizadas si las hay
    silent: false,
    renotify: false,
  };

  // Agregar información adicional basada en el tipo
  if (data.type) {
    switch (data.type) {
      case "assigned_trip":
        options.requireInteraction = true;
        options.tag = `trip-${data.trip_id}`;
        break;
      case "scheduled_trip_reminder":
        options.requireInteraction = true;
        options.tag = `trip-reminder-${data.trip_id}`;
        break;
      case "empty_trip_30":
      case "empty_trip_15":
      case "empty_trip_5":
        options.requireInteraction = true;
        options.tag = `empty-trip-${data.trip_id}`;
        options.vibrate = [200, 100, 200]; // vibración más intensa para alertas
        break;
    }
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

// Manejar clicks en notificaciones
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};

  // Determinar URL a abrir basada en el tipo de notificación
  let url = "/";
  if (data.trip_id) {
    if (data.type && data.type.startsWith("empty_trip")) {
      url = `/?tab=empty-trips&id=${data.trip_id}`;
    } else {
      url = `/trip/${data.trip_id}`;
    }
  }

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // Si ya hay una ventana abierta, enfocarla y navegar
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }

        // Si no hay ventana abierta, abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Manejar instalación del SW
self.addEventListener("install", (event) => {
  console.log("Service Worker installing...");
  // No hacer skipWaiting automáticamente para evitar conflictos
  // self.skipWaiting();
});

// Manejar activación del SW
self.addEventListener("activate", (event) => {
  console.log("Service Worker activating...");
  event.waitUntil(
    Promise.all([
      // No hacer claim automáticamente para evitar conflictos en navegador
      // self.clients.claim(),
      // Limpiar cachés antiguos de forma más conservadora
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Solo eliminar cachés muy antiguos
              return (
                cacheName.startsWith("old-") ||
                cacheName.startsWith("v1-") ||
                cacheName.startsWith("deprecated-")
              );
            })
            .map((cacheName) => caches.delete(cacheName))
        );
      }),
    ])
  );
});

// Manejar navegación offline (muy conservador para evitar interferencias)
self.addEventListener("fetch", (event) => {
  // Solo interceptar en casos muy específicos
  const url = new URL(event.request.url);

  // No interceptar requests a localhost en desarrollo
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
    return;
  }

  // Solo manejar navegaciones HTML principales cuando estamos offline
  if (
    (event.request.mode === "navigate" &&
      event.request.destination === "document" &&
      url.pathname === "/") ||
    url.pathname.startsWith("/trip/")
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Si la respuesta es exitosa, devolverla tal como es
          return response;
        })
        .catch(() => {
          // Solo usar cache como último recurso cuando definitivamente no hay red
          console.log(
            "SW: Network failed for navigation, trying cache fallback"
          );
          return caches.match("/index.html").then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Si no hay cache, devolver una respuesta básica
            return new Response(
              '<!DOCTYPE html><html><head><title>Driver Pro</title></head><body><div id="root">Cargando...</div></body></html>',
              { headers: { "Content-Type": "text/html" } }
            );
          });
        })
    );
  }
});

// Manejar sincronización en background (opcional)
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    console.log("Background sync triggered");
    // Aquí podrías manejar sincronización de datos offline
  }
});

// Log para debugging
console.log("Driver Pro Service Worker loaded");
