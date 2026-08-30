import express from "express"
import ExcelJS from "exceljs"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { cleanupTemporaryData, createDatabase } from "./database.js"

const EVENT_TYPES = new Set([
  "temperature",
  "weight",
  "height",
  "diaper",
  "breast_left",
  "breast_right",
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
const TIMER_TYPES = new Set(["breast_left", "breast_right", "face_care", "cord_care", "face_cord_care"])
const ACCENT_COLORS = new Set(["orange", "blue", "green", "pink", "purple"])
const BABY_SEXES = new Set(["", "girl", "boy"])
const LANGUAGE_PREFERENCES = new Set(["system", "fr", "en"])
const DAILY_CARE_TYPES = ["eyes", "nose", "cord", "face"]
const BATH_ITEMS = ["Serviette préparée", "Température vérifiée", "Sécher les plis"]
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

const nowIso = () => new Date().toISOString()
const localDate = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: process.env.TZ || "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).format(new Date())

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
  return {
    accent_color: ACCENT_COLORS.has(values.accent_color) ? values.accent_color : "orange",
    baby_name: values.baby_name || "",
    birth_date: values.birth_date || "",
    baby_sex: BABY_SEXES.has(values.baby_sex) ? values.baby_sex : "",
    language_preference: LANGUAGE_PREFERENCES.has(values.language_preference) ? values.language_preference : "system"
  }
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

function eventFilters(query) {
  const clauses = []
  const params = {}

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

function displayType(type) {
  return {
    temperature: "Température",
    weight: "Poids",
    height: "Taille",
    diaper: "Couche",
    breast_left: "Sein gauche",
    breast_right: "Sein droit",
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
  }[type] || type
}

export function createApp({ db = createDatabase() } = {}) {
  const app = express()
  app.disable("x-powered-by")
  app.use(express.json({ limit: "100kb" }))

  app.get("/api/health", (_request, response) => {
    response.json({ status: "ok" })
  })

  app.get("/api/settings", (_request, response) => {
    response.json(readSettings(db))
  })

  app.put("/api/settings/accent", (request, response) => {
    const { color } = request.body
    if (!ACCENT_COLORS.has(color)) {
      return response.status(400).json({ error: "Couleur d’accent invalide." })
    }
    saveSetting(db, "accent_color", color)
    response.json(readSettings(db))
  })

  app.put("/api/settings/language", (request, response) => {
    const { language } = request.body
    if (!LANGUAGE_PREFERENCES.has(language)) {
      return response.status(400).json({ error: "Préférence de langue invalide." })
    }
    saveSetting(db, "language_preference", language)
    response.json(readSettings(db))
  })

  app.put("/api/settings/profile", (request, response) => {
    const { baby_name: babyName, birth_date: birthDate, baby_sex: babySex } = request.body
    if (typeof babyName !== "string" || babyName.trim().length > 80) {
      return response.status(400).json({ error: "Le nom du bébé ne peut pas dépasser 80 caractères." })
    }
    if (typeof birthDate !== "string" || (birthDate && (!isValidDateOnly(birthDate) || birthDate > localDate()))) {
      return response.status(400).json({ error: "La date de naissance est invalide ou située dans le futur." })
    }
    if (typeof babySex !== "string" || !BABY_SEXES.has(babySex)) {
      return response.status(400).json({ error: "Le sexe renseigné est invalide." })
    }

    const updateProfile = db.transaction(() => {
      saveSetting(db, "baby_name", babyName.trim())
      saveSetting(db, "birth_date", birthDate)
      saveSetting(db, "baby_sex", babySex)
    })
    updateProfile()
    response.json(readSettings(db))
  })

  app.delete("/api/database", (_request, response) => {
    const reset = db.transaction(() => {
      db.prepare("DELETE FROM bath_checks").run()
      db.prepare("DELETE FROM bath_sessions").run()
      db.prepare("DELETE FROM daily_care_validations").run()
      db.prepare("DELETE FROM daily_care").run()
      db.prepare("DELETE FROM events").run()
      db.prepare("DELETE FROM app_settings").run()
      db.prepare("DELETE FROM sqlite_sequence").run()
      saveSetting(db, "accent_color", "orange")
      saveSetting(db, "baby_name", "")
      saveSetting(db, "birth_date", "")
      saveSetting(db, "baby_sex", "")
      saveSetting(db, "language_preference", "system")
    })
    reset()
    response.status(204).end()
  })

  app.get("/api/alerts/stool", (_request, response) => {
    const lastStool = db.prepare(`
      SELECT started_at
      FROM events
      WHERE type = 'diaper'
        AND json_valid(metadata)
        AND json_extract(metadata, '$.diaper_type') IN ('stool', 'mixed')
      ORDER BY datetime(started_at) DESC
      LIMIT 1
    `).get()
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
    const { where, params } = eventFilters(request.query)
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
    const rows = db.prepare("SELECT * FROM events WHERE status = 'running' ORDER BY datetime(started_at)").all()
    response.json(rows.map(parseEvent))
  })

  app.post("/api/events", (request, response) => {
    const { type, started_at, value_real, value_text, notes, metadata } = request.body
    if (!EVENT_TYPES.has(type)) {
      return response.status(400).json({ error: "Type d’événement invalide." })
    }
    if (type === "temperature" && (!Number.isFinite(value_real) || value_real < 34 || value_real > 44)) {
      return response.status(400).json({ error: "La température doit être comprise entre 34 et 44 °C." })
    }
    if (type === "weight" && (!Number.isFinite(value_real) || value_real < 0.3 || value_real > 30)) {
      return response.status(400).json({ error: "Le poids doit être compris entre 0,3 et 30 kg." })
    }
    if (type === "height" && (!Number.isFinite(value_real) || value_real < 20 || value_real > 200)) {
      return response.status(400).json({ error: "La taille doit être comprise entre 20 et 200 cm." })
    }
    const timestamp = nowIso()
    const start = started_at ? new Date(started_at).toISOString() : timestamp
    const result = db.prepare(`
      INSERT INTO events (type, status, started_at, value_real, value_text, notes, metadata, created_at, updated_at)
      VALUES (@type, 'completed', @started_at, @value_real, @value_text, @notes, @metadata, @created_at, @updated_at)
    `).run({
      type,
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
      return response.status(400).json({ error: "Cette action ne peut pas être chronométrée." })
    }
    const timestamp = nowIso()
    const result = db.prepare(`
      INSERT INTO events (type, status, started_at, notes, metadata, created_at, updated_at)
      VALUES (@type, 'running', @started_at, @notes, @metadata, @created_at, @updated_at)
    `).run({
      type,
      started_at: timestamp,
      notes: notes?.trim() || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      created_at: timestamp,
      updated_at: timestamp
    })
    response.status(201).json(parseEvent(db.prepare("SELECT * FROM events WHERE id = ?").get(result.lastInsertRowid)))
  })

  app.post("/api/events/:id/stop", (request, response) => {
    const event = db.prepare("SELECT * FROM events WHERE id = ?").get(request.params.id)
    if (!event) return response.status(404).json({ error: "Événement introuvable." })
    if (event.status !== "running") return response.status(409).json({ error: "Ce chrono est déjà terminé." })

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
    const event = db.prepare("SELECT * FROM events WHERE id = ?").get(request.params.id)
    if (!event) return response.status(404).json({ error: "Événement introuvable." })

    const updates = Object.entries(request.body).filter(([key]) => EDITABLE_FIELDS.has(key))
    if (updates.some(([key, value]) => key === "type" && !EVENT_TYPES.has(value))) {
      return response.status(400).json({ error: "Type d’événement invalide." })
    }
    const updatedType = request.body.type || event.type
    if (updatedType === "temperature" && request.body.value_real !== undefined) {
      const temperature = Number(request.body.value_real)
      if (!Number.isFinite(temperature) || temperature < 34 || temperature > 44) {
        return response.status(400).json({ error: "La température doit être comprise entre 34 et 44 °C." })
      }
    }
    if (updatedType === "weight" && request.body.value_real !== undefined) {
      const weight = Number(request.body.value_real)
      if (!Number.isFinite(weight) || weight < 0.3 || weight > 30) {
        return response.status(400).json({ error: "Le poids doit être compris entre 0,3 et 30 kg." })
      }
    }
    if (updatedType === "height" && request.body.value_real !== undefined) {
      const height = Number(request.body.value_real)
      if (!Number.isFinite(height) || height < 20 || height > 200) {
        return response.status(400).json({ error: "La taille doit être comprise entre 20 et 200 cm." })
      }
    }
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
    const result = db.prepare("DELETE FROM events WHERE id = ?").run(request.params.id)
    if (!result.changes) return response.status(404).json({ error: "Événement introuvable." })
    response.status(204).end()
  })

  app.get("/api/routines/daily", (request, response) => {
    const date = request.query.date || localDate()
    const insert = db.prepare("INSERT OR IGNORE INTO daily_care (date, care_type) VALUES (?, ?)")
    const ensure = db.transaction(() => DAILY_CARE_TYPES.forEach((type) => insert.run(date, type)))
    ensure()
    response.json(db.prepare(`
      SELECT daily_care.*, NULL AS validated_at
      FROM daily_care
      WHERE daily_care.date = ?
      ORDER BY daily_care.id
    `).all(date))
  })

  app.post("/api/routines/daily/validate", (request, response) => {
    const date = request.body?.date || localDate()
    const insertCare = db.prepare("INSERT OR IGNORE INTO daily_care (date, care_type) VALUES (?, ?)")
    const validate = db.transaction(() => {
      DAILY_CARE_TYPES.forEach((type) => insertCare.run(date, type))
      const incomplete = db.prepare("SELECT COUNT(*) AS count FROM daily_care WHERE date = ? AND completed = 0").get(date).count
      if (incomplete > 0) return { incomplete: true }

      const timestamp = nowIso()
      const event = db.prepare(`
        INSERT INTO events (type, status, started_at, ended_at, duration_seconds, value_text, notes, metadata, created_at, updated_at)
        VALUES ('daily_care', 'completed', ?, ?, 0, '4 / 4', ?, ?, ?, ?)
      `).run(
        timestamp,
        timestamp,
        "Yeux, nez, cordon et visage effectués",
        JSON.stringify({ date, care_types: DAILY_CARE_TYPES }),
        timestamp,
        timestamp
      )
      db.prepare(`
        INSERT INTO daily_care_validations (date, event_id, validated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(date) DO UPDATE SET event_id = excluded.event_id, validated_at = excluded.validated_at
      `).run(date, event.lastInsertRowid, timestamp)
      db.prepare(`
        UPDATE daily_care
        SET completed = 0, completed_at = NULL
        WHERE date = ?
      `).run(date)
      return { eventId: event.lastInsertRowid }
    })

    const result = validate()
    if (result.incomplete) {
      return response.status(409).json({ error: "Terminez la checklist avant de valider les soins." })
    }
    response.status(201).json(parseEvent(db.prepare("SELECT * FROM events WHERE id = ?").get(result.eventId)))
  })

  app.put("/api/routines/daily/:careType", (request, response) => {
    const { careType } = request.params
    if (!DAILY_CARE_TYPES.includes(careType)) {
      return response.status(400).json({ error: "Soin quotidien invalide." })
    }
    const date = request.body.date || localDate()
    const completed = request.body.completed ? 1 : 0
    db.prepare(`
      INSERT INTO daily_care (date, care_type, completed, completed_at)
      VALUES (@date, @care_type, @completed, @completed_at)
      ON CONFLICT(date, care_type) DO UPDATE SET
        completed = excluded.completed,
        completed_at = excluded.completed_at
    `).run({ date, care_type: careType, completed, completed_at: completed ? nowIso() : null })
    response.json(db.prepare("SELECT * FROM daily_care WHERE date = ? AND care_type = ?").get(date, careType))
  })

  app.post("/api/baths", (_request, response) => {
    const timestamp = nowIso()
    const transaction = db.transaction(() => {
      const event = db.prepare(`
        INSERT INTO events (type, status, started_at, ended_at, duration_seconds, created_at, updated_at)
        VALUES ('bath', 'completed', ?, ?, 0, ?, ?)
      `).run(timestamp, timestamp, timestamp, timestamp)
      const session = db.prepare("INSERT INTO bath_sessions (event_id, started_at, completed_at) VALUES (?, ?, ?)").run(event.lastInsertRowid, timestamp, timestamp)
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
    const session = db.prepare("SELECT * FROM bath_sessions WHERE id = ?").get(request.params.id)
    if (!session) return response.status(404).json({ error: "Session de bain introuvable." })
    const items = db.prepare("SELECT * FROM bath_checks WHERE bath_session_id = ? ORDER BY id").all(session.id)
    response.json({ ...session, items })
  })

  app.put("/api/baths/:bathId/items/:itemId", (request, response) => {
    const completed = request.body.completed ? 1 : 0
    const result = db.prepare(`
      UPDATE bath_checks SET completed = ?, completed_at = ?
      WHERE id = ? AND bath_session_id = ?
    `).run(completed, completed ? nowIso() : null, request.params.itemId, request.params.bathId)
    if (!result.changes) return response.status(404).json({ error: "Élément de bain introuvable." })
    response.json(db.prepare("SELECT * FROM bath_checks WHERE id = ?").get(request.params.itemId))
  })

  app.get("/api/export/xlsx", async (request, response, next) => {
    try {
      const { where, params } = eventFilters(request.query)
      const rows = db.prepare(`SELECT * FROM events ${where} ORDER BY datetime(started_at) DESC`).all(params).map(parseEvent)
      const workbook = new ExcelJS.Workbook()
      workbook.creator = "BabyCare"
      const sheet = workbook.addWorksheet("Historique", { views: [{ state: "frozen", ySplit: 1 }] })
      sheet.columns = [
        { header: "Date", key: "date", width: 14 },
        { header: "Heure début", key: "start", width: 14 },
        { header: "Heure fin", key: "end", width: 14 },
        { header: "Durée", key: "duration", width: 12 },
        { header: "Type", key: "type", width: 20 },
        { header: "Valeur", key: "value", width: 14 },
        { header: "Détail", key: "detail", width: 20 },
        { header: "Observation", key: "notes", width: 42 }
      ]
      rows.forEach((event) => {
        const start = new Date(event.started_at)
        const end = event.ended_at ? new Date(event.ended_at) : null
        sheet.addRow({
          date: start.toLocaleDateString("fr-FR"),
          start: start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
          end: end?.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) || "",
          duration: formatDuration(event.duration_seconds),
          type: displayType(event.type),
          value: event.type === "temperature" && event.value_real != null
            ? `${event.value_real.toFixed(1)} °C`
            : event.type === "weight" && event.value_real != null
              ? `${event.value_real.toFixed(3)} kg`
              : event.type === "height" && event.value_real != null
                ? `${event.value_real.toFixed(1)} cm`
              : event.value_real ?? event.value_text ?? "",
          detail: event.metadata?.diaper_type
            || (Array.isArray(event.metadata?.locations) ? event.metadata.locations.join(", ") : "")
            || event.metadata?.location
            || "",
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
  const distPath = path.join(projectRoot, "dist")
  app.use(express.static(distPath))
  app.use((request, response, next) => {
    if (request.method === "GET" && !request.path.startsWith("/api/") && fs.existsSync(path.join(distPath, "index.html"))) {
      return response.sendFile(path.join(distPath, "index.html"))
    }
    next()
  })

  app.use((error, _request, response, _next) => {
    console.error(error)
    response.status(500).json({ error: "Une erreur interne est survenue." })
  })

  return app
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
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
