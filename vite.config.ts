import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "BabyCare",
        short_name: "BabyCare",
        description: "Suivi local des soins quotidiens de bébé",
        theme_color: "#FD6D01",
        background_color: "#000000",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/babycare-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }
        ]
      }
    })
  ],
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
  server: {
    host: true,
    strictPort: true,
    proxy: { "/api": "http://localhost:3000" }
  }
})
