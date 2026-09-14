import { afterEach, beforeEach, expect, test, vi } from "vitest"

beforeEach(() => {
  vi.stubGlobal("__APP_VERSION__", "0.6.7")
  window.localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

test("keeps the static demo bundle version even after a stored simulated update", async () => {
  window.localStorage.setItem("babycare-demo-update-v1", JSON.stringify({
    currentVersion: "0.2.0",
    state: "complete",
    startedAt: Date.now() - 10_000,
    targetVersion: "0.2.0",
    canRollback: true,
    rollbackVersion: "0.6.7"
  }))

  const { demoApi } = await import("./demoApi")
  const info = await demoApi.versionInfo()

  expect(info.currentVersion).toBe("0.6.7")
  expect(info.updateAvailable).toBe(true)
  expect(info.availableVersion).toBe("0.2.0")
  expect(info.status.state).toBe("complete")
  expect(info.status.canRollback).toBe(false)
})

test("does not make the demo report a newer client version when the simulated update completes", async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-09-14T10:00:00.000Z"))
  const { demoApi } = await import("./demoApi")

  await demoApi.startUpdate()
  vi.setSystemTime(new Date("2026-09-14T10:00:09.000Z"))

  const info = await demoApi.versionInfo()
  const stored = JSON.parse(window.localStorage.getItem("babycare-demo-update-v1") || "{}")

  expect(info.currentVersion).toBe("0.6.7")
  expect(stored.currentVersion).toBe("0.6.7")
  expect(stored.canRollback).toBe(false)
  expect(info.updateAvailable).toBe(true)
  vi.useRealTimers()
})
