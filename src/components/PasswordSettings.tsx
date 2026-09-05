import { useState, type FormEvent } from "react"
import { ApiError, changePassword } from "@/lib/api"
import { useI18n } from "@/lib/i18n"
import { Button } from "./ui/button"
import { Input } from "./ui/input"

export function PasswordSettings() {
  const { locale } = useI18n()
  const fr = locale === "fr"
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)

  async function save(event: FormEvent) {
    event.preventDefault()
    setError("")
    setSaved(false)
    if (newPassword !== confirmation) {
      setError(fr ? "Les nouveaux mots de passe ne correspondent pas." : "The new passwords do not match.")
      return
    }
    setSaving(true)
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmation("")
      setSaved(true)
    } catch (reason) {
      const code = reason instanceof ApiError ? reason.code : null
      const errors: Record<string, string> = {
        invalid_password: fr ? "Mot de passe actuel incorrect." : "Current password is incorrect.",
        password_managed: fr ? "Le mot de passe est défini par le serveur. Modifiez sa configuration pour le changer." : "This password is managed by the server. Update its configuration to change it.",
        invalid_new_password: fr ? "Utilisez au moins 6 caractères, sans espaces au début ou à la fin." : "Use at least 6 characters, without leading or trailing spaces.",
        login_rate_limited: fr ? "Trop de tentatives. Réessayez dans une minute." : "Too many attempts. Try again in a minute."
      }
      setError(errors[code || ""] || (fr ? "Le mot de passe n’a pas pu être modifié. Réessayez." : "The password could not be changed. Try again."))
    } finally { setSaving(false) }
  }

  return <form onSubmit={save} aria-labelledby="password-settings-title" className="space-y-3 rounded-2xl border bg-card/60 p-4">
    <h3 id="password-settings-title" className="font-semibold">{fr ? "Mot de passe" : "Password"}</h3>
    <p className="text-xs text-muted-foreground">{fr ? "Choisissez au moins 6 caractères. Les autres appareils devront se reconnecter." : "Choose at least 6 characters. Other devices will need to sign in again."}</p>
    <div className="space-y-1"><label htmlFor="current-password" className="text-sm">{fr ? "Mot de passe actuel" : "Current password"}</label><Input id="current-password" type="password" autoComplete="current-password" required maxLength={1024} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></div>
    <div className="space-y-1"><label htmlFor="new-password" className="text-sm">{fr ? "Nouveau mot de passe" : "New password"}</label><Input id="new-password" type="password" autoComplete="new-password" required minLength={6} maxLength={1024} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></div>
    <div className="space-y-1"><label htmlFor="confirm-password" className="text-sm">{fr ? "Confirmer le nouveau mot de passe" : "Confirm new password"}</label><Input id="confirm-password" type="password" autoComplete="new-password" required minLength={6} maxLength={1024} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {saved && <p role="status" className="text-sm">{fr ? "Mot de passe modifié." : "Password changed."}</p>}
    <Button type="submit" disabled={saving} className="w-full">{saving ? (fr ? "Enregistrement…" : "Saving…") : (fr ? "Changer le mot de passe" : "Change password")}</Button>
  </form>
}
