import { act, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { WidgetApp } from "@/WidgetApp"

const settingsPayload = {
  active_baby_id: 1,
  babies: [{ id: 1, name: "Lou", birth_date: "2026-08-01", baby_sex: "girl", feeding_type: "breast", accent_color: "orange" }],
  accent_color: "orange",
  baby_name: "Lou",
  birth_date: "2026-08-01",
  baby_sex: "girl",
  feeding_type: "breast",
  language_preference: "fr"
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("WidgetApp", () => {
  test("affiche une vue compacte dédiée au widget avec les informations clés", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-01T10:30:00.000Z"))

    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.startsWith("/api/settings")) {
        return json(settingsPayload)
      }

      if (url.startsWith("/api/events/running")) {
        return json([{
          id: 9,
          type: "nap",
          status: "running",
          started_at: "2026-09-01T10:00:00.000Z",
          ended_at: null,
          duration_seconds: null,
          value_real: null,
          value_text: null,
          notes: null,
          metadata: null,
          created_at: "2026-09-01T10:00:00.000Z",
          updated_at: "2026-09-01T10:00:00.000Z"
        }])
      }

      if (url.startsWith("/api/events?")) {
        return json({
          events: [{
            id: 3,
            type: "diaper",
            status: "completed",
            started_at: "2026-09-01T09:45:00.000Z",
            ended_at: "2026-09-01T09:45:00.000Z",
            duration_seconds: null,
            value_real: null,
            value_text: null,
            notes: null,
            metadata: { diaper_type: "mixed" },
            created_at: "2026-09-01T09:45:00.000Z",
            updated_at: "2026-09-01T09:45:00.000Z"
          }, {
            id: 4,
            type: "temperature",
            status: "completed",
            started_at: "2026-09-01T08:00:00.000Z",
            ended_at: "2026-09-01T08:00:00.000Z",
            duration_seconds: null,
            value_real: 37.2,
            value_text: null,
            notes: null,
            metadata: null,
            created_at: "2026-09-01T08:00:00.000Z",
            updated_at: "2026-09-01T08:00:00.000Z"
          }],
          total: 2,
          limit: 12,
          offset: 0
        })
      }

      if (url.startsWith("/api/routines/daily")) {
        return json([
          { id: 1, date: "2026-09-01", care_type: "eyes", completed: 1, completed_at: "2026-09-01T08:00:00.000Z", validated_at: null },
          { id: 2, date: "2026-09-01", care_type: "nose", completed: 0, completed_at: null, validated_at: null },
          { id: 3, date: "2026-09-01", care_type: "cord", completed: 1, completed_at: "2026-09-01T08:15:00.000Z", validated_at: null },
          { id: 4, date: "2026-09-01", care_type: "face", completed: 0, completed_at: null, validated_at: null }
        ])
      }

      if (url.startsWith("/api/alerts/stool")) {
        return json({
          overdue: false,
          last_stool_at: "2026-09-01T09:45:00.000Z",
          hours_since: 1,
          threshold_hours: 48
        })
      }

      throw new Error(`Unexpected request: ${url}`)
    }))

    render(<WidgetApp />)
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(screen.getByRole("heading", { name: "Lou" })).toBeInTheDocument()
    expect(screen.getByText("Chrono actif")).toBeInTheDocument()
    expect(screen.getByText("Sieste")).toBeInTheDocument()
    expect(screen.getByText("30:00")).toBeInTheDocument()
    expect(screen.getByText("37.2 °C")).toBeInTheDocument()
    expect(screen.getByText("Urine + Selles")).toBeInTheDocument()
    expect(screen.getByText("2/4 faits")).toBeInTheDocument()
  })
})

function json(value: unknown) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json" }
  })
}
