import { describe, expect, test } from "vitest"
import { calculateHistoryStatistics } from "@/lib/historyStatistics"
import type { BabyEvent } from "@/lib/types"

function event(overrides: Partial<BabyEvent>): BabyEvent {
  return {
    id: 1,
    type: "observation",
    status: "completed",
    started_at: "2026-08-01T08:00:00.000Z",
    ended_at: null,
    duration_seconds: null,
    value_real: null,
    value_text: null,
    notes: null,
    metadata: null,
    created_at: "2026-08-01T08:00:00.000Z",
    updated_at: "2026-08-01T08:00:00.000Z",
    ...overrides
  }
}

describe("calculateHistoryStatistics", () => {
  test("calcule les températures, les tétées et les intervalles entre selles", () => {
    const result = calculateHistoryStatistics([
      event({ id: 1, type: "temperature", value_real: 36.8 }),
      event({ id: 2, type: "temperature", value_real: 37.4 }),
      event({ id: 3, type: "breast_left", duration_seconds: 600 }),
      event({ id: 4, type: "breast_right", duration_seconds: 900 }),
      event({ id: 5, type: "breast_right", duration_seconds: 1200 }),
      event({ id: 6, type: "diaper", started_at: "2026-08-01T08:00:00.000Z", metadata: { diaper_type: "stool" } }),
      event({ id: 7, type: "diaper", started_at: "2026-08-02T08:00:00.000Z", metadata: { diaper_type: "mixed" } }),
      event({ id: 8, type: "diaper", started_at: "2026-08-04T08:00:00.000Z", metadata: { diaper_type: "urine" } })
    ])

    expect(result.temperature.average).toBeCloseTo(37.1)
    expect(result.temperature).toMatchObject({ minimum: 36.8, maximum: 37.4, count: 2 })
    expect(result.feeding).toEqual({ averageDurationSeconds: 900, leftCount: 1, rightCount: 2, total: 3 })
    expect(result.bottle).toEqual({ averageIntervalSeconds: null, averageQuantityMl: null, intervalCount: 0, total: 0 })
    expect(result.averageStoolIntervalSeconds).toBe(24 * 60 * 60)
    expect(result.stoolIntervalCount).toBe(1)
  })

  test("calcule le temps moyen et la quantité moyenne des biberons", () => {
    const result = calculateHistoryStatistics([
      event({ id: 1, type: "bottle", started_at: "2026-08-01T08:00:00.000Z", value_real: 90 }),
      event({ id: 2, type: "bottle", started_at: "2026-08-01T11:00:00.000Z", value_real: 120 }),
      event({ id: 3, type: "bottle", started_at: "2026-08-01T15:00:00.000Z", value_real: 150 })
    ])

    expect(result.bottle.averageIntervalSeconds).toBe(3.5 * 60 * 60)
    expect(result.bottle.averageQuantityMl).toBe(120)
    expect(result.bottle).toMatchObject({ intervalCount: 2, total: 3 })
  })

  test("ignore les événements en cours et retourne des valeurs absentes sans données", () => {
    const result = calculateHistoryStatistics([
      event({ type: "breast_left", status: "running", duration_seconds: 300 }),
      event({ type: "diaper", metadata: { diaper_type: "stool" } })
    ])

    expect(result.temperature.average).toBeNull()
    expect(result.feeding.total).toBe(0)
    expect(result.averageStoolIntervalSeconds).toBeNull()
  })
})
