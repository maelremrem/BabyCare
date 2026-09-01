#!/usr/bin/env node

import Database from "better-sqlite3"

const database = new Database(":memory:")

try {
  const result = database.prepare("SELECT 1 AS ok").get()
  if (result?.ok !== 1) throw new Error("La requête de contrôle SQLite a échoué")
  console.log(`better-sqlite3 validé avec Node ${process.versions.node} (${process.platform}/${process.arch})`)
} finally {
  database.close()
}
