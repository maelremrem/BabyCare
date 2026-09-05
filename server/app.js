import { registerRoutinesRoutes } from "./routines-routes.js"
import { registerEventsRoutes } from "./events-routes.js"
import { backupDatabase, backupExistingDatabase } from "./backups.js"
import { ACCENT_COLORS, BABY_SEXES, FEEDING_TYPES, LANGUAGE_PREFERENCES, EXPORT_LOCALE_TAGS, EXPORT_MESSAGES, nowIso, localDate, sendApiError, resolveExportLocale } from "./constants.js"
import { readSettings, saveSetting, activeBabyId, parseEvent, eventFilters, isValidDateOnly } from "./repository.js"
import { installAuth, createAuth } from "./auth.js"
import express from "express"
import ExcelJS from "exceljs"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { cleanupTemporaryData, createDatabase } from "./database.js"
import { createUpdateService } from "./update-service.js"

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
  if (Array.isArray(metadata?.vitamins)) {
    return metadata.vitamins.map((vitamin) => EXPORT_MESSAGES[locale].vitamins[vitamin] || vitamin).join(", ")
  }
  if (metadata?.vitamin) return EXPORT_MESSAGES[locale].vitamins[metadata.vitamin] || metadata.vitamin
  return ""
}

export function createApp({ db = createDatabase(), updateService = createUpdateService(), auth = createAuth({ directory: path.dirname(db.name) }) } = {}) {
  const app = express()
  const changeStreams = new Set()
  app.disable("x-powered-by")
  app.use(express.json({ limit: "100kb" }))
  if (auth) installAuth(app, auth)
  app.use("/api", (request, response, next) => {
    response.setHeader("Cache-Control", "no-store")
    const scoped = /^\/(events|routines|baths|alerts|export)(\/|$)/.test(request.path) || request.path === "/settings/profile"
    const value = request.get("X-Baby-Id") ?? request.query.baby_id
    if (scoped && (!value || !/^\d+$/.test(String(value)))) return sendApiError(response, 400, "baby_context_required")
    if (value !== undefined) {
      const id = Number(value)
      if (!Number.isSafeInteger(id) || id < 1) return sendApiError(response, 400, "baby_context_required")
      if (!db.prepare("SELECT 1 FROM babies WHERE id = ?").get(id)) {
        if (scoped) return sendApiError(response, 404, "baby_not_found")
      } else request.babyId = id
    }
    next()
  })

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
    const heartbeat = setInterval(() => {
      if (auth && !auth.session(request)) return response.end()
      response.write(": heartbeat\n\n")
    }, 25_000)
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

  app.get("/api/health", (request, response) => {
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

  app.get("/api/update/status", (request, response) => {
    response.setHeader("Cache-Control", "no-store")
    response.json(updateService.status())
  })

  app.post("/api/update", async (_request, response, next) => {
    try {
      const runningTimers = db.prepare("SELECT COUNT(*) AS count FROM events WHERE status = 'running'").get().count
      if (runningTimers > 0) return sendApiError(response, 409, "update_timer_running")
      await backupDatabase(db)
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

  app.post("/api/update/rollback", async (_request, response, next) => {
    try {
      const runningTimers = db.prepare("SELECT COUNT(*) AS count FROM events WHERE status = 'running'").get().count
      if (runningTimers > 0) return sendApiError(response, 409, "update_timer_running")
      await backupDatabase(db)
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

  app.get("/api/settings", (request, response) => {
    response.json(readSettings(db, request.babyId))
  })

  app.put("/api/settings/language", (request, response) => {
    const { language } = request.body
    if (!LANGUAGE_PREFERENCES.has(language)) {
      return sendApiError(response, 400, "invalid_language_preference")
    }
    saveSetting(db, "language_preference", language)
    response.json(readSettings(db, request.babyId))
  })

  app.put("/api/settings/profile", (request, response) => {
    const { baby_name: babyName, birth_date: birthDate, baby_sex: babySex, feeding_type: requestedFeedingType, accent_color: accentColor = "orange" } = request.body
    const feedingType = requestedFeedingType ?? readSettings(db, request.babyId).feeding_type
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

    const storedFeedingType = feedingType === "mixed" ? "breast" : feedingType
    const bottleEnabled = feedingType === "breast" ? 0 : 1
    db.prepare(`
      UPDATE babies SET name = ?, birth_date = ?, sex = ?, feeding_type = ?, bottle_enabled = ?, accent_color = ?, updated_at = ? WHERE id = ?
    `).run(babyName.trim(), birthDate, babySex, storedFeedingType, bottleEnabled, accentColor, nowIso(), activeBabyId(request))
    response.json(readSettings(db, request.babyId))
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
    const storedFeedingType = feedingType === "mixed" ? "breast" : feedingType
    const bottleEnabled = feedingType === "breast" ? 0 : 1
    const result = db.prepare(`
      INSERT INTO babies (name, birth_date, sex, feeding_type, bottle_enabled, accent_color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(babyName.trim(), birthDate, babySex, storedFeedingType, bottleEnabled, accentColor, timestamp, timestamp)
    response.status(201).json(readSettings(db, Number(result.lastInsertRowid)))
  })

  app.put("/api/babies/active", (request, response) => {
    const babyId = Number(request.body.baby_id)
    if (!Number.isInteger(babyId) || !db.prepare("SELECT 1 FROM babies WHERE id = ?").get(babyId)) {
      return sendApiError(response, 404, "baby_not_found")
    }
    response.json(readSettings(db, babyId))
  })

  app.delete("/api/babies/:id", (request, response) => {
    const babyId = Number(request.params.id)
    if (!db.prepare("SELECT 1 FROM babies WHERE id = ?").get(babyId)) {
      return sendApiError(response, 404, "baby_not_found")
    }
    if (db.prepare("SELECT COUNT(*) AS count FROM babies").get().count <= 1) {
      return sendApiError(response, 409, "cannot_delete_last_baby")
    }
    const remove = db.transaction(() => {
      db.prepare("DELETE FROM babies WHERE id = ?").run(babyId)
    })
    remove()
    response.json(readSettings(db, request.babyId))
  })

  app.delete("/api/database", async (request, response) => {
    await backupDatabase(db)
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

  registerEventsRoutes(app, db)

  registerRoutinesRoutes(app, db)

  app.get("/api/export/xlsx", async (request, response, next) => {
    try {
      const locale = resolveExportLocale(request.query.locale)
      const localeTag = EXPORT_LOCALE_TAGS[locale]
      const exportMessages = EXPORT_MESSAGES[locale]
      const { where, params } = eventFilters(request.query, activeBabyId(request))
      const rows = db.prepare(`SELECT * FROM events ${where} ORDER BY datetime(started_at) DESC, id DESC`).all(params).map(parseEvent)
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
              : ["bottle", "pump_left", "pump_right"].includes(event.type) && event.value_real != null
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
    if (error.type === "entity.parse.failed") return sendApiError(response, 400, "invalid_payload")
    if (error.type === "entity.too.large") return sendApiError(response, 413, "invalid_payload")
    console.error(error)
    sendApiError(response, 500, "internal_error")
  })

  return app
}

const isMainModule = process.argv[1] && fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(fileURLToPath(import.meta.url))
if (isMainModule) {
  const databasePath = process.env.DATABASE_PATH || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../data/babycare.db")
  await backupExistingDatabase(databasePath)
  const db = createDatabase(databasePath)
  cleanupTemporaryData(db)
  const backupTimer = setInterval(() => {
    backupDatabase(db).catch((error) => console.error("Échec de la sauvegarde automatique", error))
  }, 24 * 60 * 60 * 1000)
  backupTimer.unref()
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
