import { render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { api } from "@/lib/api"
import type { BabyEvent } from "@/lib/types"
import { HistoryPage } from "@/pages/HistoryPage"

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

describe("HistoryPage", () => {
  afterEach(() => vi.restoreAllMocks())

  test("affiche les statistiques mensuelles indépendamment des événements filtrés", async () => {
    const monthlyEvents = [
      event({ id: 1, type: "temperature", value_real: 36.8 }),
      event({ id: 2, type: "temperature", value_real: 37.4 }),
      event({ id: 3, type: "breast_left", started_at: "2026-08-01T08:00:00.000Z", duration_seconds: 600 }),
      event({ id: 4, type: "breast_right", started_at: "2026-08-01T10:00:00.000Z", duration_seconds: 1200 }),
      event({ id: 5, type: "diaper", started_at: "2026-08-01T08:00:00.000Z", metadata: { diaper_type: "stool" } }),
      event({ id: 6, type: "diaper", started_at: "2026-08-02T08:00:00.000Z", metadata: { diaper_type: "mixed" } })
    ]
    vi.spyOn(api, "events").mockImplementation(async (params = new URLSearchParams()) => params.get("limit") === "250"
      ? { events: monthlyEvents, total: monthlyEvents.length, limit: 250, offset: 0 }
      : { events: [], total: 0, limit: 100, offset: 0 })

    render(<HistoryPage refreshKey={0} onEdit={vi.fn()} />)

    const temperature = await screen.findByTestId("temperature-statistics")
    expect(within(temperature).getByText("37,1 °C")).toBeInTheDocument()
    expect(within(temperature).getByText("36,8 °C")).toBeInTheDocument()
    expect(within(temperature).getByText("37,4 °C")).toBeInTheDocument()

    const feeding = screen.getByTestId("feeding-statistics")
    expect(within(feeding).getByText("15 min 00 s")).toBeInTheDocument()
    expect(within(feeding).getByText("2 h 00 min")).toBeInTheDocument()
    expect(within(feeding).getByText("Temps moyen entre deux tétées")).toBeInTheDocument()
    expect(within(feeding).getAllByText("50 %", { exact: false })).toHaveLength(2)

    const stool = screen.getByTestId("stool-statistics")
    expect(within(stool).getByText("24 h 00 min")).toBeInTheDocument()
    await waitFor(() => expect(api.events).toHaveBeenCalledTimes(2))
  })

  test("affiche l’intervalle et la quantité moyenne en mode biberon", async () => {
    const monthlyEvents = [
      event({ id: 1, type: "bottle", started_at: "2026-08-01T08:00:00.000Z", value_real: 90 }),
      event({ id: 2, type: "bottle", started_at: "2026-08-01T11:00:00.000Z", value_real: 150 })
    ]
    vi.spyOn(api, "events").mockImplementation(async (params = new URLSearchParams()) => params.get("limit") === "250"
      ? { events: monthlyEvents, total: monthlyEvents.length, limit: 250, offset: 0 }
      : { events: [], total: 0, limit: 100, offset: 0 })

    render(<HistoryPage refreshKey={0} feedingType="bottle" onEdit={vi.fn()} />)

    const feeding = await screen.findByTestId("feeding-statistics")
    expect(within(feeding).getByText("3 h 00 min")).toBeInTheDocument()
    expect(within(feeding).getByText("120 ml")).toBeInTheDocument()
    expect(within(feeding).getByText("Temps moyen entre deux biberons")).toBeInTheDocument()
  })
})
