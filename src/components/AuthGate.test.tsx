import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, expect, test, vi } from "vitest"
import { AuthGate } from "./AuthGate"

afterEach(() => vi.unstubAllGlobals())

test("requires a successful login and hides content again when the session expires", async () => {
  const request = vi.fn().mockResolvedValueOnce(Response.json({ authenticated: false }))
    .mockResolvedValueOnce(Response.json({ authenticated: true }))
  vi.stubGlobal("fetch", request)
  const user = userEvent.setup()
  render(<AuthGate><p>Private family content</p></AuthGate>)
  const password = await screen.findByLabelText(/Mot de passe|Password/)
  expect(screen.queryByText("Private family content")).not.toBeInTheDocument()
  await user.type(password, "my-family-password")
  await user.click(screen.getByRole("button", { name: /Se connecter|Sign in/ }))
  expect(await screen.findByText("Private family content")).toBeInTheDocument()
  window.dispatchEvent(new Event("babycare-auth-required"))
  expect(await screen.findByLabelText(/Mot de passe|Password/)).toBeInTheDocument()
  expect(screen.queryByText("Private family content")).not.toBeInTheDocument()
})
