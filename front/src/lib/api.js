import axios from "axios";

/**
 * Axios base: usamos rutas relativas y cookies de sesión de Odoo.
 * Asegúrate de que tu login ya estableció la cookie (misma raíz / dominio).
 */
const api = axios.create({
  baseURL: "/", // relativo al dev server / producción
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
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

// Helper para JSON-RPC (Odoo)
const rpc = (path, params = {}) =>
  api.post(path, { jsonrpc: "2.0", method: "call", params });

/**
 * Auth/session
 */
export const authAPI = {
  // Usar directamente JSON-RPC POST para obtener información de sesión
  async getSessionInfo() {
    const { data } = await rpc("/web/session/get_session_info", {});
    return data;
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
};

/**
 * DriverPro addon endpoints y bus
 */
export const driverAPI = {
  /**
   * Devuelve info mínima para el bus (db, uid, partner_id).
   * Ruta proxyeada: /api/me -> http://127.0.0.1:18069/driverpro/api/me
   */
  async getUserInfo() {
    const { data } = await api.post("/api/me", {});
    return data; // suele venir como { success: true, data: {...} }
  },

  /**
   * Envía una notificación de prueba vía bus desde el backend Odoo.
   * Proxyeado: /api/notify
   */
  async notify(payload) {
    const { data } = await api.post("/api/notify", payload || {});
    return data;
  },

  /**
   * Polling alternativo usando endpoint personalizado de DriverPro
   * Como longpolling nativo no está disponible en esta configuración,
   * usamos nuestro propio endpoint para verificar notificaciones
   */
  async poll({ channels, last = 0, timeout = 55 } = {}) {
    if (!Array.isArray(channels) || channels.length === 0) {
      throw new Error("channels requerido");
    }

    console.log(
      "🔄 Usando polling alternativo (longpolling no disponible en Odoo 18)"
    );

    try {
      // En lugar de longpolling, verificamos si hay notificaciones pendientes
      // usando nuestro endpoint personalizado
      const response = await api.post("/driverpro/api/check-notifications", {
        channels: channels,
        last: last,
      });

      if (response.data && response.data.result) {
        return response.data.result;
      }

      return response.data || [];
    } catch (error) {
      console.warn(
        "⚠️ Endpoint de notificaciones personalizado no disponible:",
        error.message
      );

      // Si nuestro endpoint tampoco funciona, retornamos array vacío
      // pero el sistema sigue funcional para testing
      return [];
    }
  },

  /**
   * Utilidad para botón "Test bus connection" (debug)
   * - Llama a /api/me para obtener db y partner_id
   * - Hace un poll corto (5s) para validar que no 404 y retorna el array
   */
  async testBusConnection() {
    console.log("🧪 Probando conexión directa al bus...");
    const userInfoRaw = await this.getUserInfo();
    console.log("👤 Info del usuario:", userInfoRaw);

    // Extraer datos de respuesta JSON-RPC
    let core;
    if (userInfoRaw?.result?.data) {
      // Formato JSON-RPC: { result: { success: true, data: {...} } }
      core = userInfoRaw.result.data;
    } else if (userInfoRaw?.data) {
      // Formato directo: { success: true, data: {...} }
      core = userInfoRaw.data;
    } else {
      // Formato simple: { db, partner_id, ... }
      core = userInfoRaw;
    }

    console.log("🔍 Datos extraídos:", core);

    const db = core?.db;
    const partnerId = core?.partner_id;

    if (!db || !partnerId) {
      throw new Error(
        `No hay db/partner_id en /api/me. Datos: ${JSON.stringify(core)}`
      );
    }

    const channels = [[db, "res.partner", partnerId]];
    console.log("🔍 Probando canales:", channels);

    const result = await this.poll({ channels, last: 0, timeout: 5 });
    console.log("🚌 Respuesta del bus:", result);

    return {
      success: true,
      userInfo: core,
      result,
    };
  },

  getAssignment: async () => {
    const response = await api.get("/api/me/assignment");
    return response.data;
  },

  getTrips: async (params = {}) => {
    const response = await api.get("/api/trips", { params });
    return response.data;
  },

  createTrip: async (tripData) => {
    const response = await api.post("/api/trips/create", tripData);
    return response.data;
  },

  startTrip: async (tripId) => {
    const response = await fetch(`/api/trips/${tripId}/start`, {
      method: "POST",
      credentials: "include",
    });

    const result = await response.json();

    if (!response.ok) {
      const error = new Error(
        result.message || result.error || `Error ${response.status}`
      );
      error.code = result.code || response.status;
      error.response = result;
      throw error;
    }

    return result;
  },

  pauseTrip: async (tripId, data) => {
    const response = await fetch(`/api/trips/${tripId}/pause`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      credentials: "include",
    });

    const result = await response.json();

    if (!response.ok) {
      const error = new Error(
        result.message || result.error || `Error ${response.status}`
      );
      error.code = result.code || response.status;
      error.response = result;
      throw error;
    }

    return result;
  },

  resumeTrip: async (tripId) => {
    const response = await fetch(`/api/trips/${tripId}/resume`, {
      method: "POST",
      credentials: "include",
    });

    const result = await response.json();

    if (!response.ok) {
      const error = new Error(
        result.message || result.error || `Error ${response.status}`
      );
      error.code = result.code || response.status;
      error.response = result;
      throw error;
    }

    return result;
  },

  completeTrip: async (tripId) => {
    const response = await fetch(`/api/trips/${tripId}/done`, {
      method: "POST",
      credentials: "include",
    });

    const result = await response.json();

    if (!response.ok) {
      const error = new Error(
        result.message || result.error || `Error ${response.status}`
      );
      error.code = result.code || response.status;
      error.response = result;
      throw error;
    }

    return result;
  },

  cancelTrip: async (tripId, data = {}) => {
    const response = await fetch(`/api/trips/${tripId}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      credentials: "include",
    });

    const result = await response.json();

    if (!response.ok) {
      const error = new Error(
        result.message || result.error || `Error ${response.status}`
      );
      error.code = result.code || response.status;
      error.response = result;
      throw error;
    }

    return result;
  },

  getPauseReasons: async () => {
    const response = await fetch("/api/pause-reasons", {
      method: "GET",
      credentials: "include",
    });
    return await response.json();
  },

  getHealth: async () => {
    const response = await api.get("/api/health");
    return response.data;
  },

  // Empty Trips (Client Search) API
  getEmptyTrips: async (params = {}) => {
    const { page = 1, limit = 10 } = params;
    const queryParams = new URLSearchParams({ page, limit });

    const response = await fetch(`/api/empty-trips?${queryParams}`, {
      method: "GET",
      credentials: "include",
    });

    const result = await response.json();

    if (!response.ok) {
      const error = new Error(
        result.message || result.error || `Error ${response.status}`
      );
      error.code = result.code || response.status;
      error.response = result;
      throw error;
    }

    return result;
  },

  createEmptyTrip: async (data) => {
    const response = await fetch("/api/empty-trips/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      credentials: "include",
    });

    const result = await response.json();

    if (!response.ok) {
      const error = new Error(
        result.message || result.error || `Error ${response.status}`
      );
      error.code = result.code || response.status;
      error.response = result;
      throw error;
    }

    return result;
  },

  convertEmptyTrip: async (emptyTripId) => {
    const response = await fetch(`/api/empty-trips/${emptyTripId}/convert`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    const result = await response.json();

    if (!response.ok) {
      const error = new Error(
        result.message || result.error || `Error ${response.status}`
      );
      error.code = result.code || response.status;
      error.response = result;
      throw error;
    }

    return result;
  },

  cancelEmptyTrip: async (emptyTripId) => {
    const response = await fetch(`/api/empty-trips/${emptyTripId}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    const result = await response.json();

    if (!response.ok) {
      const error = new Error(
        result.message || result.error || `Error ${response.status}`
      );
      error.code = result.code || response.status;
      error.response = result;
      throw error;
    }

    return result;
  },
};

// Mantener compatibilidad con busAPI para el hook existente
export const busAPI = {
  getUserInfo: async () => {
    try {
      const response = await authAPI.getSessionInfo();
      if (response && response.result) {
        const sessionInfo = response.result;
        return {
          success: true,
          data: {
            name: sessionInfo.name,
            login: sessionInfo.username,
            partner_id: sessionInfo.partner_id,
            db: sessionInfo.db,
            uid: sessionInfo.uid,
            user_id: sessionInfo.uid,
            session_id: sessionInfo.session_id,
          },
        };
      }
      throw new Error("No se pudo obtener información de la sesión");
    } catch (error) {
      console.error("❌ Error obteniendo info del usuario:", error);
      return { success: false, error: error.message };
    }
  },

  poll: async (channels, lastId = 0) => {
    return driverAPI.poll({ channels, last: lastId, timeout: 55 });
  },

  sendNotification: async (notification) => {
    return driverAPI.notify(notification);
  },

  testConnection: async () => {
    return driverAPI.testBusConnection();
  },
};

/**
 * APIs para notificaciones push
 */
export const pushAPI = {
  subscribe: async (payload) => {
    try {
      // Usar la ruta que funciona con nginx: /api/ se mapea a /driverpro/api/
      const response = await rpc("/api/push/subscribe", payload);
      return response.data;
    } catch (error) {
      // Si falla, intentar con la ruta web como fallback
      if (error.response?.status === 405 || error.response?.status === 404) {
        console.log("Intentando ruta alternativa para push subscribe...");
        const response = await rpc("/web/driverpro/push/subscribe", payload);
        return response.data;
      }
      throw error;
    }
  },

  unsubscribe: async (payload) => {
    try {
      const response = await rpc("/api/push/unsubscribe", payload);
      return response.data;
    } catch (error) {
      if (error.response?.status === 405 || error.response?.status === 404) {
        console.log("Intentando ruta alternativa para push unsubscribe...");
        const response = await rpc("/web/driverpro/push/unsubscribe", payload);
        return response.data;
      }
      throw error;
    }
  },

  status: async () => {
    try {
      const response = await rpc("/api/push/status", {});
      return response.data;
    } catch (error) {
      if (error.response?.status === 405 || error.response?.status === 404) {
        console.log("Intentando ruta alternativa para push status...");
        const response = await rpc("/web/driverpro/push/status", {});
        return response.data;
      }
      throw error;
    }
  },

  test: async (type = "test") => {
    try {
      const response = await rpc("/api/push/test", { type });
      return response.data;
    } catch (error) {
      if (error.response?.status === 405 || error.response?.status === 404) {
        console.log("Intentando ruta alternativa para push test...");
        const response = await rpc("/web/driverpro/push/test", { type });
        return response.data;
      }
      throw error;
    }
  },
};

export default api;
