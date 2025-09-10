import { useState, useEffect } from "react";
import { motion } from "motion/react";
import TripCard from "./TripCard";
import EmptyTripCard from "./EmptyTripCard";
import { driverAPI } from "../lib/api";
import toast from "react-hot-toast";
import { ChevronLeft, ChevronRight } from "lucide-react";

const TripTabs = ({ trips, loading, onUpdate, onNavigateToTripForm }) => {
  const [activeTab, setActiveTab] = useState("today");
  const [emptyTrips, setEmptyTrips] = useState([]);
  const [emptyTripsLoading, setEmptyTripsLoading] = useState(false);
  const [emptyTripsPagination, setEmptyTripsPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  // Estados para paginación de viajes regulares por cada tab
  const [tabTrips, setTabTrips] = useState({});
  const [tabLoading, setTabLoading] = useState({});
  const [tabPagination, setTabPagination] = useState({});

  const normalTabs = ["today", "scheduled", "history"];

  const tabs = [
    { id: "today", label: "Hoy", count: 0 },
    { id: "empty", label: "Búsqueda", count: 0 },
    { id: "scheduled", label: "Programados", count: 0 },
    { id: "history", label: "Historial", count: 0 },
  ];

  // Función para obtener búsquedas
  const fetchEmptyTrips = async (page = 1) => {
    setEmptyTripsLoading(true);
    try {
      const result = await driverAPI.getEmptyTrips({ page, limit: 10 });
      setEmptyTrips(result.data || []);
      setEmptyTripsPagination(
        result.pagination || { page: 1, limit: 10, total: 0, pages: 0 }
      );
    } catch (error) {
      console.error("Error fetching empty trips:", error);
      toast.error("Error al cargar las búsquedas");
    } finally {
      setEmptyTripsLoading(false);
    }
  };

  // Cargar búsquedas cuando se selecciona la tab
  useEffect(() => {
    if (activeTab === "empty") {
      fetchEmptyTrips();
    }
  }, [activeTab]);

  const handleEmptyTripsPageChange = (newPage) => {
    if (newPage >= 1 && newPage <= emptyTripsPagination.pages) {
      fetchEmptyTrips(newPage);
    }
  };

  const handleEmptyTripRefresh = () => {
    fetchEmptyTrips(emptyTripsPagination.page);
  };

  // Filter trips by tab
  const today = new Date().toISOString().split("T")[0];

  const filterTrips = (tabId) => {
    if (!trips) return [];

    switch (tabId) {
      case "today":
        return trips.filter((trip) => {
          // Excluir viajes vacíos de la pestaña "Hoy"
          if (trip.state === "empty") return false;

          // Viajes activos o pausados siempre van en "Hoy"
          if (trip.state === "active" || trip.state === "paused") return true;

          // Viajes draft sin programar (viajes rápidos) van en "Hoy"
          if (trip.state === "draft" && !trip.is_scheduled) return true;

          // Viajes programados para hoy van en "Hoy"
          if (
            trip.state === "draft" &&
            trip.is_scheduled &&
            trip.scheduled_datetime?.startsWith(today)
          )
            return true;
          return false;
        });
      case "empty":
        // Retornar array vacío porque ahora usamos emptyTrips
        return [];
      case "scheduled":
        return trips.filter(
          (trip) =>
            trip.state === "draft" &&
            trip.is_scheduled &&
            !trip.scheduled_datetime?.startsWith(today)
        );
      case "history":
        return trips.filter(
          (trip) => trip.state === "done" || trip.state === "cancelled"
        );
      default:
        return [];
    }
  };

  const activeTrips = filterTrips(activeTab);

  // Update tab counts
  tabs.forEach((tab) => {
    if (tab.id === "empty") {
      // Para búsquedas, mostrar solo las activas (no el total)
      const activeEmptyTrips = emptyTrips.filter(
        (trip) => trip.state === "searching"
      );
      tab.count = activeEmptyTrips.length;
    } else {
      tab.count = filterTrips(tab.id).length;
    }
  });

  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-[#a9e978]/20 p-4">
        <div className="animate-pulse space-y-4">
          <div className="flex space-x-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-[#c5f0a4]/30 rounded w-20"></div>
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-[#c5f0a4]/30 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-[#a9e978]/20">
      {/* Tab Headers */}
      <div className="flex border-b border-[#a9e978]/20">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-3 text-sm font-medium relative transition-colors ${
              activeTab === tab.id
                ? "text-[#2a2a2a] border-b-2 border-[#a9e978] bg-[#c5f0a4]/10"
                : "text-[#2a2a2a]/70 hover:text-[#2a2a2a] hover:bg-[#c5f0a4]/5"
            }`}
          >
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span
                className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                  activeTab === tab.id
                    ? "bg-[#a9e978] text-[#2a2a2a]"
                    : "bg-[#c5f0a4]/50 text-[#2a2a2a]/70"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-4">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "empty" ? (
            // Contenido especial para búsquedas
            <div>
              {emptyTripsLoading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-[#a9e978] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-[#2a2a2a]/60">Cargando búsquedas...</p>
                </div>
              ) : emptyTrips.length > 0 ? (
                <>
                  {/* Separar búsquedas activas de completadas */}
                  {(() => {
                    const activeSearches = emptyTrips.filter(
                      (trip) => trip.state === "searching"
                    );
                    const completedSearches = emptyTrips.filter(
                      (trip) => trip.state !== "searching"
                    );

                    return (
                      <div className="space-y-6">
                        {/* Búsquedas Activas */}
                        {activeSearches.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-2 h-2 bg-[#a9e978] rounded-full animate-pulse"></div>
                              <h3 className="font-medium text-[#2a2a2a] text-sm">
                                Búsquedas Activas ({activeSearches.length})
                              </h3>
                            </div>
                            <div className="space-y-3">
                              {activeSearches.map((emptyTrip) => (
                                <EmptyTripCard
                                  key={emptyTrip.id}
                                  emptyTrip={emptyTrip}
                                  onConvert={onNavigateToTripForm}
                                  onRefresh={handleEmptyTripRefresh}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Búsquedas Completadas */}
                        {completedSearches.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-2 h-2 bg-[#2a2a2a]/40 rounded-full"></div>
                              <h3 className="font-medium text-[#2a2a2a]/70 text-sm">
                                Búsquedas Completadas (
                                {completedSearches.length})
                              </h3>
                            </div>
                            <div className="space-y-3">
                              {completedSearches.map((emptyTrip) => (
                                <EmptyTripCard
                                  key={emptyTrip.id}
                                  emptyTrip={emptyTrip}
                                  onConvert={onNavigateToTripForm}
                                  onRefresh={handleEmptyTripRefresh}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Paginación para búsquedas */}
                  {emptyTripsPagination.pages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                      <button
                        onClick={() =>
                          handleEmptyTripsPageChange(
                            emptyTripsPagination.page - 1
                          )
                        }
                        disabled={emptyTripsPagination.page <= 1}
                        className="px-3 py-2 text-sm bg-[#c5f0a4] hover:bg-[#a9e978] text-[#2a2a2a] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <div className="flex items-center gap-1">
                        {Array.from(
                          { length: Math.min(3, emptyTripsPagination.pages) },
                          (_, i) => {
                            const page = i + 1;
                            return (
                              <button
                                key={page}
                                onClick={() => handleEmptyTripsPageChange(page)}
                                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                                  emptyTripsPagination.page === page
                                    ? "bg-[#a9e978] text-[#2a2a2a] font-medium"
                                    : "bg-[#c5f0a4]/50 hover:bg-[#c5f0a4] text-[#2a2a2a]/70"
                                }`}
                              >
                                {page}
                              </button>
                            );
                          }
                        )}
                      </div>

                      <button
                        onClick={() =>
                          handleEmptyTripsPageChange(
                            emptyTripsPagination.page + 1
                          )
                        }
                        disabled={
                          emptyTripsPagination.page >=
                          emptyTripsPagination.pages
                        }
                        className="px-3 py-2 text-sm bg-[#c5f0a4] hover:bg-[#a9e978] text-[#2a2a2a] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <p className="text-center text-xs text-[#2a2a2a]/50 mt-4">
                    Página {emptyTripsPagination.page} de{" "}
                    {emptyTripsPagination.pages} • {emptyTripsPagination.total}{" "}
                    búsquedas (última semana)
                  </p>
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-[#c5f0a4]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-[#2a2a2a]/40"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <p className="text-[#2a2a2a]/60 font-medium mb-2">
                    No hay búsquedas registradas
                  </p>
                  <p className="text-[#2a2a2a]/40 text-sm">
                    Inicia una búsqueda de cliente desde el botón "Viaje Vacío"
                  </p>
                </div>
              )}
            </div>
          ) : (
            // Contenido normal para otras tabs
            <>
              {activeTrips.length > 0 ? (
                <div className="space-y-3">
                  {activeTrips.map((trip) => (
                    <TripCard key={trip.id} trip={trip} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-[#2a2a2a]/60">
                    {activeTab === "today" && "No tienes viajes para hoy"}
                    {activeTab === "scheduled" &&
                      "No tienes viajes programados"}
                    {activeTab === "history" && "No hay historial de viajes"}
                  </p>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default TripTabs;
