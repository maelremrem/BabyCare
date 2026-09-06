import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import { Notifications } from './Notifications'
import { notificationsApi, subscribeToServerChanges } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  isDemoMode: false,
  subscribeToServerChanges: vi.fn(() => () => undefined),
  notificationsApi: { list: vi.fn(), settings: vi.fn(), save: vi.fn(), test: vi.fn() }
}))
beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  vi.mocked(notificationsApi.list).mockResolvedValue([])
  vi.mocked(notificationsApi.settings).mockResolvedValue({ enabled: true, provider: 'gotify', url: 'https://gotify.example/message', hasToken: true })
  vi.mocked(notificationsApi.save).mockResolvedValue({ enabled: true, provider: 'gotify', url: 'https://gotify.example/message', hasToken: true })
  vi.mocked(notificationsApi.test).mockResolvedValue({ sent: true })
})
test('uses the previous connection and shows deleted activity with the baby name', async () => {
  localStorage.setItem('babycare-last-connection-v1', '2026-01-01T00:00:00.000Z')
  vi.mocked(notificationsApi.list).mockResolvedValue([{ id: 1, action: 'deleted', baby_name: 'Lou', event_type: 'bottle', created_at: '2026-01-02T00:00:00.000Z' }])
  render(<Notifications />)
  await userEvent.click(await screen.findByRole('button', { name: 'Notifications (1)' }))
  expect(screen.getByText('Lou · Suppression')).toBeVisible()
  expect(screen.getByText('Biberon')).toBeVisible()
  expect(notificationsApi.list).toHaveBeenCalledWith('2026-01-01T00:00:00.000Z')
})
test('opens the webhook modal, preserves the saved token and saves before testing', async () => {
  render(<Notifications />)
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Notifications (0)' }))
  await user.click(screen.getByRole('button', { name: 'Notifications externes' }))
  expect(await screen.findByLabelText('Jeton')).toHaveValue('')
  expect(screen.getByRole('link', { name: 'Guide de configuration ntfy / Gotify' })).toHaveAttribute('href', expect.stringContaining('/docs/notifications.md'))
  await user.click(screen.getByRole('button', { name: 'Enregistrer et tester' }))
  await waitFor(() => expect(notificationsApi.test).toHaveBeenCalledOnce())
  expect(notificationsApi.save).toHaveBeenCalledWith(expect.objectContaining({ hasToken: true }))
  expect(vi.mocked(notificationsApi.save).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(notificationsApi.test).mock.invocationCallOrder[0])
})

 test('clears the badge on opening, remembers read actions and counts only new actions', async () => {
  const user = userEvent.setup()
  const first = { id: 1, action: 'created' as const, baby_name: 'Lou', event_type: 'bottle' as const, created_at: '2026-01-02T00:00:00.000Z' }
  vi.mocked(notificationsApi.list).mockResolvedValue([first])
  const view = render(<Notifications />)
  const bell = await screen.findByRole('button', { name: 'Notifications (1)' })
  await user.click(bell)
  expect(bell).toHaveAccessibleName('Notifications (0)')
  expect(bell.querySelector('span')).toBeNull()
  expect(screen.getByText('Lou · Ajout')).toBeVisible()
  vi.mocked(notificationsApi.list).mockResolvedValue([{ ...first, id: 2 }, first])
  await act(async () => { vi.mocked(subscribeToServerChanges).mock.calls.at(-1)![0]() })
  await user.keyboard('{Escape}')
  expect(bell).toHaveAccessibleName('Notifications (0)')
  view.unmount()
  render(<Notifications />)
  await waitFor(() => expect(notificationsApi.list).toHaveBeenCalledTimes(3))
  expect(screen.getByRole('button', { name: 'Notifications (0)' })).toBeVisible()
  vi.mocked(notificationsApi.list).mockResolvedValue([{ ...first, id: 3 }, { ...first, id: 2 }, first])
  await act(async () => { vi.mocked(subscribeToServerChanges).mock.calls.at(-1)![0]() })
  expect(await screen.findByRole('button', { name: 'Notifications (1)' })).toBeVisible()
})

test('clears the list persistently without hiding subsequent notifications', async () => {
  const user = userEvent.setup()
  const first = { id: 1, action: 'created' as const, baby_name: 'Lou', event_type: 'bottle' as const, created_at: '2026-01-02T00:00:00.000Z' }
  vi.mocked(notificationsApi.list).mockResolvedValue([first])
  const view = render(<Notifications />)
  await user.click(await screen.findByRole('button', { name: 'Notifications (1)' }))
  await user.click(screen.getByRole('button', { name: 'Nettoyer les notifications' }))
  expect(screen.queryByText('Lou · Ajout')).not.toBeInTheDocument()
  expect(screen.getByText('Aucune nouvelle action.')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Nettoyer les notifications' })).toBeDisabled()
  // A refresh must not restore the cleared rows, even if a response was in flight.
  await act(async () => { vi.mocked(subscribeToServerChanges).mock.calls.at(-1)![0]() })
  expect(screen.queryByText('Lou · Ajout')).not.toBeInTheDocument()
  view.unmount()
  render(<Notifications />)
  await waitFor(() => expect(notificationsApi.list).toHaveBeenCalledTimes(3))
  await user.click(screen.getByRole('button', { name: 'Notifications (0)' }))
  expect(screen.getByText('Aucune nouvelle action.')).toBeVisible()
  await user.keyboard('{Escape}')
  vi.mocked(notificationsApi.list).mockResolvedValue([{ ...first, id: 2 }, first])
  await act(async () => { vi.mocked(subscribeToServerChanges).mock.calls.at(-1)![0]() })
  await user.click(await screen.findByRole('button', { name: 'Notifications (1)' }))
  expect(screen.getAllByText('Lou · Ajout')).toHaveLength(1)
})
