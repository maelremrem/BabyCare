import Database from "better-sqlite3"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

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
    VALUES ('accent_color', 'orange', datetime('now'));

    INSERT OR IGNORE INTO app_settings (key, value, updated_at)
    VALUES ('baby_name', '', datetime('now'));

    INSERT OR IGNORE INTO app_settings (key, value, updated_at)
    VALUES ('birth_date', '', datetime('now'));

    CREATE INDEX IF NOT EXISTS idx_events_started_at ON events(started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
    CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
  `)

  return db
}

export function cleanupTemporaryData(db) {
  db.prepare("DELETE FROM daily_care WHERE date < date('now', '-7 days')").run()
  db.prepare(`
    DELETE FROM bath_sessions
    WHERE date(started_at) < date('now', '-7 days')
  `).run()
}
