import { afterEach, beforeEach, expect, test, vi } from "vitest"

beforeEach(() => {
  vi.stubGlobal("__APP_VERSION__", "0.6.7")
  window.localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

test("filters demo history by multiple types before counting and paginating", async () => {
  const { demoApi } = await import("./demoApi")
  await demoApi.createEvent({ type: "bottle", value_real: 120 })
  const all = await demoApi.events()
  const expected = all.events.filter((event) => ["bottle", "temperature"].includes(event.type))
  const first = await demoApi.events(new URLSearchParams({ types: "bottle,temperature,bottle", type: "diaper", limit: "1" }))
  const second = await demoApi.events(new URLSearchParams({ types: "bottle,temperature,bottle", type: "diaper", limit: "1", offset: "1" }))
  expect(first.total).toBe(2)
  expect(second.total).toBe(2)
  expect([...first.events, ...second.events]).toEqual(expected)
  expect(first.limit).toBe(1)
  expect(second.offset).toBe(1)
})

test("an empty demo types selection overrides type and returns every event", async () => {
  const { demoApi } = await import("./demoApi")
  const all = await demoApi.events()
  for (const types of ["", " , , "]) {
    expect(await demoApi.events(new URLSearchParams({ types, type: "diaper" }))).toEqual(all)
  }
  const single = await demoApi.events(new URLSearchParams({ type: "diaper" }))
  expect(single.total).toBe(1)
  expect(single.events[0].type).toBe("diaper")
})

test("demo retains the server's legacy behavior for an unknown single type", async () => {
  const { demoApi } = await import("./demoApi")
  expect(await demoApi.events(new URLSearchParams({ type: "unknown" }))).toEqual(await demoApi.events())
})

test("invalid nonempty demo types never broaden the selection", async () => {
  const { demoApi } = await import("./demoApi")
  for (const types of ["unknown", "diaper') OR 1=1 --", "constructor,__proto__"]) {
    const history = await demoApi.events(new URLSearchParams({ types, type: "diaper" }))
    expect(history.total).toBe(0)
    expect(history.events).toEqual([])
  }
  const mixed = await demoApi.events(new URLSearchParams({ types: " diaper,unknown,diaper') OR 1=1 --,diaper ", type: "weight" }))
  expect(mixed.total).toBe(1)
  expect(mixed.events[0].type).toBe("diaper")
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
