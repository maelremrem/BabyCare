import { useEffect, useState, type FormEvent } from "react"
import { ApiError, changePassword, getPasswordStatus } from "@/lib/api"
import { useI18n } from "@/lib/i18n"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog"

export function PasswordSettings() {
  const { locale } = useI18n()
  const fr = locale === "fr"
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)
  const [remove, setRemove] = useState(false)

  const [open, setOpen] = useState(false)
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    getPasswordStatus().then(status => { if (active) { setEnabled(status.enabled); setLoadError(false) } })
      .catch(() => { if (active) setLoadError(true) })
    return () => { active = false }
  }, [attempt])

  function clearFields() {
    setCurrentPassword("")
    setNewPassword("")
    setConfirmation("")
    setError("")
  }

  function showModal(removing: boolean) {
    clearFields()
    setSaved(false)
    setRemove(removing)
    setOpen(true)
  }

  const actionLabel = remove
    ? (fr ? "Supprimer le mot de passe" : "Remove password")
    : enabled ? (fr ? "Modifier le mot de passe" : "Change password") : (fr ? "Créer un mot de passe" : "Create a password")

  async function save(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    setError("")
    setSaved(false)
    if (!remove && newPassword !== confirmation) {
      setError(fr ? "Les nouveaux mots de passe ne correspondent pas." : "The new passwords do not match.")
      return
    }
    setSaving(true)
    try {
      await changePassword(currentPassword, newPassword, remove)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmation("")
      setSaved(true)
      setEnabled(!remove)
      setOpen(false)
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

  return <section aria-labelledby="password-settings-title" className="space-y-3 rounded-2xl border bg-card/60 p-4">
    <h3 id="password-settings-title" className="font-semibold">{fr ? "Mot de passe" : "Password"}</h3>
    <p className="text-sm text-muted-foreground">{enabled === null
      ? (fr ? "Vérification de la protection…" : "Checking protection…")
      : enabled ? (fr ? "L’accès est protégé par un mot de passe." : "Access is password protected.")
        : (fr ? "Aucun mot de passe n’est défini." : "No password is set.")}</p>
    {loadError && <div role="alert" className="space-y-2">
      <p className="text-sm text-destructive">{fr ? "Impossible de vérifier le mot de passe." : "Unable to check password status."}</p>
      <Button type="button" variant="outline" onClick={() => { setLoadError(false); setAttempt(value => value + 1) }}>{fr ? "Réessayer" : "Retry"}</Button>
    </div>}
    {enabled !== null && <div className="flex flex-col gap-2">
      <Button type="button" variant="outline" className="h-11 w-full" onClick={() => showModal(false)}>{enabled ? (fr ? "Modifier le mot de passe" : "Change password") : (fr ? "Créer un mot de passe" : "Create a password")}</Button>
      {enabled && <Button type="button" variant="destructive" className="h-11 w-full" onClick={() => showModal(true)}>{fr ? "Supprimer le mot de passe" : "Remove password"}</Button>}
    </div>}
    {saved && <p role="status" className="text-sm">{remove ? (fr ? "Mot de passe supprimé." : "Password removed.") : (fr ? "Mot de passe enregistré." : "Password saved.")}</p>}
    <Dialog open={open} onOpenChange={value => { if (!saving) { setOpen(value); if (!value) clearFields() } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{actionLabel}</DialogTitle>
          <DialogDescription>{remove
            ? (fr ? "L’accès ne sera plus protégé. Saisissez le mot de passe actuel pour confirmer sa suppression." : "Access will no longer be protected. Enter the current password to confirm removal.")
            : (fr ? "Utilisez au moins 6 caractères. Les autres appareils devront se reconnecter après ce changement." : "Use at least 6 characters. Other devices will need to sign in after this change.")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4" aria-busy={saving}>
          <fieldset disabled={saving} className="space-y-4">
            {enabled && <div className="space-y-1"><label htmlFor="current-password" className="text-sm">{fr ? "Mot de passe actuel" : "Current password"}</label><Input id="current-password" type="password" autoComplete="current-password" required maxLength={1024} value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} /></div>}
            {!remove && <>
              <div className="space-y-1"><label htmlFor="new-password" className="text-sm">{fr ? "Nouveau mot de passe" : "New password"}</label><Input id="new-password" type="password" autoComplete="new-password" required minLength={6} maxLength={1024} value={newPassword} onChange={event => setNewPassword(event.target.value)} /></div>
              <div className="space-y-1"><label htmlFor="confirm-password" className="text-sm">{fr ? "Confirmer le nouveau mot de passe" : "Confirm new password"}</label><Input id="confirm-password" type="password" autoComplete="new-password" required minLength={6} maxLength={1024} value={confirmation} onChange={event => setConfirmation(event.target.value)} /></div>
            </>}
          </fieldset>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={() => { setOpen(false); clearFields() }}>{fr ? "Annuler" : "Cancel"}</Button>
            <Button type="submit" variant={remove ? "destructive" : "default"} disabled={saving}>{saving ? (fr ? "Enregistrement…" : "Saving…") : actionLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </section>
}
