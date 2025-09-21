import React, { useState } from "react";
import { pushAPI } from "../lib/api";
import { toast } from "react-hot-toast";

const PushTestComponent = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const testTypes = [
    { id: "test", label: "Prueba básica", icon: "🔔" },
    { id: "trip_assigned", label: "Viaje asignado", icon: "🚗" },
    { id: "vehicle_assigned", label: "Vehículo asignado", icon: "🚙" },
    { id: "trip_reminder", label: "Recordatorio de viaje", icon: "⏰" },
    { id: "empty_trip_alert", label: "Alerta búsqueda", icon: "⚠️" },
  ];

  const sendTestNotification = async (type) => {
    setIsLoading(true);
    try {
      const result = await pushAPI.test(type);

      if (result.success) {
        toast.success(`✅ ${result.message}`);
        setLastResult(result);
      } else {
        toast.error(`❌ ${result.error || "Error desconocido"}`);
        setLastResult(result);
      }
    } catch (error) {
      const errorMessage = error.message || "Error enviando notificación";
      toast.error(`❌ ${errorMessage}`);
      setLastResult({ success: false, error: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">
        🧪 Pruebas de Notificaciones Push
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {testTypes.map((testType) => (
          <button
            key={testType.id}
            onClick={() => sendTestNotification(testType.id)}
            disabled={isLoading}
            className={`
              flex items-center gap-2 p-3 rounded-lg border-2 transition-all
              ${
                isLoading
                  ? "bg-gray-100 border-gray-300 cursor-not-allowed"
                  : "bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300 cursor-pointer"
              }
            `}
          >
            <span className="text-xl">{testType.icon}</span>
            <span className="text-sm font-medium text-gray-700">
              {testType.label}
            </span>
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-blue-700">
            Enviando notificación...
          </span>
        </div>
      )}

      {lastResult && !isLoading && (
        <div
          className={`
          p-4 rounded-lg border mt-4
          ${
            lastResult.success
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          }
        `}
        >
          <h4
            className={`
            font-medium mb-2
            ${lastResult.success ? "text-green-800" : "text-red-800"}
          `}
          >
            {lastResult.success ? "✅ Éxito" : "❌ Error"}
          </h4>

          <p
            className={`
            text-sm mb-2
            ${lastResult.success ? "text-green-700" : "text-red-700"}
          `}
          >
            {lastResult.success ? lastResult.message : lastResult.error}
          </p>

          {lastResult.success && lastResult.payload && (
            <details className="mt-2">
              <summary className="text-xs text-green-600 cursor-pointer hover:text-green-800">
                Ver payload enviado
              </summary>
              <pre className="text-xs bg-green-100 p-2 rounded mt-1 overflow-x-auto">
                {JSON.stringify(lastResult.payload, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-800 mb-2">💡 Instrucciones</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Asegúrate de estar suscrito a notificaciones push</li>
          <li>• En iOS, la PWA debe estar instalada</li>
          <li>• Verifica que los permisos de notificación estén activados</li>
          <li>• En development, usa HTTPS o túnel (ngrok)</li>
        </ul>
      </div>
    </div>
  );
};

export default PushTestComponent;
