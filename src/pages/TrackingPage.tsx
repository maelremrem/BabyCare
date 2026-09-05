import { useState } from "react"
import { AlertTriangle, Bath, Check, Milk, Thermometer, WalletCards } from "lucide-react"
import { toast } from "sonner"
import { ActionGrid } from "@/components/ActionGrid"
import { ActiveTimer } from "@/components/ActiveTimer"
import { ContentLoading } from "@/components/ContentLoading"
import { EventRow } from "@/components/EventRow"
import { TemperatureSparkline } from "@/components/TemperatureSparkline"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useClock } from "@/hooks/useClock"
import { api } from "@/lib/api"
import { interpolate, localizedErrorMessage, useI18n } from "@/lib/i18n"
import { hasBottleFeeding, hasBreastFeeding, type BabyEvent, type DailyCare, type FeedingType, type StoolAlert } from "@/lib/types"
import { dateKey, dayHeading, formatDuration, formatTime, groupEventsByDay, relativeTime } from "@/lib/dates"

const CARE_ALERT_THRESHOLD_MS = 24 * 60 * 60 * 1000
const DAILY_CARE_TYPES: DailyCare["care_type"][] = ["eyes", "face", "nose", "cord"]

interface TrackingPageProps {
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

export function TrackingPage({ events, running, loading, stoolAlert, feedingType = "breast", onChanged, onEdit, onOpenCare, onTimerStartAttempt, onTimerStartFailed }: TrackingPageProps) {
  const { locale, t } = useI18n()
  const now = useClock()
  const [validatingCare, setValidatingCare] = useState(false)
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
  const careElapsedMs = lastDailyCare ? now.getTime() - Date.parse(lastDailyCare.started_at) : null
  const isDailyCareOverdue = careElapsedMs == null || careElapsedMs > CARE_ALERT_THRESHOLD_MS
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

  const validateDailyCare = async () => {
    setValidatingCare(true)
    try {
      await Promise.all(DAILY_CARE_TYPES.map((careType) => api.updateDailyCare(careType, true)))
      await api.validateDailyCare()
      toast.success(t.care.validated)
      await onChanged()
    } catch (error) {
      toast.error(localizedErrorMessage(error, t, t.care.validationImpossible))
    } finally {
      setValidatingCare(false)
    }
  }

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
        ? interpolate(t.tracking.sinceLastFeeding, { duration: `\n${elapsedSince(lastBreastFeeding)}` })
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
        ? interpolate(t.tracking.sinceLastBottle, { duration: `\n${elapsedSince(lastBottle)}` })
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
      primary: lastBath ? formatTime(lastBath.started_at, locale) : t.common.none,
      secondary: lastBath ? relativeTime(lastBath.started_at, locale) : "",
      caption: undefined
    }
  ]

  return (
    <div className="space-y-8">
      {stoolAlert?.overdue || isDailyCareOverdue ? (
        <div className="space-y-3">
          {stoolAlert?.overdue ? <StoolAlertCard alert={stoolAlert} /> : null}
          {isDailyCareOverdue ? (
            <DailyCareAlertCard
              lastDailyCare={lastDailyCare}
              validating={validatingCare}
              onValidate={validateDailyCare}
            />
          ) : null}
        </div>
      ) : null}

      <section>
        <SectionTitle>{t.tracking.latestInfo}</SectionTitle>
        <div data-testid="feeding-info-grid" className={`grid grid-cols-1 gap-3 ${feedingInfo.length === 2 ? "sm:grid-cols-2" : ""}`}>
          {feedingInfo.map((item) => <InfoCard key={item.testId} {...item} />)}
        </div>
        <div data-testid="care-temperature-grid" className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div data-testid="bath-diaper-stack" className="grid gap-3">
            {otherInfo.map((item) => <CompactInfoCard key={item.label} {...item} />)}
          </div>
          <div className="lg:col-span-2">
            <TemperatureInfoCard events={temperatures} />
          </div>
        </div>
      </section>

      <section>
        <SectionTitle>{t.tracking.quickActions}</SectionTitle>
        <ActionGrid nextBreast={nextBreast} feedingType={feedingType} bottleDefaultQuantity={lastBottleQuantity} onChanged={onChanged} onOpenCare={onOpenCare} onTimerStartAttempt={onTimerStartAttempt} onTimerStartFailed={onTimerStartFailed} />
      </section>

      {running.length > 0 && (
        <section id="active-timers" className="scroll-mt-40 space-y-3">
          <SectionTitle>{t.tracking.activeTimer}</SectionTitle>
          {running.map((event) => <ActiveTimer key={event.id} event={event} onChanged={onChanged} />)}
        </section>
      )}

      <section>
        <SectionTitle>{t.tracking.recentActivity}</SectionTitle>
        <Card>
          <CardContent className="p-3 sm:p-5">
            {loading ? (
              <ContentLoading label={t.tracking.activityLoading} />
            ) : recent.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">{t.tracking.firstActions}</p>
            ) : Object.entries(groups).map(([key, dayEvents], groupIndex) => (
              <div key={key}>
                {groupIndex > 0 && <Separator className="my-4" />}
                <h3 className="px-2 py-2 text-xs font-semibold tracking-[.14em] text-muted-foreground">{dayHeading(key, locale)}</h3>
                {dayEvents?.map((event) => <EventRow key={event.id} event={event} showIcon onClick={() => onEdit(event)} />)}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function DailyCareAlertCard({ lastDailyCare, validating, onValidate }: {
  lastDailyCare?: BabyEvent
  validating: boolean
  onValidate: () => Promise<void>
}) {
  const { locale, t } = useI18n()
  const detail = lastDailyCare
    ? interpolate(t.tracking.lastDailyCare, { relative: relativeTime(lastDailyCare.started_at, locale) })
    : t.tracking.noDailyCareRecorded

  return (
    <section aria-label={t.tracking.dailyCareAlertLabel}>
      <Card role="alert" className="border-amber-500/45 bg-amber-500/10 shadow-sm">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:p-5">
          <div className="flex items-start gap-3">
            <span className="rounded-full bg-amber-500/15 p-2 text-amber-700 dark:text-amber-300">
              <AlertTriangle className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold text-amber-950 dark:text-amber-100">{t.tracking.dailyCareOverdueTitle}</p>
              <p className="mt-1 text-sm text-amber-900/75 dark:text-amber-100/75">
                {detail} {t.tracking.dailyCareThreshold}
              </p>
            </div>
          </div>
          <Button className="min-h-11 w-full shrink-0 sm:ml-auto sm:w-auto" disabled={validating} onClick={() => void onValidate()}>
            <Check /> {t.tracking.dailyCareDoneButton}
          </Button>
        </CardContent>
      </Card>
    </section>
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
    <Card data-testid={testId} className="bg-card/80">
      <CardContent className="flex items-center gap-4 px-4 py-0 sm:block sm:px-5 sm:py-0">
        <Icon className="size-5 shrink-0 text-primary sm:mb-5" aria-hidden="true" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
          <p className="mt-1 text-lg font-medium">{primary}</p>
          <p className="text-sm text-muted-foreground">{secondary || "—"}</p>
          {elapsed ? <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{elapsed}</p> : null}
          {caption ? <p className="mt-1 text-xs font-medium text-primary">{caption}</p> : null}
        </div>
      </CardContent>
    </Card>
  )
}

function CompactInfoCard({ label, icon: Icon, primary, secondary }: {
  label: string
  icon: typeof Milk
  primary: string
  secondary: string
}) {
  return (
    <Card className="bg-card/80">
      <CardContent className="flex min-h-0 items-center gap-3 px-3 py-0 sm:px-4 sm:py-0">
        <Icon className="size-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
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
    <Card data-testid="temperature-info-card" className="h-full bg-card/80">
      <CardContent className="px-4 py-0 sm:px-5 sm:py-0">
        <Thermometer className="mb-3 size-5 text-primary sm:mb-5" aria-hidden="true" />
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.eventLabels.temperature}</p>
        <div className="mt-2 grid gap-4 sm:grid-cols-[minmax(7rem,auto)_minmax(0,1fr)] sm:items-start">
          <div>
            <p className="text-2xl font-semibold">{latest ? `${latest.value_real?.toFixed(1)} °C` : t.common.none}</p>
            <p className="text-sm text-muted-foreground">{latest ? relativeTime(latest.started_at, locale) : t.common.noValue}</p>
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
