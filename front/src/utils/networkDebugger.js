// src/utils/networkDebugger.js
export const networkDebugger = {
  // Función para diagnosticar problemas de red
  async testConnection() {
    console.group("🌐 Network Diagnostic Test");

    const tests = [
      {
        name: "Basic connectivity",
        test: () => fetch("/", { method: "HEAD" }),
      },
      {
        name: "Session endpoint",
        test: () =>
          fetch("/web/session/get_session_info", {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              jsonrpc: "2.0",
              params: {},
              id: "test",
            }),
          }),
      },
      {
        name: "Database list",
        test: () =>
          fetch("/web/database/list", {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              jsonrpc: "2.0",
              method: "call",
              params: {},
            }),
          }),
      },
    ];

    const results = [];

    for (const { name, test } of tests) {
      try {
        console.log(`🔍 Testing: ${name}...`);
        const response = await test();
        const result = {
          name,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          ok: response.ok,
        };

        if (response.ok) {
          try {
            const text = await response.text();
            result.body = text.substring(0, 500); // Solo primeros 500 chars
            console.log(`✅ ${name}: OK`, result);
          } catch (e) {
            result.body = "Unable to read response body";
            console.log(`⚠️ ${name}: Response OK but body unreadable`, result);
          }
        } else {
          try {
            const text = await response.text();
            result.error = text.substring(0, 500);
            console.error(`❌ ${name}: Failed`, result);
          } catch (e) {
            result.error = "Unable to read error response";
            console.error(`💥 ${name}: Failed completely`, result);
          }
        }

        results.push(result);
      } catch (error) {
        const result = {
          name,
          error: error.message,
          stack: error.stack,
        };
        console.error(`💥 ${name}: Exception`, result);
        results.push(result);
      }
    }

    console.groupEnd();
    return results;
  },

  // Función para monitorear todas las peticiones fetch
  enableNetworkMonitoring() {
    if (window.originalFetch) {
      console.log("🔍 Network monitoring already enabled");
      return;
    }

    window.originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const [url, options = {}] = args;
      const startTime = performance.now();

      console.group(`📡 Fetch: ${url}`);
      console.log("Request:", {
        url,
        method: options.method || "GET",
        headers: options.headers,
        body: options.body ? options.body.substring(0, 200) + "..." : undefined,
      });

      try {
        const response = await window.originalFetch(...args);
        const endTime = performance.now();

        console.log(`Response (${Math.round(endTime - startTime)}ms):`, {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
        });

        console.groupEnd();
        return response;
      } catch (error) {
        const endTime = performance.now();
        console.error(`Error (${Math.round(endTime - startTime)}ms):`, error);
        console.groupEnd();
        throw error;
      }
    };

    console.log(
      "🔍 Network monitoring enabled. Use networkDebugger.disableNetworkMonitoring() to disable."
    );
  },

  // Desactivar monitoreo
  disableNetworkMonitoring() {
    if (window.originalFetch) {
      window.fetch = window.originalFetch;
      delete window.originalFetch;
      console.log("🔍 Network monitoring disabled");
    }
  },

  // Información del entorno
  getEnvironmentInfo() {
    const info = {
      userAgent: navigator.userAgent,
      cookiesEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      language: navigator.language,
      platform: navigator.platform,
      location: {
        href: window.location.href,
        protocol: window.location.protocol,
        host: window.location.host,
        origin: window.location.origin,
      },
      referrer: document.referrer,
      cookies: document.cookie,
      localStorage: !!window.localStorage,
      sessionStorage: !!window.sessionStorage,
    };

    console.table(info);
    return info;
  },
};

// Hacer disponible globalmente en desarrollo
if (!import.meta.env.PROD) {
  window.networkDebugger = networkDebugger;
  console.log("🔧 Network debugger available as window.networkDebugger");
}
