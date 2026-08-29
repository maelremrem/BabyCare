import { Bath, Milk, PackageCheck } from "lucide-react"
import { ActionGrid } from "@/components/ActionGrid"
import { ActiveTimer } from "@/components/ActiveTimer"
import { EventRow } from "@/components/EventRow"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { EVENT_LABELS, type BabyEvent } from "@/lib/types"
import { dayHeading, formatDuration, formatTime, groupEventsByDay, relativeTime } from "@/lib/dates"

interface TrackingPageProps {
  events: BabyEvent[]
  running: BabyEvent[]
  loading: boolean
  onChanged: () => Promise<void>
  onEdit: (event: BabyEvent) => void
}

export function TrackingPage({ events, running, loading, onChanged, onEdit }: TrackingPageProps) {
  const lastFeeding = events.find((event) => event.type === "breast_left" || event.type === "breast_right")
  const lastDiaper = events.find((event) => event.type === "diaper")
  const lastBath = events.find((event) => event.type === "bath")
  const recent = events.slice(0, 8)
  const groups = groupEventsByDay(recent)

  const info = [
    {
      label: "Tétée",
      icon: Milk,
      primary: lastFeeding ? EVENT_LABELS[lastFeeding.type] : "Aucune",
      secondary: lastFeeding ? formatDuration(lastFeeding.duration_seconds) || relativeTime(lastFeeding.started_at) : ""
    },
    {
      label: "Couche",
      icon: PackageCheck,
      primary: lastDiaper?.metadata?.diaper_type ? ({ urine: "Urine", stool: "Selles", mixed: "Mixte" }[lastDiaper.metadata.diaper_type] || lastDiaper.metadata.diaper_type) : "Aucune",
      secondary: lastDiaper ? relativeTime(lastDiaper.started_at) : ""
    },
    {
      label: "Bain",
      icon: Bath,
      primary: lastBath ? formatTime(lastBath.started_at) : "Aucun",
      secondary: lastBath ? relativeTime(lastBath.started_at) : ""
    }
  ]

  return (
    <div className="space-y-8">
      <section>
        <SectionTitle>Dernières informations</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {info.map(({ label, icon: Icon, primary, secondary }) => (
            <Card key={label} className="bg-card/80">
              <CardContent className="flex items-center gap-4 p-4 sm:block sm:p-5">
                <Icon className="size-5 text-primary sm:mb-5" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
                  <p className="mt-1 text-lg font-medium">{primary}</p>
                  <p className="text-sm text-muted-foreground">{secondary || "—"}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Actions rapides</SectionTitle>
        <ActionGrid onChanged={onChanged} />
      </section>

      {running.length > 0 && (
        <section className="space-y-3">
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-xs font-semibold uppercase tracking-[.18em] text-muted-foreground">{children}</h2>
}
