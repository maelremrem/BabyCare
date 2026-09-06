import { useEffect, useState, type ReactNode, type FormEvent } from "react"
import { isDemoMode } from "@/lib/api"
import { AppLoading } from "./AppLoading"
import { Button } from "./ui/button"
import { Input } from "./ui/input"

export function AuthGate({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(isDemoMode)
  const [loading, setLoading] = useState(!isDemoMode)
  const [passwordEnabled, setPasswordEnabled] = useState<boolean | null>(null)
  const [sessionCheck, setSessionCheck] = useState(0)
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const fr = !navigator.language.startsWith("en")

  useEffect(() => {
    if (isDemoMode) return
    let active = true
    let retry: ReturnType<typeof setTimeout> | undefined
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    setLoading(true)
    setPasswordEnabled(null)
    setError("")
    fetch("/api/auth/session", { cache: "no-store", signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error()
      const session = await response.json()
      if (typeof session.enabled !== "boolean" || typeof session.authenticated !== "boolean") throw new Error()
      if (active) {
        setPasswordEnabled(session.enabled)
        setAuthenticated(!session.enabled || session.authenticated)
      }
    }).catch(() => {
      if (!active) return
      setAuthenticated(false)
      setError(fr ? "Le serveur est temporairement indisponible. Reconnexion automatique…" : "The server is temporarily unavailable. Reconnecting automatically…")
      retry = setTimeout(() => setSessionCheck(value => value + 1), 5000)
    }).finally(() => { clearTimeout(timeout); if (active) setLoading(false) })
    const recheck = () => { setLoading(true); setPassword(""); setSessionCheck(value => value + 1) }
    window.addEventListener("babycare-auth-required", recheck)
    window.addEventListener("online", recheck)
    return () => {
      active = false
      controller.abort()
      clearTimeout(timeout)
      clearTimeout(retry)
      window.removeEventListener("babycare-auth-required", recheck)
      window.removeEventListener("online", recheck)
    }
  }, [fr, sessionCheck])

  async function login(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError("")
    try {
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-BabyCare-Request": "1" },
        body: JSON.stringify({ password })
      })
      if (!response.ok) {
        setError(response.status === 429
          ? (fr ? "Trop de tentatives. Réessayez dans une minute." : "Too many attempts. Try again in a minute.")
          : (fr ? "Connexion refusée. Vérifiez le mot de passe." : "Sign-in failed. Check your password."))
        return
      }
      setPassword("")
      setAuthenticated(true)
    } catch { setError(fr ? "Connexion au serveur impossible." : "Unable to reach the server.") }
    finally { setSubmitting(false) }
  }

  async function logout() {
    setSubmitting(true)
    try {
      const response = await fetch("/api/auth/session", { method: "DELETE", headers: { "X-BabyCare-Request": "1" } })
      if (!response.ok) throw new Error()
      setLoading(true)
      setSessionCheck(value => value + 1)
    } catch { setError(fr ? "Déconnexion impossible. Réessayez." : "Unable to sign out. Try again.") }
    finally { setSubmitting(false) }
  }

  if (loading) return <AppLoading accentColor="orange" />
  if (!isDemoMode && passwordEnabled === null) return <main className="flex min-h-dvh items-center justify-center bg-background p-6">
    <div className="w-full max-w-sm space-y-5 rounded-2xl border bg-card p-6">
      <h1 className="text-2xl font-semibold">BabyCare</h1>
      <p role="alert" className="text-sm text-muted-foreground">{error}</p>
      <Button className="w-full" onClick={() => setSessionCheck(value => value + 1)}>{fr ? "Réessayer" : "Try again"}</Button>
    </div>
  </main>
  if (authenticated) return <>{children}{!isDemoMode && passwordEnabled && <div className="p-3 text-center"><Button variant="ghost" disabled={submitting} onClick={logout}>{fr ? "Se déconnecter" : "Sign out"}</Button>{error && <p role="alert">{error}</p>}</div>}</>
  return <main className="flex min-h-dvh items-center justify-center bg-background p-6">
    <form onSubmit={login} className="w-full max-w-sm space-y-5 rounded-2xl border bg-card p-6">
      <h1 className="text-2xl font-semibold">BabyCare</h1>
      <p className="text-sm text-muted-foreground">{fr ? "Connectez-vous pour retrouver le suivi de votre famille." : "Sign in to access your family’s tracking."}</p>
      <div className="space-y-2"><label htmlFor="password">{fr ? "Mot de passe" : "Password"}</label><Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={submitting}>{submitting ? (fr ? "Connexion…" : "Signing in…") : (fr ? "Se connecter" : "Sign in")}</Button>
    </form>
  </main>
}
