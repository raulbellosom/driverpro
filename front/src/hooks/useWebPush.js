import { useState, useEffect, useCallback } from "react";
import { pushAPI } from "../lib/api";

/**
 * Hook para manejar notificaciones Web Push
 */
export const useWebPush = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState("default");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [subscription, setSubscription] = useState(null);

  // Verificar soporte del navegador
  useEffect(() => {
    const checkSupport = () => {
      const supported =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;

      setIsSupported(supported);
      setPermission(Notification.permission);
    };

    checkSupport();
  }, []);

  // Verificar suscripción existente al cargar
  useEffect(() => {
    if (isSupported) {
      checkExistingSubscription();
    }
  }, [isSupported]);

  const checkExistingSubscription = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSub = await registration.pushManager.getSubscription();

      if (existingSub) {
        setSubscription(existingSub);
        setIsSubscribed(true);
      }
    } catch (err) {
      console.warn("Error checking existing subscription:", err);
    }
  }, []);

  const urlBase64ToUint8Array = useCallback((base64String) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      throw new Error(
        "Las notificaciones push no están soportadas en este navegador"
      );
    }

    const permission = await Notification.requestPermission();
    setPermission(permission);

    if (permission !== "granted") {
      throw new Error("Permiso de notificaciones denegado");
    }

    return permission;
  }, [isSupported]);

  const subscribe = useCallback(
    async ({ app = "driver" } = {}) => {
      if (!isSupported) {
        throw new Error("Push notifications no soportadas");
      }

      setIsLoading(true);
      setError(null);

      try {
        // Solicitar permisos si es necesario
        if (permission !== "granted") {
          await requestPermission();
        }

        // Obtener la clave pública VAPID
        const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          throw new Error("VAPID public key no configurada");
        }

        // Obtener el service worker registration
        const registration = await navigator.serviceWorker.ready;

        // Verificar si ya existe una suscripción
        let pushSubscription = await registration.pushManager.getSubscription();

        if (!pushSubscription) {
          // Crear nueva suscripción
          pushSubscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
          });
        }

        // Enviar suscripción al servidor
        const response = await pushAPI.subscribe({
          subscription: pushSubscription.toJSON(),
          app: app,
        });

        if (!response.success) {
          throw new Error(response.error || "Error al registrar suscripción");
        }

        setSubscription(pushSubscription);
        setIsSubscribed(true);

        return {
          success: true,
          subscription: pushSubscription,
          message: "Notificaciones push activadas correctamente",
        };
      } catch (err) {
        const errorMessage =
          err.message || "Error activando notificaciones push";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [isSupported, permission, requestPermission, urlBase64ToUint8Array]
  );

  const unsubscribe = useCallback(async () => {
    if (!isSubscribed || !subscription) {
      return { success: true, message: "No hay suscripción activa" };
    }

    setIsLoading(true);
    setError(null);

    try {
      // Desuscribir del servidor primero
      await pushAPI.unsubscribe({
        endpoint: subscription.endpoint,
      });

      // Desuscribir del navegador
      await subscription.unsubscribe();

      setSubscription(null);
      setIsSubscribed(false);

      return {
        success: true,
        message: "Notificaciones push desactivadas",
      };
    } catch (err) {
      const errorMessage =
        err.message || "Error desactivando notificaciones push";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isSubscribed, subscription]);

  const getStatus = useCallback(async () => {
    try {
      const response = await pushAPI.status();
      return response;
    } catch (err) {
      console.warn("Error getting push status:", err);
      return { success: false, subscriptions: [], count: 0 };
    }
  }, []);

  const testNotification = useCallback(async () => {
    if (!isSubscribed) {
      throw new Error("No hay suscripción activa");
    }

    // Enviar notificación de prueba local
    if (permission === "granted") {
      new Notification("Driver Pro - Prueba", {
        body: "Esta es una notificación de prueba local",
        icon: "/logo.png",
        badge: "/favicon-96x96.png",
      });
    }

    return { success: true, message: "Notificación de prueba enviada" };
  }, [isSubscribed, permission]);

  return {
    // Estado
    isSupported,
    isSubscribed,
    permission,
    isLoading,
    error,
    subscription,

    // Métodos
    subscribe,
    unsubscribe,
    requestPermission,
    getStatus,
    testNotification,
    checkExistingSubscription,
  };
};

export default useWebPush;
