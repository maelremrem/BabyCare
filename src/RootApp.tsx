import { lazy, Suspense } from "react"
import { AppErrorBoundary } from "./components/AppErrorBoundary"
import { AuthGate } from "./components/AuthGate"
import { AppLoading } from "./components/AppLoading"
const App = lazy(() => import("./App"))
const WidgetApp = lazy(() => import("./WidgetApp").then((module) => ({ default: module.WidgetApp })))

export function RootApp() {
  const widget = window.location.pathname.replace(/\/+$/, "") === "/widget"
  return <AppErrorBoundary><AuthGate><Suspense fallback={<AppLoading accentColor="orange" />}>
    {widget ? <WidgetApp /> : <App />}
  </Suspense></AuthGate></AppErrorBoundary>
}
