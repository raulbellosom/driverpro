import React, { useState, useEffect } from "react";
import { Smartphone, Wifi, WifiOff } from "lucide-react";

const PWAStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installPromptShown, setInstallPromptShown] = useState(false);

  useEffect(() => {
    // Detectar modo standalone
    const checkStandalone = () => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true;
      setIsStandalone(standalone);
    };

    checkStandalone();
    window.addEventListener("resize", checkStandalone);

    // Detectar cambios de conexión
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Detectar evento de instalación disponible
    const handleBeforeInstallPrompt = (e) => {
      setInstallPromptShown(true);
      console.log("PWA: Install prompt available");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("resize", checkStandalone);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  // No mostrar nada si estamos en modo standalone
  if (isStandalone) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Estado de conexión */}
      <div
        className={`mb-2 px-3 py-2 rounded-lg shadow-lg text-sm font-medium ${
          isOnline ? "bg-green-500 text-white" : "bg-red-500 text-white"
        }`}
      >
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="w-4 h-4" />
          ) : (
            <WifiOff className="w-4 h-4" />
          )}
          {isOnline ? "En línea" : "Sin conexión"}
        </div>
      </div>

      {/* Estado de PWA */}
      {!isStandalone && (
        <div className="bg-blue-500 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            <span>
              {installPromptShown ? "¡Instalable como app!" : "Versión web"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PWAStatus;
