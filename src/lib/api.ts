import type { AccentColor, AppSettings, BabyEvent, DailyCare, EventList, EventPayload, EventType } from "./types"

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers }
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || "Impossible de joindre BabyCare.")
  }
  return response.status === 204 ? undefined as T : response.json()
}

export const api = {
  events: (params = new URLSearchParams()) => request<EventList>(`/api/events?${params}`),
  running: () => request<BabyEvent[]>("/api/events/running"),
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
  updateAccent: (color: AccentColor) => request<AppSettings>("/api/settings/accent", {
    method: "PUT",
    body: JSON.stringify({ color })
  }),
  updateProfile: (babyName: string, birthDate: string) => request<AppSettings>("/api/settings/profile", {
    method: "PUT",
    body: JSON.stringify({ baby_name: babyName, birth_date: birthDate })
  }),
  dailyCare: () => request<DailyCare[]>("/api/routines/daily"),
  updateDailyCare: (careType: DailyCare["care_type"], completed: boolean) => request<DailyCare>(`/api/routines/daily/${careType}`, {
    method: "PUT",
    body: JSON.stringify({ completed })
  }),
  validateDailyCare: () => request<BabyEvent>("/api/routines/daily/validate", { method: "POST" })
}
