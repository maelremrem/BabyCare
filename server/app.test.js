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

test("gère le soin combiné, les irritations multiples et les observations", () => withServer(async (baseUrl) => {
  const combined = await fetch(`${baseUrl}/api/events/start`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "face_cord_care" })
  })
  assert.equal(combined.status, 201)

  const bathTimer = await fetch(`${baseUrl}/api/events/start`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "bath" })
  })
  assert.equal(bathTimer.status, 400)

  const irritation = await fetch(`${baseUrl}/api/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "irritation",
      metadata: { locations: ["visage", "cou", "torse"] },
      notes: "Rougeur légère"
    })
  }).then((response) => response.json())
  assert.deepEqual(irritation.metadata.locations, ["visage", "cou", "torse"])

  const observation = await fetch(`${baseUrl}/api/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "observation", notes: "Bébé semble fatigué" })
  }).then((response) => response.json())
  assert.equal(observation.type, "observation")
  assert.equal(observation.notes, "Bébé semble fatigué")
}))

test("limite les températures entre 34 et 44 degrés", () => withServer(async (baseUrl) => {
  const tooLow = await fetch(`${baseUrl}/api/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "temperature", value_real: 33.9 })
  })
  assert.equal(tooLow.status, 400)

  const maximum = await fetch(`${baseUrl}/api/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "temperature", value_real: 44 })
  })
  assert.equal(maximum.status, 201)
}))

test("signale une absence de selles de plus de 48 heures", () => withServer(async (baseUrl) => {
  const initial = await fetch(`${baseUrl}/api/alerts/stool`).then((response) => response.json())
  assert.equal(initial.overdue, true)
  assert.equal(initial.last_stool_at, null)
  assert.equal(initial.threshold_hours, 48)

  const oldStoolAt = new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString()
  await fetch(`${baseUrl}/api/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "diaper", started_at: oldStoolAt, metadata: { diaper_type: "stool" } })
  })
  const overdue = await fetch(`${baseUrl}/api/alerts/stool`).then((response) => response.json())
  assert.equal(overdue.overdue, true)
  assert.ok(overdue.hours_since >= 49)

  await fetch(`${baseUrl}/api/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "diaper", metadata: { diaper_type: "mixed" } })
  })
  const current = await fetch(`${baseUrl}/api/alerts/stool`).then((response) => response.json())
  assert.equal(current.overdue, false)
  assert.ok(current.last_stool_at)
}))

test("conserve le profil du bébé et refuse une naissance future", () => withServer(async (baseUrl) => {
  const initial = await fetch(`${baseUrl}/api/settings`).then((response) => response.json())
  assert.equal(initial.accent_color, "orange")
  assert.equal(initial.baby_name, "")
  assert.equal(initial.birth_date, "")
  assert.equal(initial.baby_sex, "")

  const saved = await fetch(`${baseUrl}/api/settings/profile`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ baby_name: "Lou", birth_date: "2025-12-03", baby_sex: "girl" })
  }).then((response) => response.json())
  assert.equal(saved.baby_name, "Lou")
  assert.equal(saved.birth_date, "2025-12-03")
  assert.equal(saved.baby_sex, "girl")

  const future = await fetch(`${baseUrl}/api/settings/profile`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ baby_name: "Lou", birth_date: "2999-01-01", baby_sex: "girl" })
  })
  assert.equal(future.status, 400)

  const invalidSex = await fetch(`${baseUrl}/api/settings/profile`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ baby_name: "Lou", birth_date: "2025-12-03", baby_sex: "unknown" })
  })
  assert.equal(invalidSex.status, 400)

  const color = await fetch(`${baseUrl}/api/settings/accent`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ color: "green" })
  }).then((response) => response.json())
  assert.equal(color.accent_color, "green")
  assert.equal(color.baby_name, "Lou")
}))

test("enregistre les mesures de poids et de taille", () => withServer(async (baseUrl) => {
  const weight = await fetch(`${baseUrl}/api/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "weight", value_real: 3.55 })
  }).then((response) => response.json())
  assert.equal(weight.value_real, 3.55)

  const height = await fetch(`${baseUrl}/api/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "height", value_real: 50.1 })
  }).then((response) => response.json())
  assert.equal(height.value_real, 50.1)

  const invalidHeight = await fetch(`${baseUrl}/api/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "height", value_real: 201 })
  })
  assert.equal(invalidHeight.status, 400)

  const medicalHistory = await fetch(`${baseUrl}/api/events?type=height`).then((response) => response.json())
  assert.equal(medicalHistory.total, 1)
  assert.equal(medicalHistory.events[0].type, "height")
}))

test("réinitialise la checklist après chaque validation", () => withServer(async (baseUrl) => {
  const tooEarly = await fetch(`${baseUrl}/api/routines/daily/validate`, { method: "POST" })
  assert.equal(tooEarly.status, 409)

  for (const careType of ["eyes", "nose", "cord", "face"]) {
    const response = await fetch(`${baseUrl}/api/routines/daily/${careType}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ completed: true })
    })
    assert.equal(response.status, 200)
  }

  const validatedResponse = await fetch(`${baseUrl}/api/routines/daily/validate`, { method: "POST" })
  assert.equal(validatedResponse.status, 201)
  const validated = await validatedResponse.json()
  assert.equal(validated.type, "daily_care")

  const care = await fetch(`${baseUrl}/api/routines/daily`).then((response) => response.json())
  assert.equal(care.length, 4)
  assert.ok(care.every((item) => item.completed === 0))
  assert.ok(care.every((item) => item.completed_at === null))
  assert.ok(care.every((item) => item.validated_at === null))

  const duplicateResponse = await fetch(`${baseUrl}/api/routines/daily/validate`, { method: "POST" })
  assert.equal(duplicateResponse.status, 409)

  for (const careType of ["eyes", "nose", "cord", "face"]) {
    const response = await fetch(`${baseUrl}/api/routines/daily/${careType}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ completed: true })
    })
    assert.equal(response.status, 200)
  }
  const secondValidation = await fetch(`${baseUrl}/api/routines/daily/validate`, { method: "POST" })
  assert.equal(secondValidation.status, 201)
  const secondEvent = await secondValidation.json()
  assert.notEqual(secondEvent.id, validated.id)

  const logs = await fetch(`${baseUrl}/api/events?type=daily_care`).then((response) => response.json())
  assert.equal(logs.total, 2)
}))
