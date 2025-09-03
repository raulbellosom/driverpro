import { useState } from "react";
import { motion } from "motion/react";
import toast from "react-hot-toast";
import { useAssignment, useTrips, useTripAction } from "../lib/queries";
import { useAuth } from "../contexts/AuthContext";
import VehicleCard from "../components/VehicleCard";
import TripTabs from "../components/TripTabs";
import QuickTripButton from "../components/QuickTripButton";
import QuickTripForm from "../components/QuickTripForm";
import { RefreshCw, LogOut, User } from "lucide-react";

const HomePage = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [showQuickTripForm, setShowQuickTripForm] = useState(false);
  const { logout } = useAuth();

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
  };

  const handleQuickTripClick = () => {
    setShowQuickTripForm(true);
  };

  const handleQuickTripSubmit = async (tripData) => {
    try {
      // Refresh trips after successful creation
      await refetchTrips();
      setShowQuickTripForm(false);
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
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#eff7d0] to-[#c5f0a4]">
      {/* Fixed Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-lg border-b border-[#a9e978]/20">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo y nombre */}
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Driver Pro Logo"
              className="w-8 h-8 object-contain"
            />
            <h1 className="text-xl font-bold text-[#2a2a2a]">DriverPro</h1>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 text-[#2a2a2a] hover:text-[#000000] disabled:opacity-50 hover:bg-[#c5f0a4]/20 rounded-lg transition-colors"
              title="Actualizar"
            >
              <RefreshCw
                className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>

            <button
              onClick={handleLogout}
              className="p-2 text-[#2a2a2a] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content - con padding top para el navbar fijo */}
      <main className="pt-16 pb-6">
        <div className="max-w-lg mx-auto px-4 space-y-6">
          {/* Welcome Section */}
          {assignmentData?.success && (
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
          )}

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
            <TripTabs trips={tripsData?.data || []} loading={tripsLoading} />
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
