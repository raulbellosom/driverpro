// src/utils/pushSupport.js
export function getPushSupport() {
  const ua = (typeof navigator !== "undefined" && navigator.userAgent) || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isStandalone =
    (typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(display-mode: standalone)").matches) ||
    (typeof window !== "undefined" &&
      window.navigator &&
      window.navigator.standalone);

  const hasSW =
    typeof navigator !== "undefined" && "serviceWorker" in navigator;
  const hasPush = typeof window !== "undefined" && "PushManager" in window;
  const hasNotif = typeof Notification !== "undefined"; // SAFE: typeof no revienta

  // En iOS navegador, hasNotif = false; en PWA iOS, true.
  const webPushAvailable = hasSW && hasPush && hasNotif;

  return { isIOS, isStandalone, hasSW, hasPush, hasNotif, webPushAvailable };
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
