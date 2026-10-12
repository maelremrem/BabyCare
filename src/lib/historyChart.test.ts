import { describe, expect, test } from "vitest"
import { buildHistoryChart, historyChartUnit } from "@/lib/historyChart"
import type { BabyEvent, EventType } from "@/lib/types"

function event(overrides: Partial<BabyEvent> = {}): BabyEvent {
  return {
    id: 1,
    type: "observation",
    status: "completed",
    started_at: new Date(2026, 7, 1, 8, 15).toISOString(),
    ended_at: null,
    duration_seconds: null,
    value_real: null,
    value_text: null,
    notes: null,
    metadata: null,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    ...overrides
  }
}

function localTime(year: number, month: number, day: number, hour = 0, minute = 0) {
  return new Date(year, month - 1, day, hour, minute).toISOString()
}

describe("buildHistoryChart", () => {
  test("fills leap-day gaps with additive zeroes but omits absent measurements", () => {
    const events = [
      event({ started_at: localTime(2024, 2, 28, 12), type: "bottle", value_real: 80 }),
      event({ started_at: localTime(2024, 2, 28, 12), type: "temperature", value_real: 37 }),
      event({ started_at: localTime(2024, 3, 1, 12), type: "bottle", value_real: 100 }),
      event({ started_at: localTime(2024, 3, 1, 12), type: "temperature", value_real: 38 })
    ]
    const result = buildHistoryChart(events, ["bottle", "temperature", "nap", "diaper", "weight"])
    expect(result.granularity).toBe("day")
    expect(result.buckets).toHaveLength(3)
    expect(result.buckets[1]).toEqual({
      start: new Date(2024, 1, 29).getTime(), end: new Date(2024, 2, 1).getTime(),
      values: { bottle: 0, nap: 0, diaper: 0 }
    })
    expect(result.buckets[0].values.temperature).toBe(37)
    expect(result.buckets[2].values.temperature).toBe(38)
  })

  test("defaults omitted endpoints to historical event days independently", () => {
    const events = [
      event({ started_at: localTime(2020, 1, 3) }),
      event({ started_at: localTime(2020, 1, 1) }),
      event({ started_at: localTime(2030, 1, 1), type: "weight", value_real: null })
    ]
    const result = buildHistoryChart(events, [])
    expect(result.buckets[0].start).toBe(new Date(2020, 0, 1).getTime())
    expect(result.buckets.at(-1)?.end).toBe(new Date(2020, 0, 4).getTime())
    expect(buildHistoryChart(events, [], "2020-01-02").buckets).toHaveLength(48)
    expect(buildHistoryChart(events, [], undefined, "2020-01-02").buckets).toHaveLength(48)
  })

  test("uses real calendar months with partial first and last buckets", () => {
    const result = buildHistoryChart([
      event({ started_at: localTime(2024, 1, 31, 12) }),
      event({ started_at: localTime(2025, 3, 15, 12) })
    ], [])
    expect(result.granularity).toBe("month")
    expect(result.buckets).toHaveLength(15)
    expect(result.buckets[0].end).toBe(new Date(2024, 1, 1).getTime())
    expect(result.buckets[1].start).toBe(new Date(2024, 1, 1).getTime())
    expect(result.buckets[1].end).toBe(new Date(2024, 2, 1).getTime())
    expect(result.buckets.at(-1)?.end).toBe(new Date(2025, 2, 16).getTime())
  })

  // Run with TZ=Europe/Paris to exercise both 23h and 25h days; other zones
  // still verify their own local boundaries without changing process-global TZ.
  test.each([[2026, 3, 29], [2026, 10, 25]])("covers each real hour on local transition day %s-%s-%s", (year, month, day) => {
    const start = new Date(year, month - 1, day)
    const end = new Date(year, month - 1, day + 1)
    const result = buildHistoryChart([
      event({ started_at: new Date(start.getTime() + 2.5 * 3600000).toISOString() }),
      event({ started_at: new Date(start.getTime() + 3.5 * 3600000).toISOString() })
    ], [])
    const hours = (end.getTime() - start.getTime()) / 3600000
    expect(result.granularity).toBe("hour")
    expect(result.buckets).toHaveLength(hours)
    expect(result.buckets[2].values.observation).toBe(1)
    expect(result.buckets[3].values.observation).toBe(1)
    expect(result.buckets[0].start).toBe(start.getTime())
    expect(result.buckets.at(-1)?.end).toBe(end.getTime())
  })

  test("daily buckets stay at local midnight across spring DST", () => {
    const result = buildHistoryChart([
      event({ started_at: localTime(2026, 3, 28, 12) }),
      event({ started_at: localTime(2026, 3, 30, 12) })
    ], [])
    expect(result.granularity).toBe("day")
    expect(result.buckets.map(bucket => bucket.start)).toEqual([
      new Date(2026, 2, 28).getTime(), new Date(2026, 2, 29).getTime(), new Date(2026, 2, 30).getTime()
    ])
    expect(result.buckets[1].end).toBe(new Date(2026, 2, 30).getTime())
  })

  test("does not plot negative body measurements or turn them into counts", () => {
    const events = [
      event({ type: "temperature", value_real: -1 }),
      event({ type: "weight", value_real: -1 }),
      event({ type: "height", value_real: -1 }),
      event({ type: "observation" })
    ]
    const result = buildHistoryChart(events, ["temperature", "weight", "height", "observation"])
    expect(result.buckets[8].values).toEqual({ observation: 1 })
    expect(buildHistoryChart(events.slice(0, 3), []).buckets).toEqual([])
  })

  test("handles large event arrays without spreading timestamps into function arguments", () => {
    const events = Array.from({ length: 150000 }, () => event())
    const result = buildHistoryChart(events, [])
    expect(result.buckets[8].values.observation).toBe(150000)
    expect(result.buckets).toHaveLength(24)
  })

  test("bounds decades of data to fewer than 100 calendar-month groups without dropping events", () => {
    const events = [
      event({ started_at: localTime(1980, 1, 31), type: "bottle", value_real: 20 }),
      event({ started_at: localTime(2030, 12, 31, 23, 59), type: "bottle", value_real: 30 })
    ]
    const result = buildHistoryChart(events, [], "1980-01-31", "2030-12-31")
    expect(result.granularity).toBe("month")
    expect(result.buckets.length).toBeLessThan(100)
    expect(result.buckets[0].start).toBe(new Date(1980, 0, 31).getTime())
    expect(result.buckets.at(-1)?.end).toBe(new Date(2031, 0, 1).getTime())
    expect(result.buckets.reduce((sum, bucket) => sum + (bucket.values.bottle ?? 0), 0)).toBe(50)
    expect(result.buckets[0].values.bottle).toBe(20)
    expect(result.buckets.at(-1)?.values.bottle).toBe(30)
    expect(result.buckets.slice(1).every(bucket => new Date(bucket.start).getDate() === 1)).toBe(true)
  })

  test.each([
    [1, "hour"], [2, "hour"], [3, "day"], [62, "day"],
    [63, "week"], [366, "week"], [367, "month"]
  ] as const)("uses %s inclusive calendar days for %s granularity", (days, granularity) => {
    const start = new Date(2024, 0, 1)
    const last = new Date(2024, 0, days)
    const events = [event({ started_at: start.toISOString() }), event({ started_at: last.toISOString() })]
    const result = buildHistoryChart(events, [])
    expect(result.granularity).toBe(granularity)
    expect(result.buckets.length).toBeLessThan(100)
    expect(result.buckets[0].start).toBe(start.getTime())
    last.setDate(last.getDate() + 1)
    expect(result.buckets.at(-1)?.end).toBe(last.getTime())
    expect(result.buckets.reduce((sum, bucket) => sum + (bucket.values.observation ?? 0), 0)).toBe(2)
    if (granularity === "day") expect(result.buckets).toHaveLength(days)
    if (granularity === "week") expect(result.buckets).toHaveLength(Math.ceil(days / 7))
    for (let index = 1; index < result.buckets.length; index++) {
      expect(result.buckets[index].start).toBe(result.buckets[index - 1].end)
    }
  })

  test("returns no buckets for empty data or invalid/reversed date bounds", () => {
    expect(buildHistoryChart([], ["height", "height", "bottle"], "2026-08-01", "2026-08-03")).toEqual({
      granularity: "hour", buckets: [], types: ["height", "bottle"]
    })
    expect(buildHistoryChart([], []).buckets).toEqual([])
    expect(buildHistoryChart([event()], [], "2026-08-02", "2026-08-01").buckets).toEqual([])
    expect(buildHistoryChart([event()], [], "2026-08-04", "2026-08-05").buckets).toEqual([])
    for (const invalid of ["2026-02-30", "2026-8-01", "not-a-date", ""]) {
      expect(buildHistoryChart([event()], [], invalid, "2026-08-01").buckets).toEqual([])
      expect(buildHistoryChart([event()], [], "2026-08-01", invalid).buckets).toEqual([])
    }
  })

  test("clips to inclusive local dates and preserves deduplicated selection order", () => {
    const events = [
      event({ type: "bottle", value_real: 10, started_at: localTime(2026, 7, 31, 23, 59) }),
      event({ type: "bottle", value_real: 20, started_at: localTime(2026, 8, 1) }),
      event({ type: "bottle", value_real: 30, started_at: localTime(2026, 8, 2, 23, 59) }),
      event({ type: "bottle", value_real: 40, started_at: localTime(2026, 8, 3) }),
      event({ type: "diaper" })
    ]
    const selected: EventType[] = ["height", "bottle", "nap", "bottle"]
    const result = buildHistoryChart(events, selected, "2026-08-01", "2026-08-02")
    expect(result.types).toEqual(["height", "bottle", "nap"])
    expect(selected).toEqual(["height", "bottle", "nap", "bottle"])
    expect(result.buckets).toHaveLength(48)
    expect(result.buckets[0].start).toBe(new Date(2026, 7, 1).getTime())
    expect(result.buckets[47].end).toBe(new Date(2026, 7, 3).getTime())
    expect(result.buckets.reduce((sum, bucket) => sum + (bucket.values.bottle ?? 0), 0)).toBe(50)
    expect(result.buckets.every(bucket => bucket.values.nap === 0 && !("height" in bucket.values) && !("diaper" in bucket.values))).toBe(true)
    expect(buildHistoryChart(events, [], "2026-08-02", "2026-08-02").types).toEqual(["bottle"])
  })

  test("excludes running, invalid timestamp and unusable numeric events", () => {
    const invalid = [null, NaN, Infinity, -Infinity]
    const events = [
      ...invalid.flatMap(value => [
        event({ type: "bottle", value_real: value }),
        event({ type: "nap", duration_seconds: value }),
        event({ type: "temperature", value_real: value })
      ]),
      event({ type: "bottle", value_real: -1 }), event({ type: "nap", duration_seconds: -1 }),
      event({ type: "weight", value_real: null }), event({ type: "height", value_real: NaN }),
      event({ type: "bottle", value_real: 50, status: "running" }),
      event({ type: "diaper", started_at: "not-a-date" }),
      event({ type: "diaper", status: "running", started_at: localTime(2030, 1, 1) }),
      event({ type: "bottle", value_real: 0 }), event({ type: "nap", duration_seconds: 0 }),
      event({ type: "temperature", value_real: 37 }), event({ type: "observation" })
    ]
    const result = buildHistoryChart(events, [])
    expect(result.types).toEqual(["bottle", "nap", "temperature", "observation"])
    expect(result.buckets).toHaveLength(24)
    expect(result.buckets[8].values).toEqual({ bottle: 0, nap: 0, temperature: 37, observation: 1 })
    expect(buildHistoryChart(events.slice(0, 18), []).buckets).toEqual([])
  })

  test("aggregates native units independently in hourly buckets", () => {
    const events = [
      event({ type: "bottle", value_real: 90 }), event({ type: "bottle", value_real: 120 }),
      event({ type: "pump_left", value_real: 40 }), event({ type: "pump_right", value_real: 50 }),
      event({ type: "breast_left", duration_seconds: 90 }), event({ type: "breast_left", duration_seconds: 30 }),
      event({ type: "breast_right", duration_seconds: 180 }), event({ type: "nap", duration_seconds: 3600 }),
      event({ type: "temperature", value_real: 36 }), event({ type: "temperature", value_real: 38 }),
      event({ type: "weight", value_real: 4 }), event({ type: "weight", value_real: 5 }),
      event({ type: "height", value_real: 50 }), event({ type: "height", value_real: 52 }),
      event({ type: "diaper" }), event({ type: "diaper" }), event({ type: "face_care" })
    ]
    const snapshot = structuredClone(events)
    const result = buildHistoryChart(events, [])
    expect(result.granularity).toBe("hour")
    expect(result.buckets).toHaveLength(24)
    expect(result.buckets[8].values).toEqual({
      bottle: 210, pump_left: 40, pump_right: 50, breast_left: 2, breast_right: 3,
      nap: 60, temperature: 37, weight: 4.5, height: 51, diaper: 2, face_care: 1
    })
    expect(result.buckets[0].values).toEqual({
      bottle: 0, pump_left: 0, pump_right: 0, breast_left: 0, breast_right: 0, nap: 0, diaper: 0, face_care: 0
    })
    expect(result.types).toEqual([...new Set(events.map(item => item.type))])
    expect(events).toEqual(snapshot)
  })
})

describe("historyChartUnit", () => {
  test("maps each metric to its native unit", () => {
    const units: Partial<Record<EventType, string>> = {
      bottle: "ml", pump_left: "ml", pump_right: "ml",
      breast_left: "min", breast_right: "min", nap: "min",
      temperature: "°C", weight: "kg", height: "cm",
      diaper: "count", bath: "count", observation: "count", face_care: "count"
    }
    for (const [type, unit] of Object.entries(units)) {
      expect(historyChartUnit(type as EventType)).toBe(unit)
    }
  })
})
