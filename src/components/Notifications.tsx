import { useEffect, useRef, useState } from 'react'
import { Bell, ExternalLink } from 'lucide-react'
import { isDemoMode, notificationsApi, subscribeToServerChanges, type NotificationAction, type WebhookSettings } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Input } from './ui/input'

const READ_KEY = 'babycare-notifications-read-v1'

const guide = 'https://github.com/maelremrem/BabyCare/blob/main/docs/notifications.md'

export function Notifications() {
  const { locale, t } = useI18n()
  const fr = locale === 'fr'
  const [open, setOpen] = useState(false)
  const [readId, setReadId] = useState(() => {
    try {
      const stored = Number(localStorage.getItem(READ_KEY))
      return Number.isSafeInteger(stored) && stored > 0 ? stored : 0
    } catch { return 0 }
  })
  const [external, setExternal] = useState(false)
  const [actions, setActions] = useState<NotificationAction[]>([])
  const [error, setError] = useState('')
  const [configError, setConfigError] = useState('')
  const [config, setConfig] = useState<WebhookSettings | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const since = useRef<string | null>(null)

  useEffect(() => {
    let active = true
    if (!since.current) {
      const now = new Date().toISOString()
      since.current = now
      try {
        const previous = localStorage.getItem('babycare-last-connection-v1')
        if (previous && Number.isFinite(Date.parse(previous))) since.current = previous
        localStorage.setItem('babycare-last-connection-v1', now)
      } catch { /* The current connection remains usable without storage. */ }
    }
    const refresh = () => {
      notificationsApi.list(since.current!).then(rows => { if (!Array.isArray(rows)) throw new Error('Invalid notifications'); if (active) { setActions(rows); setError('') } })
        .catch(() => { if (active) setError(fr ? 'Impossible de charger les notifications.' : 'Unable to load notifications.') })
    }
    refresh()
    const unsubscribe = subscribeToServerChanges(refresh)
    return () => { active = false; unsubscribe() }
  }, [fr])

  useEffect(() => {
    if (!external || isDemoMode) return
    let active = true
    notificationsApi.settings().then(value => { if (active) setConfig(value) })
      .catch(() => { if (active) setConfigError(fr ? 'Chargement impossible. Fermez et réessayez.' : 'Unable to load. Close and try again.') })
    return () => { active = false }
  }, [external, fr])

  useEffect(() => {
    if (!open || !actions.length) return
    const latest = Math.max(...actions.map(action => action.id))
    if (latest <= readId) return
    setReadId(latest)
    try { localStorage.setItem(READ_KEY, String(latest)) } catch { /* Keep read state for this session. */ }
  }, [open, actions, readId])

  const unreadCount = open ? 0 : actions.filter(action => action.id > readId).length

  const labels = fr
    ? { created: 'Ajout', started: 'Démarrage', stopped: 'Fin', updated: 'Modification', deleted: 'Suppression' }
    : { created: 'Added', started: 'Started', stopped: 'Stopped', updated: 'Updated', deleted: 'Deleted' }

  async function save(test = false) {
    if (!config) return
    setBusy(true); setConfigError(''); setMessage('')
    try {
      const saved = await notificationsApi.save(config)
      setConfig(saved)
      if (test) await notificationsApi.test()
      setMessage(test ? (fr ? 'Notification de test envoyée.' : 'Test notification sent.') : (fr ? 'Configuration enregistrée.' : 'Settings saved.'))
    } catch (err) { setConfigError(err instanceof Error ? err.message : 'Erreur / Error') }
    finally { setBusy(false) }
  }

  return <>
    <Button variant="ghost" size="icon" className="relative size-11 shrink-0 rounded-xl" aria-label={`Notifications (${unreadCount})`} onClick={() => setOpen(true)}>
      <Bell className="size-5" />
      {unreadCount > 0 && <span className="absolute right-0 top-0 rounded-full bg-primary px-1 text-[10px] text-primary-foreground">{unreadCount === 100 ? '99+' : unreadCount}</span>}
    </Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>Notifications</DialogTitle><DialogDescription>{fr ? 'Les dernières actions depuis votre précédente connexion sur ce navigateur (100 maximum).' : 'Latest actions since your previous connection in this browser (up to 100).'}</DialogDescription></DialogHeader>
        <Button variant="outline" onClick={() => { setOpen(false); setExternal(true); setConfig(null); setConfigError(''); setMessage('') }}><ExternalLink />{fr ? 'Notifications externes' : 'External notifications'}</Button>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {!error && !actions.length && <p className="py-5 text-center text-sm text-muted-foreground">{fr ? 'Aucune nouvelle action.' : 'No new actions.'}</p>}
        <ul className="divide-y">{actions.map(action => <li key={action.id} className="py-3 text-sm">
          <p className="font-medium">{action.baby_name || (fr ? 'Bébé' : 'Baby')} · {labels[action.action]}</p>
          <p>{t.eventLabels[action.event_type] || action.event_type}</p>
          <time className="text-xs text-muted-foreground" dateTime={action.created_at}>{new Date(action.created_at).toLocaleString(locale)}</time>
        </li>)}</ul>
      </DialogContent>
    </Dialog>
    <Dialog open={external} onOpenChange={value => { if (!busy) setExternal(value) }}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>{fr ? 'Notifications externes' : 'External notifications'}</DialogTitle><DialogDescription>{fr ? 'Un webhook partagé par tous les bébés et appareils de cette installation.' : 'One webhook shared by all babies and devices on this installation.'}</DialogDescription></DialogHeader>
        <a href={guide} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">{fr ? 'Guide de configuration ntfy / Gotify' : 'ntfy / Gotify setup guide'}</a>
        {isDemoMode ? <p>{fr ? 'Disponible sur votre installation BabyCare.' : 'Available on your BabyCare installation.'}</p> : config ? <form className="space-y-4" onSubmit={event => { event.preventDefault(); void save() }}>
          <fieldset disabled={busy} className="space-y-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={config.enabled} onChange={event => setConfig({ ...config, enabled: event.target.checked })} />{fr ? 'Activer les notifications' : 'Enable notifications'}</label>
            <label className="block space-y-1 text-sm"><span>{fr ? 'Service' : 'Provider'}</span><select className="h-11 w-full rounded-md border bg-background px-3" value={config.provider} onChange={event => setConfig({ ...config, provider: event.target.value as WebhookSettings['provider'], token: '', hasToken: false })}><option value="ntfy">ntfy</option><option value="gotify">Gotify</option></select></label>
            <label className="block space-y-1 text-sm"><span>URL webhook</span><Input type="url" required={config.enabled} value={config.url} placeholder={config.provider === 'ntfy' ? 'https://ntfy.sh/babycare-topic' : 'https://gotify.example.com/message'} onChange={event => setConfig({ ...config, url: event.target.value, token: '', hasToken: false })} /></label>
            <label className="block space-y-1 text-sm"><span>{fr ? 'Jeton' : 'Token'}</span><Input type="password" autoComplete="new-password" value={config.token ?? ''} placeholder={config.hasToken ? (fr ? 'Jeton enregistré (inchangé si vide)' : 'Saved token (unchanged if empty)') : (config.provider === 'gotify' ? 'Application token' : 'Access token (optionnel)')} onChange={event => setConfig({ ...config, token: event.target.value || undefined })} /></label>
            {config.hasToken && <Button type="button" variant="outline" onClick={() => setConfig({ ...config, token: '', hasToken: false })}>{fr ? 'Supprimer le jeton' : 'Remove token'}</Button>}
            <div className="flex flex-wrap gap-2"><Button type="submit">{fr ? 'Enregistrer' : 'Save'}</Button><Button type="button" variant="outline" disabled={!config.enabled} onClick={() => void save(true)}>{fr ? 'Enregistrer et tester' : 'Save and test'}</Button></div>
          </fieldset>
        </form> : !configError && <p role="status">{fr ? 'Chargement…' : 'Loading…'}</p>}
        {configError && <p role="alert" className="text-sm text-destructive">{configError}</p>}
        {message && <p role="status" className="text-sm">{message}</p>}
      </DialogContent>
    </Dialog>
  </>
}
