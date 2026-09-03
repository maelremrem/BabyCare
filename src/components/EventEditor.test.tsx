import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import { EventEditor } from "@/components/EventEditor"
import { I18nProvider } from "@/lib/i18n"
import type { BabyEvent } from "@/lib/types"

const updateEvent = vi.hoisted(() => vi.fn())

vi.mock("@/lib/api", () => ({
  api: {
    updateEvent,
    deleteEvent: vi.fn()
  }
}))

describe("EventEditor", () => {
  test("n’attribue pas automatiquement le focus au champ date", () => {
    const event: BabyEvent = {
      id: 11,
      type: "temperature",
      status: "completed",
      started_at: "2026-08-30T10:00:00.000Z",
      ended_at: "2026-08-30T10:00:00.000Z",
      duration_seconds: null,
      value_real: 37,
      value_text: null,
      notes: null,
      metadata: null,
      created_at: "2026-08-30T10:00:00.000Z",
      updated_at: "2026-08-30T10:00:00.000Z"
    }

    render(
      <I18nProvider preference="fr">
        <EventEditor event={event} onOpenChange={vi.fn()} onChanged={vi.fn(async () => undefined)} />
      </I18nProvider>
    )

    expect(document.activeElement).not.toBe(screen.getByLabelText("Date et heure"))
  })

  test("permet de corriger la durée d’un événement chronométré", async () => {
    const user = userEvent.setup()
    const event: BabyEvent = {
      id: 12,
      type: "breast_left",
      status: "completed",
      started_at: "2026-08-30T10:00:00.000Z",
      ended_at: "2026-08-30T10:18:00.000Z",
      duration_seconds: 1080,
      value_real: null,
      value_text: null,
      notes: "",
      metadata: null,
      created_at: "2026-08-30T10:00:00.000Z",
      updated_at: "2026-08-30T10:18:00.000Z"
    }
    updateEvent.mockResolvedValue(event)

    render(
      <I18nProvider preference="fr">
        <EventEditor event={event} onOpenChange={vi.fn()} onChanged={vi.fn(async () => undefined)} />
      </I18nProvider>
    )

    expect(screen.getByLabelText("Heures")).toHaveValue(0)
    const minutes = screen.getByLabelText("Minutes")
    expect(minutes).toHaveValue(18)
    expect(screen.getByLabelText("Secondes")).toHaveValue(0)
    await user.clear(minutes)
    await user.type(minutes, "25")
    await user.click(screen.getByRole("button", { name: "Enregistrer" }))

    await waitFor(() => expect(updateEvent).toHaveBeenCalledWith(12, expect.objectContaining({ duration_seconds: 1500 })))
  })

  test("n’affiche pas de durée pour un soin instantané historique", () => {
    const careEvent: BabyEvent = {
      id: 13,
      type: "daily_care",
      status: "completed",
      started_at: "2026-08-30T10:00:00.000Z",
      ended_at: "2026-08-30T10:00:00.000Z",
      duration_seconds: 0,
      value_real: null,
      value_text: "4 / 4",
      notes: null,
      metadata: null,
      created_at: "2026-08-30T10:00:00.000Z",
      updated_at: "2026-08-30T10:00:00.000Z"
    }

    render(
      <I18nProvider preference="fr">
        <EventEditor event={careEvent} onOpenChange={vi.fn()} onChanged={vi.fn(async () => undefined)} />
      </I18nProvider>
    )

    expect(screen.queryByText("Durée", { exact: true })).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Minutes")).not.toBeInTheDocument()
  })
})
