import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { useScreenWakeLock } from "@/hooks/useScreenWakeLock"

const noSleepMocks = vi.hoisted(() => ({ enable: vi.fn(), disable: vi.fn() }))

vi.mock("nosleep.js", () => ({
  default: class NoSleepMock {
    isEnabled = false

    enable() {
      this.isEnabled = true
      noSleepMocks.enable()
      return Promise.resolve()
    }

    disable() {
      this.isEnabled = false
      noSleepMocks.disable()
    }
  }
}))

const originalWakeLock = Object.getOwnPropertyDescriptor(navigator, "wakeLock")
const originalVisibilityState = Object.getOwnPropertyDescriptor(document, "visibilityState")

afterEach(() => {
  if (originalWakeLock) Object.defineProperty(navigator, "wakeLock", originalWakeLock)
  else Reflect.deleteProperty(navigator, "wakeLock")

  if (originalVisibilityState) Object.defineProperty(document, "visibilityState", originalVisibilityState)
  vi.restoreAllMocks()
  noSleepMocks.enable.mockClear()
  noSleepMocks.disable.mockClear()
})

describe("useScreenWakeLock", () => {
  test("keeps the screen awake only while a timer is running", async () => {
    const release = vi.fn().mockResolvedValue(undefined)
    const request = vi.fn().mockResolvedValue({ released: false, release })
    Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request } })
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" })

    const { rerender } = renderHook(({ enabled }) => useScreenWakeLock(enabled), {
      initialProps: { enabled: false }
    })

    expect(request).not.toHaveBeenCalled()
    rerender({ enabled: true })
    await waitFor(() => expect(request).toHaveBeenCalledWith("screen"))

    rerender({ enabled: false })
    expect(release).toHaveBeenCalledOnce()
  })

  test("requests a new lock when the app becomes visible again", async () => {
    const request = vi.fn().mockResolvedValue({ released: false, release: vi.fn().mockResolvedValue(undefined) })
    Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request } })
    Object.defineProperty(document, "visibilityState", { configurable: true, writable: true, value: "visible" })

    renderHook(() => useScreenWakeLock(true))
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1))

    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" })
    act(() => document.dispatchEvent(new Event("visibilitychange")))
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" })
    act(() => document.dispatchEvent(new Event("visibilitychange")))

    await waitFor(() => expect(request).toHaveBeenCalledTimes(2))
  })

  test("uses the optional video fallback when the native API is unavailable", async () => {
    Reflect.deleteProperty(navigator, "wakeLock")
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" })

    const { rerender } = renderHook(({ enabled }) => useScreenWakeLock(enabled, true), {
      initialProps: { enabled: true }
    })

    await waitFor(() => expect(noSleepMocks.enable).toHaveBeenCalledOnce())
    rerender({ enabled: false })
    expect(noSleepMocks.disable).toHaveBeenCalledOnce()
  })
})
