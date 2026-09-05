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

test("génère six caractères et conserve le changement après redémarrage", async () => {
  const fs = await import("node:fs")
  const os = await import("node:os")
  const path = await import("node:path")
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "babycare-password-"))
  try {
    const auth = createAuth({ directory, password: "" })
    const file = path.join(directory, ".auth-password")
    const generated = fs.readFileSync(file, "utf8").trim()
    assert.match(generated, /^[A-Za-z0-9]{6}$/)
    let status = 200
    let token
    const response = { cookie(_name, value) { token = value }, json() {}, status(code) { status = code; return this }, setHeader() {} }
    const login = (service, password) => { status = 200; service.login({ headers: {}, body: { password } }, response); return token }
    const first = login(auth, generated)
    const second = login(auth, generated)
    const request = { headers: { cookie: `babycare_session=${first}` }, body: { currentPassword: "wrong", newPassword: "abc123" } }
    auth.changePassword(request, response)
    assert.equal(status, 403)
    assert.equal(fs.readFileSync(file, "utf8").trim(), generated)
    request.body.currentPassword = generated
    request.body.newPassword = "short"
    auth.changePassword(request, response)
    assert.equal(status, 400)
    request.body.newPassword = "abc123"
    status = 200
    auth.changePassword(request, response)
    assert.equal(status, 200)
    assert.equal(auth.session({ headers: { cookie: `babycare_session=${second}` } }), null)
    assert.equal(auth.session(request), null)
    assert.ok(auth.session({ headers: { cookie: `babycare_session=${token}` } }))
    assert.equal(fs.readFileSync(file, "utf8").trim(), "abc123")
    assert.equal(fs.statSync(file).mode & 0o777, 0o600)
    const restarted = createAuth({ directory, password: "" })
    login(restarted, generated)
    assert.equal(status, 401)
    login(restarted, "abc123")
    assert.equal(status, 200)
  } finally { fs.rmSync(directory, { recursive: true, force: true }) }
})

test("ne remplace pas un mot de passe géré par l’environnement", () => {
  const auth = createAuth({ password: "managed-password" })
  let status
  auth.changePassword({ body: { currentPassword: "managed-password", newPassword: "abc123" } }, { status(code) { status = code; return this }, json() {} })
  assert.equal(status, 409)
})
