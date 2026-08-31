import express from "express"
import ExcelJS from "exceljs"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { cleanupTemporaryData, createDatabase } from "./database.js"
import { createUpdateService } from "./update-service.js"

const EVENT_TYPES = new Set([
  "temperature",
  "weight",
  "height",
  "diaper",
  "breast_left",
  "breast_right",
  "bottle",
  "nap",
  "bath",
  "face_care",
  "cord_care",
  "face_cord_care",
  "clothes_change",
  "irritation",
  "observation",
  "daily_care",
  "eye_care",
  "nose_care"
])
const TIMER_TYPES = new Set(["breast_left", "breast_right", "nap"])
const ACCENT_COLORS = new Set(["orange", "blue", "green", "pink", "purple"])
const BABY_SEXES = new Set(["", "girl", "boy"])
const FEEDING_TYPES = new Set(["breast", "bottle"])
const LANGUAGE_PREFERENCES = new Set(["system", "fr", "en"])
const DAILY_CARE_TYPES = ["eyes", "face", "nose", "cord"]
const BATH_ITEMS = [
  "Préparation",
  "Fesses si souillées",
  "Mise à l’eau",
  "Tête",
  "Haut du corps",
  "Bas du corps",
  "Organes génitaux",
  "Fesses",
  "Rinçage",
  "Sortie du bain",
  "Séchage",
  "Cordon",
  "Couche",
  "Habillage"
]
const EDITABLE_FIELDS = new Set([
  "type",
  "started_at",
  "ended_at",
  "duration_seconds",
  "value_real",
  "value_text",
  "notes",
  "metadata"
])
const API_ERRORS = {
  invalid_accent_color: "Couleur d’accent invalide.",
  invalid_language_preference: "Préférence de langue invalide.",
  baby_name_too_long: "Le nom du bébé ne peut pas dépasser 80 caractères.",
  invalid_birth_date: "La date de naissance est invalide ou située dans le futur.",
  invalid_baby_sex: "Le sexe renseigné est invalide.",
  invalid_feeding_type: "Le type d’allaitement est invalide.",
  invalid_bottle_quantity: "La quantité du biberon doit être comprise entre 1 et 1000 ml.",
  baby_not_found: "Bébé introuvable.",
  cannot_delete_last_baby: "Le dernier bébé ne peut pas être supprimé.",
  invalid_event_type: "Type d’événement invalide.",
  invalid_temperature: "La température doit être comprise entre 34 et 44 °C.",
  invalid_weight: "Le poids doit être compris entre 0,3 et 30 kg.",
  invalid_height: "La taille doit être comprise entre 20 et 200 cm.",
  invalid_duration: "La durée doit être un nombre positif.",
  not_timer_event: "Cette action ne peut pas être chronométrée.",
  event_not_found: "Événement introuvable.",
  timer_already_completed: "Ce chrono est déjà terminé.",
  incomplete_daily_care: "Terminez la checklist avant de valider les soins.",
  invalid_daily_care: "Soin quotidien invalide.",
  bath_session_not_found: "Session de bain introuvable.",
  bath_item_not_found: "Élément de bain introuvable.",
  update_not_configured: "Les mises à jour depuis l’interface ne sont pas configurées sur cette installation.",
  update_timer_running: "Arrêtez tous les chronos avant de lancer une mise à jour.",
  update_already_running: "Une mise à jour est déjà en cours.",
  no_update_available: "Aucune nouvelle version n’est disponible.",
  unsupported_release: "Cette release n’est pas disponible pour l’architecture du serveur.",
  rollback_unavailable: "Aucune version précédente n’est disponible pour le rollback.",
  internal_error: "Une erreur interne est survenue."
}
const EXPORT_LOCALES = new Set(["fr", "en"])
const EXPORT_LOCALE_TAGS = {
  fr: "fr-FR",
  en: "en-US"
}
const EXPORT_MESSAGES = {
  fr: {
    sheetName: "Historique",
    columns: {
      date: "Date",
      start: "Heure début",
      end: "Heure fin",
      duration: "Durée",
      type: "Type",
      value: "Valeur",
      detail: "Détail",
      notes: "Observation"
    },
    eventLabels: {
      temperature: "Température",
      weight: "Poids",
      height: "Taille",
      diaper: "Couche",
      breast_left: "Sein gauche",
      breast_right: "Sein droit",
      bottle: "Biberon",
      nap: "Sieste",
      bath: "Bain",
      face_care: "Visage",
      cord_care: "Cordon",
      face_cord_care: "Visage et cordon",
      clothes_change: "Vêtements",
      irritation: "Irritation",
      observation: "Observation",
      daily_care: "Soins quotidiens",
      eye_care: "Yeux",
      nose_care: "Nez"
    },
    diaperTypes: {
      urine: "Urine",
      stool: "Selles",
      mixed: "Urine + Selles"
    },
    irritationLocations: {
      face: "Visage",
      neck: "Cou",
      chest: "Torse",
      back: "Dos",
      arms: "Bras",
      legs: "Jambes",
      bottom: "Fesses",
      other: "Autre",
      visage: "Visage",
      cou: "Cou",
      torse: "Torse",
      dos: "Dos",
      bras: "Bras",
      jambes: "Jambes",
      fesses: "Fesses",
      autre: "Autre"
    }
  },
  en: {
    sheetName: "Events",
    columns: {
      date: "Date",
      start: "Start time",
      end: "End time",
      duration: "Duration",
      type: "Type",
      value: "Value",
      detail: "Detail",
      notes: "Observation"
    },
    eventLabels: {
      temperature: "Temperature",
      weight: "Weight",
      height: "Height",
      diaper: "Diaper",
      breast_left: "Left breast",
      breast_right: "Right breast",
      bottle: "Bottle",
      nap: "Nap",
      bath: "Bath",
      face_care: "Face",
      cord_care: "Cord",
      face_cord_care: "Face and cord",
      clothes_change: "Clothes",
      irritation: "Irritation",
      observation: "Observation",
      daily_care: "Daily care",
      eye_care: "Eyes",
      nose_care: "Nose"
    },
    diaperTypes: {
      urine: "Urine",
      stool: "Stool",
      mixed: "Urine + Stool"
    },
    irritationLocations: {
      face: "Face",
      neck: "Neck",
      chest: "Chest",
      back: "Back",
      arms: "Arms",
      legs: "Legs",
      bottom: "Bottom",
      other: "Other",
      visage: "Face",
      cou: "Neck",
      torse: "Chest",
      dos: "Back",
      bras: "Arms",
      jambes: "Legs",
      fesses: "Bottom",
      autre: "Other"
    }
  }
}

const nowIso = () => new Date().toISOString()
const localDate = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: process.env.TZ || "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).format(new Date())

function sendApiError(response, status, code) {
  return response.status(status).json({ error: API_ERRORS[code], code })
}

function resolveExportLocale(value) {
  return EXPORT_LOCALES.has(value) ? value : "fr"
}

export function shouldUseIos15Build(userAgent = "") {
  const ios = userAgent.match(/(?:iPhone|iPad|iPod).*OS (\d+)[._]/i)
  if (ios) return Number(ios[1]) <= 15

  const android = userAgent.match(/Android[ /-](\d+)(?:\.(\d+))?/i)
  if (android) return Number(android[1]) < 12

  const safari = userAgent.match(/Version\/(\d+)(?:\.\d+)?[^\n]*Safari\//i)
  if (safari && !/(Chrome|Chromium|CriOS|Edg|OPR)\//i.test(userAgent)) {
    return Number(safari[1]) <= 15
  }

  return false
}

function isValidDateOnly(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const [, yearValue, monthValue, dayValue] = match
  const date = new Date(Date.UTC(Number(yearValue), Number(monthValue) - 1, Number(dayValue)))
  return date.getUTCFullYear() === Number(yearValue)
    && date.getUTCMonth() === Number(monthValue) - 1
    && date.getUTCDate() === Number(dayValue)
}

function readSettings(db) {
  const rows = db.prepare("SELECT key, value FROM app_settings").all()
  const values = Object.fromEntries(rows.map(({ key, value }) => [key, value]))
  let activeBaby = db.prepare("SELECT * FROM babies WHERE id = ?").get(Number(values.active_baby_id))
  if (!activeBaby) {
    activeBaby = db.prepare("SELECT * FROM babies ORDER BY id LIMIT 1").get()
    if (activeBaby) saveSetting(db, "active_baby_id", String(activeBaby.id))
  }
  const babies = db.prepare("SELECT id, name, birth_date, sex AS baby_sex, feeding_type, accent_color FROM babies ORDER BY created_at, id").all()
  return {
    active_baby_id: activeBaby?.id || 0,
    babies,
    accent_color: ACCENT_COLORS.has(activeBaby?.accent_color) ? activeBaby.accent_color : "orange",
    baby_name: activeBaby?.name || "",
    birth_date: activeBaby?.birth_date || "",
    baby_sex: BABY_SEXES.has(activeBaby?.sex) ? activeBaby.sex : "",
    feeding_type: FEEDING_TYPES.has(activeBaby?.feeding_type) ? activeBaby.feeding_type : "breast",
    language_preference: LANGUAGE_PREFERENCES.has(values.language_preference) ? values.language_preference : "system"
  }
}

function activeBabyId(db) {
  return readSettings(db).active_baby_id
}

function saveSetting(db, key, value) {
  db.prepare(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(key, value, nowIso())
}

function parseEvent(row) {
  if (!row) return row
  return {
    ...row,
    metadata: row.metadata ? JSON.parse(row.metadata) : null
  }
}

function eventFilters(query, babyId) {
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

function formatDuration(seconds) {
  if (seconds == null) return ""
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remaining = seconds % 60
  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`
}

function displayType(type, locale) {
  return EXPORT_MESSAGES[locale].eventLabels[type] || type
}

function displayDetail(metadata, locale) {
  if (metadata?.diaper_type) return EXPORT_MESSAGES[locale].diaperTypes[metadata.diaper_type] || metadata.diaper_type
  if (Array.isArray(metadata?.locations)) {
    return metadata.locations.map((location) => EXPORT_MESSAGES[locale].irritationLocations[location] || location).join(", ")
  }
  if (metadata?.location) return EXPORT_MESSAGES[locale].irritationLocations[metadata.location] || metadata.location
  return ""
}

export function createApp({ db = createDatabase(), updateService = createUpdateService() } = {}) {
  const app = express()
  const changeStreams = new Set()
  app.disable("x-powered-by")
  app.use(express.json({ limit: "100kb" }))

  function broadcastChange() {
    const message = `event: change\ndata: ${JSON.stringify({ changed_at: nowIso() })}\n\n`
    changeStreams.forEach((stream) => stream.write(message))
  }

  app.get("/api/changes", (request, response) => {
    response.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    })
    response.flushHeaders()
    response.write("event: connected\ndata: {}\n\n")
    changeStreams.add(response)
    const heartbeat = setInterval(() => response.write(": heartbeat\n\n"), 25_000)
    heartbeat.unref()
    request.on("close", () => {
      clearInterval(heartbeat)
      changeStreams.delete(response)
    })
  })

  app.use((request, response, next) => {
    if (request.method !== "GET" && request.path.startsWith("/api/")) {
      response.on("finish", () => {
        if (response.statusCode >= 200 && response.statusCode < 300) broadcastChange()
      })
    }
    next()
  })

  app.get("/api/health", (_request, response) => {
    response.setHeader("Cache-Control", "no-store")
    response.json({ status: "ok", version: updateService.currentVersion })
  })

  app.get("/api/version", async (request, response, next) => {
    try {
      response.setHeader("Cache-Control", "no-store")
      response.json(await updateService.versionInfo({ force: request.query.refresh === "true" }))
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/update/status", (_request, response) => {
    response.setHeader("Cache-Control", "no-store")
    response.json(updateService.status())
  })

  app.post("/api/update", async (_request, response, next) => {
    try {
      const runningTimers = db.prepare("SELECT COUNT(*) AS count FROM events WHERE status = 'running'").get().count
      if (runningTimers > 0) return sendApiError(response, 409, "update_timer_running")
      const result = await updateService.requestUpdate()
      if (result.error) {
        const status = result.error === "update_not_configured" ? 503 : 409
        return sendApiError(response, status, result.error)
      }
      response.status(202).json(result)
    } catch (error) {
      next(error)
    }
  })

  app.post("/api/update/rollback", (_request, response, next) => {
    try {
      const runningTimers = db.prepare("SELECT COUNT(*) AS count FROM events WHERE status = 'running'").get().count
      if (runningTimers > 0) return sendApiError(response, 409, "update_timer_running")
      const result = updateService.requestRollback()
      if (result.error) {
        const status = result.error === "update_not_configured" ? 503 : 409
        return sendApiError(response, status, result.error)
      }
      response.status(202).json(result)
    } catch (error) {
      next(error)
    }
  })

  app.get("/api/settings", (_request, response) => {
    response.json(readSettings(db))
  })

  app.put("/api/settings/language", (request, response) => {
    const { language } = request.body
    if (!LANGUAGE_PREFERENCES.has(language)) {
      return sendApiError(response, 400, "invalid_language_preference")
    }
    saveSetting(db, "language_preference", language)
    response.json(readSettings(db))
  })

  app.put("/api/settings/profile", (request, response) => {
    const { baby_name: babyName, birth_date: birthDate, baby_sex: babySex, feeding_type: requestedFeedingType, accent_color: accentColor = "orange" } = request.body
    const feedingType = requestedFeedingType ?? readSettings(db).feeding_type
    if (typeof babyName !== "string" || babyName.trim().length > 80) {
      return sendApiError(response, 400, "baby_name_too_long")
    }
    if (typeof birthDate !== "string" || (birthDate && (!isValidDateOnly(birthDate) || birthDate > localDate()))) {
      return sendApiError(response, 400, "invalid_birth_date")
    }
    if (typeof babySex !== "string" || !BABY_SEXES.has(babySex)) {
      return sendApiError(response, 400, "invalid_baby_sex")
    }
    if (!FEEDING_TYPES.has(feedingType)) {
      return sendApiError(response, 400, "invalid_feeding_type")
    }
    if (!ACCENT_COLORS.has(accentColor)) {
      return sendApiError(response, 400, "invalid_accent_color")
    }

    db.prepare(`
      UPDATE babies SET name = ?, birth_date = ?, sex = ?, feeding_type = ?, accent_color = ?, updated_at = ? WHERE id = ?
    `).run(babyName.trim(), birthDate, babySex, feedingType, accentColor, nowIso(), activeBabyId(db))
    response.json(readSettings(db))
  })

  app.post("/api/babies", (request, response) => {
    const { baby_name: babyName, birth_date: birthDate = "", baby_sex: babySex = "", feeding_type: feedingType = "breast", accent_color: accentColor = "orange" } = request.body
    if (typeof babyName !== "string" || !babyName.trim() || babyName.trim().length > 80) {
      return sendApiError(response, 400, "baby_name_too_long")
    }
    if (typeof birthDate !== "string" || (birthDate && (!isValidDateOnly(birthDate) || birthDate > localDate()))) {
      return sendApiError(response, 400, "invalid_birth_date")
    }
    if (typeof babySex !== "string" || !BABY_SEXES.has(babySex)) {
      return sendApiError(response, 400, "invalid_baby_sex")
    }
    if (!FEEDING_TYPES.has(feedingType)) {
      return sendApiError(response, 400, "invalid_feeding_type")
    }
    if (!ACCENT_COLORS.has(accentColor)) {
      return sendApiError(response, 400, "invalid_accent_color")
    }
    const timestamp = nowIso()
    const result = db.prepare(`
      INSERT INTO babies (name, birth_date, sex, feeding_type, accent_color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(babyName.trim(), birthDate, babySex, feedingType, accentColor, timestamp, timestamp)
    saveSetting(db, "active_baby_id", String(result.lastInsertRowid))
    response.status(201).json(readSettings(db))
  })

  app.put("/api/babies/active", (request, response) => {
    const babyId = Number(request.body.baby_id)
    if (!Number.isInteger(babyId) || !db.prepare("SELECT 1 FROM babies WHERE id = ?").get(babyId)) {
      return sendApiError(response, 404, "baby_not_found")
    }
    saveSetting(db, "active_baby_id", String(babyId))
    response.json(readSettings(db))
  })

  app.delete("/api/babies/:id", (request, response) => {
    const babyId = Number(request.params.id)
    const wasActive = activeBabyId(db) === babyId
    if (!db.prepare("SELECT 1 FROM babies WHERE id = ?").get(babyId)) {
      return sendApiError(response, 404, "baby_not_found")
    }
    if (db.prepare("SELECT COUNT(*) AS count FROM babies").get().count <= 1) {
      return sendApiError(response, 409, "cannot_delete_last_baby")
    }
    const remove = db.transaction(() => {
      const eventIds = db.prepare("SELECT id FROM events WHERE baby_id = ?").all(babyId).map(({ id }) => id)
      const sessionIds = db.prepare("SELECT id FROM bath_sessions WHERE baby_id = ?").all(babyId).map(({ id }) => id)
      if (sessionIds.length) db.prepare(`DELETE FROM bath_checks WHERE bath_session_id IN (${sessionIds.map(() => "?").join(",")})`).run(...sessionIds)
      db.prepare("DELETE FROM bath_sessions WHERE baby_id = ?").run(babyId)
      db.prepare("DELETE FROM daily_care_validations WHERE baby_id = ?").run(babyId)
      db.prepare("DELETE FROM daily_care WHERE baby_id = ?").run(babyId)
      if (eventIds.length) db.prepare(`DELETE FROM events WHERE id IN (${eventIds.map(() => "?").join(",")})`).run(...eventIds)
      db.prepare("DELETE FROM babies WHERE id = ?").run(babyId)
      if (wasActive) {
        const next = db.prepare("SELECT id FROM babies ORDER BY created_at, id LIMIT 1").get()
        saveSetting(db, "active_baby_id", String(next.id))
      }
    })
    remove()
    response.json(readSettings(db))
  })

  app.delete("/api/database", (_request, response) => {
    const reset = db.transaction(() => {
      db.prepare("DELETE FROM bath_checks").run()
      db.prepare("DELETE FROM bath_sessions").run()
      db.prepare("DELETE FROM daily_care_validations").run()
      db.prepare("DELETE FROM daily_care").run()
      db.prepare("DELETE FROM events").run()
      db.prepare("DELETE FROM babies").run()
      db.prepare("DELETE FROM app_settings").run()
      db.prepare("DELETE FROM sqlite_sequence").run()
      saveSetting(db, "language_preference", "system")
      const timestamp = nowIso()
      const baby = db.prepare("INSERT INTO babies (name, birth_date, sex, accent_color, created_at, updated_at) VALUES ('', '', '', 'orange', ?, ?)").run(timestamp, timestamp)
      saveSetting(db, "active_baby_id", String(baby.lastInsertRowid))
    })
    reset()
    response.status(204).end()
  })

  app.get("/api/alerts/stool", (_request, response) => {
    const lastStool = db.prepare(`
      SELECT started_at
      FROM events
      WHERE baby_id = ?
        AND type = 'diaper'
        AND json_valid(metadata)
        AND json_extract(metadata, '$.diaper_type') IN ('stool', 'mixed')
      ORDER BY datetime(started_at) DESC
      LIMIT 1
    `).get(activeBabyId(db))
    const thresholdHours = 48
    const elapsedMilliseconds = lastStool ? Math.max(0, Date.now() - Date.parse(lastStool.started_at)) : null
    const hoursSince = elapsedMilliseconds == null ? null : Math.floor(elapsedMilliseconds / (60 * 60 * 1000))
    response.json({
      overdue: elapsedMilliseconds == null || elapsedMilliseconds > thresholdHours * 60 * 60 * 1000,
      last_stool_at: lastStool?.started_at || null,
      hours_since: hoursSince,
      threshold_hours: thresholdHours
    })
  })

  app.get("/api/events", (request, response) => {
    const limit = Math.min(Math.max(Number(request.query.limit) || 100, 1), 250)
    const offset = Math.max(Number(request.query.offset) || 0, 0)
    const { where, params } = eventFilters(request.query, activeBabyId(db))
    const rows = db.prepare(`
      SELECT * FROM events
      ${where}
      ORDER BY datetime(started_at) DESC
      LIMIT @limit OFFSET @offset
    `).all({ ...params, limit, offset }).map(parseEvent)
    const total = db.prepare(`SELECT COUNT(*) AS count FROM events ${where}`).get(params).count
    response.json({ events: rows, total, limit, offset })
  })

  app.get("/api/events/running", (_request, response) => {
    const rows = db.prepare("SELECT * FROM events WHERE baby_id = ? AND status = 'running' ORDER BY datetime(started_at)").all(activeBabyId(db))
    response.json(rows.map(parseEvent))
  })

  app.post("/api/events", (request, response) => {
    const { type, started_at, value_real, value_text, notes, metadata } = request.body
    if (!EVENT_TYPES.has(type)) {
      return sendApiError(response, 400, "invalid_event_type")
    }
    if (type === "temperature" && (!Number.isFinite(value_real) || value_real < 34 || value_real > 44)) {
      return sendApiError(response, 400, "invalid_temperature")
    }
    if (type === "weight" && (!Number.isFinite(value_real) || value_real < 0.3 || value_real > 30)) {
      return sendApiError(response, 400, "invalid_weight")
    }
    if (type === "height" && (!Number.isFinite(value_real) || value_real < 20 || value_real > 200)) {
      return sendApiError(response, 400, "invalid_height")
    }
    if (type === "bottle" && (!Number.isFinite(value_real) || value_real < 1 || value_real > 1000)) {
      return sendApiError(response, 400, "invalid_bottle_quantity")
    }
    const timestamp = nowIso()
    const babyId = activeBabyId(db)
    const start = started_at ? new Date(started_at).toISOString() : timestamp
    const result = db.prepare(`
      INSERT INTO events (baby_id, type, status, started_at, value_real, value_text, notes, metadata, created_at, updated_at)
      VALUES (@baby_id, @type, 'completed', @started_at, @value_real, @value_text, @notes, @metadata, @created_at, @updated_at)
    `).run({
      type,
      baby_id: babyId,
      started_at: start,
      value_real: value_real ?? null,
      value_text: value_text ?? null,
      notes: notes?.trim() || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      created_at: timestamp,
      updated_at: timestamp
    })
    response.status(201).json(parseEvent(db.prepare("SELECT * FROM events WHERE id = ?").get(result.lastInsertRowid)))
  })

  app.post("/api/events/start", (request, response) => {
    const { type, notes, metadata } = request.body
    if (!TIMER_TYPES.has(type)) {
      return sendApiError(response, 400, "not_timer_event")
    }
    const timestamp = nowIso()
    const babyId = activeBabyId(db)
    const startTimer = db.transaction(() => {
      db.prepare(`
        UPDATE events
        SET status = 'completed',
          ended_at = @ended_at,
          duration_seconds = MAX(0, ROUND((julianday(@ended_at) - julianday(started_at)) * 86400)),
          updated_at = @updated_at
        WHERE baby_id = @baby_id AND status = 'running'
      `).run({ baby_id: babyId, ended_at: timestamp, updated_at: timestamp })
      return db.prepare(`
        INSERT INTO events (baby_id, type, status, started_at, notes, metadata, created_at, updated_at)
        VALUES (@baby_id, @type, 'running', @started_at, @notes, @metadata, @created_at, @updated_at)
      `).run({
        type,
        baby_id: babyId,
        started_at: timestamp,
        notes: notes?.trim() || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        created_at: timestamp,
        updated_at: timestamp
      })
    })
    const result = startTimer()
    response.status(201).json(parseEvent(db.prepare("SELECT * FROM events WHERE id = ?").get(result.lastInsertRowid)))
  })

  app.post("/api/events/:id/stop", (request, response) => {
    const event = db.prepare("SELECT * FROM events WHERE id = ? AND baby_id = ?").get(request.params.id, activeBabyId(db))
    if (!event) return sendApiError(response, 404, "event_not_found")
    if (event.status !== "running") return sendApiError(response, 409, "timer_already_completed")

    const endedAt = nowIso()
    const duration = Math.max(0, Math.round((Date.parse(endedAt) - Date.parse(event.started_at)) / 1000))
    const notes = request.body.notes === undefined ? event.notes : request.body.notes?.trim() || null
    db.prepare(`
      UPDATE events
      SET status = 'completed', ended_at = ?, duration_seconds = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `).run(endedAt, duration, notes, endedAt, event.id)
    response.json(parseEvent(db.prepare("SELECT * FROM events WHERE id = ?").get(event.id)))
  })

  app.patch("/api/events/:id", (request, response) => {
    const event = db.prepare("SELECT * FROM events WHERE id = ? AND baby_id = ?").get(request.params.id, activeBabyId(db))
    if (!event) return sendApiError(response, 404, "event_not_found")

    if (request.body.type !== undefined && !EVENT_TYPES.has(request.body.type)) {
      return sendApiError(response, 400, "invalid_event_type")
    }
    const updatedType = request.body.type || event.type
    if (updatedType === "temperature" && request.body.value_real !== undefined) {
      const temperature = Number(request.body.value_real)
      if (!Number.isFinite(temperature) || temperature < 34 || temperature > 44) {
        return sendApiError(response, 400, "invalid_temperature")
      }
    }
    if (updatedType === "weight" && request.body.value_real !== undefined) {
      const weight = Number(request.body.value_real)
      if (!Number.isFinite(weight) || weight < 0.3 || weight > 30) {
        return sendApiError(response, 400, "invalid_weight")
      }
    }
    if (updatedType === "height" && request.body.value_real !== undefined) {
      const height = Number(request.body.value_real)
      if (!Number.isFinite(height) || height < 20 || height > 200) {
        return sendApiError(response, 400, "invalid_height")
      }
    }
    if (updatedType === "bottle" && request.body.value_real !== undefined) {
      const quantity = Number(request.body.value_real)
      if (!Number.isFinite(quantity) || quantity < 1 || quantity > 1000) {
        return sendApiError(response, 400, "invalid_bottle_quantity")
      }
    }
    if (request.body.duration_seconds !== undefined) {
      if (!TIMER_TYPES.has(updatedType)) {
        return sendApiError(response, 400, "not_timer_event")
      }
      const duration = Number(request.body.duration_seconds)
      if (!Number.isFinite(duration) || duration < 0) {
        return sendApiError(response, 400, "invalid_duration")
      }
      request.body.duration_seconds = Math.round(duration)
    }
    if (event.status === "completed" && (request.body.started_at !== undefined || request.body.duration_seconds !== undefined)) {
      const startedAt = request.body.started_at || event.started_at
      const duration = request.body.duration_seconds ?? event.duration_seconds
      if (duration != null) request.body.ended_at = new Date(Date.parse(startedAt) + duration * 1000).toISOString()
    }
    const updates = Object.entries(request.body).filter(([key]) => EDITABLE_FIELDS.has(key))
    if (!updates.length) return response.json(parseEvent(event))

    const set = updates.map(([key]) => `${key} = @${key}`).concat("updated_at = @updated_at").join(", ")
    const values = Object.fromEntries(updates.map(([key, value]) => [
      key,
      key === "metadata" && value ? JSON.stringify(value) : value ?? null
    ]))
    db.prepare(`UPDATE events SET ${set} WHERE id = @id`).run({ ...values, id: event.id, updated_at: nowIso() })
    response.json(parseEvent(db.prepare("SELECT * FROM events WHERE id = ?").get(event.id)))
  })

  app.delete("/api/events/:id", (request, response) => {
    const result = db.prepare("DELETE FROM events WHERE id = ? AND baby_id = ?").run(request.params.id, activeBabyId(db))
    if (!result.changes) return sendApiError(response, 404, "event_not_found")
    response.status(204).end()
  })

  app.get("/api/routines/daily", (request, response) => {
    const date = request.query.date || localDate()
    const babyId = activeBabyId(db)
    const insert = db.prepare("INSERT OR IGNORE INTO daily_care (baby_id, date, care_type) VALUES (?, ?, ?)")
    const ensure = db.transaction(() => DAILY_CARE_TYPES.forEach((type) => insert.run(babyId, date, type)))
    ensure()
    response.json(db.prepare(`
      SELECT daily_care.*, NULL AS validated_at
      FROM daily_care
      WHERE daily_care.baby_id = ? AND daily_care.date = ?
      ORDER BY daily_care.id
    `).all(babyId, date))
  })

  app.post("/api/routines/daily/validate", (request, response) => {
    const date = request.body?.date || localDate()
    const babyId = activeBabyId(db)
    const insertCare = db.prepare("INSERT OR IGNORE INTO daily_care (baby_id, date, care_type) VALUES (?, ?, ?)")
    const validate = db.transaction(() => {
      DAILY_CARE_TYPES.forEach((type) => insertCare.run(babyId, date, type))
      const incomplete = db.prepare("SELECT COUNT(*) AS count FROM daily_care WHERE baby_id = ? AND date = ? AND completed = 0").get(babyId, date).count
      if (incomplete > 0) return { incomplete: true }

      const timestamp = nowIso()
      const event = db.prepare(`
        INSERT INTO events (baby_id, type, status, started_at, value_text, notes, metadata, created_at, updated_at)
        VALUES (?, 'daily_care', 'completed', ?, '4 / 4', ?, ?, ?, ?)
      `).run(
        babyId,
        timestamp,
        "Yeux, nez, cordon et visage effectués",
        JSON.stringify({ date, care_types: DAILY_CARE_TYPES }),
        timestamp,
        timestamp
      )
      db.prepare(`
        INSERT INTO daily_care_validations (baby_id, date, event_id, validated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(baby_id, date) DO UPDATE SET event_id = excluded.event_id, validated_at = excluded.validated_at
      `).run(babyId, date, event.lastInsertRowid, timestamp)
      db.prepare(`
        UPDATE daily_care
        SET completed = 0, completed_at = NULL
        WHERE baby_id = ? AND date = ?
      `).run(babyId, date)
      return { eventId: event.lastInsertRowid }
    })

    const result = validate()
    if (result.incomplete) {
      return sendApiError(response, 409, "incomplete_daily_care")
    }
    response.status(201).json(parseEvent(db.prepare("SELECT * FROM events WHERE id = ?").get(result.eventId)))
  })

  app.put("/api/routines/daily/:careType", (request, response) => {
    const { careType } = request.params
    if (!DAILY_CARE_TYPES.includes(careType)) {
      return sendApiError(response, 400, "invalid_daily_care")
    }
    const date = request.body.date || localDate()
    const babyId = activeBabyId(db)
    const completed = request.body.completed ? 1 : 0
    db.prepare(`
      INSERT INTO daily_care (baby_id, date, care_type, completed, completed_at)
      VALUES (@baby_id, @date, @care_type, @completed, @completed_at)
      ON CONFLICT(baby_id, date, care_type) DO UPDATE SET
        completed = excluded.completed,
        completed_at = excluded.completed_at
    `).run({ baby_id: babyId, date, care_type: careType, completed, completed_at: completed ? nowIso() : null })
    response.json(db.prepare("SELECT * FROM daily_care WHERE baby_id = ? AND date = ? AND care_type = ?").get(babyId, date, careType))
  })

  app.post("/api/baths", (_request, response) => {
    const timestamp = nowIso()
    const babyId = activeBabyId(db)
    const transaction = db.transaction(() => {
      const event = db.prepare(`
        INSERT INTO events (baby_id, type, status, started_at, created_at, updated_at)
        VALUES (?, 'bath', 'completed', ?, ?, ?)
      `).run(babyId, timestamp, timestamp, timestamp)
      const session = db.prepare("INSERT INTO bath_sessions (baby_id, event_id, started_at, completed_at) VALUES (?, ?, ?, ?)").run(babyId, event.lastInsertRowid, timestamp, timestamp)
      const insert = db.prepare("INSERT INTO bath_checks (bath_session_id, item) VALUES (?, ?)")
      BATH_ITEMS.forEach((item) => insert.run(session.lastInsertRowid, item))
      return session.lastInsertRowid
    })
    const sessionId = transaction()
    const session = db.prepare("SELECT * FROM bath_sessions WHERE id = ?").get(sessionId)
    const items = db.prepare("SELECT * FROM bath_checks WHERE bath_session_id = ?").all(sessionId)
    response.status(201).json({ ...session, items })
  })

  app.get("/api/baths/:id", (request, response) => {
    const session = db.prepare("SELECT * FROM bath_sessions WHERE id = ? AND baby_id = ?").get(request.params.id, activeBabyId(db))
    if (!session) return sendApiError(response, 404, "bath_session_not_found")
    const items = db.prepare("SELECT * FROM bath_checks WHERE bath_session_id = ? ORDER BY id").all(session.id)
    response.json({ ...session, items })
  })

  app.put("/api/baths/:bathId/items/:itemId", (request, response) => {
    const session = db.prepare("SELECT 1 FROM bath_sessions WHERE id = ? AND baby_id = ?").get(request.params.bathId, activeBabyId(db))
    if (!session) return sendApiError(response, 404, "bath_session_not_found")
    const completed = request.body.completed ? 1 : 0
    const result = db.prepare(`
      UPDATE bath_checks SET completed = ?, completed_at = ?
      WHERE id = ? AND bath_session_id = ?
    `).run(completed, completed ? nowIso() : null, request.params.itemId, request.params.bathId)
    if (!result.changes) return sendApiError(response, 404, "bath_item_not_found")
    response.json(db.prepare("SELECT * FROM bath_checks WHERE id = ?").get(request.params.itemId))
  })

  app.get("/api/export/xlsx", async (request, response, next) => {
    try {
      const locale = resolveExportLocale(request.query.locale)
      const localeTag = EXPORT_LOCALE_TAGS[locale]
      const exportMessages = EXPORT_MESSAGES[locale]
      const { where, params } = eventFilters(request.query, activeBabyId(db))
      const rows = db.prepare(`SELECT * FROM events ${where} ORDER BY datetime(started_at) DESC`).all(params).map(parseEvent)
      const workbook = new ExcelJS.Workbook()
      workbook.creator = "BabyCare"
      const sheet = workbook.addWorksheet(exportMessages.sheetName, { views: [{ state: "frozen", ySplit: 1 }] })
      sheet.columns = [
        { header: exportMessages.columns.date, key: "date", width: 14 },
        { header: exportMessages.columns.start, key: "start", width: 14 },
        { header: exportMessages.columns.end, key: "end", width: 14 },
        { header: exportMessages.columns.duration, key: "duration", width: 12 },
        { header: exportMessages.columns.type, key: "type", width: 20 },
        { header: exportMessages.columns.value, key: "value", width: 14 },
        { header: exportMessages.columns.detail, key: "detail", width: 20 },
        { header: exportMessages.columns.notes, key: "notes", width: 42 }
      ]
      rows.forEach((event) => {
        const start = new Date(event.started_at)
        const end = event.ended_at ? new Date(event.ended_at) : null
        sheet.addRow({
          date: start.toLocaleDateString(localeTag),
          start: start.toLocaleTimeString(localeTag, { hour: "2-digit", minute: "2-digit" }),
          end: end?.toLocaleTimeString(localeTag, { hour: "2-digit", minute: "2-digit" }) || "",
          duration: formatDuration(event.duration_seconds),
          type: displayType(event.type, locale),
          value: event.type === "temperature" && event.value_real != null
            ? `${event.value_real.toFixed(1)} °C`
            : event.type === "weight" && event.value_real != null
              ? `${event.value_real.toFixed(3)} kg`
              : event.type === "height" && event.value_real != null
                ? `${event.value_real.toFixed(1)} cm`
              : event.type === "bottle" && event.value_real != null
                ? `${event.value_real.toFixed(0)} ml`
              : event.value_real ?? event.value_text ?? "",
          detail: displayDetail(event.metadata, locale),
          notes: event.notes || ""
        })
      })
      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } }
      sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF7A00" } }
      sheet.autoFilter = { from: "A1", to: "H1" }

      const suffix = request.query.from && request.query.to
        ? `${request.query.from}_${request.query.to}`
        : localDate()
      response.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
      response.setHeader("Content-Disposition", `attachment; filename=BabyCare_${suffix}.xlsx`)
      await workbook.xlsx.write(response)
      response.end()
    } catch (error) {
      next(error)
    }
  })

  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
  const modernDistPath = path.join(projectRoot, "dist-modern")
  const ios15DistPath = path.join(projectRoot, "dist-ios15")
  const fallbackDistPath = path.join(projectRoot, "dist")
  app.use((request, response, next) => {
    if (request.path.startsWith("/api/")) return next()

    const useIos15 = shouldUseIos15Build(request.get("user-agent"))
    const selectedPath = useIos15 && fs.existsSync(ios15DistPath)
      ? ios15DistPath
      : fs.existsSync(modernDistPath)
        ? modernDistPath
        : fallbackDistPath

    response.setHeader("Vary", "User-Agent")
    return express.static(selectedPath)(request, response, next)
  })
  app.use((request, response, next) => {
    if (request.method === "GET" && !request.path.startsWith("/api/")) {
      const selectedPath = shouldUseIos15Build(request.get("user-agent")) && fs.existsSync(ios15DistPath)
        ? ios15DistPath
        : fs.existsSync(modernDistPath)
          ? modernDistPath
          : fallbackDistPath
      const indexPath = path.join(selectedPath, "index.html")
      if (fs.existsSync(indexPath)) return response.sendFile(indexPath)
    }
    next()
  })

  app.use((error, _request, response, _next) => {
    console.error(error)
    sendApiError(response, 500, "internal_error")
  })

  return app
}

const isMainModule = process.argv[1] && fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(fileURLToPath(import.meta.url))
if (isMainModule) {
  const db = createDatabase()
  cleanupTemporaryData(db)
  const cleanupTimer = setInterval(() => cleanupTemporaryData(db), 24 * 60 * 60 * 1000)
  cleanupTimer.unref()

  const port = Number(process.env.PORT) || 3000
  const server = createApp({ db }).listen(port, "0.0.0.0", () => {
    console.log(`BabyCare API disponible sur http://localhost:${port}`)
  })
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Le port ${port} est déjà utilisé. Arrêtez l’ancien serveur BabyCare puis relancez npm run dev.`)
      process.exit(1)
    }
    throw error
  })
}
