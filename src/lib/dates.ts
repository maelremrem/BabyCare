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
