import React, { useState, useEffect } from "react";
import { Download, X, Smartphone, Monitor } from "lucide-react";

const InstallPWAPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInStandaloneMode, setIsInStandaloneMode] = useState(false);

  useEffect(() => {
    // Detectar iOS
    const isIOSDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    // Detectar si ya está en modo standalone
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    setIsInStandaloneMode(isStandalone);

    // Evento para capturar el prompt de instalación (Chrome/Edge/Android)
    const handleBeforeInstallPrompt = (e) => {
      console.log("PWA: beforeinstallprompt event captured");
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    // Evento cuando la app se instala
    const handleAppInstalled = () => {
      console.log("PWA: App was installed");
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // Para iOS, mostrar el prompt después de unos segundos si no está instalado
    if (isIOSDevice && !isStandalone) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000); // Mostrar después de 3 segundos

      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Para Chrome/Edge/Android
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`PWA: User response to install prompt: ${outcome}`);

      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setShowPrompt(false);
      }
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Volver a mostrar en 24 horas
    localStorage.setItem("pwa-prompt-dismissed", Date.now().toString());
  };

  // No mostrar si ya está instalado o si fue rechazado recientemente
  if (isInStandaloneMode) return null;

  const dismissed = localStorage.getItem("pwa-prompt-dismissed");
  if (dismissed && Date.now() - parseInt(dismissed) < 24 * 60 * 60 * 1000) {
    return null;
  }

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {isIOS ? (
              <Smartphone className="w-5 h-5 text-blue-500" />
            ) : (
              <Monitor className="w-5 h-5 text-green-500" />
            )}
            <h3 className="font-medium text-gray-900">Instalar Driver Pro</h3>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          {isIOS
            ? "Instala la app en tu pantalla de inicio para recibir notificaciones push y acceso rápido."
            : "Instala la app para un acceso más rápido y notificaciones push."}
        </p>

        {isIOS ? (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-medium">Para instalar:</p>
            <ol className="text-xs text-gray-600 space-y-1 ml-4">
              <li>1. Toca el botón de compartir en Safari</li>
              <li>2. Selecciona "Añadir a pantalla de inicio"</li>
              <li>3. Toca "Añadir"</li>
            </ol>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-1"
            >
              <Download className="w-4 h-4" />
              Instalar App
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm transition-colors"
            >
              Ahora no
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstallPWAPrompt;
