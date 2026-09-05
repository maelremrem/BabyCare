import { TIMER_TYPES, EDITABLE_FIELDS, nowIso, sendApiError } from "./constants.js"
import { activeBabyId, parseEvent, eventFilters } from "./repository.js"
import { validateEvent } from "./validation.js"

export function registerEventsRoutes(app, db) {
  app.get("/api/alerts/stool", (request, response) => {
    const lastStool = db.prepare(`
      SELECT started_at
      FROM events
      WHERE baby_id = ?
        AND type = 'diaper'
        AND json_valid(metadata)
        AND json_extract(metadata, '$.diaper_type') IN ('stool', 'mixed')
      ORDER BY datetime(started_at) DESC, id DESC
      LIMIT 1
    `).get(activeBabyId(request))
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
    const limit = request.query.limit === undefined ? 100 : Number(request.query.limit)
    const offset = request.query.offset === undefined ? 0 : Number(request.query.offset)
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 250 || !Number.isSafeInteger(offset) || offset < 0) return sendApiError(response, 400, "invalid_pagination")
    const { where, params } = eventFilters(request.query, activeBabyId(request))
    const rows = db.prepare(`
      SELECT * FROM events
      ${where}
      ORDER BY datetime(started_at) DESC, id DESC
      LIMIT @limit OFFSET @offset
    `).all({ ...params, limit, offset }).map(parseEvent)
    const total = db.prepare(`SELECT COUNT(*) AS count FROM events ${where}`).get(params).count
    response.json({ events: rows, total, limit, offset })
  })

  app.get("/api/events/running", (request, response) => {
    const rows = db.prepare("SELECT * FROM events WHERE baby_id = ? AND status = 'running' ORDER BY datetime(started_at), id").all(activeBabyId(request))
    response.json(rows.map(parseEvent))
  })

  app.use("/api/events", (request, response, next) => {
    if (!["POST", "PATCH"].includes(request.method)) return next()
    const body = request.body
    if (!body || typeof body !== "object" || Array.isArray(body)) return sendApiError(response, 400, "invalid_payload")
    let existing = null
    if (request.method === "PATCH") {
      existing = db.prepare("SELECT * FROM events WHERE id = ? AND baby_id = ?").get(request.path.slice(1), request.babyId)
      if (!existing) return sendApiError(response, 404, "event_not_found")
    }
    const result = validateEvent(body, existing, request.path)
    if (result.error) return sendApiError(response, 400, result.error)
    request.body = result.value
    next()
  })

  app.post("/api/events", (request, response) => {
    const { type, started_at, value_real, value_text, notes, metadata } = request.body
    const timestamp = nowIso()
    const babyId = activeBabyId(request)
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
    const babyId = activeBabyId(request)
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
    const event = db.prepare("SELECT * FROM events WHERE id = ? AND baby_id = ?").get(request.params.id, activeBabyId(request))
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
    const event = db.prepare("SELECT * FROM events WHERE id = ? AND baby_id = ?").get(request.params.id, activeBabyId(request))
    if (!event) return sendApiError(response, 404, "event_not_found")

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
    const result = db.prepare("DELETE FROM events WHERE id = ? AND baby_id = ?").run(request.params.id, activeBabyId(request))
    if (!result.changes) return sendApiError(response, 404, "event_not_found")
    response.status(204).end()
  })

}
