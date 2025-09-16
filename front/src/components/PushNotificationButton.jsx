import React, { useState, useEffect } from "react";
import {
  Bell,
  TestTube,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { useWebPush } from "../hooks/useWebPush";

const PushNotificationButton = ({
  className = "",
  size = "sm",
  showLabel = true,
}) => {
  const {
    isSupported,
    isSubscribed,
    permission,
    isLoading,
    error,
    subscribe,
    testNotification,
    getStatus,
  } = useWebPush();

  const [status, setStatus] = useState(null);

  // Cargar estado cuando está suscrito
  useEffect(() => {
    if (isSubscribed && isSupported) {
      loadStatus();
    }
  }, [isSubscribed, isSupported]);

  const loadStatus = async () => {
    try {
      const statusData = await getStatus();
      setStatus(statusData);
    } catch (err) {
      // Silenciar errores para evitar loops
      console.warn("Error loading push status:", err.message);
    }
  };

  const handleTest = async () => {
    try {
      await testNotification();
    } catch (err) {
      console.error("Error testing notification:", err);
    }
  };

  // Si no está soportado, no mostrar nada
  if (!isSupported) {
    return null;
  }

  const getStatusIcon = () => {
    if (isLoading) {
      return (
        <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
      );
    }

    if (error) {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }

    if (isSubscribed) {
      return <Bell className="w-4 h-4 text-green-500" />;
    }

    return <Bell className="w-4 h-4 text-gray-400" />;
  };

  const getStatusText = () => {
    if (error) return "Error";
    if (isSubscribed) return "Activas";
    if (permission === "denied") return "Bloqueadas";
    return "Activando...";
  };

  const getButtonText = () => {
    if (isLoading) return "Cargando...";
    if (error) return "Error";
    if (isSubscribed) return "Notificaciones";
    return "Activando...";
  };

  return (
    <div className={`relative ${className}`}>
      {/* Información de estado - sin botón de toggle */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
          {getStatusIcon()}
          {showLabel && <span className="text-sm">{getButtonText()}</span>}
        </div>

        {/* Botón de prueba - solo mostrar si está suscrito */}
        {isSubscribed && (
          <button
            onClick={handleTest}
            className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600 transition-colors"
            title="Enviar notificación de prueba"
          >
            <TestTube className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Estado rápido */}
      {showLabel && (
        <div className="flex items-center gap-1 mt-1">
          <div
            className={`w-2 h-2 rounded-full ${
              isSubscribed
                ? "bg-green-500"
                : permission === "denied"
                ? "bg-red-500"
                : "bg-yellow-500"
            }`}
          />
          <span className="text-xs text-gray-600">{getStatusText()}</span>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Información para permisos denegados */}
      {permission === "denied" && (
        <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-orange-700">
              Las notificaciones están bloqueadas. Habilítalas en la
              configuración del navegador.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PushNotificationButton;
