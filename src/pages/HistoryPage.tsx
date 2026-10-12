import { fetchAllEvents } from "@/lib/eventPages"
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import { ChartNoAxesCombined, ChevronDown, Clock3, Download, Milk, Search, Thermometer, Utensils } from "lucide-react"
import { toast } from "sonner"
import { EventRow } from "@/components/EventRow"
import { ContentLoading } from "@/components/ContentLoading"
import { HistoryChart } from "@/components/HistoryChart"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { api, isDemoMode } from "@/lib/api"
import { dayHeading, formatDuration, groupEventsByDay } from "@/lib/dates"
import { calculateHistoryStatistics } from "@/lib/historyStatistics"
import { buildHistoryChart, historyChartUnit } from "@/lib/historyChart"
import { interpolate, localizedErrorMessage, useI18n } from "@/lib/i18n"
import { EVENT_LABELS, hasBottleFeeding, hasBreastFeeding, type BabyEvent, type EventType, type FeedingType } from "@/lib/types"

interface HistoryPageProps {
  babyId?: number
  refreshKey: number
  feedingType?: FeedingType
  onEdit: (event: BabyEvent) => void
}

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function periodParams(period: string, customFrom: string, customTo: string) {
  const params = new URLSearchParams()
  const today = new Date()
  if (period === "today") {
    params.set("from", isoDate(today))
    params.set("to", isoDate(today))
  }
  if (period === "custom") {
    params.set("from", customFrom)
    params.set("to", customTo)
  }
  if (period === "yesterday") {
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    params.set("from", isoDate(yesterday))
    params.set("to", isoDate(yesterday))
  }
  if (period === "7" || period === "30") {
    const from = new Date(today)
    from.setDate(today.getDate() - Number(period) + 1)
    params.set("from", isoDate(from))
    params.set("to", isoDate(today))
  }
  return params
}

function percentage(count: number, total: number) {
  return total ? Math.round((count / total) * 100) : 0
}

export function HistoryPage({ babyId, refreshKey, feedingType = "breast", onEdit }: HistoryPageProps) {
  const generation = useRef(0)
  const chartId = useId()
  const { locale, t } = useI18n()
  const [events, setEvents] = useState<BabyEvent[]>([])
  const moreBusy = useRef(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [total, setTotal] = useState(0)
  const [period, setPeriod] = useState("7")
  const [customFrom, setCustomFrom] = useState(() => {
    const from = new Date()
    from.setDate(from.getDate() - 6)
    return isoDate(from)
  })
  const [customTo, setCustomTo] = useState(() => isoDate(new Date()))
  const [selectedTypes, setSelectedTypes] = useState<EventType[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [statisticsEvents, setStatisticsEvents] = useState<BabyEvent[]>([])
  const [statisticsLoading, setStatisticsLoading] = useState(true)
  const [statisticsError, setStatisticsError] = useState("")
  const [statisticsRetry, setStatisticsRetry] = useState(0)
  const [showChart, setShowChart] = useState(false)
  const rangeError = period !== "custom" ? "" : !customFrom || !customTo
    ? t.history.incompleteRange
    : customFrom > customTo ? t.history.invalidRange : ""

  const params = useMemo(() => {
    const next = periodParams(period, customFrom, customTo)
    next.set("limit", "100")
    if (babyId) next.set("baby_id", String(babyId))
    if (selectedTypes.length === 1) next.set("type", selectedTypes[0])
    if (selectedTypes.length > 1) next.set("types", selectedTypes.join(","))
    if (search.trim()) next.set("search", search.trim())
    return next
  }, [period, customFrom, customTo, selectedTypes, search, babyId])

  const load = useCallback(async () => {
    const current = ++generation.current
    setLoading(true)
    setEvents([])
    setTotal(0)
    setLoadError("")
    setLoadingMore(false)
    moreBusy.current = false
    if (rangeError) { setLoading(false); return }
    try {
      const result = await api.events(params)
      if (current !== generation.current) return
      setEvents(result.events)
      setTotal(result.total)
    } catch (error) {
      if (current === generation.current && !(error instanceof DOMException && error.name === "AbortError")) setLoadError(localizedErrorMessage(error, t, t.history.unavailable))
    } finally {
      if (current === generation.current) setLoading(false)
    }
  }, [params, rangeError, t])

  const loadMore = async () => {
    if (moreBusy.current || loading) return
    moreBusy.current = true
    setLoadingMore(true)
    setLoadError("")
    const current = generation.current
    const next = new URLSearchParams(params)
    next.set("offset", String(events.length))
    try {
      const result = await api.events(next)
      if (current !== generation.current) return
      setEvents(previous => [...previous, ...result.events.filter(event => !previous.some(item => item.id === event.id))])
      setTotal(result.total)
    } catch (error) {
      if (current === generation.current) setLoadError(localizedErrorMessage(error, t, t.history.unavailable))
    } finally {
      if (current === generation.current) { moreBusy.current = false; setLoadingMore(false) }
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(load, search ? 250 : 0)
    return () => { window.clearTimeout(timer); generation.current += 1 }
  }, [load, search, refreshKey])

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    setStatisticsLoading(true)
    setStatisticsEvents([])
    setStatisticsError("")
    if (rangeError) { setStatisticsLoading(false); return }
    fetchAllEvents(params, controller.signal)
      .then((filteredEvents) => {
        if (active) setStatisticsEvents(filteredEvents)
      })
      .catch((error) => {
        if (active && !(error instanceof DOMException && error.name === "AbortError")) setStatisticsError(localizedErrorMessage(error, t, t.history.unavailable))
      })
      .finally(() => {
        if (active) setStatisticsLoading(false)
      })
    return () => { active = false; controller.abort() }
  }, [params, rangeError, refreshKey, statisticsRetry, t])

  const groups = groupEventsByDay(events)
  const statistics = useMemo(() => calculateHistoryStatistics(statisticsEvents), [statisticsEvents])
  const chart = useMemo(() => showChart && !rangeError && !statisticsLoading && !statisticsError
    ? buildHistoryChart(statisticsEvents, selectedTypes, params.get("from") ?? undefined, params.get("to") ?? undefined)
    : null, [showChart, rangeError, statisticsLoading, statisticsError, statisticsEvents, selectedTypes, params])
  const breastEnabled = hasBreastFeeding(feedingType)
  const bottleEnabled = hasBottleFeeding(feedingType)
  const formatTemperature = (value: number | null) => value == null
    ? "—"
    : `${new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)} °C`
  const feedingAverage = statistics.feeding.averageDurationSeconds == null
    ? "—"
    : formatDuration(Math.round(statistics.feeding.averageDurationSeconds), locale)
  const leftBreastDurationAverage = statistics.feeding.averageLeftDurationSeconds == null
    ? "—"
    : formatDuration(Math.round(statistics.feeding.averageLeftDurationSeconds), locale)
  const rightBreastDurationAverage = statistics.feeding.averageRightDurationSeconds == null
    ? "—"
    : formatDuration(Math.round(statistics.feeding.averageRightDurationSeconds), locale)
  const feedingIntervalAverage = statistics.feeding.averageIntervalSeconds == null
    ? "—"
    : formatDuration(Math.round(statistics.feeding.averageIntervalSeconds), locale)
  const bottleIntervalAverage = statistics.bottle.averageIntervalSeconds == null
    ? "—"
    : formatDuration(Math.round(statistics.bottle.averageIntervalSeconds), locale)
  const bottleQuantityAverage = statistics.bottle.averageQuantityMl == null
    ? "—"
    : `${new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", { maximumFractionDigits: 0 }).format(statistics.bottle.averageQuantityMl)} ml`
  const stoolAverage = statistics.averageStoolIntervalSeconds == null
    ? "—"
    : formatDuration(Math.round(statistics.averageStoolIntervalSeconds), locale)
  const exportParams = new URLSearchParams(params)
  exportParams.delete("limit")
  exportParams.set("locale", locale)
  if (babyId) exportParams.set("baby_id", String(babyId))

  const exportDemoCsv = async () => {
    const allEvents = await fetchAllEvents(exportParams)
    const header = ["started_at", "type", "value_real", "value_text", "notes"]
    const rows = allEvents.map((event) => header.map((key) => {
      const value = String(event[key as keyof BabyEvent] ?? "")
      return `"${value.split("\"").join("\"\"")}"`
    }).join(","))
    const blob = new Blob([[header.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "BabyCare_demo_export.csv"
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{t.history.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{total} {total > 1 ? t.history.matchingPlural : t.history.matchingSingular}</p>
        </div>
        {rangeError ? <Button className="h-11" disabled><Download /> {isDemoMode ? t.ux.exportCsv : t.history.exportExcel}</Button> : isDemoMode ? (
          <Button className="h-11" onClick={() => exportDemoCsv().catch((error) => toast.error(localizedErrorMessage(error, t, t.history.unavailable)))}>
            <Download /> {t.ux.exportCsv}
          </Button>
        ) : (
          <Button className="h-11" asChild>
            <a href={`/api/export/xlsx?${exportParams}`} download><Download /> {t.history.exportExcel}</a>
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-[12rem_14rem_1fr]">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger aria-label={t.ux.period} className="h-12 w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">{t.history.periods.today}</SelectItem>
              <SelectItem value="yesterday">{t.history.periods.yesterday}</SelectItem>
              <SelectItem value="7">{t.history.periods.seven}</SelectItem>
              <SelectItem value="30">{t.history.periods.thirty}</SelectItem>
              <SelectItem value="custom">{t.history.periods.custom}</SelectItem>
              <SelectItem value="all">{t.history.periods.all}</SelectItem>
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button aria-label={t.history.dataTypes} variant="outline" className="h-12 w-full justify-between">
                <span className="truncate">{selectedTypes.length ? selectedTypes.map((value) => t.eventLabels[value]).join(", ") : t.history.allTypes}</span>
                <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 max-w-[calc(100vw-2rem)] p-3">
              <fieldset>
                <legend className="px-2 text-sm font-semibold">{t.history.dataTypes}</legend>
                <p className="px-2 py-2 text-xs text-muted-foreground">{t.history.mixTypesHint}</p>
                <Button variant="outline" className="mb-2 min-h-11 w-full" aria-pressed={!selectedTypes.length} onClick={() => setSelectedTypes([])}>{t.history.allTypes}</Button>
                <div className="max-h-72 overflow-y-auto">
                  {(Object.keys(EVENT_LABELS) as EventType[]).map((value) => (
                    <label key={value} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm hover:bg-muted">
                      <input type="checkbox" className="size-4 accent-primary" checked={selectedTypes.includes(value)} onChange={() => setSelectedTypes((previous) => previous.includes(value) ? previous.filter((item) => item !== value) : [...previous, value])} />
                      {t.eventLabels[value]}
                    </label>
                  ))}
                </div>
              </fieldset>
            </PopoverContent>
          </Popover>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label={t.history.searchPlaceholder} className="h-12 pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.history.searchPlaceholder} />
          </div>
          {period === "custom" ? <div className="grid grid-cols-2 gap-3 md:col-span-3">
            <label className="space-y-1 text-sm"><span>{t.history.fromDate}</span><Input type="date" className="h-12" value={customFrom} max={customTo || undefined} aria-invalid={Boolean(rangeError)} onChange={(event) => setCustomFrom(event.target.value)} /></label>
            <label className="space-y-1 text-sm"><span>{t.history.toDate}</span><Input type="date" className="h-12" value={customTo} min={customFrom || undefined} aria-invalid={Boolean(rangeError)} onChange={(event) => setCustomTo(event.target.value)} /></label>
          </div> : null}
          {rangeError ? <p role="alert" className="text-sm text-destructive md:col-span-3">{rangeError}</p> : null}
          <p className="text-xs text-muted-foreground md:col-span-3">{t.history.sharedFilters}</p>
        </CardContent>
      </Card>

      <section aria-label={t.history.milkConsumed} className="rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-3">
          <Milk className="size-6 text-chart-2" aria-hidden="true" />
          <h3 className="text-base font-semibold">{t.history.milkConsumed}</h3>
        </div>
        <p className="mt-3 text-3xl font-semibold tabular-nums">{statisticsLoading || statisticsError || rangeError ? "—" : `${new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", { maximumFractionDigits: 1 }).format(statistics.bottle.totalQuantityMl)} ml`}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t.history.milkVolumeHint}</p>
        {statisticsError ? <div role="alert" className="mt-3 text-sm"><p>{statisticsError}</p><Button className="mt-2 min-h-11" variant="outline" onClick={() => setStatisticsRetry((value) => value + 1)}>{t.ux.retry}</Button></div> : null}
      </section>

      <section aria-label={t.history.chartTitle} className="rounded-2xl border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-base font-semibold"><ChartNoAxesCombined className="size-5 text-primary" aria-hidden="true" />{t.history.chartTitle}</h3>
          <Button variant="outline" className="min-h-11" aria-expanded={showChart} aria-controls={chartId} onClick={() => setShowChart((value) => !value)}>{showChart ? t.history.hideChart : t.history.showChart}</Button>
        </div>
        {showChart ? <div id={chartId} className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">{t.history.chartHint}</p>
          {rangeError ? <p className="text-sm text-muted-foreground">{rangeError}</p> : statisticsLoading
            ? <ContentLoading label={t.history.loading} /> : statisticsError
              ? <p className="text-sm text-muted-foreground">{statisticsError}</p> : chart
                ? <HistoryChart buckets={chart.buckets} granularity={chart.granularity} series={chart.types.map((type) => ({ type, unit: historyChartUnit(type) }))} /> : null}
        </div> : null}
      </section>

      {!rangeError && !statisticsError ? <details className="rounded-2xl border bg-card p-4">
        <summary className="min-h-11 cursor-pointer text-sm font-semibold">
          {t.ux.statistics}
        </summary>
        <div className={`grid gap-3 ${breastEnabled && bottleEnabled ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
          <Card data-testid="temperature-statistics" className="gap-4 border-chart-1/30 bg-card/80 py-5">
            <CardContent className="space-y-4 px-5">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-chart-1/15 text-chart-1"><Thermometer className="size-5" /></span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.history.temperatureAverage}</p>
                  <p className="mt-1 text-2xl font-semibold">{statisticsLoading ? "—" : formatTemperature(statistics.temperature.average)}</p>
                </div>
              </div>
              {statisticsLoading ? (
                <p className="text-sm text-muted-foreground">{t.history.loading}</p>
              ) : statistics.temperature.count ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-muted/60 p-3"><span className="text-muted-foreground">{t.history.minimum}</span><strong className="mt-1 block">{formatTemperature(statistics.temperature.minimum)}</strong></div>
                  <div className="rounded-lg bg-muted/60 p-3"><span className="text-muted-foreground">{t.history.maximum}</span><strong className="mt-1 block">{formatTemperature(statistics.temperature.maximum)}</strong></div>
                </div>
              ) : <p className="text-sm text-muted-foreground">{t.history.noMonthlyData}</p>}
            </CardContent>
          </Card>

          {breastEnabled ? <Card data-testid="feeding-statistics" className="gap-4 border-chart-2/30 bg-card/80 py-5">
            <CardContent className="space-y-4 px-5">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-chart-2/15 text-chart-2"><Utensils className="size-5" /></span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.history.feedingAverage}</p>
                  <p className="mt-1 text-2xl font-semibold">{statisticsLoading ? "—" : feedingAverage}</p>
                  <p className="text-xs text-muted-foreground">{t.history.feedingDurationAverage}</p>
                </div>
              </div>
              {statisticsLoading ? (
                <p className="text-sm text-muted-foreground">{t.history.loading}</p>
              ) : statistics.feeding.total ? (
                <div className="grid gap-2 text-sm sm:grid-cols-3">
                  <div className="rounded-lg bg-muted/60 p-3"><span className="text-muted-foreground">{t.history.feedingIntervalAverage}</span><strong className="mt-1 block">{feedingIntervalAverage}</strong></div>
                  <div className="rounded-lg bg-muted/60 p-3"><span className="text-muted-foreground">{t.history.leftBreast}</span><strong className="mt-1 block">{percentage(statistics.feeding.leftCount, statistics.feeding.total)} % <span className="font-normal text-muted-foreground">({statistics.feeding.leftCount})</span></strong><span className="mt-2 block text-xs text-muted-foreground">{t.history.leftBreastDurationAverage}: {leftBreastDurationAverage}</span></div>
                  <div className="rounded-lg bg-muted/60 p-3"><span className="text-muted-foreground">{t.history.rightBreast}</span><strong className="mt-1 block">{percentage(statistics.feeding.rightCount, statistics.feeding.total)} % <span className="font-normal text-muted-foreground">({statistics.feeding.rightCount})</span></strong><span className="mt-2 block text-xs text-muted-foreground">{t.history.rightBreastDurationAverage}: {rightBreastDurationAverage}</span></div>
                </div>
              ) : <p className="text-sm text-muted-foreground">{t.history.noMonthlyData}</p>}
            </CardContent>
          </Card> : null}

          {bottleEnabled ? <Card data-testid={breastEnabled ? "bottle-statistics" : "feeding-statistics"} className="gap-4 border-chart-2/30 bg-card/80 py-5">
            <CardContent className="space-y-4 px-5">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-chart-2/15 text-chart-2"><Utensils className="size-5" /></span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.history.bottleStatistics}</p>
                  <p className="mt-1 text-2xl font-semibold">{statisticsLoading ? "—" : bottleIntervalAverage}</p>
                  <p className="text-xs text-muted-foreground">{t.history.bottleIntervalAverage}</p>
                </div>
              </div>
              {statisticsLoading ? (
                <p className="text-sm text-muted-foreground">{t.history.loading}</p>
              ) : statistics.bottle.total ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-muted/60 p-3"><span className="text-muted-foreground">{t.history.averageQuantity}</span><strong className="mt-1 block">{bottleQuantityAverage}</strong></div>
                  <div className="rounded-lg bg-muted/60 p-3"><span className="text-muted-foreground">{t.history.bottleCount}</span><strong className="mt-1 block">{statistics.bottle.total}</strong></div>
                </div>
              ) : <p className="text-sm text-muted-foreground">{t.history.noMonthlyData}</p>}
            </CardContent>
          </Card> : null}

          <Card data-testid="stool-statistics" className="gap-4 border-chart-3/30 bg-card/80 py-5">
            <CardContent className="space-y-4 px-5">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-chart-3/15 text-chart-3"><Clock3 className="size-5" /></span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.history.stoolIntervalAverage}</p>
                  <p className="mt-1 text-2xl font-semibold">{statisticsLoading ? "—" : stoolAverage}</p>
                </div>
              </div>
              {!statisticsLoading && statistics.stoolIntervalCount === 0 && <p className="text-sm text-muted-foreground">{t.history.notEnoughStools}</p>}
            </CardContent>
          </Card>
        </div>
      </details> : null}


      {loadError ? <div role="alert" className="rounded-xl border border-destructive/40 p-3 text-sm"><p>{loadError}</p><Button className="mt-2 min-h-11" variant="outline" onClick={() => void (events.length ? loadMore() : load())}>{t.ux.retry}</Button></div> : null}
      <p role="status" className="text-sm text-muted-foreground">{loading ? t.history.loading : interpolate(t.ux.showing, { count: events.length, total })}</p>
      <Card>
        <CardContent className="p-3 sm:p-5">
          {loading ? (
            <ContentLoading label={t.history.loading} />
          ) : events.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">{t.history.empty}</p>
          ) : Object.entries(groups).map(([key, dayEvents], groupIndex) => (
            <div key={key}>
              {groupIndex > 0 && <Separator className="my-4" />}
              <h3 className="px-2 py-2 text-xs font-semibold tracking-[.14em] text-muted-foreground">{dayHeading(key, locale)}</h3>
              {dayEvents?.map((event) => <EventRow key={event.id} event={event} onClick={() => onEdit(event)} />)}
            </div>
          ))}
        </CardContent>
      </Card>
      {!loading && events.length < total ? <Button className="min-h-12 w-full" variant="outline" disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore ? t.history.loading : t.ux.loadMore}</Button> : null}
    </div>
  )
}
