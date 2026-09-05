import { afterEach, expect, test, vi } from "vitest"
import { subscribeToServerChanges } from "./api"

afterEach(() => vi.unstubAllGlobals())

test("refreshes after reconnect and returning to the foreground, then cleans up", () => {
  const source = Object.assign(new EventTarget(), { close: vi.fn() })
  class Stream { constructor() { return source } }
  vi.stubGlobal("EventSource", Stream)
  const change = vi.fn()
  const connection = vi.fn()
  const unsubscribe = subscribeToServerChanges(change, connection)
  source!.dispatchEvent(new Event("error"))
  expect(connection).toHaveBeenLastCalledWith(false)
  source!.dispatchEvent(new Event("connected"))
  expect(connection).toHaveBeenLastCalledWith(true)
  expect(change).toHaveBeenCalledTimes(1)
  window.dispatchEvent(new Event("online"))
  expect(change).toHaveBeenCalledTimes(2)
  unsubscribe()
  expect(source!.close).toHaveBeenCalledOnce()
  window.dispatchEvent(new Event("online"))
  expect(change).toHaveBeenCalledTimes(2)
})

test("sends the device baby ID and rejects responses for an old selection", async () => {
  vi.resetModules()
  const { api: client } = await import("./api")
  let release: (response: Response) => void = () => undefined
  const history = new Promise<Response>((resolve) => { release = resolve })
  const fetchMock = vi.fn(async (url: string) => {
    if (url === "/api/settings") return Response.json({ active_baby_id: 1 })
    if (url === "/api/babies/active") return Response.json({ active_baby_id: 2 })
    if (url.startsWith("/api/events?")) return history
    return Response.json([])
  })
  vi.stubGlobal("fetch", fetchMock)
  await client.settings()
  const pending = client.events()
  const rejected = expect(pending).rejects.toMatchObject({ name: "AbortError" })
  await vi.waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url.startsWith("/api/events?"))).toBe(true))
  await client.selectBaby(2)
  release(Response.json({ events: [], total: 0 }))
  await rejected
  await client.running()
  expect(fetchMock).toHaveBeenLastCalledWith("/api/events/running", expect.objectContaining({ headers: expect.objectContaining({ "X-Baby-Id": "2" }) }))
})
