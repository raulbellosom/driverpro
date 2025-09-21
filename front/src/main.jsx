import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import {
  logPushSupportInfo,
  cleanupDevelopmentTools,
} from "./utils/pushSupport";

// Registro inteligente del Service Worker
const registerSW = async () => {
  // Verificar que estamos en un entorno seguro
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  try {
    // Solo registrar en producción o si estamos en PWA mode
    const isPWA =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone ||
      document.referrer.includes("android-app://");

    const isProduction = import.meta.env.PROD;

    // Registrar SW solo en producción o cuando ya estamos en modo PWA
    if (isProduction || isPWA) {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });

      console.log("SW registrado exitosamente:", registration);

      // Manejar actualizaciones
      registration.addEventListener("updatefound", () => {
        console.log("Nueva versión del SW disponible");
      });
    } else {
      console.log("SW no registrado - modo desarrollo sin PWA");
    }
  } catch (error) {
    console.warn("Error registrando SW:", error);
  }
};

// Registrar SW después de que la página se cargue
if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    // Limpiar herramientas de desarrollo en producción
    cleanupDevelopmentTools();

    // Registrar Service Worker
    registerSW();

    // Debug info en desarrollo
    if (!import.meta.env.PROD) {
      // Pequeño delay para que todo se cargue
      setTimeout(() => {
        logPushSupportInfo();
      }, 1000);
    }
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
