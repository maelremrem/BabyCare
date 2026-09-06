import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import { Notifications } from './Notifications'
import { notificationsApi } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  isDemoMode: false,
  subscribeToServerChanges: () => () => undefined,
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
