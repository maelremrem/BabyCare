import { Component, type ReactNode } from "react"
import { Button } from "./ui/button"

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (!this.state.failed) return this.props.children
    const fr = !navigator.language.startsWith("en")
    return <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">BabyCare</h1>
      <p role="alert">{fr ? "Cette page n’a pas pu être chargée. Vérifiez votre connexion puis réessayez." : "This page could not be loaded. Check your connection and try again."}</p>
      <Button onClick={() => window.location.reload()}>{fr ? "Recharger" : "Reload"}</Button>
    </main>
  }
}
