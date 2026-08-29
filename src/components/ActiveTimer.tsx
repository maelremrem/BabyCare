import { useEffect, useState } from "react"
import { ArrowLeftRight, CircleStop, Timer } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import { formatTimer } from "@/lib/dates"
import { EVENT_LABELS, type BabyEvent, type EventType } from "@/lib/types"

interface ActiveTimerProps {
  event: BabyEvent
  onChanged: () => Promise<void>
}

export function ActiveTimer({ event, onChanged }: ActiveTimerProps) {
  const [elapsed, setElapsed] = useState(() => Math.max(0, Math.floor((Date.now() - Date.parse(event.started_at)) / 1000)))
  const [notes, setNotes] = useState(event.notes || "")

  useEffect(() => {
    const timer = window.setInterval(() => setElapsed(Math.max(0, Math.floor((Date.now() - Date.parse(event.started_at)) / 1000))), 1000)
    return () => window.clearInterval(timer)
  }, [event.started_at])

  const stop = async () => {
    const completed = await api.stopEvent(event.id, notes)
    toast.success(`${EVENT_LABELS[event.type]} · ${formatTimer(completed.duration_seconds || 0)}`)
    await onChanged()
  }

  const switchBreast = async () => {
    const next: EventType = event.type === "breast_left" ? "breast_right" : "breast_left"
    await api.stopEvent(event.id, notes)
    await api.startEvent(next)
    toast.success(`Passage au ${EVENT_LABELS[next].toLowerCase()}`)
    await onChanged()
  }

  return (
    <Card className="overflow-hidden border-primary/40 bg-primary/[.06]">
      <CardContent className="grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[.16em] text-primary">
            <Timer className="size-4" /> {EVENT_LABELS[event.type]} · En cours
          </div>
          <div className="font-mono text-5xl font-semibold tabular-nums sm:text-6xl">{formatTimer(elapsed)}</div>
          <Textarea className="mt-4 min-h-20 bg-background/70" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ajouter une observation" />
        </div>
        <div className="flex flex-col gap-3">
          <Button className="h-14 min-w-44" onClick={() => stop().catch((error) => toast.error(error.message))}>
            <CircleStop /> Terminer
          </Button>
          {(event.type === "breast_left" || event.type === "breast_right") && (
            <Button variant="outline" className="h-12" onClick={() => switchBreast().catch((error) => toast.error(error.message))}>
              <ArrowLeftRight /> Changer de sein
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
