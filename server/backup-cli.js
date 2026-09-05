import Database from "better-sqlite3"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { backupDatabase, restoreBackup } from "./backups.js"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const [command, source, destination] = process.argv.slice(2)
try {
  if (command === "restore" && source && destination) {
    await restoreBackup(path.resolve(source), path.resolve(destination))
    console.log(`Restauration vérifiée : ${path.resolve(destination)}`)
  } else if (command === "backup") {
    const db = new Database(process.env.DATABASE_PATH || path.join(root, "data", "babycare.db"), { readonly: true, fileMustExist: true })
    try { console.log(await backupDatabase(db)) } finally { db.close() }
  } else throw new Error("Usage : npm run backup | npm run restore -- sauvegarde.db nouveau-fichier.db")
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
