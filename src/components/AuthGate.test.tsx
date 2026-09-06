import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, expect, test, vi } from "vitest"
import { AuthGate } from "./AuthGate"

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

test("requires a successful login and hides content again when the session expires", async () => {
  const request = vi.fn().mockResolvedValueOnce(Response.json({ authenticated: false, enabled: true }))
    .mockResolvedValueOnce(Response.json({ authenticated: true }))
    .mockResolvedValueOnce(Response.json({ authenticated: false, enabled: true }))
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

 test('does not request a password when the server is restarting and recovers on retry', async () => {
  const request = vi.fn().mockRejectedValueOnce(new Error('server restarting'))
    .mockResolvedValueOnce(Response.json({ enabled: false, authenticated: false }))
  vi.stubGlobal('fetch', request)
  render(<AuthGate><p>Family content</p></AuthGate>)
  expect(await screen.findByRole('alert')).toHaveTextContent(/temporairement indisponible|temporarily unavailable/)
  expect(screen.queryByLabelText(/Mot de passe|Password/)).not.toBeInTheDocument()
  expect(screen.queryByText('Family content')).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /Réessayer|Try again/ }))
  expect(await screen.findByText('Family content')).toBeInTheDocument()
  expect(screen.queryByLabelText(/Mot de passe|Password/)).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Se déconnecter|Sign out/ })).not.toBeInTheDocument()
})

test('rechecks the server after an expired response without requiring a disabled password', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => Response.json({ enabled: false, authenticated: false })))
  render(<AuthGate><p>Family content</p></AuthGate>)
  await screen.findByText('Family content')
  await act(async () => { window.dispatchEvent(new Event('babycare-auth-required')) })
  expect(await screen.findByText('Family content')).toBeInTheDocument()
  expect(screen.queryByLabelText(/Mot de passe|Password/)).not.toBeInTheDocument()
})

test('an invalid session response neither opens private content nor requests a password', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({})))
  render(<AuthGate><p>Private content</p></AuthGate>)
  await screen.findByRole('alert')
  expect(screen.queryByText('Private content')).not.toBeInTheDocument()
  expect(screen.queryByLabelText(/Mot de passe|Password/)).not.toBeInTheDocument()
})

test('automatically retries a failed session check after five seconds', async () => {
  vi.useFakeTimers()
  const request = vi.fn().mockRejectedValueOnce(new Error('restarting'))
    .mockResolvedValueOnce(Response.json({ enabled: false, authenticated: false }))
  vi.stubGlobal('fetch', request)
  await act(async () => { render(<AuthGate><p>Family content</p></AuthGate>) })
  expect(screen.getByRole('alert')).toBeInTheDocument()
  expect(screen.queryByLabelText(/Mot de passe|Password/)).not.toBeInTheDocument()
  await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
  expect(request).toHaveBeenCalledTimes(2)
  expect(screen.getByText('Family content')).toBeInTheDocument()
})
