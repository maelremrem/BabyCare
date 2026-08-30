import type { AccentColor, AppSettings, BabyEvent, BabySex, DailyCare, EventList, EventPayload, EventType, StoolAlert } from "./types"
import type { LanguagePreference } from "@/lib/i18n"
import { demoApi } from "@/lib/demoApi"

export const isDemoMode = import.meta.env.VITE_DEMO_MODE === "true"

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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers }
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new ApiError(body.error || "Unable to reach BabyCare.", response.status, body.code || null)
  }
  return response.status === 204 ? undefined as T : response.json()
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
  settings: () => request<AppSettings>("/api/settings"),
  updateLanguage: (language: LanguagePreference) => request<AppSettings>("/api/settings/language", {
    method: "PUT",
    body: JSON.stringify({ language })
  }),
  updateProfile: (babyName: string, birthDate: string, babySex: BabySex, accentColor: AccentColor) => request<AppSettings>("/api/settings/profile", {
    method: "PUT",
    body: JSON.stringify({ baby_name: babyName, birth_date: birthDate, baby_sex: babySex, accent_color: accentColor })
  }),
  createBaby: (babyName: string, birthDate: string, babySex: BabySex, accentColor: AccentColor) => request<AppSettings>("/api/babies", {
    method: "POST",
    body: JSON.stringify({ baby_name: babyName, birth_date: birthDate, baby_sex: babySex, accent_color: accentColor })
  }),
  selectBaby: (babyId: number) => request<AppSettings>("/api/babies/active", {
    method: "PUT",
    body: JSON.stringify({ baby_id: babyId })
  }),
  deleteBaby: (babyId: number) => request<AppSettings>(`/api/babies/${babyId}`, { method: "DELETE" }),
  resetDatabase: () => request<void>("/api/database", { method: "DELETE" }),
  dailyCare: () => request<DailyCare[]>("/api/routines/daily"),
  updateDailyCare: (careType: DailyCare["care_type"], completed: boolean) => request<DailyCare>(`/api/routines/daily/${careType}`, {
    method: "PUT",
    body: JSON.stringify({ completed })
  }),
  validateDailyCare: () => request<BabyEvent>("/api/routines/daily/validate", { method: "POST" })
}

export const api = isDemoMode ? demoApi : serverApi
