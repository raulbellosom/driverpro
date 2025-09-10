import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import toast from "react-hot-toast";
import { useTrips, useTripAction } from "../lib/queries";
import TripDetailView from "../components/TripDetailView";
import AppNavigation from "../components/AppNavigation";
import { ArrowLeft, Loader2 } from "lucide-react";

const TripPage = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);

  const {
    data: tripsData,
    isLoading: tripsLoading,
    refetch: refetchTrips,
  } = useTrips();
  const tripAction = useTripAction();

  useEffect(() => {
    if (tripsData?.success && tripsData.data) {
      // Buscar el viaje específico
      const foundTrip = tripsData.data.find((t) => t.id === parseInt(tripId));

      if (foundTrip) {
        setTrip(foundTrip);
      } else {
        // Si no se encuentra el viaje, mostrar error y redirigir
        toast.error("Viaje no encontrado o no tienes permisos para verlo", {
          icon: "🚫",
        });
        navigate("/", { replace: true });
      }
      setLoading(false);
    }
  }, [tripsData, tripId, navigate]);

  const handleTripAction = async ({ action, tripId: actionTripId, data }) => {
    try {
      await tripAction.mutateAsync({
        tripId: actionTripId,
        action,
        data,
      });

      // Solo ejecutar estas acciones si NO hay error
      // Refresh trip data
      await refetchTrips();
      toast.success("Acción ejecutada exitosamente", { icon: "✅" });

      // Si se completa o cancela, volver al home
      if (action === "complete" || action === "cancel") {
        navigate("/");
      }
    } catch (error) {
      console.error("Error en acción del viaje:", error);

      // Mostrar el mensaje específico del servidor si está disponible
      const errorMessage = error.message || "Error al ejecutar la acción";
      toast.error(errorMessage, {
        icon: "❌",
        duration: 5000, // Mostrar por más tiempo para errores importantes
      });
    }
  };

  const handleRefresh = async () => {
    await refetchTrips();
    toast.success("Datos actualizados", { icon: "🔄" });
  };

  const handleBack = () => {
    navigate("/");
  };

  if (loading || tripsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#eff7d0] to-[#c5f0a4] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-[#2a2a2a] animate-spin" />
          <p className="text-[#2a2a2a] font-medium">Cargando viaje...</p>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#eff7d0] to-[#c5f0a4] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#2a2a2a] mb-4">
            Viaje no encontrado
          </h2>
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-[#2a2a2a] hover:text-[#000000] transition-colors mx-auto"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Volver al inicio</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gradient-to-br from-[#eff7d0] to-[#c5f0a4]"
    >
      {/* Navegación */}
      <AppNavigation onRefresh={handleRefresh} />

      <TripDetailView
        trip={trip}
        onBack={handleBack}
        onAction={handleTripAction}
      />
    </motion.div>
  );
};

export default TripPage;
