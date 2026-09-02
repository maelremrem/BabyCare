import { render, screen, within } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"
import { UpdateProgressDialog } from "@/components/UpdateProgressDialog"
import type { UpdateStatus } from "@/lib/types"

function updateStatus(overrides: Partial<UpdateStatus>): UpdateStatus {
  return {
    state: "downloading",
    progress: 0,
    command: "",
    message: "",
    targetVersion: "0.2.0",
    updatedAt: "2026-09-01T12:00:00.000Z",
    canRollback: false,
    rollbackVersion: null,
    active: true,
    ...overrides
  }
}

describe("UpdateProgressDialog", () => {
  test("affiche les deux moitiés de progression et l’étape active", () => {
    const { rerender } = render(
      <UpdateProgressDialog
        open
        status={updateStatus({ progress: 49, command: "Téléchargement en cours" })}
        onOpenChange={vi.fn()}
      />
    )

    expect(screen.getByText("0–50 %")).toBeInTheDocument()
    expect(screen.getByText("50–100 %")).toBeInTheDocument()
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "49")
    expect(screen.getByText("Télécharger la mise à jour").closest("li")).toHaveAttribute("aria-current", "step")

    rerender(
      <UpdateProgressDialog
        open
        status={updateStatus({ state: "installing", progress: 82, command: "Activation de BabyCare" })}
        onOpenChange={vi.fn()}
      />
    )

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "82")
    expect(screen.getByText("Activer la nouvelle version").closest("li")).toHaveAttribute("aria-current", "step")
  })

  test("valide visuellement le téléchargement au passage à l’installation", () => {
    render(
      <UpdateProgressDialog
        open
        status={updateStatus({ progress: 50, command: "Image téléchargée" })}
        onOpenChange={vi.fn()}
      />
    )

    const downloadCard = screen.getByText("Téléchargement").closest("div")
    const installCard = screen.getByText("Installation").closest("div")

    expect(downloadCard).toHaveClass("bg-primary/10")
    expect(within(downloadCard as HTMLElement).getByText("0–50 %")).toBeInTheDocument()
    expect(downloadCard?.querySelector("svg")).toBeInTheDocument()
    expect(installCard).toHaveClass("bg-primary/5")
  })
})
