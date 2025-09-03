import { motion } from "motion/react";
import {
  Car,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";

const VehicleCard = ({ assignment, loading }) => {
  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-[#a9e978]/20 p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-[#c5f0a4]/50 rounded w-1/2"></div>
          <div className="h-3 bg-[#c5f0a4]/50 rounded w-3/4"></div>
          <div className="h-3 bg-[#c5f0a4]/50 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <div>
            <h3 className="font-medium text-red-900">Sin asignación</h3>
            <p className="text-sm text-red-700">No tienes vehículo asignado</p>
          </div>
        </div>
      </div>
    );
  }

  const { driver, vehicle, card, warnings } = assignment;

  const hasWarnings = warnings && warnings.length > 0;
  const hasValidCard = card && card.balance > 0;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-[#a9e978]/20 p-4"
    >
      {/* Driver Info */}
      <div className="mb-4">
        <h3 className="font-medium text-[#2a2a2a]">{driver?.name}</h3>
        <p className="text-sm text-[#2a2a2a]/70">{driver?.email}</p>
      </div>

      {/* Vehicle Info */}
      {vehicle ? (
        <div className="flex items-center gap-3 mb-3 p-3 bg-[#c5f0a4]/30 rounded-xl border border-[#a9e978]/30">
          <Car className="w-5 h-5 text-[#2a2a2a]" />
          <div className="flex-1">
            <p className="font-medium text-[#2a2a2a]">{vehicle.name}</p>
            <p className="text-sm text-[#2a2a2a]/70">
              Placas: {vehicle.license_plate}
            </p>
            {vehicle.model && (
              <p className="text-xs text-[#2a2a2a]/60">{vehicle.model}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 mb-3 p-3 bg-red-50/80 rounded-xl border border-red-200">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <div>
            <p className="font-medium text-red-900">Sin vehículo</p>
            <p className="text-sm text-red-700">No hay vehículo asignado</p>
          </div>
        </div>
      )}

      {/* Card Info */}
      {card ? (
        <div
          className={`flex items-center gap-3 p-3 rounded-xl border ${
            hasValidCard
              ? "bg-[#a9e978]/30 border-[#a9e978]/50"
              : "bg-orange-50/80 border-orange-200"
          }`}
        >
          <CreditCard
            className={`w-5 h-5 ${
              hasValidCard ? "text-[#2a2a2a]" : "text-orange-600"
            }`}
          />
          <div className="flex-1">
            <p
              className={`font-medium ${
                hasValidCard ? "text-[#2a2a2a]" : "text-orange-900"
              }`}
            >
              Tarjeta {card.name}
            </p>
            <p
              className={`text-sm ${
                hasValidCard ? "text-[#2a2a2a]/70" : "text-orange-700"
              }`}
            >
              Saldo: {card.balance} créditos
            </p>
          </div>
          {hasValidCard ? (
            <CheckCircle className="w-5 h-5 text-[#2a2a2a]" />
          ) : (
            <Clock className="w-5 h-5 text-orange-600" />
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3 bg-red-50/80 border border-red-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <div>
            <p className="font-medium text-red-900">Sin tarjeta</p>
            <p className="text-sm text-red-700">No hay tarjeta asignada</p>
          </div>
        </div>
      )}

      {/* Warnings */}
      {hasWarnings && (
        <div className="mt-3 space-y-2">
          {warnings.map((warning, index) => (
            <div
              key={index}
              className="flex items-start gap-2 p-2 bg-yellow-50/80 border border-yellow-200 rounded-xl"
            >
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-yellow-800">{warning}</p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default VehicleCard;
