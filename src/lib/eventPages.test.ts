import { afterEach, expect, test, vi } from "vitest"
import { api } from "./api"
import { fetchAllEvents } from "./eventPages"
import type { BabyEvent } from "./types"

afterEach(() => vi.restoreAllMocks())

test("loads medical history beyond the first 250 entries", async () => {
  const events = Array.from({ length: 301 }, (_, id) => ({ id } as BabyEvent))
  vi.spyOn(api, "events").mockImplementation(async (params) => {
    const offset = Number(params?.get("offset"))
    return { events: events.slice(offset, offset + 250), total: 301, limit: 250, offset }
  })
  expect(await fetchAllEvents(new URLSearchParams({ type: "weight" }))).toHaveLength(301)
  expect(api.events).toHaveBeenCalledTimes(2)
})
