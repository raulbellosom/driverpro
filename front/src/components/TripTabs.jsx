import { useState } from "react";
import { motion } from "motion/react";
import TripCard from "./TripCard";

const TripTabs = ({ trips, loading }) => {
  const [activeTab, setActiveTab] = useState("today");

  const tabs = [
    { id: "today", label: "Hoy", count: 0 },
    { id: "scheduled", label: "Programados", count: 0 },
    { id: "history", label: "Historial", count: 0 },
  ];

  // Filter trips by tab
  const today = new Date().toISOString().split("T")[0];

  const filterTrips = (tabId) => {
    if (!trips) return [];

    switch (tabId) {
      case "today":
        return trips.filter((trip) => {
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
    tab.count = filterTrips(tab.id).length;
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
                {activeTab === "scheduled" && "No tienes viajes programados"}
                {activeTab === "history" && "No hay historial de viajes"}
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default TripTabs;
