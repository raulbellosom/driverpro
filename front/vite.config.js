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
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",
      registerType: "autoUpdate",
      devOptions: {
        enabled: true,
        type: "module",
        navigateFallback: "index.html",
      },
      injectManifest: {
        swDest: "dist/sw.js",
        globDirectory: "dist",
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
        maximumFileSizeToCacheInBytes: 5000000,
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
        maximumFileSizeToCacheInBytes: 5000000,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/driverpro\.racoondevs\.com\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 1 day
              },
            },
          },
        ],
      },
      includeAssets: [
        "favicon.ico",
        "apple-touch-icon.png",
        "favicon.svg",
        "logo.png",
        "web-app-manifest-192x192.png",
        "web-app-manifest-512x512.png",
        "favicon-96x96.png",
      ],
      manifest: {
        name: "Driver Pro - Aplicación para Choferes",
        short_name: "Driver Pro",
        description:
          "Aplicación móvil para gestión de viajes y tarjetas de Driver Pro",
        theme_color: "#c5f0a4",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/",
        id: "/",
        lang: "es-MX",
        categories: ["productivity", "business", "travel"],
        prefer_related_applications: false,
        edge_side_panel: {
          preferred_width: 400,
        },
        icons: [
          {
            src: "web-app-manifest-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "web-app-manifest-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "apple-touch-icon.png",
            sizes: "180x180",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "favicon-96x96.png",
            sizes: "96x96",
            type: "image/png",
            purpose: "any",
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
      "/api": {
        target: "http://127.0.0.1:18069/driverpro",
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p.replace(/^\/api/, "/api"),
      },
      "/longpolling": {
        target: "http://127.0.0.1:18069",
        changeOrigin: true,
        secure: false,
      },
      "/websocket": {
        target: "http://127.0.0.1:18072",
        ws: true,
        changeOrigin: true,
        secure: false,
      },
      "/driverpro": {
        target: "http://127.0.0.1:18069",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
