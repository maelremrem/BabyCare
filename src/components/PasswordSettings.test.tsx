import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, expect, test, vi } from "vitest"
import * as api from "@/lib/api"
import { PasswordSettings } from "./PasswordSettings"

afterEach(() => vi.restoreAllMocks())

test("vérifie la confirmation et efface les champs après le changement", async () => {
  const change = vi.spyOn(api, "changePassword").mockResolvedValue({ changed: true })
  const user = userEvent.setup()
  render(<PasswordSettings />)
  await user.type(screen.getByLabelText("Mot de passe actuel"), "old123")
  await user.type(screen.getByLabelText("Nouveau mot de passe", { exact: true }), "new123")
  await user.type(screen.getByLabelText("Confirmer le nouveau mot de passe"), "bad123")
  await user.click(screen.getByRole("button", { name: "Changer le mot de passe" }))
  expect(screen.getByRole("alert")).toHaveTextContent("ne correspondent pas")
  expect(change).not.toHaveBeenCalled()
  await user.clear(screen.getByLabelText("Confirmer le nouveau mot de passe"))
  await user.type(screen.getByLabelText("Confirmer le nouveau mot de passe"), "new123")
  await user.click(screen.getByRole("button", { name: "Changer le mot de passe" }))
  expect(change).toHaveBeenCalledWith("old123", "new123")
  expect(await screen.findByRole("status")).toHaveTextContent("Mot de passe modifié")
  expect(screen.getByLabelText("Mot de passe actuel")).toHaveValue("")
})
