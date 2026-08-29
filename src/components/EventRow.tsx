import { ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { EVENT_LABELS, type BabyEvent } from "@/lib/types"
import { formatDuration, formatTime } from "@/lib/dates"

interface EventRowProps {
  event: BabyEvent
  onClick?: () => void
}

export function EventRow({ event, onClick }: EventRowProps) {
  const diaperType = typeof event.metadata?.diaper_type === "string" ? event.metadata.diaper_type : null
  const irritationLocations = Array.isArray(event.metadata?.locations)
    ? event.metadata.locations
    : typeof event.metadata?.location === "string"
      ? [event.metadata.location]
      : []
  const detail = event.type === "temperature" && event.value_real != null
    ? `${event.value_real.toFixed(1)} °C`
    : diaperType
      ? { urine: "Urine", stool: "Selles", mixed: "Mixte" }[diaperType]
      : irritationLocations.length > 0
        ? irritationLocations.map((location) => location.charAt(0).toUpperCase() + location.slice(1)).join(", ")
        : formatDuration(event.duration_seconds)

  return (
    <button type="button" onClick={onClick} className="grid w-full grid-cols-[3.5rem_1fr_auto] items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-muted/50 active:bg-muted sm:grid-cols-[4.5rem_1fr_auto_auto]">
      <time className="font-mono text-sm tabular-nums text-muted-foreground">{formatTime(event.started_at)}</time>
      <div className="min-w-0">
        <div className="font-medium">{EVENT_LABELS[event.type]}</div>
        {event.notes && <p className="truncate text-xs text-muted-foreground">{event.notes}</p>}
      </div>
      {detail && <Badge variant="secondary" className="max-w-40 truncate">{detail}</Badge>}
      {onClick && <ChevronRight className="hidden size-4 text-muted-foreground sm:block" />}
    </button>
  )
}
