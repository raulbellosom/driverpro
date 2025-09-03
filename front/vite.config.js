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
            urlPattern: /^\/api\/.*$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "driverpro-api",
              expiration: { maxEntries: 100, maxAgeSeconds: 86400 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      "/web": {
        target: "http://127.0.0.1:18069",
        changeOrigin: true,
        secure: false,
      },
      // añade este y puedes borrar "/driverpro"
      "/api": {
        target: "http://127.0.0.1:18069/driverpro",
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p.replace(/^\/api/, "/api"),
      },
    },
  },
});
