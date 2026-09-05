import Database from "better-sqlite3"
import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"

export function verifyBackup(file) {
  const db = new Database(file, { readonly: true, fileMustExist: true })
  try {
    if (db.pragma("integrity_check", { simple: true }) !== "ok" || db.pragma("foreign_key_check").length) throw new Error("Sauvegarde SQLite invalide")
    for (const table of ["events", "app_settings"]) {
      if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(table)) throw new Error("Ce fichier n’est pas une base BabyCare")
    }
  } finally { db.close() }
}

function finalizeSnapshot(file) {
  const snapshot = new Database(file, { fileMustExist: true })
  try { snapshot.pragma("journal_mode = DELETE") } finally { snapshot.close() }
  verifyBackup(file)
}

export async function backupDatabase(db, { directory = path.join(path.dirname(db.name), "backups"), keep = 14 } = {}) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 })
  const name = `babycare-${new Date().toISOString().replaceAll(":", "-")}-${crypto.randomBytes(4).toString("hex")}.db`
  const target = path.join(directory, name)
  const temporary = `${target}.tmp`
  try {
    fs.closeSync(fs.openSync(temporary, "wx", 0o600))
    await db.backup(temporary)
    finalizeSnapshot(temporary)
    fs.renameSync(temporary, target)
    const backups = fs.readdirSync(directory).filter((file) => /^babycare-.*\.db$/.test(file)).sort().reverse()
    for (const file of backups.slice(Math.max(1, keep))) fs.unlinkSync(path.join(directory, file))
    return target
  } finally { fs.rmSync(temporary, { force: true }) }
}

export async function backupExistingDatabase(file) {
  if (!fs.existsSync(file)) return
  const db = new Database(file, { readonly: true, fileMustExist: true })
  try { return await backupDatabase(db) } finally { db.close() }
}

// Restore to a NEW file: never overwrite a running database or its WAL.
export async function restoreBackup(source, destination) {
  verifyBackup(source)
  fs.mkdirSync(path.dirname(destination), { recursive: true })
  fs.closeSync(fs.openSync(destination, "wx", 0o600))
  const db = new Database(source, { readonly: true, fileMustExist: true })
  try {
    await db.backup(destination)
    finalizeSnapshot(destination)
  } catch (error) {
    fs.rmSync(destination, { force: true })
    throw error
  } finally { db.close() }
}
