import React, { useState } from "react";
import { motion } from "motion/react";
import toast from "react-hot-toast";
import { useCreateTrip } from "../hooks/useCreateTrip";
import { driverAPI } from "../lib/api";
import {
  ArrowLeft,
  MapPin,
  Users,
  CreditCard,
  DollarSign,
  FileText,
  Upload,
  Check,
  Loader2,
  AlertTriangle,
} from "lucide-react";

const QuickTripForm = ({ onBack, onSubmit, assignmentData }) => {
  const { createTrip, isCreating } = useCreateTrip();
  const [isCreatingEmptyTrip, setIsCreatingEmptyTrip] = useState(false);
  const [showActiveSearchWarning, setShowActiveSearchWarning] = useState(false);
  const [activeSearchInfo, setActiveSearchInfo] = useState(null);

  // Function to check if there's an active search
  const checkActiveSearch = async () => {
    try {
      const emptyTrips = await driverAPI.getEmptyTrips(1, 10);
      const activeSearch = emptyTrips.data?.find(
        (trip) => trip.state === "searching"
      );
      return activeSearch || null;
    } catch (error) {
      console.error("Error checking active search:", error);
      return null;
    }
  };

  // Function to create empty trip (client search)
  const createEmptyTrip = async (data) => {
    setIsCreatingEmptyTrip(true);
    try {
      const result = await driverAPI.createEmptyTrip(data);
      return { success: true, data: result };
    } catch (error) {
      console.error("Error creating empty trip:", error);
      toast.error(error.message || "Error al crear la búsqueda");
      return { success: false, error: error.message };
    } finally {
      setIsCreatingEmptyTrip(false);
    }
  };

  const [formData, setFormData] = useState({
    trip_type: "normal", // "normal", "empty", "recharge"
    origin: "",
    destination: "",
    passenger_count: 1,
    passenger_reference: "",
    payment_method: "",
    amount_mxn: "",
    payment_in_usd: false,
    amount_usd: "",
    exchange_rate: 20,
    payment_reference: "",
    comments: "",
    empty_wait_limit_minutes: 60, // Para viajes vacíos
    is_recharge_trip: false,
  });

  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
      setFiles((prev) => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors = {};

    // Para viajes vacíos, solo validamos el tipo y límite de tiempo
    if (formData.trip_type === "empty") {
      if (
        !formData.empty_wait_limit_minutes ||
        formData.empty_wait_limit_minutes < 15
      ) {
        newErrors.empty_wait_limit_minutes =
          "El límite debe ser al menos 15 minutos";
      }
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }

    // Para viajes normales y con recarga, validar origen y destino
    if (!formData.origin.trim()) {
      newErrors.origin = "El origen es requerido";
    }

    if (!formData.destination.trim()) {
      newErrors.destination = "El destino es requerido";
    }

    if (formData.passenger_count < 1) {
      newErrors.passenger_count = "Debe haber al menos 1 pasajero";
    }

    if (formData.amount_mxn && isNaN(formData.amount_mxn)) {
      newErrors.amount_mxn = "Monto MXN debe ser un número válido";
    }

    if (
      formData.payment_in_usd &&
      formData.amount_usd &&
      isNaN(formData.amount_usd)
    ) {
      newErrors.amount_usd = "Monto USD debe ser un número válido";
    }

    if (
      formData.payment_in_usd &&
      (!formData.exchange_rate || isNaN(formData.exchange_rate))
    ) {
      newErrors.exchange_rate = "Tipo de cambio debe ser un número válido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Por favor, corrige los errores en el formulario", {
        icon: "⚠️",
      });
      return;
    }

    try {
      let result;

      if (formData.trip_type === "empty") {
        // Verificar si ya hay una búsqueda activa
        const activeSearch = await checkActiveSearch();

        if (activeSearch) {
          // Mostrar advertencia y almacenar info de la búsqueda activa
          setActiveSearchInfo(activeSearch);
          setShowActiveSearchWarning(true);
          return; // No proceder hasta que el usuario confirme
        }

        // Crear búsqueda de clientes (empty trip)
        const emptyTripData = {
          wait_limit_minutes: parseInt(formData.empty_wait_limit_minutes),
          comments: formData.comments || "Búsqueda de clientes",
        };
        result = await createEmptyTrip(emptyTripData);
      } else {
        // Crear viaje normal o con recarga
        const tripData = {
          ...formData,
          passenger_count: parseInt(formData.passenger_count),
          amount_mxn: formData.amount_mxn ? parseFloat(formData.amount_mxn) : 0,
          amount_usd:
            formData.payment_in_usd && formData.amount_usd
              ? parseFloat(formData.amount_usd)
              : 0,
          exchange_rate: formData.payment_in_usd
            ? parseFloat(formData.exchange_rate)
            : 1,
          is_recharge_trip: formData.trip_type === "recharge",
        };
        result = await createTrip(tripData, files);
      }

      if (result.success) {
        // Reset form
        setFormData({
          trip_type: "normal",
          origin: "",
          destination: "",
          passenger_count: 1,
          passenger_reference: "",
          payment_method: "",
          amount_mxn: "",
          payment_in_usd: false,
          amount_usd: "",
          exchange_rate: 20,
          payment_reference: "",
          comments: "",
          empty_wait_limit_minutes: 60,
          is_recharge_trip: false,
        });
        setFiles([]);

        // Call parent callback if needed
        if (onSubmit) {
          onSubmit(result.data);
        }
      }
    } catch (error) {
      console.error("Error creating trip:", error);

      // Manejar error específico de búsqueda activa
      if (error.code === 409 && formData.trip_type === "empty") {
        toast.error(
          `${error.message}\nBúsqueda actual: ${
            error.response?.existing_search_name || "Sin identificar"
          }`,
          {
            icon: "⚠️",
            duration: 5000,
          }
        );
      } else {
        toast.error("Error inesperado al crear el viaje", {
          icon: "💥",
        });
      }
    }
  };

  const handleCancelActiveSearch = async () => {
    if (!activeSearchInfo) return;

    try {
      await driverAPI.cancelEmptyTrip(activeSearchInfo.id);
      toast.success("Búsqueda anterior cancelada");

      // Cerrar modal y proceder con la nueva búsqueda
      setShowActiveSearchWarning(false);
      setActiveSearchInfo(null);

      // Crear la nueva búsqueda
      await createNewEmptyTrip();
    } catch (error) {
      console.error("Error cancelling active search:", error);
      toast.error("Error al cancelar búsqueda anterior");
    }
  };

  const createNewEmptyTrip = async () => {
    try {
      const emptyTripData = {
        wait_limit_minutes: parseInt(formData.empty_wait_limit_minutes),
        comments: formData.comments || "Búsqueda de clientes",
      };

      const result = await createEmptyTrip(emptyTripData);

      if (result.success) {
        toast.success("¡Búsqueda de clientes iniciada!", {
          icon: "🔍",
        });

        // Reset form
        setFormData({
          ...formData,
          trip_type: "normal",
          empty_wait_limit_minutes: 60,
          comments: "",
        });

        if (onSubmit) {
          onSubmit(result.data);
        }
      }
    } catch (error) {
      console.error("Error creating new empty trip:", error);
      toast.error("Error al crear nueva búsqueda");
    }
  };

  const handleDismissWarning = () => {
    setShowActiveSearchWarning(false);
    setActiveSearchInfo(null);
  };

  const cardBalance = assignmentData?.data?.card?.balance || 0;
  const hasLowCredits = cardBalance < 5;

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
          <h1 className="text-lg font-bold text-[#2a2a2a]">Viaje Rápido</h1>
          <div className="w-16"></div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Card Warning */}
        {hasLowCredits && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-orange-800">Créditos Bajos</h3>
              <p className="text-sm text-orange-700">
                Tu tarjeta tiene {cardBalance} créditos disponibles. Considera
                recargar antes del viaje.
              </p>
            </div>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Trip Type Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-[#a9e978]/20"
          >
            <h2 className="text-lg font-semibold text-[#2a2a2a] mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#a9e978]" />
              Tipo de Viaje
            </h2>

            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 border border-[#a9e978]/30 rounded-xl hover:bg-[#c5f0a4]/10 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="trip_type"
                  value="normal"
                  checked={formData.trip_type === "normal"}
                  onChange={handleInputChange}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-[#2a2a2a]">
                    Viaje Regular
                  </div>
                  <div className="text-sm text-gray-600">
                    Viaje con cliente confirmado, origen y destino específicos
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border border-[#a9e978]/30 rounded-xl hover:bg-[#c5f0a4]/10 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="trip_type"
                  value="recharge"
                  checked={formData.trip_type === "recharge"}
                  onChange={handleInputChange}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-[#2a2a2a]">
                    Viaje con Recarga
                  </div>
                  <div className="text-sm text-gray-600">
                    Viaje desde zona controlada que requiere consumo de recarga
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border border-[#a9e978]/30 rounded-xl hover:bg-[#c5f0a4]/10 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="trip_type"
                  value="empty"
                  checked={formData.trip_type === "empty"}
                  onChange={handleInputChange}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-[#2a2a2a]">
                    Búsqueda de Clientes
                  </div>
                  <div className="text-sm text-gray-600">
                    Crear búsqueda en aeropuerto o zona con límite de tiempo
                  </div>
                </div>
              </label>
            </div>
          </motion.div>

          {/* Empty Trip Configuration */}
          {formData.trip_type === "empty" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-[#a9e978]/20"
            >
              <h2 className="text-lg font-semibold text-[#2a2a2a] mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Configuración Viaje Vacío
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#2a2a2a] mb-2">
                    Límite de tiempo (minutos) *
                  </label>
                  <input
                    type="number"
                    name="empty_wait_limit_minutes"
                    value={formData.empty_wait_limit_minutes}
                    onChange={handleInputChange}
                    min="15"
                    max="180"
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#c5f0a4] focus:border-transparent bg-white/70 ${
                      errors.empty_wait_limit_minutes
                        ? "border-red-300"
                        : "border-[#a9e978]/50"
                    }`}
                    placeholder="60"
                  />
                  {errors.empty_wait_limit_minutes && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.empty_wait_limit_minutes}
                    </p>
                  )}
                  <p className="text-sm text-gray-600 mt-1">
                    Tiempo máximo para encontrar cliente antes de cancelación
                    automática
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#2a2a2a] mb-2">
                    Comentarios
                  </label>
                  <textarea
                    name="comments"
                    value={formData.comments}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-[#a9e978]/50 rounded-xl focus:ring-2 focus:ring-[#c5f0a4] focus:border-transparent bg-white/70 resize-none"
                    rows="2"
                    placeholder="Ubicación específica donde buscar clientes..."
                  />
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-800">
                        Sistema de Alertas
                      </h4>
                      <p className="text-sm text-amber-700">
                        Recibirás alertas a los 30, 15 y 5 minutos antes de la
                        cancelación automática.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Trip Details - Solo para viajes regulares y con recarga */}
          {formData.trip_type !== "empty" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-[#a9e978]/20"
            >
              <h2 className="text-lg font-semibold text-[#2a2a2a] mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#a9e978]" />
                Detalles del Viaje
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#2a2a2a] mb-2">
                    Origen *
                  </label>
                  <input
                    type="text"
                    name="origin"
                    value={formData.origin}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#c5f0a4] focus:border-transparent bg-white/70 ${
                      errors.origin ? "border-red-300" : "border-[#a9e978]/50"
                    }`}
                    placeholder="Dirección de origen"
                  />
                  {errors.origin && (
                    <p className="text-red-600 text-sm mt-1">{errors.origin}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#2a2a2a] mb-2">
                    Destino *
                  </label>
                  <input
                    type="text"
                    name="destination"
                    value={formData.destination}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#c5f0a4] focus:border-transparent bg-white/70 ${
                      errors.destination
                        ? "border-red-300"
                        : "border-[#a9e978]/50"
                    }`}
                    placeholder="Dirección de destino"
                  />
                  {errors.destination && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.destination}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#2a2a2a] mb-2">
                      Pasajeros *
                    </label>
                    <input
                      type="number"
                      name="passenger_count"
                      value={formData.passenger_count}
                      onChange={handleInputChange}
                      min="1"
                      max="20"
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#c5f0a4] focus:border-transparent bg-white/70 ${
                        errors.passenger_count
                          ? "border-red-300"
                          : "border-[#a9e978]/50"
                      }`}
                    />
                    {errors.passenger_count && (
                      <p className="text-red-600 text-sm mt-1">
                        {errors.passenger_count}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#2a2a2a] mb-2">
                      Referencia
                    </label>
                    <input
                      type="text"
                      name="passenger_reference"
                      value={formData.passenger_reference}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-[#a9e978]/50 rounded-xl focus:ring-2 focus:ring-[#c5f0a4] focus:border-transparent bg-white/70"
                      placeholder="Nombre del pasajero"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Payment Details - Solo para viajes regulares y con recarga */}
          {formData.trip_type !== "empty" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-[#a9e978]/20"
            >
              <h2 className="text-lg font-semibold text-[#2a2a2a] mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#a9e978]" />
                Información de Pago
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#2a2a2a] mb-2">
                    Método de Pago
                  </label>
                  <select
                    name="payment_method"
                    value={formData.payment_method}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-[#a9e978]/50 rounded-xl focus:ring-2 focus:ring-[#c5f0a4] focus:border-transparent bg-white/70"
                  >
                    <option value="">Seleccionar método</option>
                    <option value="cash">Efectivo</option>
                    <option value="card">Tarjeta</option>
                    <option value="transfer">Transferencia</option>
                    <option value="credit">Crédito</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#2a2a2a] mb-2">
                    Monto MXN
                  </label>
                  <input
                    type="number"
                    name="amount_mxn"
                    value={formData.amount_mxn}
                    onChange={handleInputChange}
                    step="0.01"
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#c5f0a4] focus:border-transparent bg-white/70 ${
                      errors.amount_mxn
                        ? "border-red-300"
                        : "border-[#a9e978]/50"
                    }`}
                    placeholder="0.00"
                  />
                  {errors.amount_mxn && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.amount_mxn}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="payment_in_usd"
                    checked={formData.payment_in_usd}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-[#a9e978] bg-gray-100 border-gray-300 rounded focus:ring-[#c5f0a4] focus:ring-2"
                  />
                  <label className="text-sm font-medium text-[#2a2a2a]">
                    Requiere pago en USD
                  </label>
                </div>

                {formData.payment_in_usd && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#2a2a2a] mb-2">
                        Monto USD
                      </label>
                      <input
                        type="number"
                        name="amount_usd"
                        value={formData.amount_usd}
                        onChange={handleInputChange}
                        step="0.01"
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#c5f0a4] focus:border-transparent bg-white/70 ${
                          errors.amount_usd
                            ? "border-red-300"
                            : "border-[#a9e978]/50"
                        }`}
                        placeholder="0.00"
                      />
                      {errors.amount_usd && (
                        <p className="text-red-600 text-sm mt-1">
                          {errors.amount_usd}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#2a2a2a] mb-2">
                        Tipo de Cambio
                      </label>
                      <input
                        type="number"
                        name="exchange_rate"
                        value={formData.exchange_rate}
                        onChange={handleInputChange}
                        step="0.01"
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#c5f0a4] focus:border-transparent bg-white/70 ${
                          errors.exchange_rate
                            ? "border-red-300"
                            : "border-[#a9e978]/50"
                        }`}
                        placeholder="20.00"
                      />
                      {errors.exchange_rate && (
                        <p className="text-red-600 text-sm mt-1">
                          {errors.exchange_rate}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-[#2a2a2a] mb-2">
                    Referencia de Pago
                  </label>
                  <input
                    type="text"
                    name="payment_reference"
                    value={formData.payment_reference}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-[#a9e978]/50 rounded-xl focus:ring-2 focus:ring-[#c5f0a4] focus:border-transparent bg-white/70"
                    placeholder="Número de referencia o comprobante"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Additional Info - Solo para viajes regulares y con recarga */}
          {formData.trip_type !== "empty" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-[#a9e978]/20"
            >
              <h2 className="text-lg font-semibold text-[#2a2a2a] mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#a9e978]" />
                Información Adicional
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#2a2a2a] mb-2">
                    Comentarios
                  </label>
                  <textarea
                    name="comments"
                    value={formData.comments}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-[#a9e978]/50 rounded-xl focus:ring-2 focus:ring-[#c5f0a4] focus:border-transparent bg-white/70"
                    placeholder="Instrucciones especiales o comentarios"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#2a2a2a] mb-2">
                    Adjuntar Archivos (opcional)
                  </label>
                  <div className="space-y-3">
                    <div className="relative">
                      <input
                        type="file"
                        onChange={handleFileChange}
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        multiple
                        className="hidden"
                        id="file-upload"
                      />
                      <label
                        htmlFor="file-upload"
                        className="w-full border border-[#a9e978]/50 border-dashed rounded-xl p-4 flex items-center justify-center gap-2 cursor-pointer hover:bg-[#c5f0a4]/10 transition-colors"
                      >
                        <Upload className="w-5 h-5 text-[#a9e978]" />
                        <span className="text-[#2a2a2a]">
                          Subir comprobantes o documentos
                        </span>
                      </label>
                    </div>

                    {/* Lista de archivos seleccionados */}
                    {files.length > 0 && (
                      <div className="space-y-2">
                        {files.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between bg-white/50 rounded-lg p-3 border border-[#a9e978]/30"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-[#a9e978]" />
                              <span className="text-sm text-[#2a2a2a] truncate">
                                {file.name}
                              </span>
                              <span className="text-xs text-[#2a2a2a]/60">
                                ({(file.size / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="text-red-500 hover:text-red-700 transition-colors"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Submit Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            <button
              type="submit"
              disabled={isCreating || isCreatingEmptyTrip}
              className="w-full bg-[#a9e978] hover:bg-[#c5f0a4] disabled:opacity-50 disabled:cursor-not-allowed text-[#2a2a2a] py-4 px-6 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-colors shadow-lg"
            >
              {isCreating || isCreatingEmptyTrip ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {formData.trip_type === "empty"
                    ? "Iniciando Búsqueda..."
                    : "Creando Viaje..."}
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  {formData.trip_type === "empty"
                    ? "Iniciar Búsqueda"
                    : formData.trip_type === "recharge"
                    ? "Crear Viaje con Recarga"
                    : "Crear Viaje Rápido"}
                </>
              )}
            </button>
          </motion.div>
        </form>
      </div>

      {/* Modal de advertencia de búsqueda activa */}
      {showActiveSearchWarning && activeSearchInfo && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-[#2a2a2a] mb-2">
                Búsqueda Activa Detectada
              </h3>
              <p className="text-[#2a2a2a]/70 text-sm">
                Ya tienes una búsqueda de clientes en curso. ¿Deseas cancelarla
                y crear una nueva?
              </p>
            </div>

            <div className="bg-[#c5f0a4]/20 p-4 rounded-xl mb-6">
              <div className="text-sm">
                <p className="font-medium text-[#2a2a2a] mb-1">
                  Búsqueda actual: {activeSearchInfo.search_number}
                </p>
                <p className="text-[#2a2a2a]/60">
                  Iniciada:{" "}
                  {new Date(activeSearchInfo.create_date).toLocaleString()}
                </p>
                {activeSearchInfo.time_remaining > 0 && (
                  <p className="text-[#2a2a2a]/60">
                    Tiempo restante: {activeSearchInfo.time_remaining} minutos
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDismissWarning}
                className="flex-1 px-4 py-3 bg-[#2a2a2a]/10 text-[#2a2a2a]/70 rounded-xl font-medium transition-colors hover:bg-[#2a2a2a]/20"
              >
                Mantener Actual
              </button>
              <button
                onClick={handleCancelActiveSearch}
                disabled={isCreatingEmptyTrip}
                className="flex-1 px-4 py-3 bg-[#a9e978] text-[#2a2a2a] rounded-xl font-medium transition-colors hover:bg-[#95d165] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isCreatingEmptyTrip ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>Cancelar y Crear Nueva</>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default QuickTripForm;
