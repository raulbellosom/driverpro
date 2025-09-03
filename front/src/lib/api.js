import axios from "axios";

// Configuración del cliente HTTP
const api = axios.create({
  baseURL: "/",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para respuestas
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login if unauthorized
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  // Login automático que detecta la base de datos
  smartLogin: async (username, password) => {
    try {
      // Primero obtener lista de bases de datos
      const dbListResult = await api.post("/web/database/list", {
        jsonrpc: "2.0",
        method: "call",
        params: {},
      });

      if (
        !dbListResult.data.result ||
        !Array.isArray(dbListResult.data.result)
      ) {
        throw new Error("No se pudieron obtener las bases de datos");
      }

      const databases = dbListResult.data.result;
      let targetDb = null;

      // Si solo hay una base de datos, usarla
      if (databases.length === 1) {
        targetDb = databases[0];
      } else {
        // Buscar una base de datos que contenga "driver", "driverpro" o "racoon"
        targetDb = databases.find(
          (db) =>
            db.toLowerCase().includes("driver") ||
            db.toLowerCase().includes("driverpro") ||
            db.toLowerCase().includes("racoon")
        );

        // Si no encuentra una obvia, usar la primera
        if (!targetDb && databases.length > 0) {
          targetDb = databases[0];
        }
      }

      if (!targetDb) {
        throw new Error("No hay bases de datos disponibles");
      }

      // Hacer login con la base de datos detectada
      const response = await api.post("/web/session/authenticate", {
        jsonrpc: "2.0",
        method: "call",
        params: {
          db: targetDb,
          login: username,
          password: password,
        },
      });

      if (response.data.error) {
        throw new Error(
          response.data.error.message || "Credenciales inválidas"
        );
      }

      return response.data;
    } catch (error) {
      console.error("Error en smartLogin:", error);
      throw error;
    }
  },

  getDatabaseList: async () => {
    const response = await api.post("/web/database/list", {
      jsonrpc: "2.0",
      method: "call",
      params: {},
    });
    return response.data;
  },

  login: async (username, password, database) => {
    const response = await api.post("/web/session/authenticate", {
      jsonrpc: "2.0",
      method: "call",
      params: {
        db: database,
        login: username,
        password: password,
      },
    });
    return response.data;
  },

  logout: async () => {
    const response = await api.post("/web/session/destroy", {
      jsonrpc: "2.0",
      method: "call",
      params: {},
    });
    return response.data;
  },

  getSessionInfo: async () => {
    const response = await api.post("/web/session/get_session_info", {
      jsonrpc: "2.0",
      method: "call",
      params: {},
    });
    return response.data;
  },
};

// DriverPro API
export const driverAPI = {
  getAssignment: async () => {
    const response = await api.get("/driverpro/api/me/assignment");
    return response.data;
  },

  getTrips: async (params = {}) => {
    const response = await api.get("/driverpro/api/trips", { params });
    return response.data;
  },

  createTrip: async (tripData) => {
    const response = await api.post("/driverpro/api/trips/create", tripData);
    return response.data;
  },

  startTrip: async (tripId) => {
    const response = await fetch(`/driverpro/api/trips/${tripId}/start`, {
      method: "POST",
      credentials: "include",
    });
    return await response.json();
  },

  pauseTrip: async (tripId, data) => {
    const response = await fetch(`/driverpro/api/trips/${tripId}/pause`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      credentials: "include",
    });
    return await response.json();
  },

  resumeTrip: async (tripId) => {
    const response = await fetch(`/driverpro/api/trips/${tripId}/resume`, {
      method: "POST",
      credentials: "include",
    });
    return await response.json();
  },

  completeTrip: async (tripId) => {
    const response = await fetch(`/driverpro/api/trips/${tripId}/done`, {
      method: "POST",
      credentials: "include",
    });
    return await response.json();
  },

  cancelTrip: async (tripId, data = {}) => {
    const response = await fetch(`/driverpro/api/trips/${tripId}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      credentials: "include",
    });
    return await response.json();
  },

  getPauseReasons: async () => {
    const response = await fetch("/driverpro/api/pause-reasons", {
      method: "GET",
      credentials: "include",
    });
    return await response.json();
  },

  getHealth: async () => {
    const response = await api.get("/driverpro/api/health");
    return response.data;
  },
};

// Test API connection
export const testAPI = {
  test: () => api.get("/driverpro/api/test"),
};

export default api;
