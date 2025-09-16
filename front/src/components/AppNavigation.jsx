import React from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../hooks/useNotifications";
import { useOdooBus } from "../hooks/useOdooBus";
import NotificationPanel from "./NotificationPanel";
import NotificationSystem from "./NotificationSystem";
import { RefreshCw, LogOut, User, Menu } from "lucide-react";

const AppNavigation = ({ onRefresh, refreshing = false }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    clearAll,
    handleBusNotification,
  } = useNotifications();

  // Obtener estado de conexión del bus
  const { isConnected } = useOdooBus(() => {});

  const handleNotificationClick = (notification) => {
    console.log("🔔 Clic en notificación:", notification);

    // Marcar como leída al hacer clic
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Manejar navegación si tiene acción
    if (notification.trip_id) {
      navigate(`/trip/${notification.trip_id}`);
    } else if (notification.search_id) {
      // Navegar a búsqueda de clientes si existe esa vista
      console.log("Navegar a búsqueda:", notification.search_id);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const handleRefresh = () => {
    if (onRefresh && !refreshing) {
      onRefresh();
    }
  };

  return (
    <>
      {/* Barra de navegación sticky con safe area para iOS */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`sticky top-0 z-50 bg-white/95 backdrop-blur-md shadow-sm nav-safe-area-reset ${
          !isConnected
            ? "border-b-2 border-yellow-400"
            : "border-b border-gray-200/50"
        }`}
        style={{
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo y navegación principal */}
            <div className="flex items-center space-x-6">
              <motion.button
                className="flex items-center space-x-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/")}
              >
                <img
                  src="/logo.png"
                  alt="Driver Pro Logo"
                  className="w-8 h-8 object-contain"
                />
                <h1 className="text-xl font-bold text-gray-900 hidden sm:block">
                  Driver Pro
                </h1>
              </motion.button>
            </div>

            {/* Controles del usuario */}
            <div className="flex items-center space-x-2">
              {/* Botón de refresh */}
              {onRefresh && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-2 text-gray-600 hover:text-[#2a2a2a] disabled:opacity-50 hover:bg-[#c5f0a4]/20 rounded-lg transition-colors"
                  title="Actualizar"
                >
                  <RefreshCw
                    className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`}
                  />
                </motion.button>
              )}

              {/* Panel de Notificaciones */}
              <NotificationPanel
                notifications={notifications}
                onNotificationClick={handleNotificationClick}
                onMarkAsRead={markAsRead}
                onClearAll={clearAll}
              />

              {/* Info del usuario */}
              <div className="hidden sm:flex items-center space-x-3 pl-3 border-l border-gray-200">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {user?.name || "Usuario"}
                  </span>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLogout}
                  className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Salir</span>
                </motion.button>
              </div>

              {/* Menú móvil */}
              <div className="sm:hidden flex items-center space-x-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleLogout}
                  className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                  title="Salir"
                >
                  <LogOut className="w-5 h-5" />
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Sistema de notificaciones que conecta con el panel */}
      <NotificationSystem onNotificationReceived={handleBusNotification} />
    </>
  );
};

export default AppNavigation;
