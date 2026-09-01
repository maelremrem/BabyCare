import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App"
import { WidgetApp } from "./WidgetApp"
import "./index.css"

function readPathname() {
  if (typeof window === "undefined") return "/"
  const pathname = window.location.pathname.replace(/\/+$/, "")
  return pathname || "/"
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {readPathname() === "/widget" ? <WidgetApp /> : <App />}
  </StrictMode>
)
