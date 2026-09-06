import { afterEach, expect, test, vi } from 'vitest'

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })

test('persists an anonymous device ID across page loads', async () => {
  localStorage.clear()
  vi.resetModules()
  const { getDeviceId } = await import('./device')
  const id = getDeviceId()
  expect(id).toMatch(/^[a-f0-9]{32}$/)
  expect(getDeviceId()).toBe(id)
  vi.resetModules()
  const reloaded = await import('./device')
  expect(reloaded.getDeviceId()).toBe(id)
})

test('keeps a stable identity when storage is unavailable', async () => {
  vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } })
  vi.resetModules()
  const { getDeviceId } = await import('./device')
  expect(getDeviceId()).toMatch(/^[a-f0-9]{32}$/)
  expect(getDeviceId()).toBe(getDeviceId())
})
