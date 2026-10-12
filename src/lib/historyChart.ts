import type { BabyEvent, EventType } from "@/lib/types"

export type HistoryChartUnit = "ml" | "min" | "°C" | "kg" | "cm" | "count"

export interface HistoryChartBucket {
  start: number
  end: number
  values: Partial<Record<EventType, number>>
}

export interface HistoryChartData {
  granularity: "hour" | "day" | "week" | "month"
  buckets: HistoryChartBucket[]
  types: EventType[]
}

export function historyChartUnit(type: EventType): HistoryChartUnit {
  switch (type) {
    case "bottle":
    case "pump_left":
    case "pump_right": return "ml"
    case "breast_left":
    case "breast_right":
    case "nap": return "min"
    case "temperature": return "°C"
    case "weight": return "kg"
    case "height": return "cm"
    default: return "count"
  }
}

function isMeasurement(type: EventType) {
  return type === "temperature" || type === "weight" || type === "height"
}

function localDay(time: number) {
  const date = new Date(time)
  date.setHours(0, 0, 0, 0)
  return date
}

function calendarDayIndex(date: Date) {
  const utc = new Date(0)
  utc.setUTCFullYear(date.getFullYear(), date.getMonth(), date.getDate())
  return utc.getTime() / 86400000
}

function parseLocalDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(0)
  date.setFullYear(year, month - 1, day)
  date.setHours(0, 0, 0, 0)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null
}

function chartSample(event: BabyEvent) {
  const time = Date.parse(event.started_at)
  if (event.status !== "completed" || !Number.isFinite(time)) return null
  const unit = historyChartUnit(event.type)
  const value = unit === "count" ? 1 : unit === "min" ? event.duration_seconds : event.value_real
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null
  return { type: event.type, time, value: unit === "min" ? value / 60 : value }
}

/**
 * Bucket boundaries are epoch milliseconds, [start, end). Dates are local and inclusive.
 * Weeks start at the range's first day; months use calendar boundaries (partial edges).
 * Ranges over 99 months use multi-month buckets, retaining granularity "month".
 * Invalid dates/ranges or no valid in-range events yield no buckets.
 */
export function buildHistoryChart(inputEvents: BabyEvent[], selectedTypes: EventType[], from?: string, to?: string): HistoryChartData {
  const selection = [...new Set(selectedTypes)]
  const empty = (): HistoryChartData => ({ granularity: "hour", buckets: [], types: selection })
  const samples = inputEvents.map(chartSample).filter(sample => sample !== null)
  if (!samples.length) return empty()
  const firstTime = samples.reduce((min, sample) => Math.min(min, sample.time), Infinity)
  const lastTime = samples.reduce((max, sample) => Math.max(max, sample.time), -Infinity)
  const start = from !== undefined ? parseLocalDate(from) : localDay(firstTime)
  const end = to !== undefined ? parseLocalDate(to) : localDay(lastTime)
  if (!start || !end || start.getTime() > end.getTime()) return empty()
  end.setDate(end.getDate() + 1)
  const inRange = samples.filter(sample => sample.time >= start.getTime() && sample.time < end.getTime())
  if (!inRange.length) return empty()
  const types = selection.length ? selection : [...new Set(inRange.map(sample => sample.type))]
  const days = calendarDayIndex(end) - calendarDayIndex(start)
  const granularity = days <= 2 ? "hour" : days <= 62 ? "day" : days <= 366 ? "week" : "month"
  const monthCount = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth() + (end.getDate() > 1 ? 1 : 0)
  // Very long ranges retain every event by grouping calendar months, never truncating.
  const monthStep = Math.max(1, Math.ceil(monthCount / 99))
  const buckets: HistoryChartBucket[] = []
  for (let time = start.getTime(); time < end.getTime();) {
    const next = new Date(time)
    if (granularity === "hour") next.setTime(time + 3600000)
    else if (granularity === "month") next.setMonth(next.getMonth() + monthStep, 1)
    else next.setDate(next.getDate() + (granularity === "week" ? 7 : 1))
    const bucketEnd = Math.min(next.getTime(), end.getTime())
    const values: HistoryChartBucket["values"] = {}
    for (const type of types) if (!isMeasurement(type)) values[type] = 0
    buckets.push({ start: time, end: bucketEnd, values })
    time = bucketEnd
  }
  for (const bucket of buckets) {
    const measurementCounts: Partial<Record<EventType, number>> = {}
    for (const sample of inRange) {
      if (!types.includes(sample.type) || sample.time < bucket.start || sample.time >= bucket.end) continue
      bucket.values[sample.type] = (bucket.values[sample.type] ?? 0) + sample.value
      if (isMeasurement(sample.type)) measurementCounts[sample.type] = (measurementCounts[sample.type] ?? 0) + 1
    }
    for (const type of types) {
      const count = measurementCounts[type]
      if (count) bucket.values[type] = bucket.values[type]! / count
    }
  }
  return { granularity, buckets, types }
}
