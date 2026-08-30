import { useCallback, useEffect, useMemo, useState } from "react"
import { Download, Search } from "lucide-react"
import { toast } from "sonner"
import { EventRow } from "@/components/EventRow"
import { ContentLoading } from "@/components/ContentLoading"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { api, isDemoMode } from "@/lib/api"
import { dayHeading, groupEventsByDay } from "@/lib/dates"
import { localizedErrorMessage, useI18n } from "@/lib/i18n"
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

export function HistoryPage({ refreshKey, onEdit }: HistoryPageProps) {
  const { locale, t } = useI18n()
  const [events, setEvents] = useState<BabyEvent[]>([])
  const [total, setTotal] = useState(0)
  const [period, setPeriod] = useState("7")
  const [type, setType] = useState("all")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

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

  const groups = groupEventsByDay(events)
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
