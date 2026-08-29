import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { createApp } from "./app.js"
import { createDatabase } from "./database.js"

async function withServer(run) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "babycare-test-"))
  const db = createDatabase(path.join(directory, "test.db"))
  const server = createApp({ db }).listen(0, "127.0.0.1")
  await new Promise((resolve) => server.once("listening", resolve))
  const address = server.address()
  try {
    await run(`http://127.0.0.1:${address.port}`)
  } finally {
    await new Promise((resolve) => server.close(resolve))
    db.close()
    fs.rmSync(directory, { recursive: true, force: true })
  }
}

test("crée et liste un événement instantané", () => withServer(async (baseUrl) => {
  const created = await fetch(`${baseUrl}/api/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "temperature", value_real: 37.2, notes: "Tout va bien" })
  })
  assert.equal(created.status, 201)

  const history = await fetch(`${baseUrl}/api/events`).then((response) => response.json())
  assert.equal(history.total, 1)
  assert.equal(history.events[0].value_real, 37.2)
  assert.equal(history.events[0].notes, "Tout va bien")
}))

test("conserve puis termine un chrono", () => withServer(async (baseUrl) => {
  const started = await fetch(`${baseUrl}/api/events/start`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "breast_right" })
  }).then((response) => response.json())

  const running = await fetch(`${baseUrl}/api/events/running`).then((response) => response.json())
  assert.equal(running.length, 1)
  assert.equal(running[0].id, started.id)

  const stopped = await fetch(`${baseUrl}/api/events/${started.id}/stop`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ notes: "Bonne tétée" })
  }).then((response) => response.json())
  assert.equal(stopped.status, "completed")
  assert.equal(stopped.notes, "Bonne tétée")
  assert.ok(stopped.duration_seconds >= 0)
}))

test("initialise et met à jour la checklist quotidienne", () => withServer(async (baseUrl) => {
  const care = await fetch(`${baseUrl}/api/routines/daily`).then((response) => response.json())
  assert.equal(care.length, 4)

  const updated = await fetch(`${baseUrl}/api/routines/daily/eyes`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ completed: true })
  }).then((response) => response.json())
  assert.equal(updated.completed, 1)
  assert.ok(updated.completed_at)
}))

test("génère un export Excel filtrable", () => withServer(async (baseUrl) => {
  await fetch(`${baseUrl}/api/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "diaper", metadata: { diaper_type: "mixed" } })
  })
  const response = await fetch(`${baseUrl}/api/export/xlsx?type=diaper`)
  assert.equal(response.status, 200)
  assert.match(response.headers.get("content-type"), /spreadsheetml/)
  assert.ok((await response.arrayBuffer()).byteLength > 1000)
}))
