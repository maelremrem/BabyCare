import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { MedicalChart } from "@/components/MedicalChart"
import type { AppSettings } from "@/lib/types"

const settings: AppSettings = {
  accent_color: "orange",
  baby_name: "Lou",
  birth_date: "2026-01-01",
  baby_sex: "girl"
}

describe("MedicalChart", () => {
  test("projette une zone OMS dans la fenêtre de trois mois reçue", () => {
    render(<MedicalChart title="Courbe de poids" indicator="weight" events={[]} unit="kg" decimals={3} settings={settings} windowStart={1} windowEnd={4} />)

    expect(screen.getByTestId("who-reference-zone")).toBeInTheDocument()
    expect(screen.getByText("Zone de référence OMS (−2 à +2 z)")).toBeInTheDocument()
    expect(screen.getByText("1 mois")).toBeInTheDocument()
    expect(screen.getByText("4 mois")).toBeInTheDocument()
    expect(screen.queryByRole("slider")).not.toBeInTheDocument()
  })

  test("demande une première mesure si le profil OMS est incomplet", () => {
    render(<MedicalChart
      title="Courbe de taille"
      indicator="height"
      events={[]}
      unit="cm"
      decimals={1}
      settings={{ ...settings, baby_sex: "" }}
      windowStart={0}
      windowEnd={3}
    />)

    expect(screen.getByText("Le graphique apparaîtra après la première mesure.")).toBeInTheDocument()
    expect(screen.queryByRole("slider")).not.toBeInTheDocument()
  })
})
