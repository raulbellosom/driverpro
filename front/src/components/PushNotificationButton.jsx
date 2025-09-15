import React, { useState, useEffect } from "react";
import {
  Bell,
  BellOff,
  Settings,
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
    unsubscribe,
    testNotification,
    getStatus,
  } = useWebPush();

  const [showDetails, setShowDetails] = useState(false);
  const [status, setStatus] = useState(null);

  // Cargar estado al montar el componente
  useEffect(() => {
    if (isSubscribed) {
      loadStatus();
    }
  }, [isSubscribed]);

  const loadStatus = async () => {
    try {
      const statusData = await getStatus();
      setStatus(statusData);
    } catch (err) {
      console.warn("Error loading push status:", err);
    }
  };

  const handleToggle = async () => {
    try {
      if (isSubscribed) {
        await unsubscribe();
        setStatus(null);
      } else {
        await subscribe({ app: "driver" });
        await loadStatus();
      }
    } catch (err) {
      // El error ya se maneja en el hook
      console.error("Error toggling push notifications:", err);
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

    return <BellOff className="w-4 h-4 text-gray-400" />;
  };

  const getStatusText = () => {
    if (error) return "Error";
    if (isSubscribed) return "Activas";
    if (permission === "denied") return "Bloqueadas";
    return "Inactivas";
  };

  const getButtonText = () => {
    if (isLoading) return "Procesando...";
    if (isSubscribed) return "Desactivar Push";
    return "Activar Push";
  };

  const getButtonColor = () => {
    if (isSubscribed) {
      return "bg-green-600 hover:bg-green-700 text-white";
    }
    return "bg-blue-600 hover:bg-blue-700 text-white";
  };

  return (
    <div className={`relative ${className}`}>
      {/* Botón principal */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleToggle}
          disabled={isLoading || permission === "denied"}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
            ${getButtonColor()}
          `}
        >
          {getStatusIcon()}
          {showLabel && <span className="text-sm">{getButtonText()}</span>}
        </button>

        {/* Botón de detalles */}
        {isSubscribed && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
            title="Ver detalles"
          >
            <Settings className="w-4 h-4" />
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
                : "bg-gray-400"
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

      {/* Panel de detalles */}
      {showDetails && isSubscribed && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4">
            <h3 className="font-medium text-gray-900 mb-3">
              Estado de Notificaciones Push
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Estado:</span>
                <span className="flex items-center gap-1 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Activadas
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Permisos:</span>
                <span className="text-sm capitalize">{permission}</span>
              </div>

              {status && status.count > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Dispositivos:</span>
                  <span className="text-sm">{status.count}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-200">
              <button
                onClick={handleTest}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors"
              >
                <TestTube className="w-4 h-4" />
                Prueba de Notificación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Información para usuarios no soportados */}
      {!isSupported && showLabel && (
        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              Tu navegador no soporta notificaciones push
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PushNotificationButton;
