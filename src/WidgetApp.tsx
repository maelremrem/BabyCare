import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Baby, Droplets, Stethoscope, Thermometer } from "lucide-react"
import { api, subscribeToServerChanges } from "@/lib/api"
import { formatAgeCompact, formatDuration, formatTime, formatTimer, getAgeParts, relativeTime } from "@/lib/dates"
import { I18nProvider, interpolate, localizedErrorMessage, messages, resolveLocale } from "@/lib/i18n"
import type { AppSettings, BabyEvent, DailyCare, StoolAlert } from "@/lib/types"

const DEFAULT_SETTINGS: AppSettings = {
  active_baby_id: 0,
  babies: [],
  accent_color: "orange",
  baby_name: "",
  birth_date: "",
  baby_sex: "",
  feeding_type: "breast",
  language_preference: "system"
}

function activeAccentColor(settings: AppSettings) {
  return settings.babies.find((baby) => baby.id === settings.active_baby_id)?.accent_color || settings.accent_color
}

function activeBaby(settings: AppSettings) {
  return settings.babies.find((baby) => baby.id === settings.active_baby_id) || null
}

export function WidgetApp() {
  const generation = useRef(0)
  const [connected, setConnected] = useState(true)
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [events, setEvents] = useState<BabyEvent[]>([])
  const [running, setRunning] = useState<BabyEvent[]>([])
  const [care, setCare] = useState<DailyCare[]>([])
  const [stoolAlert, setStoolAlert] = useState<StoolAlert | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
  const [now, setNow] = useState(() => new Date())

  const loadWidget = useCallback(async () => {
    const current = ++generation.current
    const params = new URLSearchParams({ limit: "12" })
    const [nextSettings, history, active, nextCare, nextAlert] = await Promise.all([
      api.settings(),
      api.events(params),
      api.running(),
      api.dailyCare(),
      api.stoolAlert()
    ])

    if (current !== generation.current) return
    setSettings(nextSettings)
    setEvents(history.events)
    setRunning(active)
    setCare(nextCare)
    setStoolAlert(nextAlert)
    setLastUpdatedAt(new Date())
    setError(null)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadWidget()
      .catch((loadError) => {
        const fallbackMessages = messages[resolveLocale("system")]
        setError(localizedErrorMessage(loadError, fallbackMessages, fallbackMessages.common.appUnavailable))
        setLoading(false)
      })
    return () => { generation.current += 1 }
  }, [loadWidget])

  useEffect(() => subscribeToServerChanges(() => {
    loadWidget().catch(() => undefined)
  }, setConnected), [loadWidget])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const accent = activeAccentColor(settings)
    const root = document.documentElement
    const colors = {
      orange: "#FD6D01",
      blue: "#2F80ED",
      green: "#34C759",
      pink: "#FF2D92",
      purple: "#AF52DE"
    } as const
    root.style.setProperty("--primary", colors[accent])
    root.style.setProperty("--ring", colors[accent])
    root.style.setProperty("--sidebar-primary", colors[accent])
  }, [settings])

  return (
    <I18nProvider preference={settings.language_preference}>
      <WidgetView
        care={care}
        error={error || (!connected ? (resolveLocale(settings.language_preference) === "fr" ? "Connexion interrompue." : "Connection lost.") : null)}
        events={events}
        lastUpdatedAt={lastUpdatedAt}
        loading={loading}
        now={now}
        running={running}
        settings={settings}
        stoolAlert={stoolAlert}
      />
    </I18nProvider>
  )
}

function WidgetView({
  care,
  error,
  events,
  lastUpdatedAt,
  loading,
  now,
  running,
  settings,
  stoolAlert
}: {
  care: DailyCare[]
  error: string | null
  events: BabyEvent[]
  lastUpdatedAt: Date | null
  loading: boolean
  now: Date
  running: BabyEvent[]
  settings: AppSettings
  stoolAlert: StoolAlert | null
}) {
  const locale = resolveLocale(settings.language_preference)
  const t = messages[locale]
  const baby = activeBaby(settings)
  const feedType = settings.feeding_type || "breast"
  const activeEvent = running[0] || null
  const lastFeeding = events.find((event) => feedType === "bottle"
    ? event.type === "bottle"
    : feedType === "breast"
      ? event.type === "breast_left" || event.type === "breast_right"
      : event.type === "bottle" || event.type === "breast_left" || event.type === "breast_right")
  const lastDiaper = events.find((event) => event.type === "diaper")
  const lastTemperature = events.find((event) => event.type === "temperature" && event.value_real != null)
  const completedCareCount = care.filter((item) => item.completed === 1).length
  const age = baby?.birth_date ? getAgeParts(baby.birth_date, now) : null
  const activeTimer = activeEvent ? Math.max(0, Math.floor((now.getTime() - Date.parse(activeEvent.started_at)) / 1000)) : null

  const spotlight = useMemo(() => {
    if (activeEvent && activeTimer != null) {
      return {
        label: t.widget.activeTimer,
        value: t.eventLabels[activeEvent.type],
        detail: formatTimer(activeTimer),
        caption: interpolate(t.widget.startedAt, { time: formatTime(activeEvent.started_at, locale) })
      }
    }

    if (lastFeeding) {
      const value = lastFeeding.type === "bottle" && lastFeeding.value_real != null
        ? `${lastFeeding.value_real.toFixed(0)} ml`
        : t.eventLabels[lastFeeding.type]
      const detail = formatDuration(Math.max(0, Math.floor((now.getTime() - Date.parse(lastFeeding.started_at)) / 1000)), locale)
      const caption = relativeTime(lastFeeding.started_at, locale)
      return {
        label: lastFeeding.type === "bottle" ? t.widget.latestBottle : t.widget.latestFeeding,
        value,
        detail: detail || t.common.noValue,
        caption
      }
    }

    return {
      label: t.widget.latestFeeding,
      value: t.common.none,
      detail: t.widget.noData,
      caption: ""
    }
  }, [activeEvent, activeTimer, lastFeeding, locale, now, t])

  if (loading) return <WidgetShell><WidgetLoading /></WidgetShell>

  if (error) {
    return (
      <WidgetShell>
        <div className="rounded-[1.75rem] border border-border bg-card/90 p-4 shadow-2xl shadow-black/30">
          <p className="text-sm font-semibold">{t.widget.title}</p>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        </div>
      </WidgetShell>
    )
  }

  return (
    <WidgetShell>
      <div className="h-full overflow-hidden rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,18,18,.98),rgba(5,5,5,.98))] p-3 shadow-2xl shadow-black/40">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">{t.widget.title}</p>
            <h1 className="truncate pt-0.5 text-lg font-semibold">{baby?.name || t.widget.noBaby}</h1>
            <p className="pt-0.5 text-xs text-muted-foreground">
              {age ? formatAgeCompact(age, locale) : baby?.birth_date ? t.common.noValue : t.widget.profileHint}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 text-right">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{t.widget.sync}</p>
            <p className="pt-1 text-sm font-medium">{lastUpdatedAt ? formatTime(lastUpdatedAt.toISOString(), locale) : t.common.noValue}</p>
          </div>
        </div>

        <div className="mt-3 rounded-[1.25rem] border border-primary/30 bg-primary/10 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">{spotlight.label}</p>
          <div className="mt-1.5 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">{spotlight.value}</p>
              <p className="pt-0.5 text-xs text-white/80">{spotlight.caption || t.widget.noData}</p>
            </div>
            <p className="shrink-0 text-xl font-semibold tabular-nums">{spotlight.detail}</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <WidgetCard
            icon={Thermometer}
            label={t.widget.latestTemperature}
            value={lastTemperature?.value_real != null ? `${lastTemperature.value_real.toFixed(1)} °C` : t.common.none}
            detail={lastTemperature ? relativeTime(lastTemperature.started_at, locale) : t.widget.noData}
          />
          <WidgetCard
            icon={Droplets}
            label={t.widget.latestDiaper}
            value={diaperLabel(lastDiaper, locale)}
            detail={lastDiaper ? relativeTime(lastDiaper.started_at, locale) : t.widget.noData}
          />
          <WidgetCard
            icon={Stethoscope}
            label={t.widget.stool}
            value={stoolStatus(stoolAlert, locale)}
            detail={stoolDetail(stoolAlert, locale)}
          />
          <WidgetCard
            icon={Baby}
            label={t.widget.dailyCare}
            value={interpolate(t.widget.completedCare, { count: completedCareCount, total: care.length || 4 })}
            detail={completedCareCount === (care.length || 4) ? t.care.completed : t.widget.pendingCare}
          />
        </div>

      </div>
    </WidgetShell>
  )
}

function WidgetShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[radial-gradient(circle_at_top,#1f1f1f_0%,#090909_38%,#000_100%)] p-3 text-foreground">
      <div className="aspect-square w-[min(calc(100dvw-1.5rem),calc(100dvh-1.5rem),26rem)]">{children}</div>
    </div>
  )
}

function WidgetLoading() {
  return (
    <div className="h-full rounded-[1.5rem] border border-white/10 bg-card/90 p-3 shadow-2xl shadow-black/30">
      <div className="h-3 w-24 rounded-full bg-white/8" />
      <div className="mt-3 h-7 w-40 rounded-full bg-white/10" />
      <div className="mt-3 h-20 rounded-[1.25rem] bg-white/6" />
      <div className="mt-3 grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-16 rounded-[1rem] bg-white/6" />)}
      </div>
    </div>
  )
}

function WidgetCard({
  detail,
  icon: Icon,
  label,
  value
}: {
  detail: string
  icon: typeof Thermometer
  label: string
  value: string
}) {
  return (
    <div className="min-w-0 rounded-[1rem] border border-white/8 bg-white/[0.03] p-2">
      <Icon className="size-3.5 text-primary" aria-hidden="true" />
      <p className="truncate pt-1.5 text-[9px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">{label}</p>
      <p className="truncate pt-0.5 text-sm font-semibold">{value}</p>
      <p className="truncate pt-0.5 text-[10px] text-muted-foreground">{detail}</p>
    </div>
  )
}

function diaperLabel(event: BabyEvent | undefined, locale: "fr" | "en") {
  if (!event) return messages[locale].common.none
  const diaperType = typeof event.metadata?.diaper_type === "string" ? event.metadata.diaper_type : null
  if (!diaperType) return messages[locale].common.none
  const diaperTypes = messages[locale].diaperTypes as Record<string, string>
  return diaperTypes[diaperType] || diaperType
}

function stoolStatus(alert: StoolAlert | null, locale: "fr" | "en") {
  if (!alert) return messages[locale].common.noValue
  if (alert.overdue) return messages[locale].widget.overdue
  if (alert.last_stool_at) return relativeTime(alert.last_stool_at, locale)
  return messages[locale].widget.monitoringOk
}

function stoolDetail(alert: StoolAlert | null, locale: "fr" | "en") {
  if (!alert) return messages[locale].widget.noData
  if (alert.hours_since != null) return interpolate(messages[locale].tracking.noStoolSince, { hours: alert.hours_since })
  return interpolate(messages[locale].tracking.stoolThreshold, { hours: alert.threshold_hours })
}
