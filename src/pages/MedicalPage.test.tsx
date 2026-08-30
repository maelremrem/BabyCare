import { fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { api } from "@/lib/api"
import type { AppSettings } from "@/lib/types"
import { MedicalPage } from "@/pages/MedicalPage"

const settings: AppSettings = {
  active_baby_id: 1,
  babies: [{ id: 1, name: "Lou", birth_date: "2026-01-01", baby_sex: "girl", accent_color: "orange" }],
  accent_color: "orange",
  baby_name: "Lou",
  birth_date: "2026-01-01",
  baby_sex: "girl",
  language_preference: "system"
}

describe("MedicalPage", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  test("synchronise la période glissante des courbes de poids et de taille", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-03-01T12:00:00.000Z"))
    vi.spyOn(api, "events").mockResolvedValue({ events: [], total: 0, limit: 250, offset: 0 })

    render(
      <MedicalPage
        settings={settings}
        refreshKey={0}
        onChanged={vi.fn(async () => undefined)}
        onEdit={vi.fn()}
      />
    )

    const startSlider = screen.getByRole("slider", { name: "Début de la période des courbes" })
    const endSlider = screen.getByRole("slider", { name: "Fin de la période des courbes" })
    expect(screen.getAllByRole("slider")).toHaveLength(2)

    const weightChart = screen.getByRole("img", { name: "Évolution : courbe de poids" })
    const heightChart = screen.getByRole("img", { name: "Évolution : courbe de taille" })
    expect(within(weightChart).getByText("1 mois")).toBeInTheDocument()
    expect(within(heightChart).getByText("1 mois")).toBeInTheDocument()

    fireEvent.change(startSlider, { target: { value: "0" } })
    fireEvent.change(endSlider, { target: { value: "60" } })

    expect(within(weightChart).getByText("0 mois")).toBeInTheDocument()
    expect(within(weightChart).getByText("60 mois")).toBeInTheDocument()
    expect(within(heightChart).getByText("0 mois")).toBeInTheDocument()
    expect(within(heightChart).getByText("60 mois")).toBeInTheDocument()
    expect(screen.getByText("0 mois → 60 mois")).toBeInTheDocument()
  })
})
