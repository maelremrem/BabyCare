import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { MedicalChart } from "@/components/MedicalChart"
import type { AppSettings } from "@/lib/types"

const settings: AppSettings = {
  accent_color: "orange",
  baby_name: "Lou",
  birth_date: "2026-01-01",
  baby_sex: "girl"
}

describe("MedicalChart", () => {
  afterEach(() => vi.useRealTimers())

  test("projette une zone OMS dans une fenêtre mobile de trois mois", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-03-01T12:00:00.000Z"))
    render(<MedicalChart title="Courbe de poids" indicator="weight" events={[]} unit="kg" decimals={3} settings={settings} />)

    expect(screen.getByTestId("who-reference-zone")).toBeInTheDocument()
    expect(screen.getByText("Zone de référence OMS (−2 à +2 z)")).toBeInTheDocument()
    expect(screen.getByText("1 mois → 4 mois")).toBeInTheDocument()

    const slider = screen.getByRole("slider", { name: "Déplacer la fenêtre de la courbe de poids" })
    fireEvent.change(slider, { target: { value: "57" } })
    expect(screen.getByText("57 mois → 60 mois")).toBeInTheDocument()
  })

  test("demande une première mesure si le profil OMS est incomplet", () => {
    render(<MedicalChart
      title="Courbe de taille"
      indicator="height"
      events={[]}
      unit="cm"
      decimals={1}
      settings={{ ...settings, baby_sex: "" }}
    />)

    expect(screen.getByText("Le graphique apparaîtra après la première mesure.")).toBeInTheDocument()
    expect(screen.queryByRole("slider")).not.toBeInTheDocument()
  })
})
