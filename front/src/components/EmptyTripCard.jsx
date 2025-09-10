import React, { useState } from "react";
import { motion } from "motion/react";
import toast from "react-hot-toast";
import { driverAPI } from "../lib/api";
import { Clock, CheckCircle, X, AlertTriangle, Users } from "lucide-react";

const EmptyTripCard = ({ emptyTrip, onConvert, onCancel, onRefresh }) => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTimeRemaining = () => {
    if (!emptyTrip.wait_limit_time) return null;

    const now = new Date();
    // Ensure proper timezone handling for the limit time
    const limitTime = new Date(emptyTrip.wait_limit_time);

    // Validate the date
    if (isNaN(limitTime.getTime())) return "Fecha inválida";

    const diffMs = limitTime - now;

    if (diffMs <= 0) return "Expirado";

    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${remainingMinutes}m`;
  };

  const isExpired = () => {
    if (!emptyTrip.wait_limit_time) return false;

    const limitTime = new Date(emptyTrip.wait_limit_time);

    // Validate the date
    if (isNaN(limitTime.getTime())) return false;

    return new Date() > limitTime;
  };

  const handleClientFound = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmConvert = async () => {
    setIsConverting(true);
    try {
      const result = await driverAPI.convertEmptyTrip(emptyTrip.id);

      toast.success(
        "¡Cliente encontrado! Redirigiendo al formulario de viaje..."
      );

      // Close dialog
      setShowConfirmDialog(false);

      // Navigate to trip form with the new trip ID
      if (onConvert) {
        onConvert(result.trip_id);
      }

      // Refresh the list
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error("Error converting empty trip:", error);
      toast.error(error.message || "Error al convertir la búsqueda");
    } finally {
      setIsConverting(false);
    }
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await driverAPI.cancelEmptyTrip(emptyTrip.id);

      toast.success("Búsqueda cancelada");

      // Refresh the list
      if (onRefresh) {
        onRefresh();
      }

      if (onCancel) {
        onCancel(emptyTrip.id);
      }
    } catch (error) {
      console.error("Error cancelling empty trip:", error);
      toast.error(error.message || "Error al cancelar la búsqueda");
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusColor = () => {
    if (emptyTrip.state === "cancelled")
      return "bg-red-50 text-red-700 border-red-200";
    if (emptyTrip.state === "converted")
      return "bg-green-50 text-green-700 border-green-200";
    if (isExpired()) return "bg-orange-50 text-orange-700 border-orange-200";
    return "bg-blue-50 text-blue-700 border-blue-200";
  };

  const getStatusText = () => {
    if (emptyTrip.state === "cancelled") return "Cancelada";
    if (emptyTrip.state === "converted") return "Cliente Encontrado";
    if (isExpired()) return "Tiempo Expirado";
    return "Buscando Cliente";
  };

  const getStatusIcon = () => {
    if (emptyTrip.state === "cancelled") return <X className="w-4 h-4" />;
    if (emptyTrip.state === "converted")
      return <CheckCircle className="w-4 h-4" />;
    if (isExpired()) return <AlertTriangle className="w-4 h-4" />;
    return <Clock className="w-4 h-4 animate-pulse" />;
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-white rounded-xl shadow-sm border ${
          emptyTrip.state === "searching" && !isExpired()
            ? "border-[#a9e978]/30 bg-gradient-to-r from-[#c5f0a4]/5 to-white"
            : emptyTrip.state === "converted"
            ? "border-green-200 bg-gradient-to-r from-green-50/50 to-white"
            : emptyTrip.state === "cancelled"
            ? "border-red-200 bg-gradient-to-r from-red-50/30 to-white"
            : "border-orange-200 bg-gradient-to-r from-orange-50/30 to-white"
        } p-5 transition-all duration-200 hover:shadow-md`}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                emptyTrip.state === "searching" && !isExpired()
                  ? "bg-[#c5f0a4]/20 text-[#2a2a2a]"
                  : emptyTrip.state === "converted"
                  ? "bg-green-100 text-green-600"
                  : emptyTrip.state === "cancelled"
                  ? "bg-red-100 text-red-600"
                  : "bg-orange-100 text-orange-600"
              }`}
            >
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-[#2a2a2a] text-base">
                Búsqueda #{emptyTrip.search_number}
              </h3>
              <p className="text-sm text-[#2a2a2a]/60 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-[#a9e978] rounded-full"></span>
                {emptyTrip.vehicle_id?.license_plate || "Sin vehículo"}
              </p>
            </div>
          </div>

          <div
            className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 ${getStatusColor()}`}
          >
            {getStatusIcon()}
            {getStatusText()}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2 text-sm text-[#2a2a2a]/70">
            <Clock className="w-4 h-4 text-[#a9e978]" />
            <span>Iniciado: {formatTime(emptyTrip.create_date)}</span>
          </div>

          {emptyTrip.wait_limit_time &&
            emptyTrip.state !== "cancelled" &&
            emptyTrip.state !== "converted" && (
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle
                  className={`w-4 h-4 ${
                    isExpired() ? "text-red-500" : "text-orange-500"
                  }`}
                />
                <span
                  className={isExpired() ? "text-red-600" : "text-orange-600"}
                >
                  {isExpired()
                    ? `Expiró a las ${formatTime(emptyTrip.wait_limit_time)}`
                    : `Expira en: ${getTimeRemaining()}`}
                </span>
              </div>
            )}

          {emptyTrip.comments && (
            <div className="bg-[#c5f0a4]/10 p-3 rounded-lg">
              <p className="text-sm text-[#2a2a2a]/80">
                <span className="font-medium">Comentarios:</span>{" "}
                {emptyTrip.comments}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        {emptyTrip.state === "searching" && !isExpired() && (
          <div className="flex gap-3 pt-2 border-t border-[#c5f0a4]/20">
            <button
              onClick={handleClientFound}
              className="flex-1 bg-[#a9e978] hover:bg-[#95d165] text-[#2a2a2a] px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200 hover:shadow-md"
            >
              <CheckCircle className="w-4 h-4" />
              Cliente Encontrado
            </button>

            <button
              onClick={handleCancel}
              disabled={isCancelling}
              className="px-4 py-2.5 bg-[#2a2a2a]/5 hover:bg-[#2a2a2a]/10 text-[#2a2a2a]/70 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 border border-[#2a2a2a]/10"
            >
              {isCancelling ? (
                <div className="w-4 h-4 border-2 border-[#2a2a2a]/40 border-t-transparent rounded-full animate-spin" />
              ) : (
                <X className="w-4 h-4" />
              )}
              {isCancelling ? "Cancelando..." : "Cancelar"}
            </button>
          </div>
        )}
      </motion.div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
          >
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-[#2a2a2a] mb-2">
                  ¿Cliente Encontrado?
                </h3>
                <p className="text-[#2a2a2a]/70 text-sm">
                  Se creará un nuevo viaje y serás redirigido al formulario para
                  completar los detalles.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="flex-1 px-4 py-3 bg-[#2a2a2a]/10 text-[#2a2a2a]/70 rounded-xl font-medium transition-colors hover:bg-[#2a2a2a]/20"
                >
                  Cancelar
                </button>

                <button
                  onClick={handleConfirmConvert}
                  disabled={isConverting}
                  className="flex-1 px-4 py-3 bg-[#a9e978] text-[#2a2a2a] rounded-xl font-medium flex items-center justify-center gap-2 transition-colors hover:bg-[#95d165] disabled:opacity-50"
                >
                  {isConverting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#2a2a2a] border-t-transparent rounded-full animate-spin" />
                      Activando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Activar Viaje
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
};

export default EmptyTripCard;
