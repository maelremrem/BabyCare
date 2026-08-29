import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import { TopBar } from "@/components/TopBar"

describe("TopBar", () => {
  test("enregistre le sexe avec le profil du bébé", async () => {
    const user = userEvent.setup()
    const onProfileChange = vi.fn(async () => undefined)
    render(
      <TopBar
        settings={{ accent_color: "orange", baby_name: "Lou", birth_date: "2026-01-01", baby_sex: "" }}
        onAccentChange={vi.fn(async () => undefined)}
        onProfileChange={onProfileChange}
        onReset={vi.fn(async () => undefined)}
      />
    )

    await user.click(screen.getByRole("button", { name: "Ouvrir les paramètres" }))
    const girlButton = screen.getByRole("button", { name: "Fille" })
    expect(girlButton.querySelector(".lucide-venus")).toBeInTheDocument()
    await user.click(girlButton)
    expect(girlButton).toHaveAttribute("aria-pressed", "true")
    await user.click(screen.getByRole("button", { name: "Enregistrer le profil" }))

    await waitFor(() => expect(onProfileChange).toHaveBeenCalledWith("Lou", "2026-01-01", "girl"))
  })

  test("demande une confirmation avant de réinitialiser la base", async () => {
    const user = userEvent.setup()
    const onReset = vi.fn(async () => undefined)
    render(
      <TopBar
        settings={{ accent_color: "orange", baby_name: "Lou", birth_date: "2026-01-01", baby_sex: "girl" }}
        onAccentChange={vi.fn(async () => undefined)}
        onProfileChange={vi.fn(async () => undefined)}
        onReset={onReset}
      />
    )

    await user.click(screen.getByRole("button", { name: "Ouvrir les paramètres" }))
    await user.click(screen.getByRole("button", { name: "Réinitialiser toute la base" }))
    expect(onReset).not.toHaveBeenCalled()
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Cette action est irréversible")

    await user.click(screen.getByRole("button", { name: "Confirmer la réinitialisation" }))
    await waitFor(() => expect(onReset).toHaveBeenCalledOnce())
  })
})
