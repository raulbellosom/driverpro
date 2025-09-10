import React, { useEffect } from "react";
import { motion } from "motion/react";
import { useOdooBus } from "../hooks/useOdooBus";
import { Bell } from "lucide-react";
import toast from "react-hot-toast";

export const NotificationSystem = ({ onNotificationReceived }) => {
  const handleNotification = (notification) => {
    console.log("📨 Nueva notificación recibida:", notification);

    // Generar mensaje personalizado según el tipo
    let message = notification.title || notification.body;
    let toastConfig = {
      duration: 4000,
      position: "top-right",
    };

    // Personalizar mensaje y duración según el tipo de notificación
    switch (notification.type) {
      case "trip_created":
        message = `🚗 ${notification.title}: ${notification.body}`;
        toast.success(message, { ...toastConfig, duration: 6000 });
        break;

      case "trip_assigned":
        message = `📋 ${notification.title}: ${notification.body}`;
        toast.success(message, { ...toastConfig, duration: 6000 });
        break;

      case "scheduled_trip_reminder":
        message = `⏰ ${notification.title}: ${notification.body}`;
        toast(message, { ...toastConfig, duration: 8000 });
        break;

      case "empty_trip_warning":
        message = `⚠️ ${notification.title}: ${notification.body}`;
        toast.error(message, { ...toastConfig, duration: 6000 });
        break;

      case "empty_trip_success":
        message = `✅ ${notification.title}: ${notification.body}`;
        toast.success(message, { ...toastConfig, duration: 5000 });
        break;

      case "recharge_confirmed":
        message = `💳 ${notification.title}: ${notification.body}`;
        toast.success(message, { ...toastConfig, duration: 5000 });
        break;

      case "success":
        toast.success(message, toastConfig);
        break;

      case "warning":
        toast.error(message, toastConfig);
        break;

      case "info":
        toast(message, toastConfig);
        break;

      case "error":
        toast.error(message, toastConfig);
        break;

      default:
        toast(message, toastConfig);
    }

    // Enviar al componente padre para agregarlo al panel
    if (onNotificationReceived) {
      onNotificationReceived({
        ...notification,
        displayMessage: message, // Mensaje formateado para el panel
      });
    }
  };

  const { isConnected, userInfo } = useOdooBus(handleNotification);

  // Mostrar toast de advertencia solo cuando se desconecta
  useEffect(() => {
    if (userInfo && !isConnected) {
      toast.error("Sin conexión en tiempo real", {
        duration: 3000,
        id: "connection-lost", // Evita duplicados
      });
    }
  }, [isConnected, userInfo]);

  return null; // El componente no renderiza nada visible
};

export default NotificationSystem;
