import { useState, useEffect, useCallback } from "react";

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Generar ID único para notificaciones
  const generateId = () =>
    `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Agregar nueva notificación
  const addNotification = useCallback((notification) => {
    const newNotification = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      read: false,
      ...notification,
    };

    setNotifications((prev) => [newNotification, ...prev]);
    console.log("🔔 Nueva notificación agregada:", newNotification);
  }, []);

  // Marcar notificación como leída
  const markAsRead = useCallback((notificationId) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
  }, []);

  // Marcar todas como leídas
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // Limpiar todas las notificaciones
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Remover notificación específica
  const removeNotification = useCallback((notificationId) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  }, []);

  // Actualizar contador de no leídas
  useEffect(() => {
    const count = notifications.filter((n) => !n.read).length;
    setUnreadCount(count);
  }, [notifications]);

  // Procesar notificación del bus de Odoo
  const handleBusNotification = useCallback(
    (message) => {
      console.log("🚌 Notificación del bus recibida:", message);

      if (message && message.type) {
        // Determinar acción basada en el tipo de notificación
        let action = null;

        if (message.trip_id) {
          action = {
            type: "navigate",
            route: `/trip/${message.trip_id}`,
            data: { trip_id: message.trip_id, trip_name: message.trip_name },
          };
        }

        addNotification({
          type: message.type,
          title: message.title || "Notificación",
          body: message.body || "",
          action,
          trip_name: message.trip_name,
          search_id: message.search_id,
          search_name: message.search_name,
          // Agregar datos adicionales del mensaje original
          ...message,
        });
      }
    },
    [addNotification]
  );

  // Limpiar notificaciones antiguas (más de 7 días)
  useEffect(() => {
    const cleanupOldNotifications = () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      setNotifications((prev) =>
        prev.filter((n) => new Date(n.timestamp) > sevenDaysAgo)
      );
    };

    // Limpiar cada hora
    const interval = setInterval(cleanupOldNotifications, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification,
    handleBusNotification,
  };
};
