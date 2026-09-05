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
