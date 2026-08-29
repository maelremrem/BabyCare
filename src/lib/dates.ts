export function formatClock(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(date)
}

export function formatLongDate(date: Date) {
  const value = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date)
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date)
}

export interface AgeParts {
  years: number
  months: number
  days: number
}

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

function parseDateOnly(value: string) {
  const match = DATE_ONLY_PATTERN.exec(value)
  if (!match) return null
  const [, yearValue, monthValue, dayValue] = match
  const year = Number(yearValue)
  const month = Number(monthValue) - 1
  const day = Number(dayValue)
  const date = new Date(year, month, day, 12)
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day ? date : null
}

function clampedDate(year: number, month: number, day: number) {
  const lastDay = new Date(year, month + 1, 0, 12).getDate()
  return new Date(year, month, Math.min(day, lastDay), 12)
}

export function getAgeParts(birthDate: string, now = new Date()): AgeParts | null {
  const birth = parseDateOnly(birthDate)
  if (!birth) return null

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12)
  if (birth > today) return null

  let years = today.getFullYear() - birth.getFullYear()
  let yearCursor = clampedDate(birth.getFullYear() + years, birth.getMonth(), birth.getDate())
  if (yearCursor > today) {
    years -= 1
    yearCursor = clampedDate(birth.getFullYear() + years, birth.getMonth(), birth.getDate())
  }

  let months = 0
  let monthCursor = yearCursor
  while (months < 11) {
    const candidate = clampedDate(yearCursor.getFullYear(), yearCursor.getMonth() + months + 1, birth.getDate())
    if (candidate > today) break
    monthCursor = candidate
    months += 1
  }

  const millisecondsPerDay = 24 * 60 * 60 * 1000
  const days = Math.round((today.getTime() - monthCursor.getTime()) / millisecondsPerDay)
  return { years, months, days }
}

export function formatAgeCompact(age: AgeParts) {
  if (age.years > 0) return `${age.years} ${age.years === 1 ? "an" : "ans"} ${age.months} mois`
  if (age.months > 0) return `${age.months} mois ${age.days} j`
  return `${age.days} ${age.days === 1 ? "jour" : "jours"}`
}

export function formatAgeDetailed(age: AgeParts) {
  const yearLabel = `${age.years} ${age.years === 1 ? "an" : "ans"}`
  const monthLabel = `${age.months} mois`
  const dayLabel = `${age.days} ${age.days === 1 ? "jour" : "jours"}`
  return `${yearLabel}, ${monthLabel} et ${dayLabel}`
}

export function formatBirthDate(value: string) {
  const date = parseDateOnly(value)
  if (!date) return ""
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(date)
}

export function formatTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value))
}

export function formatDuration(seconds: number | null) {
  if (seconds == null) return ""
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60
  if (hours) return `${hours} h ${String(minutes).padStart(2, "0")} min`
  if (minutes) return `${minutes} min ${String(rest).padStart(2, "0")} s`
  return `${rest} s`
}

export function formatTimer(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60
  const core = `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`
  return hours ? `${String(hours).padStart(2, "0")}:${core}` : core
}

export function dateKey(value: string) {
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export function dayHeading(key: string) {
  const [year, month, day] = key.split("-").map(Number)
  const date = new Date(year, month - 1, day)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return `AUJOURD’HUI — ${day} ${date.toLocaleDateString("fr-FR", { month: "long" }).toUpperCase()}`
  if (date.toDateString() === yesterday.toDateString()) return `HIER — ${day} ${date.toLocaleDateString("fr-FR", { month: "long" }).toUpperCase()}`
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).toUpperCase()
}

export function relativeTime(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 1000))
  if (seconds < 60) return "à l’instant"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  return `il y a ${Math.floor(hours / 24)} j`
}

export function groupEventsByDay<T extends { started_at: string }>(events: T[]) {
  return events.reduce<Record<string, T[]>>((groups, event) => {
    const key = dateKey(event.started_at)
    ;(groups[key] ||= []).push(event)
    return groups
  }, {})
}
