import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import { TopBar } from "@/components/TopBar"

describe("TopBar", () => {
  test("affiche la mise à jour et la bloque pendant un chrono actif", async () => {
    const user = userEvent.setup()
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.startsWith("/api/version")) {
        return new Response(JSON.stringify({
          currentVersion: "0.1.0",
          enabled: true,
          updateAvailable: true,
          availableVersion: "0.2.0",
          releaseUrl: null,
          supported: true,
          status: { state: "idle", progress: 0, command: "", message: "", targetVersion: null, updatedAt: null, canRollback: false, rollbackVersion: null, active: false }
        }), { status: 200, headers: { "content-type": "application/json" } })
      }
      throw new Error(`Unexpected request: ${url}`)
    }))

    render(
      <TopBar
        settings={{ active_baby_id: 1, babies: [{ id: 1, name: "Lou", birth_date: "2026-01-01", baby_sex: "girl", accent_color: "orange" }], accent_color: "orange", baby_name: "Lou", birth_date: "2026-01-01", baby_sex: "girl", language_preference: "system" }}
        onBabySelect={vi.fn(async () => undefined)}
        onBabyAdd={vi.fn(async () => undefined)}
        onBabyDelete={vi.fn(async () => undefined)}
        onLanguageChange={vi.fn(async () => undefined)}
        onProfileChange={vi.fn(async () => undefined)}
        onReset={vi.fn(async () => undefined)}
        hasRunningTimer
      />
    )

    const settingsButton = await screen.findByRole("button", { name: /BabyCare v0.2.0 est disponible/ })
    await user.click(settingsButton)
    expect(screen.getByRole("button", { name: "La mise à jour sera disponible quand le chronomètre en cours sera terminé" })).toBeDisabled()
    vi.unstubAllGlobals()
  })

  test("affiche l’absence de mise à jour sous la langue", async () => {
    const user = userEvent.setup()
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      currentVersion: "0.1.0",
      enabled: true,
      runtime: "docker",
      updateAvailable: false,
      availableVersion: "0.1.0",
      releaseUrl: null,
      supported: true,
      status: { state: "idle", progress: 0, command: "", message: "", targetVersion: null, updatedAt: null, canRollback: false, rollbackVersion: null, active: false }
    }), { status: 200, headers: { "content-type": "application/json" } })))

    render(
      <TopBar
        settings={{ active_baby_id: 1, babies: [{ id: 1, name: "Lou", birth_date: "2026-01-01", baby_sex: "girl", accent_color: "orange" }], accent_color: "orange", baby_name: "Lou", birth_date: "2026-01-01", baby_sex: "girl", language_preference: "system" }}
        onBabySelect={vi.fn(async () => undefined)}
        onBabyAdd={vi.fn(async () => undefined)}
        onBabyDelete={vi.fn(async () => undefined)}
        onLanguageChange={vi.fn(async () => undefined)}
        onProfileChange={vi.fn(async () => undefined)}
        onReset={vi.fn(async () => undefined)}
      />
    )

    await user.click(screen.getByRole("button", { name: "Ouvrir les paramètres" }))
    const noUpdate = await screen.findByRole("button", { name: "Aucune nouvelle mise à jour" })
    expect(noUpdate).toBeDisabled()
    const languageTitle = screen.getByText("Langue")
    const updateTitle = screen.getByText("Mise à jour")
    expect(languageTitle.compareDocumentPosition(updateTitle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    vi.unstubAllGlobals()
  })

  test("permet de relancer manuellement une vérification indisponible", async () => {
    const user = userEvent.setup()
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline") }))
    render(
      <TopBar
        settings={{ active_baby_id: 1, babies: [{ id: 1, name: "Lou", birth_date: "", baby_sex: "", accent_color: "orange" }], accent_color: "orange", baby_name: "Lou", birth_date: "", baby_sex: "", language_preference: "system" }}
        onBabySelect={vi.fn(async () => undefined)}
        onBabyAdd={vi.fn(async () => undefined)}
        onBabyDelete={vi.fn(async () => undefined)}
        onLanguageChange={vi.fn(async () => undefined)}
        onProfileChange={vi.fn(async () => undefined)}
        onReset={vi.fn(async () => undefined)}
      />
    )

    await user.click(screen.getByRole("button", { name: "Ouvrir les paramètres" }))
    const checkButton = await screen.findByRole("button", { name: "Vérifier les mises à jour" })
    await waitFor(() => expect(checkButton).toBeEnabled())
    vi.unstubAllGlobals()
  })

  test("enregistre le sexe et le type d’allaitement avec le profil du bébé", async () => {
    const user = userEvent.setup()
    const onProfileChange = vi.fn(async () => undefined)
    render(
      <TopBar
        settings={{ active_baby_id: 1, babies: [{ id: 1, name: "Lou", birth_date: "2026-01-01", baby_sex: "", accent_color: "orange" }], accent_color: "orange", baby_name: "Lou", birth_date: "2026-01-01", baby_sex: "", language_preference: "system" }}
        onBabySelect={vi.fn(async () => undefined)}
        onBabyAdd={vi.fn(async () => undefined)}
        onBabyDelete={vi.fn(async () => undefined)}
        onLanguageChange={vi.fn(async () => undefined)}
        onProfileChange={onProfileChange}
        onReset={vi.fn(async () => undefined)}
      />
    )

    await user.click(screen.getByRole("button", { name: "Ouvrir les paramètres" }))
    expect(screen.getByRole("dialog", { name: "Paramètres de BabyCare" })).toBeInTheDocument()
    const birthDateInput = screen.getByLabelText("Date de naissance")
    expect(birthDateInput).toHaveValue("01/01/2026")
    expect(birthDateInput).toHaveAttribute("autocomplete", "off")
    expect(birthDateInput).toHaveAttribute("data-lpignore", "true")
    await user.click(screen.getByRole("button", { name: "Choisir la date de naissance" }))
    await user.click(screen.getByRole("button", { name: "Choisir le 02/01/2026" }))
    expect(birthDateInput).toHaveValue("02/01/2026")
    const girlButton = screen.getByRole("button", { name: "Fille" })
    expect(girlButton.querySelector(".lucide-venus")).toBeInTheDocument()
    await user.click(girlButton)
    await user.click(screen.getByRole("button", { name: "Choisir Vert pour ce bébé" }))
    await user.click(screen.getByRole("button", { name: "Au biberon" }))
    expect(girlButton).toHaveAttribute("aria-pressed", "true")
    await user.click(screen.getByRole("button", { name: "Enregistrer le profil" }))

    await waitFor(() => expect(onProfileChange).toHaveBeenCalledWith("Lou", "2026-01-02", "girl", "bottle", "green"))
  })

  test("demande une confirmation avant de réinitialiser la base", async () => {
    const user = userEvent.setup()
    const onReset = vi.fn(async () => undefined)
    render(
      <TopBar
        settings={{ active_baby_id: 1, babies: [{ id: 1, name: "Lou", birth_date: "2026-01-01", baby_sex: "girl", accent_color: "orange" }], accent_color: "orange", baby_name: "Lou", birth_date: "2026-01-01", baby_sex: "girl", language_preference: "system" }}
        onBabySelect={vi.fn(async () => undefined)}
        onBabyAdd={vi.fn(async () => undefined)}
        onBabyDelete={vi.fn(async () => undefined)}
        onLanguageChange={vi.fn(async () => undefined)}
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

  test("ajoute un bébé avec sa couleur depuis les paramètres", async () => {
    const user = userEvent.setup()
    const onBabyAdd = vi.fn(async () => undefined)
    render(
      <TopBar
        settings={{ active_baby_id: 1, babies: [{ id: 1, name: "Lou", birth_date: "2026-01-01", baby_sex: "girl", accent_color: "orange" }], accent_color: "orange", baby_name: "Lou", birth_date: "2026-01-01", baby_sex: "girl", language_preference: "system" }}
        onBabySelect={vi.fn(async () => undefined)}
        onBabyAdd={onBabyAdd}
        onBabyDelete={vi.fn(async () => undefined)}
        onLanguageChange={vi.fn(async () => undefined)}
        onProfileChange={vi.fn(async () => undefined)}
        onReset={vi.fn(async () => undefined)}
      />
    )

    await user.click(screen.getByRole("button", { name: "Ouvrir les paramètres" }))
    await user.click(screen.getByRole("button", { name: "Ajouter un bébé" }))
    await user.type(screen.getByLabelText("Nom du bébé"), "Mila")
    await user.click(screen.getByRole("button", { name: "Choisir Rose pour ce bébé" }))
    await user.click(screen.getByRole("button", { name: "Ajouter ce bébé" }))

    await waitFor(() => expect(onBabyAdd).toHaveBeenCalledWith("Mila", "", "", "breast", "pink"))
  })

  test("confirme la suppression du bébé actif", async () => {
    const user = userEvent.setup()
    const onBabyDelete = vi.fn(async () => undefined)
    render(
      <TopBar
        settings={{ active_baby_id: 1, babies: [{ id: 1, name: "Lou", birth_date: "2026-01-01", baby_sex: "girl", accent_color: "orange" }, { id: 2, name: "Mila", birth_date: "", baby_sex: "", accent_color: "pink" }], accent_color: "orange", baby_name: "Lou", birth_date: "2026-01-01", baby_sex: "girl", language_preference: "system" }}
        onBabySelect={vi.fn(async () => undefined)}
        onBabyAdd={vi.fn(async () => undefined)}
        onBabyDelete={onBabyDelete}
        onLanguageChange={vi.fn(async () => undefined)}
        onProfileChange={vi.fn(async () => undefined)}
        onReset={vi.fn(async () => undefined)}
      />
    )

    await user.click(screen.getByRole("button", { name: "Ouvrir les paramètres" }))
    await user.click(screen.getByRole("button", { name: "Supprimer bébé Lou" }))
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Le profil de Lou")
    await user.click(screen.getByRole("button", { name: "Supprimer ce bébé" }))
    await waitFor(() => expect(onBabyDelete).toHaveBeenCalledWith(1))
  })
})
