import React, { useState, useEffect } from "react";
import {
  Bell,
  BellOff,
  Smartphone,
  Monitor,
  Shield,
  X,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { useWebPush } from "../hooks/useWebPush";

const NotificationPermissionGuide = () => {
  const { isSupported, isSubscribed, permission, isLoading, subscribe, error } =
    useWebPush();

  const [showGuide, setShowGuide] = useState(false);
  const [userAgent, setUserAgent] = useState("");

  useEffect(() => {
    // Detectar el tipo de dispositivo/navegador
    const ua = navigator.userAgent;
    setUserAgent(ua);

    // Mostrar guía si las notificaciones no están configuradas
    if (isSupported && permission === "default") {
      const timer = setTimeout(() => {
        setShowGuide(true);
      }, 5000); // Mostrar después de 5 segundos

      return () => clearTimeout(timer);
    }
  }, [isSupported, permission]);

  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);
  const isWindows = /Windows/.test(userAgent);
  const isMacOS = /Mac OS X/.test(userAgent);

  const handleRequestPermission = async () => {
    try {
      await subscribe({ app: "driver" });
      setShowGuide(false);
    } catch (err) {
      console.error("Error requesting permission:", err);
      // No mostrar error agresivo que pueda romper la app
      setShowGuide(false);
    }
  };

  const getDeviceInstructions = () => {
    if (isIOS) {
      return {
        icon: <Smartphone className="w-6 h-6" />,
        platform: "iOS Safari",
        steps: [
          "Toca el botón de 'Compartir' en Safari",
          "Selecciona 'Agregar a pantalla de inicio'",
          "Las notificaciones funcionarán solo en la app instalada",
        ],
        note: "⚠️ iOS requiere instalar la app para recibir notificaciones",
      };
    }

    if (isAndroid) {
      return {
        icon: <Smartphone className="w-6 h-6" />,
        platform: "Android Chrome",
        steps: [
          "Chrome mostrará un popup pidiendo permisos",
          "Selecciona 'Permitir' para recibir notificaciones",
          "También puedes instalar la app desde el navegador",
        ],
        note: "✅ Android tiene el mejor soporte para notificaciones web",
      };
    }

    if (isWindows) {
      return {
        icon: <Monitor className="w-6 h-6" />,
        platform: "Windows Chrome/Edge",
        steps: [
          "El navegador mostrará un popup de permisos",
          "Haz clic en 'Permitir' para activar notificaciones",
          "Las notificaciones aparecerán en el centro de notificaciones de Windows",
        ],
        note: "✅ Windows soporta notificaciones web nativas",
      };
    }

    if (isMacOS) {
      return {
        icon: <Monitor className="w-6 h-6" />,
        platform: "macOS Safari/Chrome",
        steps: [
          "Safari/Chrome mostrará un diálogo de permisos",
          "Selecciona 'Permitir' para habilitar notificaciones",
          "Las notificaciones aparecerán en el centro de notificaciones de macOS",
        ],
        note: "✅ macOS soporta notificaciones web",
      };
    }

    return {
      icon: <Monitor className="w-6 h-6" />,
      platform: "Navegador Web",
      steps: [
        "Tu navegador mostrará un popup pidiendo permisos",
        "Selecciona 'Permitir' para recibir notificaciones",
        "Podrás recibir alertas de viajes y recordatorios",
      ],
      note: "ℹ️ El soporte varía según el navegador y sistema operativo",
    };
  };

  const instructions = getDeviceInstructions();

  if (!isSupported) {
    return null;
  }

  if (permission === "granted" && isSubscribed) {
    return null;
  }

  if (!showGuide) {
    return null;
  }

  // Render solo si todo está bien y no hay errores críticos
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Habilitar Notificaciones
              </h2>
              <p className="text-sm text-gray-500">{instructions.platform}</p>
            </div>
          </div>
          <button
            onClick={() => setShowGuide(false)}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            {instructions.icon}
            <div>
              <h3 className="font-medium text-gray-900">
                Recibe alertas importantes
              </h3>
              <p className="text-sm text-gray-600">
                Nuevos viajes, recordatorios y actualizaciones
              </p>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-3 mb-4">
            <h4 className="font-medium text-gray-900">Pasos a seguir:</h4>
            {instructions.steps.map((step, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </div>
                <p className="text-sm text-gray-700">{step}</p>
              </div>
            ))}
          </div>

          {/* Note */}
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <p className="text-sm text-gray-600">{instructions.note}</p>
          </div>

          {/* Current Status */}
          <div className="flex items-center gap-2 mb-4">
            {permission === "default" && (
              <>
                <AlertCircle className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-gray-600">
                  Permisos no solicitados aún
                </span>
              </>
            )}
            {permission === "denied" && (
              <>
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-600">
                  Permisos denegados - Revisa configuración del navegador
                </span>
              </>
            )}
            {permission === "granted" && !isSubscribed && (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600">
                  Permisos concedidos - Configurando suscripción...
                </span>
              </>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={() => setShowGuide(false)}
            className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Ahora no
          </button>
          <button
            onClick={handleRequestPermission}
            disabled={isLoading || permission === "denied"}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Configurando..." : "Habilitar"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPermissionGuide;
