import { EDITABLE_FIELDS, EVENT_TYPES, TIMER_TYPES } from "./constants.js"
import { isValidDateOnly } from "./repository.js"

const MEASUREMENTS = {
  temperature: [34, 44, "invalid_temperature"],
  weight: [0.3, 30, "invalid_weight"],
  height: [20, 200, "invalid_height"],
  bottle: [1, 1000, "invalid_bottle_quantity"],
  pump_left: [1, 1000, "invalid_pump_quantity"],
  pump_right: [1, 1000, "invalid_pump_quantity"]
}

function validTimestamp(value) {
  return typeof value === "string"
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    && isValidDateOnly(value.slice(0, 10)) && Number.isFinite(Date.parse(value))
}

export function validateEvent(input, existing = null, route = "/") {
  if (Object.keys(input).some((key) => !EDITABLE_FIELDS.has(key))) return { error: "invalid_payload" }
  const value = { ...input }
  for (const key of ["notes", "value_text"]) {
    if (value[key] != null && (typeof value[key] !== "string" || value[key].length > 10000)) return { error: "invalid_payload" }
    if (typeof value[key] === "string") value[key] = value[key].trim() || null
  }
  if (value.metadata != null && (typeof value.metadata !== "object" || Array.isArray(value.metadata))) return { error: "invalid_payload" }
  if (value.metadata && Object.values(value.metadata).some((item) => typeof item !== "string" && !(Array.isArray(item) && item.every((entry) => typeof entry === "string")))) return { error: "invalid_payload" }
  for (const key of ["started_at", "ended_at"]) {
    if (value[key] === undefined || (key === "ended_at" && value[key] === null)) continue
    if (!validTimestamp(value[key])) return { error: "invalid_date" }
    value[key] = new Date(value[key]).toISOString()
  }
  // Stopping only accepts notes; the server owns the end and duration.
  if (route.endsWith("/stop")) return Object.keys(value).some((key) => key !== "notes") ? { error: "invalid_payload" } : { value }
  const event = { ...existing, ...value }
  if (existing && !validTimestamp(event.started_at)) return { error: "invalid_date" }
  if (existing?.status === "running" && Date.parse(event.started_at) > Date.now()) return { error: "invalid_date" }
  if (!EVENT_TYPES.has(event.type)) return { error: "invalid_event_type" }
  if (route === "/start") {
    if (!TIMER_TYPES.has(event.type)) return { error: "not_timer_event" }
    if (Object.keys(value).some((key) => !["type", "notes", "metadata"].includes(key))) return { error: "invalid_payload" }
    return { value }
  }
  if (!existing && (value.ended_at !== undefined || value.duration_seconds !== undefined)) return { error: "invalid_payload" }
  const range = MEASUREMENTS[event.type]
  if (range && (!Number.isFinite(event.value_real) || event.value_real < range[0] || event.value_real > range[1])) return { error: range[2] }
  if (event.value_real != null && !Number.isFinite(event.value_real)) return { error: "invalid_payload" }
  if (event.status === "running" && !TIMER_TYPES.has(event.type)) return { error: "not_timer_event" }
  if (value.duration_seconds !== undefined) {
    if (!TIMER_TYPES.has(event.type)) return { error: "not_timer_event" }
    if (!Number.isFinite(value.duration_seconds) || value.duration_seconds < 0 || !Number.isSafeInteger(Math.round(value.duration_seconds))) return { error: "invalid_duration" }
    value.duration_seconds = Math.round(value.duration_seconds)
  }
  if (existing?.status === "running" && (value.ended_at !== undefined || value.duration_seconds !== undefined)) return { error: "invalid_duration" }
  if (event.duration_seconds != null && !TIMER_TYPES.has(event.type)) return { error: "not_timer_event" }
  const start = value.started_at ?? existing?.started_at
  const duration = value.duration_seconds ?? existing?.duration_seconds
  if (duration != null && (value.started_at !== undefined || value.duration_seconds !== undefined)) {
    const end = Date.parse(start) + duration * 1000
    if (!Number.isFinite(end) || !Number.isFinite(new Date(end).getTime())) return { error: "invalid_date" }
    value.ended_at = new Date(end).toISOString()
  }
  const end = value.ended_at !== undefined ? value.ended_at : existing?.ended_at
  if (end != null) {
    if (!validTimestamp(start) || !validTimestamp(end) || Date.parse(end) < Date.parse(start)) return { error: "invalid_date" }
    if (TIMER_TYPES.has(event.type)) value.duration_seconds = Math.round((Date.parse(end) - Date.parse(start)) / 1000)
  } else if (value.ended_at === null && duration != null) return { error: "invalid_date" }
  return { value }
}
