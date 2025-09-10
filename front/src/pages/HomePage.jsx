import { useState } from "react";
import { motion } from "motion/react";
import toast from "react-hot-toast";
import { useAssignment, useTrips, useTripAction } from "../lib/queries";
import { useAuth } from "../contexts/AuthContext";
import VehicleCard from "../components/VehicleCard";
import TripTabs from "../components/TripTabs";
import QuickTripButton from "../components/QuickTripButton";
import QuickTripForm from "../components/QuickTripForm";
import AppNavigation from "../components/AppNavigation";
import { User } from "lucide-react";
import ChatPanel from "../components/ChatPanel";

const HomePage = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [showQuickTripForm, setShowQuickTripForm] = useState(false);
  const [editingTripId, setEditingTripId] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const { logout, user } = useAuth();

  const {
    data: assignmentData,
    isLoading: assignmentLoading,
    refetch: refetchAssignment,
  } = useAssignment();

  const {
    data: tripsData,
    isLoading: tripsLoading,
    refetch: refetchTrips,
  } = useTrips();

  const tripAction = useTripAction();

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchAssignment(), refetchTrips()]);
      toast.success("Datos actualizados", { icon: "🔄" });
    } catch (error) {
      toast.error("Error al actualizar datos", { icon: "❌" });
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Error durante logout:", error);
    }
  };

  const handleBackToList = () => {
    setShowQuickTripForm(false);
    setEditingTripId(null);
  };

  const handleQuickTripClick = () => {
    setShowQuickTripForm(true);
  };

  // Test notification function
  const testNotification = async () => {
    try {
      console.log("📤 Enviando notificación de prueba...");
      const result = await busAPI.sendNotification({
        type: "success",
        title: "🎉 Test de Notificación",
        body: "Esta es una notificación de prueba desde el frontend - deberías verla aparecer en la esquina superior derecha!",
      });

      console.log("✅ Notificación de prueba enviada:", result);
    } catch (error) {
      console.error("❌ Error en test de notificación:", error);
    }
  };

  // Nueva función para probar el bus directamente
  const testBusConnection = async () => {
    console.log("🧪 Probando conexión directa al bus...");
    const result = await busAPI.testConnection();
    console.log("🚌 Resultado del test:", result);
  };

  const handleNavigateToTripForm = (tripId) => {
    // Set the trip ID for editing and show the form
    setEditingTripId(tripId);
    setShowQuickTripForm(true);
  };

  const handleQuickTripSubmit = async (tripData) => {
    try {
      // Refresh trips after successful creation
      await refetchTrips();
      setShowQuickTripForm(false);
      setEditingTripId(null);
    } catch (error) {
      console.error("Error in quick trip submit:", error);
      // Error handling is done in the form component
    }
  };

  if (assignmentLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#c5f0a4] to-[#a9e978] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-[#2a2a2a] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#2a2a2a] font-medium">Cargando información...</p>
        </div>
      </div>
    );
  }

  // Si se está mostrando el formulario de viaje rápido
  if (showQuickTripForm) {
    return (
      <QuickTripForm
        onBack={handleBackToList}
        onSubmit={handleQuickTripSubmit}
        assignmentData={assignmentData}
        editingTripId={editingTripId}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#eff7d0] to-[#c5f0a4]">
      {/* Navegación usando el nuevo componente */}
      <AppNavigation onRefresh={handleRefresh} refreshing={refreshing} />

      {/* Main Content */}
      <main className="pt-6 pb-6">
        <div className="max-w-lg mx-auto px-4 space-y-6">
          {/* Welcome Section */}
          {/* {assignmentData?.success && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-[#a9e978]/20"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-[#c5f0a4] rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-[#2a2a2a]" />
                </div>
                <div>
                  <h2 className="font-semibold text-[#2a2a2a]">¡Hola!</h2>
                  <p className="text-sm text-[#2a2a2a]/70">
                    {assignmentData.data.driver.name}
                  </p>
                </div>
              </div>
            </motion.div>
          )} */}

          {/* Vehicle Card */}
          {assignmentData?.success ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <VehicleCard
                assignment={assignmentData.data}
                loading={assignmentLoading}
              />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-red-200"
            >
              <h3 className="text-lg font-semibold text-red-700 mb-2">
                Sin Asignación
              </h3>
              <p className="text-red-600 text-sm">
                No tienes un vehículo asignado. Contacta al administrador para
                obtener una asignación.
              </p>
            </motion.div>
          )}

          {/* Quick Trip Button */}
          {assignmentData?.success && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <QuickTripButton onClick={handleQuickTripClick} />
            </motion.div>
          )}

          {/* Trip Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <TripTabs
              trips={tripsData?.data || []}
              loading={tripsLoading}
              onUpdate={refetchTrips}
              onNavigateToTripForm={handleNavigateToTripForm}
            />
          </motion.div>
        </div>
      </main>

      {/* Chat Panel */}
      <ChatPanel
        isOpen={showChat}
        onClose={() => setShowChat(false)}
        currentUser={user}
      />
    </div>
  );
};

export default HomePage;
