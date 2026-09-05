import type { AccentColor, AppSettings, BabyEvent, BabySex, DailyCare, EventList, EventPayload, EventType, FeedingType, StoolAlert, UpdateStatus, VersionInfo } from "./types"
import type { LanguagePreference } from "@/lib/i18n"
import { demoApi } from "@/lib/demoApi"

export const isDemoMode = import.meta.env.VITE_DEMO_MODE === "true" || import.meta.env.MODE === "demo"

export class ApiError extends Error {
  code: string | null
  status: number

  constructor(message: string, status: number, code: string | null) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
  }
}

const BABY_STORAGE_KEY = "babycare-selected-baby"
let selectedBabyId: number | null = null
try {
  const stored = Number(window.localStorage.getItem(BABY_STORAGE_KEY))
  if (Number.isSafeInteger(stored) && stored > 0) selectedBabyId = stored
} catch { /* Storage is optional. */ }
let contextRevision = 0
let initialization: Promise<void> | null = null

function rememberBaby(id: number) {
  if (selectedBabyId === id) return
  contextRevision += 1
  selectedBabyId = id
  try { window.localStorage.setItem(BABY_STORAGE_KEY, String(id)) } catch { /* Keep the selection in memory. */ }
}

async function rawRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", "X-BabyCare-Request": "1", ...init?.headers }
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    if (response.status === 401) window.dispatchEvent(new Event("babycare-auth-required"))
    throw new ApiError(body.error || "Unable to reach BabyCare.", response.status, body.code || null)
  }
  return response.status === 204 ? undefined as T : response.json()
}

async function initializeContext() {
  if (!initialization) initialization = rawRequest<AppSettings>("/api/settings", {
    headers: selectedBabyId ? { "X-Baby-Id": String(selectedBabyId) } : {}
  }).then((settings) => rememberBaby(settings.active_baby_id)).catch((error) => {
    initialization = null
    throw error
  })
  await initialization
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (/^\/api\/(version|update|database)([/?]|$)/.test(path)) return rawRequest<T>(path, init)
  await initializeContext()
  const revision = contextRevision
  const result = await rawRequest<T>(path, {
    ...init,
    headers: { "X-Baby-Id": String(selectedBabyId), ...init?.headers }
  })
  if (revision !== contextRevision) throw new DOMException("The selected baby changed.", "AbortError")
  return result
}

async function settingsMutation(path: string, init: RequestInit) {
  const settings = await request<AppSettings>(path, init)
  rememberBaby(settings.active_baby_id)
  return settings
}

const serverApi = {
  events: (params = new URLSearchParams()) => request<EventList>(`/api/events?${params}`),
  running: () => request<BabyEvent[]>("/api/events/running"),
  stoolAlert: () => request<StoolAlert>("/api/alerts/stool"),
  createEvent: (payload: EventPayload) => request<BabyEvent>("/api/events", {
    method: "POST",
    body: JSON.stringify(payload)
  }),
  startEvent: (type: EventType) => request<BabyEvent>("/api/events/start", {
    method: "POST",
    body: JSON.stringify({ type })
  }),
  stopEvent: (id: number, notes?: string) => request<BabyEvent>(`/api/events/${id}/stop`, {
    method: "POST",
    body: JSON.stringify({ notes })
  }),
  updateEvent: (id: number, payload: Partial<BabyEvent>) => request<BabyEvent>(`/api/events/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  }),
  deleteEvent: (id: number) => request<void>(`/api/events/${id}`, { method: "DELETE" }),
  settings: async () => {
    const settings = await request<AppSettings>("/api/settings")
    rememberBaby(settings.active_baby_id)
    return settings
  },
  updateLanguage: (language: LanguagePreference) => request<AppSettings>("/api/settings/language", {
    method: "PUT",
    body: JSON.stringify({ language })
  }),
  updateProfile: (babyName: string, birthDate: string, babySex: BabySex, feedingType: FeedingType, accentColor: AccentColor) => request<AppSettings>("/api/settings/profile", {
    method: "PUT",
    body: JSON.stringify({ baby_name: babyName, birth_date: birthDate, baby_sex: babySex, feeding_type: feedingType, accent_color: accentColor })
  }),
  createBaby: (babyName: string, birthDate: string, babySex: BabySex, feedingType: FeedingType, accentColor: AccentColor) => settingsMutation("/api/babies", {
    method: "POST",
    body: JSON.stringify({ baby_name: babyName, birth_date: birthDate, baby_sex: babySex, feeding_type: feedingType, accent_color: accentColor })
  }),
  selectBaby: (babyId: number) => settingsMutation("/api/babies/active", {
    method: "PUT",
    body: JSON.stringify({ baby_id: babyId })
  }),
  deleteBaby: (babyId: number) => settingsMutation(`/api/babies/${babyId}`, { method: "DELETE" }),
  versionInfo: (refresh = false) => request<VersionInfo>(`/api/version${refresh ? "?refresh=true" : ""}`),
  updateStatus: () => request<UpdateStatus>("/api/update/status"),
  startUpdate: () => request<UpdateStatus>("/api/update", { method: "POST" }),
  rollbackUpdate: () => request<UpdateStatus>("/api/update/rollback", { method: "POST" }),
  resetDatabase: () => request<void>("/api/database", { method: "DELETE" }),
  dailyCare: () => request<DailyCare[]>("/api/routines/daily"),
  updateDailyCare: (careType: DailyCare["care_type"], completed: boolean) => request<DailyCare>(`/api/routines/daily/${careType}`, {
    method: "PUT",
    body: JSON.stringify({ completed })
  }),
  validateDailyCare: () => request<BabyEvent>("/api/routines/daily/validate", { method: "POST" })
}

export const api = isDemoMode ? demoApi : serverApi

export function subscribeToServerChanges(onChange: () => void, onConnection?: (connected: boolean) => void) {
  if (isDemoMode || typeof EventSource === "undefined") return () => undefined
  const stream = new EventSource("/api/changes")
  const reconnect = () => { onConnection?.(true); onChange() }
  const disconnected = () => onConnection?.(false)
  const visible = () => { if (document.visibilityState === "visible") onChange() }
  stream.addEventListener("connected", reconnect)
  stream.addEventListener("change", onChange)
  stream.addEventListener("error", disconnected)
  window.addEventListener("online", onChange)
  document.addEventListener("visibilitychange", visible)
  return () => {
    stream.close()
    window.removeEventListener("online", onChange)
    document.removeEventListener("visibilitychange", visible)
  }
}
