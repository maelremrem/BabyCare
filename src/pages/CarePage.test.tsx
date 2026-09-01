import { render, screen } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"
import type { DailyCare } from "@/lib/types"
import { CarePage } from "@/pages/CarePage"

const care: DailyCare[] = ["eyes", "nose", "cord", "face"].map((careType, index) => ({
  id: index + 1,
  date: "2026-08-30",
  care_type: careType as DailyCare["care_type"],
  completed: 0,
  completed_at: null,
  validated_at: null
}))

describe("CarePage", () => {
  test("présente les soins dans l’ordre recommandé avec leurs conseils", () => {
    render(<CarePage care={care} onChanged={vi.fn(async () => undefined)} />)

    const headings = ["2. Yeux", "3. Visage", "4. Nez", "5. Cordon ombilical"]
      .map((title) => screen.getByText(title))

    headings.slice(1).forEach((heading, index) => {
      expect(headings[index].compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })
    expect(screen.getByText("Yeux → Visage → Nez → Cordon")).toBeInTheDocument()
    expect(screen.getByText(/Ne pas chercher à aller profondément dans la narine/)).toBeInTheDocument()
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Soins effectués/ })).toBeInTheDocument()
  })

  test("affiche toutes les étapes essentielles du bain", () => {
    render(<CarePage care={care} onChanged={vi.fn(async () => undefined)} />)

    expect(screen.getByText("1. Préparer le bain")).toBeInTheDocument()
    expect(screen.getByText("8. Cordon après le bain")).toBeInTheDocument()
    expect(screen.getByText(/Ne jamais laisser bébé seul dans le bain/)).toBeInTheDocument()
    expect(screen.getByText(/Préparation → Fesses si souillées → Mise à l’eau/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Bain effectué/ })).toBeInTheDocument()
  })
})
