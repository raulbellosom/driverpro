import { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSessionInfo } from "../lib/queries";
import { authAPI, pushAPI } from "../lib/api";
import { useWebPush } from "../hooks/useWebPush";
import {
  getPushSupport,
  ensurePermission,
  getNotificationPermission,
  canUseNotifications,
} from "../utils/pushSupport";

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pushAutoSubscribed, setPushAutoSubscribed] = useState(
    () => sessionStorage.getItem("push_auto_subscribed") === "true"
  );

  const queryClient = useQueryClient();
  const { data: sessionData, isLoading, error, refetch } = useSessionInfo();

  useEffect(() => {
    if (!isLoading) {
      if (sessionData?.result?.uid && !error) {
        setIsAuthenticated(true);
        setUser(sessionData.result);

        // Auto-suscribir a notificaciones push después del login
        // (solo una vez por sesión)
        if (!pushAutoSubscribed) {
          autoSubscribePushNotifications();
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
        // Limpiar flag cuando se desautentica
        setPushAutoSubscribed(false);
        sessionStorage.removeItem("push_auto_subscribed");
      }
      setLoading(false);
    }
  }, [sessionData, isLoading, error, pushAutoSubscribed]);

  const autoSubscribePushNotifications = async () => {
    // Solo intentar si el navegador soporta push y estamos en HTTPS
    if (!canUseNotifications() || window.location.protocol !== "https:") {
      const support = getPushSupport();
      if (support.isIOS && !support.isStandalone) {
        console.log(
          "⚠️ iOS navegador detectado. Las notificaciones push solo funcionan cuando la app está instalada como PWA."
        );
      }
      return;
    }

    try {
      // Verificar si ya hay una suscripción activa
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription =
        await registration.pushManager.getSubscription();

      if (existingSubscription) {
        console.log("Ya existe una suscripción de push activa");
        return;
      }

      let permission = getNotificationPermission();

      if (permission === "default") {
        // Solicitar permisos de manera silenciosa
        const result = await ensurePermission();
        permission = result.perm || "default";
      }

      if (permission === "granted") {
        console.log("Iniciando auto-suscripción a notificaciones push...");

        // Obtener la clave pública VAPID
        const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          console.warn("VAPID public key no configurada");
          return;
        }

        // Crear la suscripción
        const urlBase64ToUint8Array = (base64String) => {
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
        };

        const pushSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });

        // Enviar suscripción al servidor
        const response = await pushAPI.subscribe({
          subscription: pushSubscription.toJSON(),
          app: "driver",
        });

        if (response.success) {
          console.log("✅ Auto-suscripción a push notifications exitosa");
          setPushAutoSubscribed(true);
          sessionStorage.setItem("push_auto_subscribed", "true");
        } else {
          console.warn("⚠️ Error en auto-suscripción:", response.error);
        }
      } else if (permission === "denied") {
        console.info("ℹ️ Permisos de notificación denegados por el usuario");
      }
    } catch (error) {
      console.warn("Error en auto-suscripción push:", error);
    }
  };

  const login = async (email, password) => {
    try {
      const result = await authAPI.smartLogin(email, password);
      if (result?.result?.uid) {
        await refetch(); // Refrecar la información de sesión
        return result;
      } else {
        throw new Error("Credenciales inválidas");
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.warn("Error al cerrar sesión en el servidor:", error);
    } finally {
      // Siempre limpiar el estado local
      setIsAuthenticated(false);
      setUser(null);
      setPushAutoSubscribed(false);
      // Limpiar todas las queries en caché
      queryClient?.clear();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
