import { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSessionInfo } from "../lib/queries";
import { authAPI } from "../lib/api";

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
  const [pushAutoSubscribed, setPushAutoSubscribed] = useState(false);

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
          setPushAutoSubscribed(true);
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setPushAutoSubscribed(false);
      }
      setLoading(false);
    }
  }, [sessionData, isLoading, error, pushAutoSubscribed]);

  const autoSubscribePushNotifications = async () => {
    // Solo intentar si el navegador soporta push y no está en desarrollo local
    if (
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window &&
      window.location.protocol === "https:"
    ) {
      try {
        // Importar dinámicamente para evitar errores en SSR
        const { useWebPush } = await import("../hooks/useWebPush");

        // Solo auto-suscribir si los permisos ya están concedidos
        if (Notification.permission === "granted") {
          // Verificar si ya hay una suscripción activa
          const registration = await navigator.serviceWorker.ready;
          const existingSubscription =
            await registration.pushManager.getSubscription();

          if (!existingSubscription) {
            console.log("Auto-suscribiendo a notificaciones push...");
            // Aquí podrías llamar al hook, pero como estamos en un contexto,
            // es mejor mostrar una notificación al usuario para que active manualmente
          }
        }
      } catch (error) {
        console.warn("Error en auto-suscripción push:", error);
      }
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
