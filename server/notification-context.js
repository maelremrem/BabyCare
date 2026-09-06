import { AsyncLocalStorage } from 'node:async_hooks'

// Keep attribution attached to the request even when a route awaits async work.
export const notificationContext = new AsyncLocalStorage()
export function notificationDevice(request) {
  const value = request.get('X-BabyCare-Device')
  return typeof value === 'string' && /^[a-f0-9]{32}$/.test(value) ? value : null
}
