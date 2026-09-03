import type { BabyEvent } from "@/lib/types"

export interface HistoryStatistics {
  temperature: {
    average: number | null
    minimum: number | null
    maximum: number | null
    count: number
  }
  feeding: {
    averageDurationSeconds: number | null
    averageLeftDurationSeconds: number | null
    averageRightDurationSeconds: number | null
    averageIntervalSeconds: number | null
    intervalCount: number
    leftCount: number
    rightCount: number
    total: number
  }
  bottle: {
    averageIntervalSeconds: number | null
    averageQuantityMl: number | null
    intervalCount: number
    total: number
  }
  averageStoolIntervalSeconds: number | null
  stoolIntervalCount: number
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
}

export function calculateHistoryStatistics(events: BabyEvent[]): HistoryStatistics {
  const completed = events.filter((event) => event.status === "completed")
  const temperatures = completed
    .filter((event) => event.type === "temperature" && Number.isFinite(event.value_real))
    .map((event) => event.value_real as number)
  const feedings = completed
    .filter((event) => event.type === "breast_left" || event.type === "breast_right")
    .sort((left, right) => Date.parse(left.started_at) - Date.parse(right.started_at))
  const feedingDurations = feedings
    .map((event) => event.duration_seconds)
    .filter((duration): duration is number => duration != null && Number.isFinite(duration) && duration >= 0)
  const averageBreastDuration = (type: "breast_left" | "breast_right") => average(feedings
    .filter((event) => event.type === type)
    .map((event) => event.duration_seconds)
    .filter((duration): duration is number => duration != null && Number.isFinite(duration) && duration >= 0))
  const feedingIntervals = feedings.slice(1)
    .map((event, index) => (Date.parse(event.started_at) - Date.parse(feedings[index].started_at)) / 1000)
    .filter((interval) => Number.isFinite(interval) && interval >= 0)
  const bottles = completed
    .filter((event) => event.type === "bottle" && Number.isFinite(event.value_real))
    .sort((left, right) => Date.parse(left.started_at) - Date.parse(right.started_at))
  const bottleIntervals = bottles.slice(1)
    .map((event, index) => (Date.parse(event.started_at) - Date.parse(bottles[index].started_at)) / 1000)
    .filter((interval) => Number.isFinite(interval) && interval >= 0)
  const stools = completed
    .filter((event) => event.type === "diaper" && ["stool", "mixed"].includes(String(event.metadata?.diaper_type)))
    .map((event) => Date.parse(event.started_at))
    .filter(Number.isFinite)
    .sort((left, right) => left - right)
  const stoolIntervals = stools.slice(1).map((timestamp, index) => (timestamp - stools[index]) / 1000)

  return {
    temperature: {
      average: average(temperatures),
      minimum: temperatures.length ? Math.min(...temperatures) : null,
      maximum: temperatures.length ? Math.max(...temperatures) : null,
      count: temperatures.length
    },
    feeding: {
      averageDurationSeconds: average(feedingDurations),
      averageLeftDurationSeconds: averageBreastDuration("breast_left"),
      averageRightDurationSeconds: averageBreastDuration("breast_right"),
      averageIntervalSeconds: average(feedingIntervals),
      intervalCount: feedingIntervals.length,
      leftCount: feedings.filter((event) => event.type === "breast_left").length,
      rightCount: feedings.filter((event) => event.type === "breast_right").length,
      total: feedings.length
    },
    bottle: {
      averageIntervalSeconds: average(bottleIntervals),
      averageQuantityMl: average(bottles.map((event) => event.value_real as number)),
      intervalCount: bottleIntervals.length,
      total: bottles.length
    },
    averageStoolIntervalSeconds: average(stoolIntervals),
    stoolIntervalCount: stoolIntervals.length
  }
}
