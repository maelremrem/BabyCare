const DEVICE_KEY = 'babycare-device-v1'
let fallbackId: string | undefined

export function getDeviceId() {
  try {
    const stored = localStorage.getItem(DEVICE_KEY)
    if (stored && /^[a-f0-9]{32}$/.test(stored)) return stored
  } catch { /* Storage is optional. */ }
  if (!fallbackId) {
    fallbackId = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('')
  }
  try { localStorage.setItem(DEVICE_KEY, fallbackId) } catch { /* Retain identity until the page closes. */ }
  return fallbackId
}
