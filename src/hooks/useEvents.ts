import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api"
import type { BabyEvent } from "@/lib/types"

export function useEvents() {
  const [events, setEvents] = useState<BabyEvent[]>([])
  const [running, setRunning] = useState<BabyEvent[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const [history, active] = await Promise.all([api.events(), api.running()])
    setEvents(history.events)
    setRunning(active)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh().catch(() => setLoading(false))
  }, [refresh])

  return { events, running, loading, refresh }
}
