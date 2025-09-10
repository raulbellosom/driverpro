import { useEffect, useRef, useCallback, useState } from "react";
import { busAPI } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

/**
 * Hook simplificado para el sistema de notificaciones
 * @param {Function} onMessage - Función que se ejecuta cuando llega una notificación
 */
export function useOdooBus(onMessage) {
  const [isConnected, setIsConnected] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const runningRef = useRef(false);
  const { isAuthenticated } = useAuth();

  const stableOnMessage = useCallback(onMessage || (() => {}), []);

  useEffect(() => {
    // Solo proceder si está autenticado
    if (!isAuthenticated || runningRef.current) {
      return;
    }

    console.log("🚀 Iniciando sistema de notificaciones");
    runningRef.current = true;

    const initializeNotifications = async () => {
      try {
        // Obtener información del usuario
        const userResponse = await busAPI.getUserInfo();
        if (!userResponse.success) {
          throw new Error("No se pudo obtener información del usuario");
        }

        const userData = userResponse.data;
        setUserInfo(userData);
        setIsConnected(true);

        console.log(
          "🔔 Sistema de notificaciones listo para usuario:",
          userData.name
        );
      } catch (error) {
        console.error("❌ Error iniciando notificaciones:", error);
        setIsConnected(false);
        runningRef.current = false;
      }
    };

    initializeNotifications();

    // Cleanup function
    return () => {
      console.log("🛑 Limpiando sistema de notificaciones");
      runningRef.current = false;
      setIsConnected(false);
    };
  }, [isAuthenticated, stableOnMessage]);

  return {
    isConnected,
    userInfo,
  };
}
