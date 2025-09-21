// src/utils/pushSupport.js
export function getPushSupport() {
  const ua = (typeof navigator !== "undefined" && navigator.userAgent) || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua);

  // Detección más robusta de modo PWA
  const isStandalone =
    // iOS: window.navigator.standalone
    (typeof window !== "undefined" &&
      window.navigator &&
      window.navigator.standalone === true) ||
    // Android/Desktop: display-mode standalone
    (typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(display-mode: standalone)").matches) ||
    // Fallback: detectar por referrer
    (typeof document !== "undefined" &&
      document.referrer.includes("android-app://"));

  const hasSW =
    typeof navigator !== "undefined" && "serviceWorker" in navigator;
  const hasPush = typeof window !== "undefined" && "PushManager" in window;
  const hasNotif = typeof Notification !== "undefined"; // SAFE: typeof no revienta

  // En iOS navegador, hasNotif = false; en PWA iOS, true.
  const webPushAvailable = hasSW && hasPush && hasNotif;

  // Debug info útil
  const debugInfo = {
    userAgent: ua,
    isIOS,
    isStandalone,
    hasSW,
    hasPush,
    hasNotif,
    webPushAvailable,
    // Información extra para debugging
    windowNavigatorStandalone:
      typeof window !== "undefined" && window.navigator
        ? window.navigator.standalone
        : "undefined",
    displayMode:
      typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia("(display-mode: standalone)").matches
          ? "standalone"
          : window.matchMedia("(display-mode: fullscreen)").matches
          ? "fullscreen"
          : window.matchMedia("(display-mode: minimal-ui)").matches
          ? "minimal-ui"
          : "browser"
        : "unknown",
  };

  return {
    isIOS,
    isStandalone,
    hasSW,
    hasPush,
    hasNotif,
    webPushAvailable,
    debugInfo,
  };
}

export async function ensurePermission() {
  if (typeof Notification === "undefined") {
    return { ok: false, reason: "no-notification-api", perm: "unsupported" };
  }

  try {
    const perm = await Notification.requestPermission();
    return { ok: perm === "granted", perm };
  } catch (error) {
    console.warn("Error requesting notification permission:", error);
    return { ok: false, reason: "request-failed", perm: "default" };
  }
}

export function getNotificationPermission() {
  if (typeof Notification === "undefined") {
    return "unsupported";
  }
  return Notification.permission;
}

export function canUseNotifications() {
  const { webPushAvailable, isIOS, isStandalone } = getPushSupport();

  // En iOS, solo funciona en PWA instalada
  if (isIOS && !isStandalone) {
    return false;
  }

  return webPushAvailable;
}

// Función para debug - útil para diagnosticar problemas
export function logPushSupportInfo() {
  const support = getPushSupport();

  console.group("🔍 Push Support Debug Info");
  console.log("📱 Device Info:", {
    isIOS: support.isIOS,
    isStandalone: support.isStandalone,
    userAgent: support.debugInfo.userAgent,
  });

  console.log("🌐 Web APIs:", {
    serviceWorker: support.hasSW,
    pushManager: support.hasPush,
    notification: support.hasNotif,
  });

  console.log("🔧 PWA Detection:", {
    windowNavigatorStandalone: support.debugInfo.windowNavigatorStandalone,
    displayMode: support.debugInfo.displayMode,
  });

  console.log("✅ Final Result:", {
    webPushAvailable: support.webPushAvailable,
    canUseNotifications: canUseNotifications(),
  });

  // Recomendaciones
  if (support.isIOS && !support.isStandalone) {
    console.warn(
      "⚠️ iOS Safari navegador detectado. Para habilitar notificaciones push:"
    );
    console.log("1️⃣ Toca el botón 'Compartir' 📤");
    console.log("2️⃣ Selecciona 'Añadir a pantalla de inicio' ➕");
    console.log("3️⃣ Abre la app desde la pantalla de inicio");
  }

  console.groupEnd();

  return support;
}

// Función para limpiar Eruda en producción
export function cleanupDevelopmentTools() {
  // Eliminar Eruda en producción
  if (typeof window !== "undefined" && window.eruda && import.meta.env.PROD) {
    try {
      window.eruda.destroy();
      console.log("🧹 Eruda removido en producción");
    } catch (error) {
      console.warn("Error removiendo Eruda:", error);
    }
  }

  // Limpiar otras herramientas de debug
  if (typeof window !== "undefined" && import.meta.env.PROD) {
    // Remover vConsole si existe
    if (window.vConsole) {
      try {
        window.vConsole.destroy();
        console.log("🧹 vConsole removido en producción");
      } catch (error) {
        console.warn("Error removiendo vConsole:", error);
      }
    }
  }
}
