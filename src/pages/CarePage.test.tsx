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
    expect(screen.getAllByRole("checkbox").length).toBeGreaterThanOrEqual(4)
    expect(screen.getByRole("button", { name: /Enregistrer les soins sélectionnés/ })).toBeInTheDocument()
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

test("enregistre uniquement les soins cochés et conserve la sélection après erreur", async () => {
  const { default: userEvent } = await import("@testing-library/user-event")
  const { api } = await import("@/lib/api")
  const user = userEvent.setup()
  const save = vi.spyOn(api, "validateDailyCare").mockRejectedValueOnce(new Error("Réseau indisponible")).mockResolvedValueOnce({ id: 1 } as never)
  const onChanged = vi.fn(async () => undefined)
  render(<CarePage care={care} onChanged={onChanged} />)
  const saveButton = screen.getByRole("button", { name: "Enregistrer les soins sélectionnés" })
  expect(saveButton).toBeDisabled()
  // The routine configuration is collapsed; the checklist is outside it.
  const boxes = screen.getAllByRole("checkbox").filter(box => !box.closest("details"))
  await user.click(boxes[0])
  await user.click(saveButton)
  expect(await screen.findByRole("alert")).toHaveTextContent("Réseau indisponible")
  expect(boxes[0]).toBeChecked()
  await user.click(saveButton)
  expect(save).toHaveBeenLastCalledWith(["eyes"])
  expect(onChanged).toHaveBeenCalledOnce()
  save.mockRestore()
})
