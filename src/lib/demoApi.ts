import type { AccentColor, AppSettings, BabyEvent, BabySex, DailyCare, EventList, EventPayload, EventType, StoolAlert } from "@/lib/types"
import type { LanguagePreference } from "@/lib/i18n"

interface DemoState {
  nextBabyId: number
  nextEventId: number
  nextDailyCareId: number
  settings: AppSettings
  events: BabyEvent[]
  dailyCare: DailyCare[]
}

const STORAGE_KEY = "babycare-demo-state-v1"
const DAILY_CARE_TYPES: DailyCare["care_type"][] = ["eyes", "face", "nose", "cord"]
const TIMER_TYPES = new Set<EventType>(["breast_left", "breast_right"])
const DEFAULT_BABY_NAME = "Charlie"

function nowIso() {
  return new Date().toISOString()
}

function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
}

function daysAgo(days: number, hour: number, minute: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(hour, minute, 0, 0)
  return date.toISOString()
}

function createEvent(id: number, event: Omit<BabyEvent, "id" | "created_at" | "updated_at">): BabyEvent {
  const timestamp = event.started_at
  return { id, created_at: timestamp, updated_at: timestamp, ...event }
}

function initialState(): DemoState {
  const birthDate = new Date()
  birthDate.setMonth(birthDate.getMonth() - 2)
  birthDate.setDate(birthDate.getDate() - 9)
  const baby = {
    id: 1,
    name: DEFAULT_BABY_NAME,
    birth_date: localDate(birthDate),
    baby_sex: "girl" as BabySex,
    accent_color: "orange" as AccentColor
  }
  const events = [
    createEvent(1, {
      type: "diaper",
      status: "completed",
      started_at: hoursAgo(2),
      ended_at: null,
      duration_seconds: null,
      value_real: null,
      value_text: null,
      notes: "Demo diaper change",
      metadata: { diaper_type: "mixed" }
    }),
    createEvent(2, {
      type: "temperature",
      status: "completed",
      started_at: hoursAgo(5),
      ended_at: null,
      duration_seconds: null,
      value_real: 37.1,
      value_text: null,
      notes: "After nap",
      metadata: null
    }),
    createEvent(3, {
      type: "breast_left",
      status: "completed",
      started_at: daysAgo(1, 7, 30),
      ended_at: daysAgo(1, 7, 48),
      duration_seconds: 1080,
      value_real: null,
      value_text: null,
      notes: "",
      metadata: null
    }),
    createEvent(4, {
      type: "weight",
      status: "completed",
      started_at: daysAgo(2, 10, 15),
      ended_at: null,
      duration_seconds: null,
      value_real: 4.82,
      value_text: null,
      notes: "Weekly check",
      metadata: null
    }),
    createEvent(5, {
      type: "height",
      status: "completed",
      started_at: daysAgo(2, 10, 20),
      ended_at: null,
      duration_seconds: null,
      value_real: 57.4,
      value_text: null,
      notes: "Weekly check",
      metadata: null
    }),
    createEvent(6, {
      type: "observation",
      status: "completed",
      started_at: daysAgo(3, 18, 5),
      ended_at: null,
      duration_seconds: null,
      value_real: null,
      value_text: null,
      notes: "Demo observation saved locally in this browser",
      metadata: null
    })
  ]

  return {
    nextBabyId: 2,
    nextEventId: 7,
    nextDailyCareId: 1,
    settings: {
      active_baby_id: baby.id,
      babies: [baby],
      accent_color: baby.accent_color,
      baby_name: baby.name,
      birth_date: baby.birth_date,
      baby_sex: baby.baby_sex,
      language_preference: "system"
    },
    events,
    dailyCare: []
  }
}

function readState() {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const state = initialState()
    writeState(state)
    return state
  }
  try {
    return JSON.parse(raw) as DemoState
  } catch {
    const state = initialState()
    writeState(state)
    return state
  }
}

function writeState(state: DemoState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function activeBabySettings(state: DemoState): AppSettings {
  const activeBaby = state.settings.babies.find((baby) => baby.id === state.settings.active_baby_id) || state.settings.babies[0]
  if (!activeBaby) return state.settings
  return {
    ...state.settings,
    active_baby_id: activeBaby.id,
    accent_color: activeBaby.accent_color,
    baby_name: activeBaby.name,
    birth_date: activeBaby.birth_date,
    baby_sex: activeBaby.baby_sex
  }
}

function saveSettings(state: DemoState) {
  state.settings = activeBabySettings(state)
  writeState(state)
  return state.settings
}

function activeEventIds(state: DemoState) {
  return new Set(state.events.map((event) => event.id))
}

function matchesFilters(event: BabyEvent, params: URLSearchParams) {
  const started = localDate(new Date(event.started_at))
  const from = params.get("from")
  const to = params.get("to")
  const type = params.get("type")
  const search = params.get("search")?.toLowerCase()
  if (from && started < from) return false
  if (to && started > to) return false
  if (type && event.type !== type) return false
  if (search) {
    const haystack = [event.type, event.value_text, event.notes, JSON.stringify(event.metadata)].filter(Boolean).join(" ").toLowerCase()
    if (!haystack.includes(search)) return false
  }
  return true
}

function ensureDailyCare(state: DemoState, date = localDate()) {
  const existing = new Set(state.dailyCare.filter((item) => item.date === date).map((item) => item.care_type))
  DAILY_CARE_TYPES.forEach((careType) => {
    if (!existing.has(careType)) {
      state.dailyCare.push({
        id: state.nextDailyCareId++,
        date,
        care_type: careType,
        completed: 0,
        completed_at: null,
        validated_at: null
      })
    }
  })
}

function addCompletedEvent(state: DemoState, payload: EventPayload) {
  const timestamp = nowIso()
  const startedAt = payload.started_at ? new Date(payload.started_at).toISOString() : timestamp
  const event: BabyEvent = {
    id: state.nextEventId++,
    type: payload.type,
    status: "completed",
    started_at: startedAt,
    ended_at: payload.ended_at || null,
    duration_seconds: payload.duration_seconds ?? null,
    value_real: payload.value_real ?? null,
    value_text: payload.value_text ?? null,
    notes: payload.notes?.trim() || null,
    metadata: payload.metadata || null,
    created_at: timestamp,
    updated_at: timestamp
  }
  state.events.push(event)
  writeState(state)
  return event
}

export const demoApi = {
  async events(params = new URLSearchParams()): Promise<EventList> {
    const state = readState()
    const limit = Math.min(Math.max(Number(params.get("limit")) || 100, 1), 250)
    const offset = Math.max(Number(params.get("offset")) || 0, 0)
    const filtered = state.events
      .filter((event) => matchesFilters(event, params))
      .sort((left, right) => Date.parse(right.started_at) - Date.parse(left.started_at))
    return { events: filtered.slice(offset, offset + limit), total: filtered.length, limit, offset }
  },

  async running(): Promise<BabyEvent[]> {
    return readState().events
      .filter((event) => event.status === "running")
      .sort((left, right) => Date.parse(left.started_at) - Date.parse(right.started_at))
  },

  async stoolAlert(): Promise<StoolAlert> {
    const stool = readState().events
      .filter((event) => event.type === "diaper" && ["stool", "mixed"].includes(String(event.metadata?.diaper_type)))
      .sort((left, right) => Date.parse(right.started_at) - Date.parse(left.started_at))[0]
    const thresholdHours = 48
    const elapsed = stool ? Math.max(0, Date.now() - Date.parse(stool.started_at)) : null
    return {
      overdue: elapsed == null || elapsed > thresholdHours * 60 * 60 * 1000,
      last_stool_at: stool?.started_at || null,
      hours_since: elapsed == null ? null : Math.floor(elapsed / (60 * 60 * 1000)),
      threshold_hours: thresholdHours
    }
  },

  async createEvent(payload: EventPayload): Promise<BabyEvent> {
    return addCompletedEvent(readState(), payload)
  },

  async startEvent(type: EventType): Promise<BabyEvent> {
    if (!TIMER_TYPES.has(type)) throw new Error("This action cannot be timed.")
    const state = readState()
    const timestamp = nowIso()
    const event = createEvent(state.nextEventId++, {
      type,
      status: "running",
      started_at: timestamp,
      ended_at: null,
      duration_seconds: null,
      value_real: null,
      value_text: null,
      notes: null,
      metadata: null
    })
    state.events.push(event)
    writeState(state)
    return event
  },

  async stopEvent(id: number, notes?: string): Promise<BabyEvent> {
    const state = readState()
    const event = state.events.find((item) => item.id === id)
    if (!event) throw new Error("Event not found.")
    const endedAt = nowIso()
    event.status = "completed"
    event.ended_at = endedAt
    event.duration_seconds = Math.max(0, Math.round((Date.parse(endedAt) - Date.parse(event.started_at)) / 1000))
    event.notes = notes === undefined ? event.notes : notes.trim() || null
    event.updated_at = endedAt
    writeState(state)
    return event
  },

  async updateEvent(id: number, payload: Partial<BabyEvent>): Promise<BabyEvent> {
    const state = readState()
    const event = state.events.find((item) => item.id === id)
    if (!event) throw new Error("Event not found.")
    Object.assign(event, payload, { updated_at: nowIso() })
    writeState(state)
    return event
  },

  async deleteEvent(id: number): Promise<void> {
    const state = readState()
    const ids = activeEventIds(state)
    if (!ids.has(id)) throw new Error("Event not found.")
    state.events = state.events.filter((event) => event.id !== id)
    writeState(state)
  },

  async settings(): Promise<AppSettings> {
    return activeBabySettings(readState())
  },

  async updateLanguage(language: LanguagePreference): Promise<AppSettings> {
    const state = readState()
    state.settings.language_preference = language
    return saveSettings(state)
  },

  async updateProfile(babyName: string, birthDate: string, babySex: BabySex, accentColor: AccentColor): Promise<AppSettings> {
    const state = readState()
    const baby = state.settings.babies.find((item) => item.id === state.settings.active_baby_id)
    if (baby) {
      baby.name = babyName
      baby.birth_date = birthDate
      baby.baby_sex = babySex
      baby.accent_color = accentColor
    }
    return saveSettings(state)
  },

  async createBaby(babyName: string, birthDate: string, babySex: BabySex, accentColor: AccentColor): Promise<AppSettings> {
    const state = readState()
    const baby = {
      id: state.nextBabyId++,
      name: babyName,
      birth_date: birthDate,
      baby_sex: babySex,
      accent_color: accentColor
    }
    state.settings.babies.push(baby)
    state.settings.active_baby_id = baby.id
    return saveSettings(state)
  },

  async selectBaby(babyId: number): Promise<AppSettings> {
    const state = readState()
    if (!state.settings.babies.some((baby) => baby.id === babyId)) throw new Error("Baby not found.")
    state.settings.active_baby_id = babyId
    return saveSettings(state)
  },

  async deleteBaby(babyId: number): Promise<AppSettings> {
    const state = readState()
    if (state.settings.babies.length <= 1) throw new Error("The last baby cannot be deleted.")
    state.settings.babies = state.settings.babies.filter((baby) => baby.id !== babyId)
    if (state.settings.active_baby_id === babyId) state.settings.active_baby_id = state.settings.babies[0].id
    return saveSettings(state)
  },

  async resetDatabase(): Promise<void> {
    writeState(initialState())
  },

  async dailyCare(): Promise<DailyCare[]> {
    const state = readState()
    ensureDailyCare(state)
    writeState(state)
    return state.dailyCare.filter((item) => item.date === localDate())
  },

  async updateDailyCare(careType: DailyCare["care_type"], completed: boolean): Promise<DailyCare> {
    const state = readState()
    ensureDailyCare(state)
    const item = state.dailyCare.find((care) => care.date === localDate() && care.care_type === careType)
    if (!item) throw new Error("Daily care not found.")
    item.completed = completed ? 1 : 0
    item.completed_at = completed ? nowIso() : null
    writeState(state)
    return item
  },

  async validateDailyCare(): Promise<BabyEvent> {
    const state = readState()
    ensureDailyCare(state)
    const todayItems = state.dailyCare.filter((item) => item.date === localDate())
    if (todayItems.some((item) => !item.completed)) throw new Error("Complete the checklist before validating care.")
    const event = addCompletedEvent(state, {
      type: "daily_care",
      duration_seconds: 0,
      ended_at: nowIso(),
      value_text: "4 / 4",
      notes: "Eyes, nose, cord and face completed",
      metadata: { date: localDate(), care_types: DAILY_CARE_TYPES }
    })
    todayItems.forEach((item) => {
      item.completed = 0
      item.completed_at = null
      item.validated_at = event.started_at
    })
    writeState(state)
    return event
  }
}
