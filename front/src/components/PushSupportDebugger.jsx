import React, { useState, useEffect } from "react";
import { getPushSupport, logPushSupportInfo } from "../utils/pushSupport";

const PushSupportDebugger = () => {
  const [support, setSupport] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const supportInfo = getPushSupport();
    setSupport(supportInfo);
  }, []);

  if (!support || import.meta.env.PROD) {
    return null; // No mostrar en producción
  }

  const getStatusColor = (value) => {
    if (value === true) return "text-green-600";
    if (value === false) return "text-red-600";
    return "text-yellow-600";
  };

  const getStatusIcon = (value) => {
    if (value === true) return "✅";
    if (value === false) return "❌";
    return "⚠️";
  };

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg max-w-sm z-50">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-bold">🔍 Push Debug</h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs bg-gray-700 px-2 py-1 rounded"
        >
          {showDetails ? "Ocultar" : "Detalles"}
        </button>
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span>iOS:</span>
          <span className={getStatusColor(support.isIOS)}>
            {getStatusIcon(support.isIOS)} {support.isIOS ? "Sí" : "No"}
          </span>
        </div>

        <div className="flex justify-between">
          <span>PWA Instalada:</span>
          <span className={getStatusColor(support.isStandalone)}>
            {getStatusIcon(support.isStandalone)}{" "}
            {support.isStandalone ? "Sí" : "No"}
          </span>
        </div>

        <div className="flex justify-between">
          <span>Push Disponible:</span>
          <span className={getStatusColor(support.webPushAvailable)}>
            {getStatusIcon(support.webPushAvailable)}{" "}
            {support.webPushAvailable ? "Sí" : "No"}
          </span>
        </div>

        {showDetails && (
          <div className="mt-2 pt-2 border-t border-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>Service Worker:</span>
              <span className={getStatusColor(support.hasSW)}>
                {getStatusIcon(support.hasSW)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Push Manager:</span>
              <span className={getStatusColor(support.hasPush)}>
                {getStatusIcon(support.hasPush)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Notification API:</span>
              <span className={getStatusColor(support.hasNotif)}>
                {getStatusIcon(support.hasNotif)}
              </span>
            </div>

            <div className="text-gray-300 mt-2">
              <div>Display: {support.debugInfo.displayMode}</div>
              <div>
                iOS Standalone:{" "}
                {support.debugInfo.windowNavigatorStandalone?.toString() ||
                  "N/A"}
              </div>
            </div>
          </div>
        )}

        {support.isIOS && !support.isStandalone && (
          <div className="mt-2 p-2 bg-yellow-600 text-black rounded text-xs">
            <strong>💡 Tip:</strong> En iOS, instala la app como PWA para
            habilitar notificaciones push.
          </div>
        )}
      </div>

      <button
        onClick={() => logPushSupportInfo()}
        className="mt-2 w-full text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
      >
        Log Info Completa
      </button>
    </div>
  );
};

export default PushSupportDebugger;
