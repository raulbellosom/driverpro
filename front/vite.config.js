import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "favicon.svg"],
      manifest: {
        name: "Driver Pro - Chofer",
        short_name: "Driver Pro",
        description: "Aplicación para choferes de Driver Pro",
        theme_color: "#c5f0a4",
        background_color: "#eff7d0",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "web-app-manifest-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "web-app-manifest-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^\/api\/.*$/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "driverpro-api",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 }, // 1 día
            },
          },
        ],
      },
      devOptions: { enabled: true }, // para registrar el SW en dev si lo necesitas
    }),
  ],

  server: {
    proxy: {
      // Odoo HTTP normal (8069 → 18069)
      "/web": {
        target: "http://127.0.0.1:18069",
        changeOrigin: true,
        secure: false,
      },

      // Facade del addon: /api/* → http://127.0.0.1:18069/driverpro/api/*
      "/api": {
        target: "http://127.0.0.1:18069/driverpro",
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p.replace(/^\/api/, "/api"),
      },

      // Bus "evented" (long-poll legacy) en Odoo 17/18 → usar puerto principal 18069
      "/longpolling": {
        target: "http://127.0.0.1:18069",
        changeOrigin: true,
        secure: false,
      },

      // WebSocket nativo del bus (para cuando quieras migrarte a WS)
      "/websocket": {
        target: "http://127.0.0.1:18072",
        ws: true,
        changeOrigin: true,
        secure: false,
      },

      // Opcional: si en algún punto llamas a /driverpro/api/* directamente
      "/driverpro": {
        target: "http://127.0.0.1:18069",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
