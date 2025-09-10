import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import toast from "react-hot-toast";
import {
  RefreshCw,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { driverAPI } from "../lib/api";
import EmptyTripCard from "./EmptyTripCard";

const EmptyTripsList = ({ onCreateTrip, onNavigateToTripForm }) => {
  const [emptyTrips, setEmptyTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  const fetchEmptyTrips = async (page = 1, showRefreshToast = false) => {
    if (showRefreshToast) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const result = await driverAPI.getEmptyTrips({ page, limit: 10 });
      setEmptyTrips(result.data || []);
      setPagination(
        result.pagination || { page: 1, limit: 10, total: 0, pages: 0 }
      );

      if (showRefreshToast) {
        toast.success("Lista actualizada");
      }
    } catch (error) {
      console.error("Error fetching empty trips:", error);
      toast.error(error.message || "Error al cargar las búsquedas");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEmptyTrips();

    // Auto-refresh every 30 seconds to update time remaining
    const interval = setInterval(() => {
      fetchEmptyTrips(pagination.page);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      fetchEmptyTrips(newPage);
    }
  };

  const handleConvert = (tripId) => {
    // Navigate to trip form with the new trip ID
    if (onNavigateToTripForm) {
      onNavigateToTripForm(tripId);
    }
  };

  const handleCancel = (emptyTripId) => {
    // Refresh current page
    fetchEmptyTrips(pagination.page);
  };

  const handleRefresh = () => {
    fetchEmptyTrips(pagination.page, true);
  }; // Filter active searches (searching state and not expired)
  const activeEmptyTrips = emptyTrips.filter(
    (trip) => trip.state === "searching"
  );

  // Filter completed/cancelled searches
  const inactiveEmptyTrips = emptyTrips.filter(
    (trip) => trip.state !== "searching"
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Cargando búsquedas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Search className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Búsquedas de Clientes
            </h2>
            <p className="text-sm text-gray-600">
              {activeEmptyTrips.length} búsquedas activas
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Actualizar
          </button>

          {onCreateTrip && (
            <button
              onClick={onCreateTrip}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nueva Búsqueda
            </button>
          )}
        </div>
      </div>

      {/* Active Searches */}
      {activeEmptyTrips.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            Búsquedas Activas ({activeEmptyTrips.length})
          </h3>

          <div className="space-y-3">
            {activeEmptyTrips.map((emptyTrip) => (
              <EmptyTripCard
                key={emptyTrip.id}
                emptyTrip={emptyTrip}
                onConvert={handleConvert}
                onCancel={handleCancel}
                onRefresh={handleRefresh}
              />
            ))}
          </div>
        </div>
      )}

      {/* Inactive/Completed Searches */}
      {inactiveEmptyTrips.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-600 flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            Búsquedas Completadas ({inactiveEmptyTrips.length})
          </h3>

          <div className="space-y-3">
            {inactiveEmptyTrips.slice(0, 5).map((emptyTrip) => (
              <EmptyTripCard
                key={emptyTrip.id}
                emptyTrip={emptyTrip}
                onConvert={handleConvert}
                onCancel={handleCancel}
                onRefresh={handleRefresh}
              />
            ))}
          </div>

          {inactiveEmptyTrips.length > 5 && (
            <p className="text-sm text-gray-500 text-center">
              ... y {inactiveEmptyTrips.length - 5} búsquedas más
            </p>
          )}
        </div>
      )}

      {/* Empty State */}
      {emptyTrips.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12 bg-gray-50 rounded-xl"
        >
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-blue-600" />
          </div>

          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay búsquedas activas
          </h3>

          <p className="text-gray-600 mb-6">
            Crea una nueva búsqueda de clientes para empezar
          </p>

          {onCreateTrip && (
            <button
              onClick={onCreateTrip}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium flex items-center gap-2 mx-auto transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nueva Búsqueda
            </button>
          )}
        </motion.div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Anterior
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
              const page = i + 1;
              return (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    pagination.page === page
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages}
            className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Siguiente
          </button>
        </div>
      )}

      {/* Info */}
      {emptyTrips.length > 0 && (
        <p className="text-center text-sm text-gray-500 mt-4">
          Página {pagination.page} de {pagination.pages} • {pagination.total}{" "}
          búsquedas totales (última semana)
        </p>
      )}
    </div>
  );
};

export default EmptyTripsList;
