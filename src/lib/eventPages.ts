import { api } from "./api"
import type { BabyEvent } from "./types"

export async function fetchAllEvents(params: URLSearchParams, signal?: AbortSignal) {
  const events: BabyEvent[] = []
  let offset = 0
  while (!signal?.aborted) {
    const pageParams = new URLSearchParams(params)
    pageParams.set("limit", "250")
    pageParams.set("offset", String(offset))
    const page = await api.events(pageParams)
    if (signal?.aborted) throw new DOMException("Cancelled", "AbortError")
    events.push(...page.events)
    offset += page.events.length
    if (!page.events.length || offset >= page.total) return events
  }
  throw new DOMException("Cancelled", "AbortError")
}
