// Service Worker para Driver Pro PWA
// Maneja notificaciones push y cache offline

import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";

// Limpiar caches viejos y precargar archivos
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

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
  self.skipWaiting();
});

// Manejar activación del SW
self.addEventListener("activate", (event) => {
  console.log("Service Worker activating...");
  event.waitUntil(self.clients.claim());
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
