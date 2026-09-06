import { AlertTriangle, Bath, Milk, Moon, Thermometer, WalletCards } from "lucide-react"
import { ActionGrid } from "@/components/ActionGrid"
import { ContentLoading } from "@/components/ContentLoading"
import { EventRow } from "@/components/EventRow"
import { TemperatureSparkline } from "@/components/TemperatureSparkline"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useClock } from "@/hooks/useClock"
import { useRoutinePreferences } from "@/hooks/useRoutinePreferences"
import { formatNumber } from "@/lib/numbers"
import { interpolate, useI18n } from "@/lib/i18n"
import { hasBottleFeeding, hasBreastFeeding, type BabyEvent, type FeedingType, type StoolAlert } from "@/lib/types"
import { dateKey, dayHeading, formatDuration, formatTime, groupEventsByDay, relativeTime } from "@/lib/dates"

interface TrackingPageProps {
  babyId?: number
  events: BabyEvent[]
  running: BabyEvent[]
  loading: boolean
  stoolAlert: StoolAlert | null
  feedingType?: FeedingType
  onChanged: () => Promise<void>
  onEdit: (event: BabyEvent) => void
  onOpenCare: () => void
  onTimerStartAttempt?: () => void
  onTimerStartFailed?: () => void
}

export function TrackingPage({ babyId, events, loading, stoolAlert, feedingType = "breast", onChanged, onEdit, onOpenCare, onTimerStartAttempt, onTimerStartFailed }: TrackingPageProps) {
  const { locale, t } = useI18n()
  const now = useClock()
  const [routine] = useRoutinePreferences(babyId)
  const breastEnabled = hasBreastFeeding(feedingType)
  const bottleEnabled = hasBottleFeeding(feedingType)
  const lastBreastFeeding = events.find((event) => event.type === "breast_left" || event.type === "breast_right")
  const lastBottle = events.find((event) => event.type === "bottle")
  const lastBottleQuantity = events.find((event) => event.type === "bottle" && Number.isFinite(event.value_real))?.value_real ?? 150
  const lastBreastUse = events.find((event) => ["breast_left", "breast_right", "pump_left", "pump_right"].includes(event.type))
  const nextBreast = lastBreastUse?.type === "breast_left" || lastBreastUse?.type === "pump_left" ? "breast_right" : "breast_left"
  const lastDiaper = events.find((event) => event.type === "diaper")
  const lastBath = events.find((event) => event.type === "bath")
  const lastDailyCare = events.find((event) => event.type === "daily_care")
  const recent = events.slice(0, 8)
  const groups = groupEventsByDay(recent)
  const lastDiaperType = typeof lastDiaper?.metadata?.diaper_type === "string" ? lastDiaper.metadata.diaper_type : null
  const routineLastEvents = routine.types.map(type => events.find(event => event.type === "daily_care" && (
    !Array.isArray(event.metadata?.care_types) || event.metadata.care_types.includes(type)
  )))
  const missingCare = routineLastEvents.some(event => !event)
  const isDailyCareOverdue = routine.reminders && routineLastEvents.some(event => event && now.getTime() - Date.parse(event.started_at) > routine.hours * 60 * 60 * 1000)
  const lastSleep = events.find(event => event.type === "nap")
  const today = dateKey(now.toISOString())
  const breastFeedingsToday = events.reduce((count, event) => count + (
    (event.type === "breast_left" || event.type === "breast_right") && dateKey(event.started_at) === today ? 1 : 0
  ), 0)
  const bottlesToday = events.reduce((count, event) => count + (
    event.type === "bottle" && dateKey(event.started_at) === today ? 1 : 0
  ), 0)
  const elapsedSince = (event: BabyEvent | undefined) => event
    ? formatDuration(Math.max(0, Math.floor((now.getTime() - Date.parse(event.started_at)) / 1000)), locale)
    : ""
  const temperatures = events
    .filter((event) => event.type === "temperature" && event.value_real != null)
    .slice(0, 10)
    .reverse()

  const feedingInfo = [
    breastEnabled ? {
      testId: "feeding-info-card",
      label: t.tracking.feeding,
      icon: Milk,
      primary: lastBreastFeeding
        ? t.eventLabels[lastBreastFeeding.type]
        : t.common.none,
      secondary: lastBreastFeeding
        ? formatDuration(lastBreastFeeding.duration_seconds, locale) || relativeTime(lastBreastFeeding.started_at, locale)
        : "",
      elapsed: lastBreastFeeding
        ? interpolate(t.tracking.sinceLastFeeding, { duration: elapsedSince(lastBreastFeeding) })
        : undefined,
      caption: `${breastFeedingsToday} ${breastFeedingsToday === 1 ? t.tracking.feedingsTodaySingular : t.tracking.feedingsTodayPlural}`
    } : null,
    bottleEnabled ? {
      testId: breastEnabled ? "bottle-info-card" : "feeding-info-card",
      label: t.tracking.bottle,
      icon: Milk,
      primary: lastBottle?.value_real != null ? `${lastBottle.value_real.toFixed(0)} ml` : t.common.none,
      secondary: "",
      elapsed: lastBottle
        ? interpolate(t.tracking.sinceLastBottle, { duration: elapsedSince(lastBottle) })
        : undefined,
      caption: `${bottlesToday} ${bottlesToday === 1 ? t.tracking.bottlesTodaySingular : t.tracking.bottlesTodayPlural}`
    } : null
  ].filter((item): item is NonNullable<typeof item> => item !== null)

  const otherInfo = [
    {
      label: t.tracking.diaper,
      icon: WalletCards,
      primary: lastDiaperType ? (t.diaperTypes[lastDiaperType as keyof typeof t.diaperTypes] || lastDiaperType) : t.common.none,
      secondary: lastDiaper ? relativeTime(lastDiaper.started_at, locale) : "",
      caption: undefined
    },
    {
      label: t.tracking.bath,
      icon: Bath,
      primary: lastBath ? formatTime(lastBath.started_at, locale) : t.ux.noBath,
      secondary: lastBath ? relativeTime(lastBath.started_at, locale) : "",
      care: {
        label: t.eventLabels.daily_care,
        primary: lastDailyCare ? formatTime(lastDailyCare.started_at, locale) : t.common.none,
        secondary: lastDailyCare ? relativeTime(lastDailyCare.started_at, locale) : ""
      },
      caption: undefined
    }
  ]

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      <section className="lg:col-start-2 lg:row-start-1">
        <SectionTitle>{t.ux.summary}</SectionTitle>
        <div data-testid="feeding-info-grid" className={`grid grid-cols-2 gap-2 ${feedingInfo.length === 1 ? "[&>div:first-child]:row-span-2" : ""}`}>
          {feedingInfo.map((item) => <InfoCard key={item.testId} {...item} />)}
          <CompactInfoCard {...otherInfo[0]} />
          <CompactInfoCard label={t.ux.sleep} icon={Moon} primary={lastSleep?.status === "running" ? t.activeTimer.running : lastSleep ? relativeTime(lastSleep.started_at, locale) : t.ux.noRecord} secondary={lastSleep ? formatDuration(lastSleep.duration_seconds, locale) : ""} />
        </div>
      </section>

      <section className="lg:col-start-1 lg:row-span-3 lg:row-start-1">
        <SectionTitle>{t.tracking.quickActions}</SectionTitle>
        <ActionGrid nextBreast={nextBreast} feedingType={feedingType} bottleDefaultQuantity={lastBottleQuantity} onChanged={onChanged} onOpenCare={onOpenCare} onTimerStartAttempt={onTimerStartAttempt} onTimerStartFailed={onTimerStartFailed} />
      </section>

      <div className="space-y-3 lg:col-start-2">
        {stoolAlert?.overdue ? <StoolAlertCard alert={stoolAlert} /> : null}
        {isDailyCareOverdue || missingCare ? <section aria-label={t.ux.careReminder} className={`rounded-2xl border p-4 ${isDailyCareOverdue ? "border-amber-500/45 bg-amber-500/10" : "bg-card"}`}>
          <p className="text-sm font-medium">{isDailyCareOverdue ? interpolate(t.ux.careDue, { hours: routine.hours }) : t.ux.noCare}</p>
          <Button variant="ghost" className="mt-1 min-h-11 px-0 text-primary" onClick={onOpenCare}>{t.ux.configureCare}</Button>
        </section> : null}
        <details className="rounded-2xl border bg-card">
          <summary className="min-h-12 cursor-pointer px-4 py-3 text-sm font-semibold">{t.tracking.latestInfo}</summary>
          <div data-testid="care-temperature-grid" className="space-y-3 p-3 pt-0">
            <div data-testid="bath-diaper-stack"><CompactInfoCard {...otherInfo[1]} /></div>
            <TemperatureInfoCard events={temperatures} />
          </div>
        </details>
      </div>

      <section className="lg:col-start-2">
        <SectionTitle>{t.tracking.recentActivity}</SectionTitle>
        <Card className="py-0">
          <CardContent className="p-2 sm:p-3">
            {loading ? <ContentLoading label={t.tracking.activityLoading} /> : recent.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t.tracking.firstActions}</p>
            ) : Object.entries(groups).map(([key, dayEvents], groupIndex) => (
              <div key={key}>
                {groupIndex > 0 && <Separator className="my-3" />}
                <h3 className="px-2 py-2 text-xs font-semibold text-muted-foreground">{dayHeading(key, locale)}</h3>
                {dayEvents?.map(event => <EventRow key={event.id} event={event} showIcon onClick={() => onEdit(event)} />)}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function StoolAlertCard({ alert }: { alert: StoolAlert }) {
  const { locale, t } = useI18n()
  const detail = alert.last_stool_at
    ? interpolate(t.tracking.lastStool, { relative: relativeTime(alert.last_stool_at, locale) })
    : t.tracking.noStoolRecorded

  return (
    <section aria-label={t.tracking.stoolAlertLabel}>
      <Card role="alert" className="border-amber-500/45 bg-amber-500/10 shadow-sm">
        <CardContent className="flex items-start gap-3 p-4 sm:p-5">
          <span className="rounded-full bg-amber-500/15 p-2 text-amber-700 dark:text-amber-300">
            <AlertTriangle className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-semibold text-amber-950 dark:text-amber-100">
              {alert.hours_since == null ? t.tracking.stoolMissingTitle : interpolate(t.tracking.noStoolSince, { hours: alert.hours_since })}
            </p>
            <p className="mt-1 text-sm text-amber-900/75 dark:text-amber-100/75">
              {detail} {interpolate(t.tracking.stoolThreshold, { hours: alert.threshold_hours })}
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

function InfoCard({ testId, label, icon: Icon, primary, secondary, elapsed, caption }: {
  testId: string
  label: string
  icon: typeof Milk
  primary: string
  secondary: string
  elapsed?: string
  caption?: string
}) {
  return (
    <Card data-testid={testId} className="gap-0 bg-card/80 py-3">
      <CardContent className="flex items-start gap-2 px-3 py-0">
        <Icon className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-sm font-semibold">{elapsed || primary}</p>
          {elapsed ? <p className="mt-1 text-xs text-muted-foreground"><span>{primary}</span>{secondary ? ` · ${secondary}` : ""}</p> : null}
          {caption ? <p className="mt-1 text-xs font-medium text-primary">{caption}</p> : null}
        </div>
      </CardContent>
    </Card>
  )
}

function CompactInfoCard({ label, icon: Icon, primary, secondary, care }: {
  label: string
  icon: typeof Milk
  primary: string
  secondary: string
  care?: { label: string; primary: string; secondary: string }
}) {
  return (
    <Card className="gap-0 bg-card/80 py-3">
      <CardContent className="flex min-h-0 items-center gap-3 px-3 py-0 sm:px-4 sm:py-0">
        <Icon className="size-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0">
          {care ? (
            <div className="mb-3 border-b border-border pb-3">
              <p className="text-xs font-medium text-muted-foreground">{care.label}</p>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <p className="font-medium">{care.primary}</p>
                <p className="text-xs text-muted-foreground">{care.secondary || "—"}</p>
              </div>
            </div>
          ) : null}
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <p className="font-medium">{primary}</p>
            <p className="text-xs text-muted-foreground">{secondary || "—"}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function TemperatureInfoCard({ events }: { events: BabyEvent[] }) {
  const { locale, t } = useI18n()
  const values = events.map((event) => event.value_real as number)
  const latest = events[events.length - 1]

  return (
    <Card data-testid="temperature-info-card" className="h-full gap-0 bg-card/80 py-3">
      <CardContent className="px-4 py-0 sm:px-5 sm:py-0">
        <Thermometer className="mb-3 size-5 text-primary sm:mb-5" aria-hidden="true" />
        <p className="text-xs font-medium text-muted-foreground">{t.eventLabels.temperature}</p>
        <div className="mt-2 grid gap-4 sm:grid-cols-[minmax(7rem,auto)_minmax(0,1fr)] sm:items-start">
          <div>
            <p className="text-2xl font-semibold">{latest ? `${formatNumber(latest.value_real!, 1, locale)} °C` : t.common.none}</p>
            <p className="text-sm text-muted-foreground">{latest ? relativeTime(latest.started_at, locale) : t.common.noValue}</p>
          </div>
          <TemperatureSparkline values={values} />
        </div>
      </CardContent>
    </Card>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-sm font-semibold text-muted-foreground">{children}</h2>
}
