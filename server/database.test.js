import assert from "node:assert/strict"
import Database from "better-sqlite3"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { createDatabase } from "./database.js"

test("migre les données existantes vers le premier bébé", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "babycare-migration-"))
  const databasePath = path.join(directory, "legacy.db")
  const legacy = new Database(databasePath)
  legacy.exec(`
    CREATE TABLE events (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, status TEXT NOT NULL, started_at TEXT NOT NULL, ended_at TEXT, duration_seconds INTEGER, value_real REAL, value_text TEXT, notes TEXT, metadata TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE daily_care (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, care_type TEXT NOT NULL, completed INTEGER NOT NULL DEFAULT 0, completed_at TEXT, UNIQUE(date, care_type));
    CREATE TABLE daily_care_validations (date TEXT PRIMARY KEY, event_id INTEGER, validated_at TEXT NOT NULL, FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE SET NULL);
    CREATE TABLE bath_sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, event_id INTEGER, started_at TEXT NOT NULL, completed_at TEXT, FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE SET NULL);
    CREATE TABLE bath_checks (id INTEGER PRIMARY KEY AUTOINCREMENT, bath_session_id INTEGER NOT NULL, item TEXT NOT NULL, completed INTEGER NOT NULL DEFAULT 0, completed_at TEXT, FOREIGN KEY(bath_session_id) REFERENCES bath_sessions(id) ON DELETE CASCADE);
    CREATE TABLE app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
    INSERT INTO app_settings VALUES ('baby_name', 'Lou', datetime('now'));
    INSERT INTO app_settings VALUES ('birth_date', '2025-12-03', datetime('now'));
    INSERT INTO app_settings VALUES ('baby_sex', 'girl', datetime('now'));
    INSERT INTO app_settings VALUES ('accent_color', 'green', datetime('now'));
    INSERT INTO app_settings VALUES ('language_preference', 'fr', datetime('now'));
    INSERT INTO events (type, status, started_at, created_at, updated_at) VALUES ('temperature', 'completed', '2026-01-01T12:00:00.000Z', '2026-01-01T12:00:00.000Z', '2026-01-01T12:00:00.000Z');
  `)
  legacy.close()

  const migrated = createDatabase(databasePath)
  try {
    const baby = migrated.prepare("SELECT * FROM babies").get()
    assert.equal(baby.name, "Lou")
    assert.equal(baby.accent_color, "green")
    assert.equal(baby.feeding_type, "breast")
    assert.equal(baby.bottle_enabled, 0)
    assert.equal(migrated.prepare("SELECT baby_id FROM events").get().baby_id, baby.id)
    assert.equal(Number(migrated.prepare("SELECT value FROM app_settings WHERE key = 'active_baby_id'").get().value), baby.id)
  } finally {
    migrated.close()
    fs.rmSync(directory, { recursive: true, force: true })
  }
})
