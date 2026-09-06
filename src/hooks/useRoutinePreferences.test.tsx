import { act, renderHook } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { CARE_TYPES, useRoutinePreferences } from "./useRoutinePreferences"

afterEach(() => localStorage.clear())

test("conserve la routine par bébé et partage les changements entre les écrans", () => {
  const one = renderHook(() => useRoutinePreferences(11))
  const observer = renderHook(() => useRoutinePreferences(11))
  const other = renderHook(() => useRoutinePreferences(12))
  act(() => one.result.current[1]({ types: ["eyes"], reminders: false, hours: 48 }))
  expect(observer.result.current[0]).toEqual({ types: ["eyes"], reminders: false, hours: 48 })
  expect(other.result.current[0].types).toEqual(CARE_TYPES)
  one.unmount()
  const reopened = renderHook(() => useRoutinePreferences(11))
  expect(reopened.result.current[0].hours).toBe(48)
})

test("ignore une préférence corrompue et filtre les valeurs invalides", () => {
  localStorage.setItem("babycare-routine-v1-11", "invalid-json")
  const { result, unmount } = renderHook(() => useRoutinePreferences(11))
  expect(result.current[0].types).toEqual(CARE_TYPES)
  unmount()
  localStorage.setItem("babycare-routine-v1-11", JSON.stringify({ types: ["eyes", "invalid"], hours: -1 }))
  const filtered = renderHook(() => useRoutinePreferences(11))
  expect(filtered.result.current[0]).toEqual({ types: ["eyes"], hours: 24, reminders: true })
})
