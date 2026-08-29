import { AlertTriangle, Bath, Milk, PackageCheck, Thermometer } from "lucide-react"
import { ActionGrid } from "@/components/ActionGrid"
import { ActiveTimer } from "@/components/ActiveTimer"
import { EventRow } from "@/components/EventRow"
import { TemperatureSparkline } from "@/components/TemperatureSparkline"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { EVENT_LABELS, type BabyEvent, type StoolAlert } from "@/lib/types"
import { dateKey, dayHeading, formatDuration, formatTime, groupEventsByDay, relativeTime } from "@/lib/dates"

interface TrackingPageProps {
  events: BabyEvent[]
  running: BabyEvent[]
  loading: boolean
  stoolAlert: StoolAlert | null
  onChanged: () => Promise<void>
  onEdit: (event: BabyEvent) => void
  onOpenCare: () => void
}

export function TrackingPage({ events, running, loading, stoolAlert, onChanged, onEdit, onOpenCare }: TrackingPageProps) {
  const lastFeeding = events.find((event) => event.type === "breast_left" || event.type === "breast_right")
  const lastDiaper = events.find((event) => event.type === "diaper")
  const lastBath = events.find((event) => event.type === "bath")
  const recent = events.slice(0, 8)
  const groups = groupEventsByDay(recent)
  const lastDiaperType = typeof lastDiaper?.metadata?.diaper_type === "string" ? lastDiaper.metadata.diaper_type : null
  const today = dateKey(new Date().toISOString())
  const feedingsToday = events.reduce((count, event) => {
    const isFeeding = event.type === "breast_left" || event.type === "breast_right"
    return count + (isFeeding && dateKey(event.started_at) === today ? 1 : 0)
  }, 0)
  const temperatures = events
    .filter((event) => event.type === "temperature" && event.value_real != null)
    .slice(0, 10)
    .reverse()

  const info = [
    {
      label: "Tétée",
      icon: Milk,
      primary: lastFeeding ? EVENT_LABELS[lastFeeding.type] : "Aucune",
      secondary: lastFeeding ? formatDuration(lastFeeding.duration_seconds) || relativeTime(lastFeeding.started_at) : "",
      caption: `${feedingsToday} ${feedingsToday === 1 ? "tétée" : "tétées"} aujourd’hui`
    },
    {
      label: "Couche",
      icon: PackageCheck,
      primary: lastDiaperType ? ({ urine: "Urine", stool: "Selles", mixed: "Mixte" }[lastDiaperType] || lastDiaperType) : "Aucune",
      secondary: lastDiaper ? relativeTime(lastDiaper.started_at) : "",
      caption: undefined
    },
    {
      label: "Bain",
      icon: Bath,
      primary: lastBath ? formatTime(lastBath.started_at) : "Aucun",
      secondary: lastBath ? relativeTime(lastBath.started_at) : "",
      caption: undefined
    }
  ]

  return (
    <div className="space-y-8">
      {stoolAlert?.overdue ? <StoolAlertCard alert={stoolAlert} /> : null}

      <section>
        <SectionTitle>Dernières informations</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCard {...info[0]} />
          <TemperatureInfoCard events={temperatures} />
          {info.slice(1).map((item) => <InfoCard key={item.label} {...item} />)}
        </div>
      </section>

      <section>
        <SectionTitle>Actions rapides</SectionTitle>
        <ActionGrid onChanged={onChanged} onOpenCare={onOpenCare} />
      </section>

      {running.length > 0 && (
        <section id="active-timers" className="scroll-mt-40 space-y-3">
          <SectionTitle>Chrono actif</SectionTitle>
          {running.map((event) => <ActiveTimer key={event.id} event={event} onChanged={onChanged} />)}
        </section>
      )}

      <section>
        <SectionTitle>Activité récente</SectionTitle>
        <Card>
          <CardContent className="p-3 sm:p-5">
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Chargement…</p>
            ) : recent.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Les premières actions apparaîtront ici.</p>
            ) : Object.entries(groups).map(([key, dayEvents], groupIndex) => (
              <div key={key}>
                {groupIndex > 0 && <Separator className="my-4" />}
                <h3 className="px-2 py-2 text-xs font-semibold tracking-[.14em] text-muted-foreground">{dayHeading(key)}</h3>
                {dayEvents?.map((event) => <EventRow key={event.id} event={event} onClick={() => onEdit(event)} />)}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function StoolAlertCard({ alert }: { alert: StoolAlert }) {
  const detail = alert.last_stool_at
    ? `Dernière selle enregistrée ${relativeTime(alert.last_stool_at)}.`
    : "Aucune selle n’a encore été enregistrée."

  return (
    <section aria-label="Alerte transit">
      <Card role="alert" className="border-amber-500/45 bg-amber-500/10 shadow-sm">
        <CardContent className="flex items-start gap-3 p-4 sm:p-5">
          <span className="rounded-full bg-amber-500/15 p-2 text-amber-700 dark:text-amber-300">
            <AlertTriangle className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-semibold text-amber-950 dark:text-amber-100">
              {alert.hours_since == null ? "Suivi des selles à renseigner" : `Aucune selle depuis ${alert.hours_since} h`}
            </p>
            <p className="mt-1 text-sm text-amber-900/75 dark:text-amber-100/75">
              {detail} Le seuil de surveillance est fixé à {alert.threshold_hours} heures.
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

function InfoCard({ label, icon: Icon, primary, secondary, caption }: {
  label: string
  icon: typeof Milk
  primary: string
  secondary: string
  caption?: string
}) {
  return (
    <Card className="bg-card/80">
      <CardContent className="flex items-center gap-4 p-4 sm:block sm:p-5">
        <Icon className="size-5 shrink-0 text-primary sm:mb-5" aria-hidden="true" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
          <p className="mt-1 text-lg font-medium">{primary}</p>
          <p className="text-sm text-muted-foreground">{secondary || "—"}</p>
          {caption ? <p className="mt-1 text-xs font-medium text-primary">{caption}</p> : null}
        </div>
      </CardContent>
    </Card>
  )
}

function TemperatureInfoCard({ events }: { events: BabyEvent[] }) {
  const values = events.map((event) => event.value_real as number)
  const latest = events.at(-1)

  return (
    <Card className="bg-card/80">
      <CardContent className="p-4 sm:p-5">
        <Thermometer className="mb-3 size-5 text-primary sm:mb-5" aria-hidden="true" />
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Température</p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <div>
            <p className="text-lg font-medium">{latest ? `${latest.value_real?.toFixed(1)} °C` : "Aucune"}</p>
            <p className="text-sm text-muted-foreground">{latest ? relativeTime(latest.started_at) : "—"}</p>
          </div>
          <TemperatureSparkline values={values} />
        </div>
      </CardContent>
    </Card>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-xs font-semibold uppercase tracking-[.18em] text-muted-foreground">{children}</h2>
}
