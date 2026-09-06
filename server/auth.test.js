import assert from "node:assert/strict"
import test from "node:test"
import { createAuth } from "./auth.js"

test("cookies protégés, expiration et limitation des tentatives", () => {
  let now = 1
  const auth = createAuth({ password: "a-test-password-1234", secure: true, now: () => now })
  let status = 200
  let token
  let attributes
  const response = { cookie(_name, value, options) { token = value; attributes = options }, json() {}, status(code) { status = code; return this }, setHeader() {} }
  auth.login({ headers: {}, body: { password: "a-test-password-1234" } }, response)
  assert.equal(attributes.httpOnly, true)
  assert.equal(attributes.secure, true)
  assert.equal(attributes.sameSite, "strict")
  const request = { headers: { cookie: `babycare_session=${token}` } }
  assert.ok(auth.session(request))
  now += 8 * 24 * 60 * 60 * 1000
  assert.equal(auth.session(request), null)
  for (let i = 0; i < 11; i++) auth.login({ headers: {}, body: { password: "wrong" } }, response)
  assert.equal(status, 429)
})

test("démarre sans mot de passe et permet d’en définir un", async () => {
  const fs = await import("node:fs")
  const os = await import("node:os")
  const path = await import("node:path")
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "babycare-password-"))
  try {
    const auth = createAuth({ directory, password: "" })
    const file = path.join(directory, ".auth-password")
    assert.equal(fs.existsSync(file), false)
    const generated = "abc123"
    let status = 200
    const response = { cookie() {}, json() {}, status(code) { status = code; return this }, setHeader() {} }
    const request = { headers: {}, body: { currentPassword: "wrong", newPassword: generated } }
    auth.changePassword(request, response)
    assert.equal(status, 200)
    assert.equal(fs.readFileSync(file, "utf8").trim(), "abc123")
    assert.equal(fs.statSync(file).mode & 0o777, 0o600)
    assert.equal(auth.enabled(), true)
  } finally { fs.rmSync(directory, { recursive: true, force: true }) }
})

test("ne remplace pas un mot de passe géré par l’environnement", () => {
  const auth = createAuth({ password: "managed-password" })
  let status
  auth.changePassword({ body: { currentPassword: "managed-password", newPassword: "abc123" } }, { status(code) { status = code; return this }, json() {} })
  assert.equal(status, 409)
})
