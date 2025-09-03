import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  MapPin,
  Users,
  Clock,
  CreditCard,
  Play,
  Pause,
  Square,
  AlertTriangle,
} from "lucide-react";
import { driverAPI } from "../lib/api";

const TripDetailView = ({ trip, onBack, onAction }) => {
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [selectedReasonId, setSelectedReasonId] = useState("");
  const [pauseNotes, setPauseNotes] = useState("");
  const [pauseReasons, setPauseReasons] = useState([]);
  const [loadingReasons, setLoadingReasons] = useState(false);

  // Cargar motivos de pausa cuando se monta el componente
  useEffect(() => {
    const loadPauseReasons = async () => {
      setLoadingReasons(true);
      try {
        const response = await driverAPI.getPauseReasons();
        if (response.success) {
          setPauseReasons(response.data);
        }
      } catch (error) {
        console.error("Error cargando motivos de pausa:", error);
      } finally {
        setLoadingReasons(false);
      }
    };

    loadPauseReasons();
  }, []);

  const getStatusColor = (state) => {
    switch (state) {
      case "draft":
        return "bg-gray-500";
      case "active":
        return "bg-blue-500";
      case "paused":
        return "bg-yellow-500";
      case "done":
        return "bg-green-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (state) => {
    switch (state) {
      case "draft":
        return "Pendiente";
      case "active":
        return "En Progreso";
      case "paused":
        return "Pausado";
      case "done":
        return "Completado";
      case "cancelled":
        return "Cancelado";
      default:
        return "Desconocido";
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "No programado";

    // La fecha viene del servidor, la tratamos directamente
    const date = new Date(dateStr);

    return date.toLocaleString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const handleStartTrip = () => {
    onAction({ action: "start", tripId: trip.id });
  };

  const handlePauseTrip = () => {
    if (trip.state === "paused") {
      onAction({ action: "resume", tripId: trip.id });
    } else {
      setShowPauseModal(true);
    }
  };

  const handleClosePauseModal = () => {
    setShowPauseModal(false);
    setSelectedReasonId("");
    setPauseNotes("");
  };

  const handleConfirmPause = () => {
    const data = {
      notes: pauseNotes,
    };

    // Solo agregar reason_id si se seleccionó un motivo
    if (selectedReasonId) {
      data.reason_id = parseInt(selectedReasonId);
    }

    onAction({
      action: "pause",
      tripId: trip.id,
      data: data,
    });
    setShowPauseModal(false);
    setSelectedReasonId("");
    setPauseNotes("");
  };

  const handleCompleteTrip = () => {
    onAction({ action: "complete", tripId: trip.id });
  };

  const handleCancelTrip = () => {
    if (confirm("¿Estás seguro de que quieres cancelar este viaje?")) {
      onAction({ action: "cancel", tripId: trip.id });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#eff7d0] to-[#c5f0a4] pt-16">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-lg border-b border-[#a9e978]/20">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#2a2a2a] hover:text-[#000000] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Volver</span>
          </button>
          <h1 className="text-lg font-bold text-[#2a2a2a]">{trip.name}</h1>
          <div
            className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(
              trip.state
            )}`}
          >
            {getStatusText(trip.state)}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Trip Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-[#a9e978]/20"
        >
          <h2 className="text-lg font-semibold text-[#2a2a2a] mb-4">
            Información del Viaje
          </h2>

          {/* Origin & Destination */}
          <div className="space-y-3 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 bg-[#a9e978] rounded-full mt-2"></div>
              <div>
                <p className="text-sm text-[#2a2a2a]/70">Origen</p>
                <p className="font-medium text-[#2a2a2a]">{trip.origin}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 bg-[#c5f0a4] rounded-full mt-2"></div>
              <div>
                <p className="text-sm text-[#2a2a2a]/70">Destino</p>
                <p className="font-medium text-[#2a2a2a]">{trip.destination}</p>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#2a2a2a]/70" />
              <div>
                <p className="text-xs text-[#2a2a2a]/70">Pasajeros</p>
                <p className="font-medium text-[#2a2a2a]">
                  {trip.passenger_count}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#2a2a2a]/70" />
              <div>
                <p className="text-xs text-[#2a2a2a]/70">Programado</p>
                <p className="font-medium text-[#2a2a2a] text-xs">
                  {formatDateTime(trip.scheduled_datetime)}
                </p>
              </div>
            </div>

            {trip.passenger_reference && (
              <div className="col-span-2">
                <p className="text-xs text-[#2a2a2a]/70">
                  Referencia del Pasajero
                </p>
                <p className="font-medium text-[#2a2a2a]">
                  {trip.passenger_reference}
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Payment Information */}
        {(trip.amount_mxn > 0 || trip.amount_usd > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-[#a9e978]/20"
          >
            <h2 className="text-lg font-semibold text-[#2a2a2a] mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Información de Pago
            </h2>

            <div className="grid grid-cols-2 gap-4">
              {trip.amount_mxn > 0 && (
                <div>
                  <p className="text-sm text-[#2a2a2a]/70">Monto MXN</p>
                  <p className="font-bold text-[#2a2a2a]">${trip.amount_mxn}</p>
                </div>
              )}

              {trip.amount_usd > 0 && (
                <div>
                  <p className="text-sm text-[#2a2a2a]/70">Monto USD</p>
                  <p className="font-bold text-[#2a2a2a]">${trip.amount_usd}</p>
                </div>
              )}

              {trip.payment_method && (
                <div>
                  <p className="text-sm text-[#2a2a2a]/70">Método</p>
                  <p className="font-medium text-[#2a2a2a] capitalize">
                    {trip.payment_method}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          {trip.state === "draft" && (
            <button
              onClick={handleStartTrip}
              className="w-full bg-[#a9e978] hover:bg-[#c5f0a4] text-[#2a2a2a] py-4 px-6 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-colors shadow-lg"
            >
              <Play className="w-6 h-6" />
              Iniciar Viaje
            </button>
          )}

          {trip.state === "active" && (
            <>
              <button
                onClick={handlePauseTrip}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-4 px-6 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-colors shadow-lg"
              >
                <Pause className="w-6 h-6" />
                Pausar Viaje
              </button>

              <button
                onClick={handleCompleteTrip}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-4 px-6 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-colors shadow-lg"
              >
                <Square className="w-6 h-6" />
                Completar Viaje
              </button>
            </>
          )}

          {trip.state === "paused" && (
            <>
              <button
                onClick={handlePauseTrip}
                className="w-full bg-[#a9e978] hover:bg-[#c5f0a4] text-[#2a2a2a] py-4 px-6 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-colors shadow-lg"
              >
                <Play className="w-6 h-6" />
                Reanudar Viaje
              </button>

              <button
                onClick={handleCompleteTrip}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-4 px-6 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-colors shadow-lg"
              >
                <Square className="w-6 h-6" />
                Completar Viaje
              </button>
            </>
          )}

          {["draft", "active", "paused"].includes(trip.state) && (
            <button
              onClick={handleCancelTrip}
              className="w-full bg-red-500 hover:bg-red-600 text-white py-3 px-6 rounded-2xl font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <AlertTriangle className="w-5 h-5" />
              Cancelar Viaje
            </button>
          )}
        </motion.div>
      </div>

      {/* Pause Modal */}
      {showPauseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-sm w-full"
          >
            <h3 className="text-lg font-bold text-[#2a2a2a] mb-4">
              Pausar Viaje
            </h3>
            <p className="text-[#2a2a2a]/70 mb-4">
              Selecciona el motivo de la pausa:
            </p>

            {/* Select de motivos de pausa */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#2a2a2a] mb-2">
                Motivo de pausa
              </label>
              <select
                value={selectedReasonId}
                onChange={(e) => setSelectedReasonId(e.target.value)}
                className="w-full p-3 border border-[#a9e978]/50 rounded-lg focus:ring-2 focus:ring-[#c5f0a4] focus:border-transparent bg-white/70"
                disabled={loadingReasons}
              >
                <option value="">Seleccionar motivo (opcional)</option>
                {pauseReasons.map((reason) => (
                  <option key={reason.id} value={reason.id}>
                    {reason.name}
                  </option>
                ))}
              </select>
              {loadingReasons && (
                <p className="text-xs text-[#2a2a2a]/50 mt-1">
                  Cargando motivos...
                </p>
              )}
            </div>

            {/* Textarea para notas */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#2a2a2a] mb-2">
                Notas adicionales
              </label>
              <textarea
                value={pauseNotes}
                onChange={(e) => setPauseNotes(e.target.value)}
                placeholder="Describe detalles adicionales de la pausa..."
                className="w-full p-3 border border-[#a9e978]/50 rounded-lg focus:ring-2 focus:ring-[#c5f0a4] focus:border-transparent bg-white/70"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleClosePauseModal}
                className="flex-1 bg-gray-200 text-[#2a2a2a] py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmPause}
                className="flex-1 bg-yellow-500 text-white py-2 px-4 rounded-lg hover:bg-yellow-600 transition-colors"
              >
                Pausar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default TripDetailView;
