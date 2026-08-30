import { useCallback, useEffect, useMemo, useState } from "react"
import { Clock3, Download, Search, Thermometer, Utensils } from "lucide-react"
import { toast } from "sonner"
import { EventRow } from "@/components/EventRow"
import { ContentLoading } from "@/components/ContentLoading"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { api, isDemoMode } from "@/lib/api"
import { dayHeading, formatDuration, groupEventsByDay } from "@/lib/dates"
import { calculateHistoryStatistics } from "@/lib/historyStatistics"
import { interpolate, localizedErrorMessage, useI18n } from "@/lib/i18n"
import { EVENT_LABELS, type BabyEvent, type EventType } from "@/lib/types"

interface HistoryPageProps {
  refreshKey: number
  onEdit: (event: BabyEvent) => void
}

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function periodParams(period: string) {
  const params = new URLSearchParams()
  const today = new Date()
  if (period === "today") params.set("from", isoDate(today))
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

function currentMonthParams() {
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  const params = new URLSearchParams({ from: isoDate(firstDay), to: isoDate(today), limit: "250" })
  return params
}

async function fetchAllEvents(params: URLSearchParams) {
  const allEvents: BabyEvent[] = []
  let offset = 0

  while (true) {
    const pageParams = new URLSearchParams(params)
    pageParams.set("offset", String(offset))
    const page = await api.events(pageParams)
    allEvents.push(...page.events)
    offset += page.events.length
    if (page.events.length === 0 || offset >= page.total) return allEvents
  }
}

function percentage(count: number, total: number) {
  return total ? Math.round((count / total) * 100) : 0
}

export function HistoryPage({ refreshKey, onEdit }: HistoryPageProps) {
  const { locale, t } = useI18n()
  const [events, setEvents] = useState<BabyEvent[]>([])
  const [total, setTotal] = useState(0)
  const [period, setPeriod] = useState("7")
  const [type, setType] = useState("all")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [statisticsEvents, setStatisticsEvents] = useState<BabyEvent[]>([])
  const [statisticsLoading, setStatisticsLoading] = useState(true)

  const params = useMemo(() => {
    const next = periodParams(period)
    next.set("limit", "100")
    if (type !== "all") next.set("type", type)
    if (search.trim()) next.set("search", search.trim())
    return next
  }, [period, type, search])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await api.events(params)
      setEvents(result.events)
      setTotal(result.total)
    } catch (error) {
      toast.error(localizedErrorMessage(error, t, t.history.unavailable))
    } finally {
      setLoading(false)
    }
  }, [params, t])

  useEffect(() => {
    const timer = window.setTimeout(load, search ? 250 : 0)
    return () => window.clearTimeout(timer)
  }, [load, search, refreshKey])

  useEffect(() => {
    let active = true
    setStatisticsLoading(true)
    fetchAllEvents(currentMonthParams())
      .then((monthlyEvents) => {
        if (active) setStatisticsEvents(monthlyEvents)
      })
      .catch((error) => {
        if (active) toast.error(localizedErrorMessage(error, t, t.history.unavailable))
      })
      .finally(() => {
        if (active) setStatisticsLoading(false)
      })
    return () => { active = false }
  }, [refreshKey, t])

  const groups = groupEventsByDay(events)
  const statistics = useMemo(() => calculateHistoryStatistics(statisticsEvents), [statisticsEvents])
  const monthLabel = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", { month: "long", year: "numeric" }).format(new Date())
  const formatTemperature = (value: number | null) => value == null
    ? "—"
    : `${new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)} °C`
  const feedingAverage = statistics.feeding.averageDurationSeconds == null
    ? "—"
    : formatDuration(Math.round(statistics.feeding.averageDurationSeconds), locale)
  const stoolAverage = statistics.averageStoolIntervalSeconds == null
    ? "—"
    : formatDuration(Math.round(statistics.averageStoolIntervalSeconds), locale)
  const exportParams = new URLSearchParams(params)
  exportParams.delete("limit")
  exportParams.set("locale", locale)

  const exportDemoCsv = async () => {
    const result = await api.events(exportParams)
    const header = ["started_at", "type", "value_real", "value_text", "notes"]
    const rows = result.events.map((event) => header.map((key) => {
      const value = String(event[key as keyof BabyEvent] ?? "")
      return `"${value.replaceAll("\"", "\"\"")}"`
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
        {isDemoMode ? (
          <Button className="h-11" onClick={() => exportDemoCsv().catch((error) => toast.error(localizedErrorMessage(error, t, t.history.unavailable)))}>
            <Download /> {t.history.exportExcel}
          </Button>
        ) : (
          <Button className="h-11" asChild>
            <a href={`/api/export/xlsx?${exportParams}`} download><Download /> {t.history.exportExcel}</a>
          </Button>
        )}
      </div>

      <section aria-labelledby="history-statistics-title" className="space-y-3">
        <h3 id="history-statistics-title" className="text-sm font-semibold tracking-wide text-muted-foreground first-letter:uppercase">
          {interpolate(t.history.statisticsTitle, { month: monthLabel })}
        </h3>
        <div className="grid gap-3 lg:grid-cols-3">
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

          <Card data-testid="feeding-statistics" className="gap-4 border-chart-2/30 bg-card/80 py-5">
            <CardContent className="space-y-4 px-5">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-chart-2/15 text-chart-2"><Utensils className="size-5" /></span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.history.feedingAverage}</p>
                  <p className="mt-1 text-2xl font-semibold">{statisticsLoading ? "—" : feedingAverage}</p>
                  <p className="text-xs text-muted-foreground">{t.history.average}</p>
                </div>
              </div>
              {statisticsLoading ? (
                <p className="text-sm text-muted-foreground">{t.history.loading}</p>
              ) : statistics.feeding.total ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-muted/60 p-3"><span className="text-muted-foreground">{t.history.leftBreast}</span><strong className="mt-1 block">{percentage(statistics.feeding.leftCount, statistics.feeding.total)} % <span className="font-normal text-muted-foreground">({statistics.feeding.leftCount})</span></strong></div>
                  <div className="rounded-lg bg-muted/60 p-3"><span className="text-muted-foreground">{t.history.rightBreast}</span><strong className="mt-1 block">{percentage(statistics.feeding.rightCount, statistics.feeding.total)} % <span className="font-normal text-muted-foreground">({statistics.feeding.rightCount})</span></strong></div>
                </div>
              ) : <p className="text-sm text-muted-foreground">{t.history.noMonthlyData}</p>}
            </CardContent>
          </Card>

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
      </section>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-[12rem_14rem_1fr]">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">{t.history.periods.today}</SelectItem>
              <SelectItem value="yesterday">{t.history.periods.yesterday}</SelectItem>
              <SelectItem value="7">{t.history.periods.seven}</SelectItem>
              <SelectItem value="30">{t.history.periods.thirty}</SelectItem>
              <SelectItem value="all">{t.history.periods.all}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.history.allTypes}</SelectItem>
              {Object.keys(EVENT_LABELS).map((value) => <SelectItem key={value} value={value as EventType}>{t.eventLabels[value as EventType]}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-11 pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.history.searchPlaceholder} />
          </div>
        </CardContent>
      </Card>

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
    </div>
  )
}
