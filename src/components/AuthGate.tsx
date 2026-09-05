import { useEffect, useState, type ReactNode, type FormEvent } from "react"
import { isDemoMode } from "@/lib/api"
import { AppLoading } from "./AppLoading"
import { Button } from "./ui/button"
import { Input } from "./ui/input"

export function AuthGate({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(isDemoMode)
  const [loading, setLoading] = useState(!isDemoMode)
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const fr = !navigator.language.startsWith("en")

  useEffect(() => {
    if (isDemoMode) return
    let active = true
    fetch("/api/auth/session").then(async (response) => {
      if (!response.ok) throw new Error()
      const session = await response.json()
      if (active) setAuthenticated(session.authenticated === true)
    }).catch(() => { if (active) setError(fr ? "Connexion au serveur impossible. Réessayez." : "Unable to reach the server. Try again.") })
      .finally(() => { if (active) setLoading(false) })
    const expired = () => { setAuthenticated(false); setPassword("") }
    window.addEventListener("babycare-auth-required", expired)
    return () => { active = false; window.removeEventListener("babycare-auth-required", expired) }
  }, [fr])

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
      setAuthenticated(false)
    } catch { setError(fr ? "Déconnexion impossible. Réessayez." : "Unable to sign out. Try again.") }
    finally { setSubmitting(false) }
  }

  if (loading) return <AppLoading accentColor="orange" />
  if (authenticated) return <>{children}{!isDemoMode && <div className="p-3 text-center"><Button variant="ghost" disabled={submitting} onClick={logout}>{fr ? "Se déconnecter" : "Sign out"}</Button>{error && <p role="alert">{error}</p>}</div>}</>
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
