import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { MapPin, Users, Clock, Eye, ChevronRight } from "lucide-react";

const TripCard = ({ trip }) => {
  const navigate = useNavigate();
  const getStateColor = (state) => {
    switch (state) {
      case "draft":
        return "bg-[#c5f0a4]/20 text-[#2a2a2a]";
      case "active":
        return "bg-green-100 text-green-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      case "done":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-[#c5f0a4]/20 text-[#2a2a2a]";
    }
  };

  const getStateLabel = (state) => {
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
        return state;
    }
  };

  const formatDateTime = (datetime) => {
    if (!datetime) return "";
    const date = new Date(datetime);
    return date.toLocaleString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const handleClick = () => {
    navigate(`/trip/${trip.id}`);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="border border-[#a9e978]/30 rounded-2xl p-4 bg-white/60 backdrop-blur-sm hover:bg-white/80 transition-colors cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-[#2a2a2a]">{trip.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`px-3 py-1 text-xs font-medium rounded-full ${getStateColor(
                trip.state
              )}`}
            >
              {getStateLabel(trip.state)}
            </span>
            {trip.is_scheduled && trip.scheduled_datetime && (
              <div className="flex items-center gap-1 text-xs text-[#2a2a2a]/60">
                <Clock className="w-3 h-3" />
                <span>{formatDateTime(trip.scheduled_datetime)}</span>
              </div>
            )}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-[#2a2a2a]/40" />
      </div>

      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-[#a9e978] mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#2a2a2a] truncate">
              {trip.origin}
            </p>
            <p className="text-sm text-[#2a2a2a]/70 truncate">
              {trip.destination}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#a9e978]" />
          <span className="text-sm text-[#2a2a2a]">
            {trip.passenger_count} pasajero
            {trip.passenger_count !== 1 ? "s" : ""}
          </span>
          {trip.passenger_reference && (
            <span className="text-sm text-[#2a2a2a]/60">
              · {trip.passenger_reference}
            </span>
          )}
        </div>

        {(trip.amount_mxn > 0 || trip.amount_usd > 0) && (
          <div className="flex items-center gap-2 pt-2 border-t border-[#a9e978]/20">
            <div className="flex gap-3 text-sm font-medium text-[#2a2a2a]">
              {trip.amount_mxn > 0 && <span>${trip.amount_mxn} MXN</span>}
              {trip.amount_usd > 0 && <span>${trip.amount_usd} USD</span>}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-[#a9e978]/20">
        <button className="w-full bg-[#c5f0a4] hover:bg-[#a9e978] text-[#2a2a2a] py-2 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2">
          <Eye className="w-4 h-4" />
          Ver detalles
        </button>
      </div>
    </motion.div>
  );
};

export default TripCard;
