import { useCallback, useEffect, useRef, useState } from "react"
import { api } from "@/lib/api"
import type { BabyEvent } from "@/lib/types"

export function useEvents() {
  const generation = useRef(0)
  const [events, setEvents] = useState<BabyEvent[]>([])
  const [running, setRunning] = useState<BabyEvent[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const current = ++generation.current
    const [history, active] = await Promise.all([api.events(), api.running()])
    if (current !== generation.current) return
    setEvents(history.events)
    setRunning(active)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh().catch(() => setLoading(false))
    return () => { generation.current += 1 }
  }, [refresh])

  return { events, running, loading, refresh }
}
