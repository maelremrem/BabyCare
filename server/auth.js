import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"

const COOKIE = "babycare_session"
const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
const SESSION_MS = 7 * 24 * 60 * 60 * 1000

export function createAuth({ directory, password = process.env.BABYCARE_PASSWORD, secure = process.env.BABYCARE_COOKIE_SECURE === "true", now = Date.now } = {}) {
  const file = password ? null : process.env.BABYCARE_PASSWORD_FILE || path.join(directory, ".auth-password")
  if (!password) {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    try {
      fs.writeFileSync(file, `${Array.from({ length: 6 }, () => PASSWORD_ALPHABET[crypto.randomInt(PASSWORD_ALPHABET.length)]).join("")}\n`, { flag: "wx", mode: 0o600 })
      console.info(`BabyCare : mot de passe initial disponible dans ${file}`)
    } catch (error) {
      if (error.code !== "EEXIST") throw error
    }
    password = fs.readFileSync(file, "utf8").trim()
  }
  if (typeof password !== "string" || password.length < 6 || password.length > 1024) throw new Error("Le mot de passe BabyCare doit contenir entre 6 et 1024 caractères.")
  const salt = crypto.randomBytes(16)
  let expected = crypto.scryptSync(password, salt, 64)
  const sessions = new Map()
  let attempts = 0
  let windowEnds = 0
  const tokenFor = (request) => request.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1)
  function session(request) {
    const token = tokenFor(request)
    const entry = sessions.get(token)
    if (!entry || entry.expires <= now()) {
      sessions.delete(token)
      return null
    }
    return entry
  }
  function cookie(response, token, maxAge) {
    response.cookie(COOKIE, token, { httpOnly: true, sameSite: "strict", secure, path: "/", maxAge })
  }
  function allowAttempt(response) {
    if (now() >= windowEnds) { attempts = 0; windowEnds = now() + 60_000 }
    if (++attempts <= 10) return true
    response.setHeader("Retry-After", String(Math.ceil((windowEnds - now()) / 1000)))
    response.status(429).json({ code: "login_rate_limited", error: "Trop de tentatives. Réessayez dans une minute." })
    return false
  }
  function matches(value) {
    return typeof value === "string" && value.length <= 1024 && crypto.timingSafeEqual(crypto.scryptSync(value, salt, 64), expected)
  }
  return {
    session,
    changePassword(request, response) {
      if (!file) return response.status(409).json({ code: "password_managed", error: "Le mot de passe est défini dans la configuration du serveur." })
      if (!allowAttempt(response)) return
      if (!matches(request.body?.currentPassword)) return response.status(403).json({ code: "invalid_password", error: "Mot de passe actuel incorrect." })
      const nextPassword = request.body?.newPassword
      if (typeof nextPassword !== "string" || nextPassword.length < 6 || nextPassword.length > 1024 || nextPassword.trim() !== nextPassword || /[\r\n]/.test(nextPassword)) {
        return response.status(400).json({ code: "invalid_new_password", error: "Choisissez un mot de passe de 6 à 1024 caractères, sans espaces au début ou à la fin." })
      }
      const nextHash = crypto.scryptSync(nextPassword, salt, 64)
      const temporary = `${file}.${crypto.randomBytes(8).toString("hex")}.tmp`
      try {
        fs.writeFileSync(temporary, `${nextPassword}\n`, { flag: "wx", mode: 0o600 })
        fs.renameSync(temporary, file)
      } finally { fs.rmSync(temporary, { force: true }) }
      expected = nextHash
      sessions.clear()
      const token = crypto.randomBytes(32).toString("base64url")
      sessions.set(token, { expires: now() + SESSION_MS })
      cookie(response, token, SESSION_MS)
      response.json({ changed: true })
    },
    login(request, response) {
      if (!allowAttempt(response)) return
      const submitted = request.body?.password
      const valid = matches(submitted)
      if (!valid) return response.status(401).json({ code: "invalid_password", error: "Mot de passe incorrect." })
      for (const [token, entry] of sessions) if (entry.expires <= now()) sessions.delete(token)
      if (sessions.size >= 100) return response.status(429).json({ code: "session_limit", error: "Trop de sessions ouvertes." })
      sessions.delete(tokenFor(request))
      const token = crypto.randomBytes(32).toString("base64url")
      sessions.set(token, { expires: now() + SESSION_MS })
      cookie(response, token, SESSION_MS)
      return response.json({ authenticated: true })
    },
    logout(request, response) {
      sessions.delete(tokenFor(request))
      cookie(response, "", 0)
      response.status(204).end()
    }
  }
}

export function installAuth(app, auth) {
  app.use("/api", (request, response, next) => {
    response.setHeader("Cache-Control", "no-store")
    response.setHeader("X-Content-Type-Options", "nosniff")
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && request.get("X-BabyCare-Request") !== "1") {
      return response.status(403).json({ code: "csrf_required", error: "Requête non autorisée." })
    }
    next()
  })
  app.get("/api/auth/session", (request, response) => response.json({ authenticated: Boolean(auth.session(request)) }))
  app.post("/api/auth/session", (request, response) => auth.login(request, response))
  app.delete("/api/auth/session", (request, response) => auth.logout(request, response))
  app.use("/api", (request, response, next) => {
    if (request.path === "/health" && request.method === "GET") return next()
    if (!auth.session(request)) return response.status(401).json({ code: "authentication_required", error: "Connectez-vous pour accéder à BabyCare." })
    next()
  })
  app.put("/api/auth/password", (request, response) => auth.changePassword(request, response))
}
