import { DAILY_CARE_TYPES, BATH_ITEMS, nowIso, localDate, sendApiError } from "./constants.js"
import { activeBabyId, parseEvent } from "./repository.js"

export function registerRoutinesRoutes(app, db) {
  app.get("/api/routines/daily", (request, response) => {
    const date = request.query.date || localDate()
    const babyId = activeBabyId(request)
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
    const babyId = activeBabyId(request)
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
    const babyId = activeBabyId(request)
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

  app.post("/api/baths", (request, response) => {
    const timestamp = nowIso()
    const babyId = activeBabyId(request)
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
    const session = db.prepare("SELECT * FROM bath_sessions WHERE id = ? AND baby_id = ?").get(request.params.id, activeBabyId(request))
    if (!session) return sendApiError(response, 404, "bath_session_not_found")
    const items = db.prepare("SELECT * FROM bath_checks WHERE bath_session_id = ? ORDER BY id").all(session.id)
    response.json({ ...session, items })
  })

  app.put("/api/baths/:bathId/items/:itemId", (request, response) => {
    const session = db.prepare("SELECT 1 FROM bath_sessions WHERE id = ? AND baby_id = ?").get(request.params.bathId, activeBabyId(request))
    if (!session) return sendApiError(response, 404, "bath_session_not_found")
    const completed = request.body.completed ? 1 : 0
    const result = db.prepare(`
      UPDATE bath_checks SET completed = ?, completed_at = ?
      WHERE id = ? AND bath_session_id = ?
    `).run(completed, completed ? nowIso() : null, request.params.itemId, request.params.bathId)
    if (!result.changes) return sendApiError(response, 404, "bath_item_not_found")
    response.json(db.prepare("SELECT * FROM bath_checks WHERE id = ?").get(request.params.itemId))
  })

}
