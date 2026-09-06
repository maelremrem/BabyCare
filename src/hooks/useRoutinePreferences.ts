import { useCallback, useMemo, useSyncExternalStore } from "react"
import type { DailyCare } from "@/lib/types"

export const CARE_TYPES: DailyCare["care_type"][] = ["eyes", "face", "nose", "cord"]
export interface RoutinePreferences {
  types: DailyCare["care_type"][]
  reminders: boolean
  hours: number
}
const defaults: RoutinePreferences = { types: CARE_TYPES, reminders: true, hours: 24 }
const eventName = "babycare-routine-change"
function subscribe(callback: () => void) {
  window.addEventListener(eventName, callback)
  window.addEventListener("storage", callback)
  return () => {
    window.removeEventListener(eventName, callback)
    window.removeEventListener("storage", callback)
  }
}
const memory = new Map<string, string>()
export function useRoutinePreferences(babyId = 0) {
  const key = `babycare-routine-v1-${babyId}`
  const snapshot = useCallback(() => {
    try { return memory.get(key) ?? window.localStorage.getItem(key) }
    catch { return memory.get(key) ?? null }
  }, [key])
  const stored = useSyncExternalStore(subscribe, snapshot, () => null)
  const preferences = useMemo(() => {
    try {
      const value = JSON.parse(stored || "null") as Partial<RoutinePreferences> | null
      return {
        types: Array.isArray(value?.types) ? CARE_TYPES.filter(type => value.types?.includes(type)) : defaults.types,
        reminders: value?.reminders !== false,
        hours: [12, 24, 48, 72].includes(value?.hours ?? 0) ? value!.hours! : 24
      }
    } catch { return defaults }
  }, [stored])
  const save = (value: RoutinePreferences) => {
    const json = JSON.stringify(value)
    try { window.localStorage.setItem(key, json); memory.delete(key) } catch { memory.set(key, json) }
    window.dispatchEvent(new Event(eventName))
  }
  return [preferences, save] as const
}
