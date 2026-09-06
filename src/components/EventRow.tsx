import { formatNumber } from "@/lib/numbers"
import {
  Bath,
  ChevronRight,
  CircleDot,
  Eye,
  HeartPulse,
  MessageSquare,
  Milk,
  Moon,
  Pill,
  Ruler,
  Scale,
  Shirt,
  Thermometer,
  WalletCards,
  type LucideIcon
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useI18n } from "@/lib/i18n"
import { type BabyEvent, type BabyVitamin, type EventType, normalizeIrritationLocation } from "@/lib/types"
import { formatDuration, formatTime } from "@/lib/dates"
import { cn } from "@/lib/utils"

interface EventRowProps {
  event: BabyEvent
  onClick?: () => void
  showIcon?: boolean
}

const EVENT_ICONS: Record<EventType, LucideIcon> = {
  temperature: Thermometer,
  weight: Scale,
  height: Ruler,
  diaper: WalletCards,
  breast_left: Milk,
  breast_right: Milk,
  bottle: Milk,
  pump_left: Milk,
  pump_right: Milk,
  nap: Moon,
  bath: Bath,
  face_care: HeartPulse,
  cord_care: HeartPulse,
  face_cord_care: HeartPulse,
  clothes_change: Shirt,
  irritation: HeartPulse,
  vitamin: Pill,
  observation: MessageSquare,
  daily_care: Bath,
  eye_care: Eye,
  nose_care: CircleDot
}

export function EventRow({ event, onClick, showIcon = false }: EventRowProps) {
  const { locale, t } = useI18n()
  const Icon = EVENT_ICONS[event.type]
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
  const careNames: Record<string, string> = { eyes: t.eventLabels.eye_care, face: t.eventLabels.face_care, nose: t.eventLabels.nose_care, cord: t.eventLabels.cord_care }
  const careDetail = event.type === "daily_care" && Array.isArray(event.metadata?.care_types)
    ? event.metadata.care_types.map(type => careNames[String(type)] || String(type)).join(", ") : null
  const isTimer = event.type === "breast_left" || event.type === "breast_right" || event.type === "nap"
  const detail = event.type === "temperature" && event.value_real != null
    ? `${formatNumber(event.value_real, 1, locale)} °C`
    : event.type === "weight" && event.value_real != null
      ? `${formatNumber(event.value_real, 3, locale)} kg`
      : event.type === "height" && event.value_real != null
        ? `${formatNumber(event.value_real, 1, locale)} cm`
      : ["bottle", "pump_left", "pump_right"].includes(event.type) && event.value_real != null
        ? `${formatNumber(event.value_real, 0, locale)} ml`
    : careDetail
      ? careDetail
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
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "grid w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-muted/50 active:bg-muted",
        showIcon
          ? "grid-cols-[3rem_minmax(0,1fr)_auto] sm:grid-cols-[3.5rem_2.25rem_minmax(0,1fr)_auto_auto]"
          : "grid-cols-[3rem_minmax(0,1fr)_auto] sm:grid-cols-[3.5rem_minmax(0,1fr)_auto_auto]"
      )}
    >
      <time className="font-mono text-sm tabular-nums text-muted-foreground">{formatTime(event.started_at, locale)}</time>
      {showIcon ? (
        <span className="hidden size-9 sm:flex items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
          <Icon className="size-4" />
        </span>
      ) : null}
      <div className="min-w-0">
        <div className="font-medium">{t.eventLabels[event.type]}</div>
        {event.notes && <p className="truncate text-xs text-muted-foreground">{event.notes}</p>}
      </div>
      {detail && <Badge variant="secondary" className="max-w-40 truncate">{detail}</Badge>}
      {onClick && <ChevronRight className="hidden size-4 text-muted-foreground sm:block" />}
    </button>
  )
}
