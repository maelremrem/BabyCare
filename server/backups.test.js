import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { createDatabase } from "./database.js"
import { backupDatabase, restoreBackup, verifyBackup } from "./backups.js"

test("sauvegarde WAL, rétention et restauration vérifiée sans écrasement", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "babycare-backup-test-"))
  const db = createDatabase(path.join(directory, "live.db"))
  try {
    db.prepare("UPDATE babies SET name = 'Sauvegardé' WHERE id = 1").run()
    const snapshot = await backupDatabase(db, { keep: 2 })
    db.prepare("UPDATE babies SET name = 'Modifié' WHERE id = 1").run()
    const restoredPath = path.join(directory, "restored.db")
    await restoreBackup(snapshot, restoredPath)
    const restored = createDatabase(restoredPath)
    try { assert.equal(restored.prepare("SELECT name FROM babies WHERE id = 1").get().name, "Sauvegardé") } finally { restored.close() }
    await assert.rejects(restoreBackup(snapshot, restoredPath), /EEXIST/)
    await backupDatabase(db, { keep: 2 })
    await backupDatabase(db, { keep: 2 })
    assert.equal(fs.readdirSync(path.join(directory, "backups")).length, 2)
    const invalid = path.join(directory, "invalid.db")
    fs.writeFileSync(invalid, "not a database")
    assert.throws(() => verifyBackup(invalid))
    await assert.rejects(restoreBackup(invalid, path.join(directory, "bad-restore.db")))
    assert.equal(fs.existsSync(path.join(directory, "bad-restore.db")), false)
  } finally { db.close(); fs.rmSync(directory, { recursive: true, force: true }) }
})
