import { ACCENT_COLORS, BABY_SEXES, LANGUAGE_PREFERENCES, EVENT_TYPES, nowIso } from "./constants.js"

export function isValidDateOnly(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const [, yearValue, monthValue, dayValue] = match
  const date = new Date(Date.UTC(Number(yearValue), Number(monthValue) - 1, Number(dayValue)))
  return date.getUTCFullYear() === Number(yearValue)
    && date.getUTCMonth() === Number(monthValue) - 1
    && date.getUTCDate() === Number(dayValue)
}

export function readSettings(db, babyId) {
  const rows = db.prepare("SELECT key, value FROM app_settings").all()
  const values = Object.fromEntries(rows.map(({ key, value }) => [key, value]))
  let activeBaby = db.prepare("SELECT * FROM babies WHERE id = ?").get(babyId)
  if (!activeBaby) {
    activeBaby = db.prepare("SELECT * FROM babies ORDER BY id LIMIT 1").get()
  }
  const normalizeFeedingType = (baby) => baby?.feeding_type === "bottle"
    ? "bottle"
    : baby?.bottle_enabled === 1 ? "mixed" : "breast"
  const babies = db.prepare("SELECT id, name, birth_date, sex AS baby_sex, feeding_type, bottle_enabled, accent_color FROM babies ORDER BY created_at, id").all()
    .map((baby) => ({
      id: baby.id,
      name: baby.name,
      birth_date: baby.birth_date,
      baby_sex: baby.baby_sex,
      feeding_type: normalizeFeedingType(baby),
      accent_color: baby.accent_color
    }))
  return {
    active_baby_id: activeBaby?.id || 0,
    babies,
    accent_color: ACCENT_COLORS.has(activeBaby?.accent_color) ? activeBaby.accent_color : "orange",
    baby_name: activeBaby?.name || "",
    birth_date: activeBaby?.birth_date || "",
    baby_sex: BABY_SEXES.has(activeBaby?.sex) ? activeBaby.sex : "",
    feeding_type: normalizeFeedingType(activeBaby),
    language_preference: LANGUAGE_PREFERENCES.has(values.language_preference) ? values.language_preference : "system"
  }
}

export function activeBabyId(request) {
  return request.babyId
}

export function saveSetting(db, key, value) {
  db.prepare(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(key, value, nowIso())
}

export function parseEvent(row) {
  if (!row) return row
  return {
    ...row,
    metadata: row.metadata ? JSON.parse(row.metadata) : null
  }
}

export function eventFilters(query, babyId) {
  const clauses = ["baby_id = @baby_id"]
  const params = { baby_id: babyId }

  if (query.from) {
    clauses.push("date(started_at, 'localtime') >= date(@from)")
    params.from = query.from
  }
  if (query.to) {
    clauses.push("date(started_at, 'localtime') <= date(@to)")
    params.to = query.to
  }
  if (query.type && EVENT_TYPES.has(query.type)) {
    clauses.push("type = @type")
    params.type = query.type
  }
  if (query.search) {
    clauses.push("(notes LIKE @search OR value_text LIKE @search OR type LIKE @search OR metadata LIKE @search)")
    params.search = `%${query.search}%`
  }

  return { where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params }
}

