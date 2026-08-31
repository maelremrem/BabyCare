import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import legacy from "@vitejs/plugin-legacy"
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from "vite-plugin-pwa"
import packageJson from "./package.json" with { type: "json" }

const apiPort = Number(process.env.API_PORT || process.env.PORT) || 3000

export default defineConfig(({ mode }) => {
  const isIos15Mode = mode === "ios15"
  const base = process.env.VITE_BASE_PATH || (mode === "demo" ? "/BabyCare/" : "/")
  const outDir = process.env.VITE_OUT_DIR || (isIos15Mode ? "dist-ios15" : mode === "modern" ? "dist-modern" : "dist")

  return {
    base,
    define: { __APP_VERSION__: JSON.stringify(packageJson.version) },
    plugins: [
      react(),
      tailwindcss(),
      ...(isIos15Mode ? [legacy({ targets: ["iOS >= 15", "Safari >= 15", "Android >= 10"] })] : []),
      VitePWA({
        registerType: "autoUpdate",
        manifest: {
          name: "BabyCare",
          short_name: "BabyCare",
          description: "Suivi local des soins quotidiens de bébé",
          theme_color: "#FD6D01",
          background_color: "#000000",
          display: "standalone",
          start_url: base,
          icons: [
            { src: `${base}babycare-icon.svg`, sizes: "any", type: "image/svg+xml", purpose: "any maskable" }
          ]
        }
      })
    ],
    resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
    build: { outDir, cssTarget: isIos15Mode ? "safari15" : "safari17" },
    server: {
      host: true,
      strictPort: true,
      proxy: { "/api": `http://localhost:${apiPort}` }
    },
    preview: { host: true, port: 4173, strictPort: true, proxy: { "/api": `http://localhost:${apiPort}` } }
  }
})
