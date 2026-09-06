import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, expect, test, vi } from "vitest"
import * as api from "@/lib/api"
import { PasswordSettings } from "./PasswordSettings"

afterEach(() => vi.restoreAllMocks())

function setup(enabled: boolean) {
  vi.spyOn(api, "getPasswordStatus").mockResolvedValue({ enabled, authenticated: true })
  const change = vi.spyOn(api, "changePassword").mockResolvedValue({ changed: true })
  render(<PasswordSettings />)
  return { user: userEvent.setup(), change }
}

test("crée un mot de passe dans une modale sans proposer de suppression au départ", async () => {
  const { user, change } = setup(false)
  const create = await screen.findByRole("button", { name: "Créer un mot de passe" })
  expect(screen.queryByLabelText("Nouveau mot de passe")).not.toBeInTheDocument()
  expect(screen.queryByRole("button", { name: "Supprimer le mot de passe" })).not.toBeInTheDocument()
  await user.click(create)
  expect(screen.queryByLabelText("Mot de passe actuel")).not.toBeInTheDocument()
  await user.type(screen.getByLabelText("Nouveau mot de passe", { exact: true }), "new123")
  await user.type(screen.getByLabelText("Confirmer le nouveau mot de passe"), "new123")
  await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Créer un mot de passe" }))
  expect(change).toHaveBeenCalledWith("", "new123", false)
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Supprimer le mot de passe" })).toHaveAttribute("data-variant", "destructive")
})

test("vérifie la confirmation et ferme la modale après le changement", async () => {
  const { user, change } = setup(true)
  await user.click(await screen.findByRole("button", { name: "Modifier le mot de passe" }))
  await user.type(screen.getByLabelText("Mot de passe actuel"), "old123")
  await user.type(screen.getByLabelText("Nouveau mot de passe", { exact: true }), "new123")
  await user.type(screen.getByLabelText("Confirmer le nouveau mot de passe"), "bad123")
  const submit = within(screen.getByRole("dialog")).getByRole("button", { name: "Modifier le mot de passe" })
  await user.click(submit)
  expect(screen.getByRole("alert")).toHaveTextContent("ne correspondent pas")
  expect(change).not.toHaveBeenCalled()
  await user.clear(screen.getByLabelText("Confirmer le nouveau mot de passe"))
  await user.type(screen.getByLabelText("Confirmer le nouveau mot de passe"), "new123")
  await user.click(submit)
  expect(change).toHaveBeenCalledWith("old123", "new123", false)
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  await user.click(screen.getByRole("button", { name: "Modifier le mot de passe" }))
  expect(screen.getByLabelText("Mot de passe actuel")).toHaveValue("")
})

test("supprime avec le mot de passe actuel puis masque la suppression", async () => {
  const { user, change } = setup(true)
  await user.click(await screen.findByRole("button", { name: "Supprimer le mot de passe" }))
  expect(screen.queryByLabelText("Nouveau mot de passe")).not.toBeInTheDocument()
  await user.type(screen.getByLabelText("Mot de passe actuel"), "old123")
  await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Supprimer le mot de passe" }))
  expect(change).toHaveBeenCalledWith("old123", "", true)
  expect(screen.queryByRole("button", { name: "Supprimer le mot de passe" })).not.toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Créer un mot de passe" })).toBeInTheDocument()
})

test("conserve la modale et l’état protégé en cas d’échec", async () => {
  const { user, change } = setup(true)
  change.mockRejectedValue(new Error("network"))
  await user.click(await screen.findByRole("button", { name: "Supprimer le mot de passe" }))
  await user.type(screen.getByLabelText("Mot de passe actuel"), "old123")
  await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Supprimer le mot de passe" }))
  expect(screen.getByRole("alert")).toBeInTheDocument()
  expect(screen.getByRole("dialog")).toBeInTheDocument()
  await user.click(screen.getByRole("button", { name: "Annuler" }))
  expect(screen.queryByRole("button", { name: "Créer un mot de passe" })).not.toBeInTheDocument()
})

test("ne propose aucune mutation si l’état est inconnu et permet de réessayer", async () => {
  const status = vi.spyOn(api, "getPasswordStatus").mockRejectedValueOnce(new Error("network"))
    .mockResolvedValueOnce({ enabled: false, authenticated: true })
  render(<PasswordSettings />)
  const user = userEvent.setup()
  await screen.findByRole("alert")
  expect(screen.queryByRole("button", { name: "Créer un mot de passe" })).not.toBeInTheDocument()
  expect(screen.queryByRole("button", { name: "Supprimer le mot de passe" })).not.toBeInTheDocument()
  await user.click(screen.getByRole("button", { name: "Réessayer" }))
  expect(await screen.findByRole("button", { name: "Créer un mot de passe" })).toBeInTheDocument()
  expect(status).toHaveBeenCalledTimes(2)
})
