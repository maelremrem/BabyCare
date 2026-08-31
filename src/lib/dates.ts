import { getLocaleTag, messages, type SupportedLocale } from "@/lib/i18n"

function localeTag(locale: SupportedLocale = "fr") {
  return getLocaleTag(locale)
}

export function formatClock(date: Date, locale: SupportedLocale = "fr") {
  return new Intl.DateTimeFormat(localeTag(locale), {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(date)
}

export function formatLongDate(date: Date, locale: SupportedLocale = "fr") {
  const value = new Intl.DateTimeFormat(localeTag(locale), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date)
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function formatShortDate(date: Date, locale: SupportedLocale = "fr") {
  return new Intl.DateTimeFormat(localeTag(locale), {
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

export function formatAgeCompact(age: AgeParts, locale: SupportedLocale = "fr") {
  const t = messages[locale].dates
  const monthLabel = locale === "en" && age.months !== 1 ? `${t.month}s` : t.month
  if (age.years > 0) return `${age.years} ${age.years === 1 ? t.yearSingular : t.yearPlural} ${age.months} ${monthLabel}`
  if (age.months > 0) return locale === "fr"
    ? `${age.months} ${t.month} ${age.days} j`
    : `${age.months} ${monthLabel} ${age.days} d`
  return `${age.days} ${age.days === 1 ? t.daySingular : t.dayPlural}`
}

export function formatAgeDetailed(age: AgeParts, locale: SupportedLocale = "fr") {
  const t = messages[locale].dates
  const yearLabel = `${age.years} ${age.years === 1 ? t.yearSingular : t.yearPlural}`
  const monthLabel = `${age.months} ${age.months === 1 && locale === "en" ? t.month : locale === "en" ? `${t.month}s` : t.month}`
  const dayLabel = `${age.days} ${age.days === 1 ? t.daySingular : t.dayPlural}`
  return locale === "fr" ? `${yearLabel}, ${monthLabel} et ${dayLabel}` : `${yearLabel}, ${monthLabel}, and ${dayLabel}`
}

export function formatBirthDate(value: string, locale: SupportedLocale = "fr") {
  const date = parseDateOnly(value)
  if (!date) return ""
  return new Intl.DateTimeFormat(localeTag(locale), { day: "numeric", month: "long", year: "numeric" }).format(date)
}

export function formatTime(value: string, locale: SupportedLocale = "fr") {
  return new Intl.DateTimeFormat(localeTag(locale), { hour: "2-digit", minute: "2-digit" }).format(new Date(value))
}

export function formatDuration(seconds: number | null, locale: SupportedLocale = "fr") {
  if (seconds == null) return ""
  const t = messages[locale].dates
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60
  if (hours) return `${hours} ${t.hourShort} ${String(minutes).padStart(2, "0")} ${t.minuteShort}`
  if (minutes) return `${minutes} ${t.minuteShort} ${String(rest).padStart(2, "0")} ${t.secondShort}`
  return `${rest} ${t.secondShort}`
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

export function dayHeading(key: string, locale: SupportedLocale = "fr") {
  const t = messages[locale].dates
  const [year, month, day] = key.split("-").map(Number)
  const date = new Date(year, month - 1, day)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return `${t.today} — ${date.toLocaleDateString(localeTag(locale), { day: "numeric", month: "long" }).toUpperCase()}`
  if (date.toDateString() === yesterday.toDateString()) return `${t.yesterday} — ${date.toLocaleDateString(localeTag(locale), { day: "numeric", month: "long" }).toUpperCase()}`
  return date.toLocaleDateString(localeTag(locale), { weekday: "long", day: "numeric", month: "long", year: "numeric" }).toUpperCase()
}

export function relativeTime(value: string, locale: SupportedLocale = "fr") {
  const t = messages[locale].dates
  const seconds = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 1000))
  if (seconds < 60) return t.now
  const minutes = Math.floor(seconds / 60)
  const relativeTimeFormatter = typeof Intl !== "undefined" && "RelativeTimeFormat" in Intl
    ? new Intl.RelativeTimeFormat(localeTag(locale), { numeric: "auto", style: "short" })
    : null
  if (minutes < 60) {
    if (relativeTimeFormatter) return relativeTimeFormatter.format(-minutes, "minute")
    return locale === "fr" ? `il y a ${minutes} min` : `${minutes} min ago`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    if (relativeTimeFormatter) return relativeTimeFormatter.format(-hours, "hour")
    return locale === "fr" ? `il y a ${hours} h` : `${hours} h ago`
  }
  const days = Math.floor(hours / 24)
  if (relativeTimeFormatter) return relativeTimeFormatter.format(-days, "day")
  return locale === "fr" ? `il y a ${days} j` : `${days} d ago`
}

export function groupEventsByDay<T extends { started_at: string }>(events: T[]) {
  return events.reduce<Record<string, T[]>>((groups, event) => {
    const key = dateKey(event.started_at)
    ;(groups[key] ||= []).push(event)
    return groups
  }, {})
}
