import Database from "better-sqlite3"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

function hasColumn(db, table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some((item) => item.name === column)
}

function migrateToBabies(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS babies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL DEFAULT '',
      birth_date TEXT NOT NULL DEFAULT '',
      sex TEXT NOT NULL DEFAULT '' CHECK(sex IN ('', 'girl', 'boy')),
      accent_color TEXT NOT NULL DEFAULT 'orange',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)

  if (!db.prepare("SELECT 1 FROM babies LIMIT 1").get()) {
    const settings = Object.fromEntries(db.prepare("SELECT key, value FROM app_settings").all().map(({ key, value }) => [key, value]))
    const timestamp = new Date().toISOString()
    const result = db.prepare(`
      INSERT INTO babies (name, birth_date, sex, accent_color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(settings.baby_name || "", settings.birth_date || "", settings.baby_sex || "", settings.accent_color || "orange", timestamp, timestamp)
    db.prepare("INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES ('active_baby_id', ?, ?)").run(String(result.lastInsertRowid), timestamp)
  }

  const activeBabyId = Number(db.prepare("SELECT value FROM app_settings WHERE key = 'active_baby_id'").get()?.value)
    || db.prepare("SELECT id FROM babies ORDER BY id LIMIT 1").get().id

  if (!hasColumn(db, "events", "baby_id")) {
    db.exec("ALTER TABLE events ADD COLUMN baby_id INTEGER REFERENCES babies(id) ON DELETE CASCADE")
    db.prepare("UPDATE events SET baby_id = ? WHERE baby_id IS NULL").run(activeBabyId)
  }

  if (!hasColumn(db, "daily_care", "baby_id")) {
    db.exec(`
      ALTER TABLE daily_care RENAME TO daily_care_legacy;
      CREATE TABLE daily_care (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        baby_id INTEGER NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        care_type TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        completed_at TEXT,
        UNIQUE(baby_id, date, care_type)
      );
    `)
    db.prepare(`
      INSERT INTO daily_care (id, baby_id, date, care_type, completed, completed_at)
      SELECT id, ?, date, care_type, completed, completed_at FROM daily_care_legacy
    `).run(activeBabyId)
    db.exec("DROP TABLE daily_care_legacy")
  }

  if (!hasColumn(db, "daily_care_validations", "baby_id")) {
    db.exec(`
      ALTER TABLE daily_care_validations RENAME TO daily_care_validations_legacy;
      CREATE TABLE daily_care_validations (
        baby_id INTEGER NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        event_id INTEGER,
        validated_at TEXT NOT NULL,
        PRIMARY KEY(baby_id, date),
        FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE SET NULL
      );
    `)
    db.prepare(`
      INSERT INTO daily_care_validations (baby_id, date, event_id, validated_at)
      SELECT ?, date, event_id, validated_at FROM daily_care_validations_legacy
    `).run(activeBabyId)
    db.exec("DROP TABLE daily_care_validations_legacy")
  }

  if (!hasColumn(db, "bath_sessions", "baby_id")) {
    db.exec("ALTER TABLE bath_sessions ADD COLUMN baby_id INTEGER REFERENCES babies(id) ON DELETE CASCADE")
    db.prepare(`
      UPDATE bath_sessions
      SET baby_id = COALESCE((SELECT baby_id FROM events WHERE events.id = bath_sessions.event_id), ?)
      WHERE baby_id IS NULL
    `).run(activeBabyId)
  }

  db.prepare("UPDATE app_settings SET value = ? WHERE key = 'active_baby_id' AND NOT EXISTS (SELECT 1 FROM babies WHERE id = CAST(value AS INTEGER))").run(String(activeBabyId))
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_events_baby_started_at ON events(baby_id, started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_daily_care_baby_date ON daily_care(baby_id, date);
    CREATE INDEX IF NOT EXISTS idx_bath_sessions_baby ON bath_sessions(baby_id);
  `)
}

export function createDatabase(databasePath = process.env.DATABASE_PATH || path.join(projectRoot, "data", "babycare.db")) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true })

  const db = new Database(databasePath)
  db.pragma("journal_mode = WAL")
  db.pragma("foreign_keys = ON")
  db.pragma("busy_timeout = 5000")

  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('running', 'completed')),
      started_at TEXT NOT NULL,
      ended_at TEXT,
      duration_seconds INTEGER,
      value_real REAL,
      value_text TEXT,
      notes TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS daily_care (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      care_type TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      UNIQUE(date, care_type)
    );

    CREATE TABLE IF NOT EXISTS daily_care_validations (
      date TEXT PRIMARY KEY,
      event_id INTEGER,
      validated_at TEXT NOT NULL,
      FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS bath_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS bath_checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bath_session_id INTEGER NOT NULL,
      item TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      FOREIGN KEY(bath_session_id) REFERENCES bath_sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    INSERT OR IGNORE INTO app_settings (key, value, updated_at)
    VALUES ('baby_name', '', datetime('now'));
    INSERT OR IGNORE INTO app_settings (key, value, updated_at)
    VALUES ('birth_date', '', datetime('now'));
    INSERT OR IGNORE INTO app_settings (key, value, updated_at)
    VALUES ('baby_sex', '', datetime('now'));
    INSERT OR IGNORE INTO app_settings (key, value, updated_at)
    VALUES ('language_preference', 'system', datetime('now'));

    CREATE INDEX IF NOT EXISTS idx_events_started_at ON events(started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
    CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
  `)

  db.transaction(() => migrateToBabies(db))()
  return db
}

export function cleanupTemporaryData(db) {
  db.prepare("DELETE FROM daily_care WHERE date < date('now', '-7 days')").run()
  db.prepare(`
    DELETE FROM bath_sessions
    WHERE date(started_at) < date('now', '-7 days')
  `).run()
}
