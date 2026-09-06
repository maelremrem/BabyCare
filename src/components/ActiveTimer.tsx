import { useRef, useState } from "react"
import { ArrowLeftRight, CircleStop, Timer } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import { useClock } from "@/hooks/useClock"
import { formatTimer } from "@/lib/dates"
import { localizedErrorMessage, useI18n } from "@/lib/i18n"
import type { BabyEvent } from "@/lib/types"

interface ActiveTimerProps {
  event: BabyEvent
  onChanged: () => Promise<void>
}

export function ActiveTimer({ event, onChanged }: ActiveTimerProps) {
  const { t } = useI18n()
  const now = useClock()
  const [notes, setNotes] = useState(event.notes || "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const busy = useRef(false)
  const elapsed = Math.max(0, Math.floor((now.getTime() - Date.parse(event.started_at)) / 1000))
  const finish = async (switchSide = false) => {
    if (busy.current) return
    busy.current = true
    setSaving(true)
    setError("")
    let stopped = false
    try {
      const completed = await api.stopEvent(event.id, notes)
      stopped = true
      if (switchSide) await api.startEvent(event.type === "breast_left" ? "breast_right" : "breast_left")
      toast.success(`${t.eventLabels[event.type]} · ${formatTimer(completed.duration_seconds || 0)}`)
    } catch (cause) {
      const message = localizedErrorMessage(cause, t, t.common.actionImpossible)
      setError(message)
      toast.error(message)
    } finally {
      if (stopped) {
        try { await onChanged() } catch { toast.warning(t.ux.refreshError) }
      }
      busy.current = false
      setSaving(false)
    }
  }
  return (
    <section aria-label={`${t.eventLabels[event.type]} · ${t.activeTimer.running}`} className="rounded-2xl border border-primary/40 bg-card p-3 shadow-lg">
      <div className="flex items-center gap-3">
        <Timer className="hidden size-5 shrink-0 text-primary sm:block" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-primary">{t.eventLabels[event.type]} · {t.activeTimer.running}</p>
          <p className="font-mono text-2xl font-semibold tabular-nums">{formatTimer(elapsed)}</p>
        </div>
        <Button className="h-12 shrink-0" disabled={saving} onClick={() => void finish()}><CircleStop />{t.activeTimer.stop}</Button>
      </div>
      <details className="mt-1">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm text-muted-foreground">{t.ux.details}</summary>
        <div className="space-y-2 pb-1">
          <Textarea aria-label={t.activeTimer.addObservation} value={notes} onChange={e => setNotes(e.target.value)} placeholder={t.activeTimer.addObservation} />
          {(event.type === "breast_left" || event.type === "breast_right") ? <Button className="min-h-12 w-full" variant="outline" disabled={saving} onClick={() => void finish(true)}><ArrowLeftRight />{t.activeTimer.switchBreast}</Button> : null}
        </div>
      </details>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </section>
  )
}
