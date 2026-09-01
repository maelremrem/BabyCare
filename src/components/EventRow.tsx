import { ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useI18n } from "@/lib/i18n"
import { type BabyEvent, type BabyVitamin, normalizeIrritationLocation } from "@/lib/types"
import { formatDuration, formatTime } from "@/lib/dates"

interface EventRowProps {
  event: BabyEvent
  onClick?: () => void
}

export function EventRow({ event, onClick }: EventRowProps) {
  const { locale, t } = useI18n()
  const diaperType = typeof event.metadata?.diaper_type === "string" ? event.metadata.diaper_type : null
  const irritationLocations = Array.isArray(event.metadata?.locations)
      ? event.metadata.locations.map(normalizeIrritationLocation)
    : typeof event.metadata?.location === "string"
      ? [normalizeIrritationLocation(event.metadata.location)]
      : []
  const vitamins = Array.isArray(event.metadata?.vitamins)
    ? event.metadata.vitamins
    : typeof event.metadata?.vitamin === "string"
      ? [event.metadata.vitamin]
      : []
  const isTimer = event.type === "breast_left" || event.type === "breast_right" || event.type === "nap"
  const detail = event.type === "temperature" && event.value_real != null
    ? `${event.value_real.toFixed(1)} °C`
    : event.type === "weight" && event.value_real != null
      ? `${event.value_real.toFixed(3)} kg`
      : event.type === "height" && event.value_real != null
        ? `${event.value_real.toFixed(1)} cm`
      : event.type === "bottle" && event.value_real != null
        ? `${event.value_real.toFixed(0)} ml`
    : diaperType
      ? t.diaperTypes[diaperType as keyof typeof t.diaperTypes]
      : irritationLocations.length > 0
        ? irritationLocations.map((location) => t.irritationLocations[location as keyof typeof t.irritationLocations] || location.charAt(0).toUpperCase() + location.slice(1)).join(", ")
      : vitamins.length > 0
        ? vitamins.map((vitamin) => t.vitamins[vitamin as BabyVitamin] || vitamin).join(", ")
        : isTimer
          ? formatDuration(event.duration_seconds, locale)
          : ""

  return (
    <button type="button" onClick={onClick} className="grid w-full grid-cols-[3.5rem_1fr_auto] items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-muted/50 active:bg-muted sm:grid-cols-[4.5rem_1fr_auto_auto]">
      <time className="font-mono text-sm tabular-nums text-muted-foreground">{formatTime(event.started_at, locale)}</time>
      <div className="min-w-0">
        <div className="font-medium">{t.eventLabels[event.type]}</div>
        {event.notes && <p className="truncate text-xs text-muted-foreground">{event.notes}</p>}
      </div>
      {detail && <Badge variant="secondary" className="max-w-40 truncate">{detail}</Badge>}
      {onClick && <ChevronRight className="hidden size-4 text-muted-foreground sm:block" />}
    </button>
  )
}
