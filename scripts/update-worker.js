#!/usr/bin/env node

import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { pipeline } from "node:stream/promises"
import { Readable } from "node:stream"
import { spawnSync } from "node:child_process"

const appRoot = process.env.BABYCARE_APP_ROOT || "/opt/babycare"
const updateDirectory = process.env.BABYCARE_UPDATE_DIR || path.join(appRoot, "data", "update")
const releasesDirectory = path.join(appRoot, "releases")
const currentLink = path.join(appRoot, "current")
const requestPath = path.join(updateDirectory, "request.json")
const statusPath = path.join(updateDirectory, "status.json")
const rollbackPath = path.join(updateDirectory, "rollback.json")
const lockPath = path.join(updateDirectory, "worker.lock")
const serviceName = process.env.BABYCARE_SERVICE_NAME || "babycare.service"
const healthUrl = process.env.BABYCARE_HEALTH_URL || "http://127.0.0.1:3000/api/health"

function writeStatus(state, progress, command, extra = {}) {
  fs.mkdirSync(updateDirectory, { recursive: true })
  const temporaryPath = `${statusPath}.${process.pid}.tmp`
  fs.writeFileSync(temporaryPath, `${JSON.stringify({ state, progress, command, updatedAt: new Date().toISOString(), ...extra }, null, 2)}\n`, { mode: 0o644 })
  // systemd's UMask=0027 strips world-read on creation. Set permissions
  // before publishing so the application can read every status snapshot.
  fs.chmodSync(temporaryPath, 0o644)
  fs.renameSync(temporaryPath, statusPath)
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", ...options })
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} : ${(result.stderr || result.stdout).trim()}`)
  return result.stdout
}

function validateNativeDependencies(releaseDirectory, version) {
  writeStatus("installing", 76, "Validation des dépendances natives distribuées", { targetVersion: version })
  run(process.execPath, [path.join(releaseDirectory, "scripts", "verify-native-runtime.js")], {
    cwd: releaseDirectory,
    env: { ...process.env, NODE_ENV: "production" }
  })
}

function validateVersion(value) {
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(value || "")) throw new Error("Version de release invalide")
  return value
}

function validateDownloadUrl(value) {
  const url = new URL(value)
  if (url.protocol !== "https:" || url.hostname !== "github.com") throw new Error("URL de release non autorisée")
  return url
}

async function download(url, destination, progressStart, progressEnd, command, extra = {}) {
  const response = await fetch(validateDownloadUrl(url), { redirect: "follow", signal: AbortSignal.timeout(10 * 60 * 1000) })
  if (!response.ok || !response.body) throw new Error(`Téléchargement impossible (${response.status})`)
  const total = Number(response.headers.get("content-length")) || 0
  let received = 0
  let lastProgress = progressStart - 1
  const stream = Readable.fromWeb(response.body)
  stream.on("data", (chunk) => {
    received += chunk.length
    const measuredProgress = total
      ? Math.round(progressStart + (received / total) * (progressEnd - progressStart))
      : progressStart + Math.floor(received / (2 * 1024 * 1024))
    const progress = Math.min(progressEnd - 1, measuredProgress)
    if (progress > lastProgress) {
      lastProgress = progress
      writeStatus("downloading", progress, command, extra)
    }
  })
  await pipeline(stream, fs.createWriteStream(destination, { mode: 0o600 }))
  writeStatus("downloading", progressEnd, command, extra)
}

function sha256(filePath) {
  const hash = crypto.createHash("sha256")
  hash.update(fs.readFileSync(filePath))
  return hash.digest("hex")
}

function atomicSymlink(target) {
  const temporaryLink = `${currentLink}.${process.pid}.tmp`
  fs.symlinkSync(target, temporaryLink)
  fs.renameSync(temporaryLink, currentLink)
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const response = await fetch(healthUrl, { signal: AbortSignal.timeout(2_000), cache: "no-store" })
      if (response.ok) return true
    } catch {
      // The service is expected to be temporarily unavailable while restarting.
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000))
  }
  return false
}

async function restartAndCheck(version) {
  run("systemctl", ["restart", serviceName])
  writeStatus("checking", 98, `Contrôle de santé de BabyCare v${version}`, { targetVersion: version })
  return waitForHealth()
}

async function installUpdate(request) {
  const version = validateVersion(request.version)
  validateDownloadUrl(request.archiveUrl)
  validateDownloadUrl(request.checksumUrl)
  if (!fs.lstatSync(currentLink).isSymbolicLink()) throw new Error(`${currentLink} doit être un lien symbolique`)

  const workDirectory = fs.mkdtempSync(path.join(updateDirectory, "install-"))
  const archivePath = path.join(workDirectory, "release.tar.gz")
  const checksumPath = `${archivePath}.sha256`
  const stagingDirectory = path.join(releasesDirectory, `.${version}-${process.pid}`)
  const releaseDirectory = path.join(releasesDirectory, version)
  const previousTarget = fs.realpathSync(currentLink)

  try {
    writeStatus("downloading", 0, `Téléchargement de babycare-v${version}`, { targetVersion: version })
    await download(request.archiveUrl, archivePath, 0, 49, `Téléchargement de babycare-v${version}`, { targetVersion: version })
    await download(request.checksumUrl, checksumPath, 49, 50, "Téléchargement du checksum SHA-256", { targetVersion: version })

    writeStatus("verifying", 54, "Vérification SHA-256 de la release", { targetVersion: version })
    const expectedChecksum = fs.readFileSync(checksumPath, "utf8").trim().split(/\s+/)[0]
    if (!/^[a-f0-9]{64}$/i.test(expectedChecksum) || sha256(archivePath) !== expectedChecksum.toLowerCase()) {
      throw new Error("Le checksum SHA-256 de la release ne correspond pas")
    }
    writeStatus("verifying", 59, "Contrôle du contenu de l’archive", { targetVersion: version })
    const entries = run("tar", ["-tzf", archivePath]).split("\n").filter(Boolean)
    if (!entries.length || entries.some((entry) => path.isAbsolute(entry) || entry.split("/").includes(".."))) {
      throw new Error("Contenu d’archive non autorisé")
    }

    writeStatus("extracting", 64, `Extraction de BabyCare v${version}`, { targetVersion: version })
    fs.mkdirSync(stagingDirectory, { recursive: true, mode: 0o755 })
    run("tar", ["-xzf", archivePath, "-C", stagingDirectory])
    writeStatus("installing", 70, "Validation des fichiers de la release", { targetVersion: version })
    const manifestPath = path.join(stagingDirectory, "package.json")
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"))
    if (manifest.name !== "babycare" || manifest.version !== version) throw new Error("La release ne correspond pas à la version demandée")
    for (const requiredPath of ["server/app.js", "dist-modern/index.html", "dist-ios15/index.html", "node_modules", "scripts/verify-native-runtime.js", ".npmrc"]) {
      if (!fs.existsSync(path.join(stagingDirectory, requiredPath))) throw new Error(`Release incomplète : ${requiredPath} absent`)
    }
    validateNativeDependencies(stagingDirectory, version)

    writeStatus("installing", 82, `Préparation de BabyCare v${version}`, { targetVersion: version })
    if (fs.existsSync(releaseDirectory)) fs.renameSync(releaseDirectory, `${releaseDirectory}.replaced-${Date.now()}`)
    fs.renameSync(stagingDirectory, releaseDirectory)
    writeStatus("installing", 87, "Application des permissions de la release", { targetVersion: version })
    run("chown", ["-R", "babycare:babycare", releaseDirectory])
    writeStatus("installing", 92, `Activation atomique de BabyCare v${version}`, { targetVersion: version })
    atomicSymlink(releaseDirectory)
    fs.writeFileSync(rollbackPath, `${JSON.stringify({ target: previousTarget, version: path.basename(previousTarget), createdAt: new Date().toISOString() }, null, 2)}\n`, { mode: 0o644 })
    fs.chmodSync(rollbackPath, 0o644)

    writeStatus("restarting", 95, `Redémarrage de BabyCare v${version}`, { targetVersion: version })
    const healthy = await restartAndCheck(version)
    if (!healthy) {
      writeStatus("restarting", 99, "Échec du contrôle de santé, rollback automatique", { targetVersion: version })
      atomicSymlink(previousTarget)
      await restartAndCheck(path.basename(previousTarget))
      throw new Error(`BabyCare v${version} n’a pas répondu au contrôle de santé ; rollback automatique effectué`)
    }
    writeStatus("complete", 100, `BabyCare v${version} est actif`, { targetVersion: version })
  } finally {
    fs.rmSync(workDirectory, { recursive: true, force: true })
    if (fs.existsSync(stagingDirectory)) fs.rmSync(stagingDirectory, { recursive: true, force: true })
  }
}

async function rollback() {
  const rollbackState = JSON.parse(fs.readFileSync(rollbackPath, "utf8"))
  const target = fs.realpathSync(rollbackState.target)
  if (!target.startsWith(`${fs.realpathSync(releasesDirectory)}${path.sep}`)) throw new Error("Cible de rollback non autorisée")
  const currentTarget = fs.realpathSync(currentLink)
  writeStatus("installing", 82, `Retour vers BabyCare v${rollbackState.version}`, { targetVersion: rollbackState.version })
  atomicSymlink(target)
  fs.writeFileSync(rollbackPath, `${JSON.stringify({ target: currentTarget, version: path.basename(currentTarget), createdAt: new Date().toISOString() }, null, 2)}\n`, { mode: 0o644 })
  fs.chmodSync(rollbackPath, 0o644)
  writeStatus("restarting", 95, `Redémarrage de BabyCare v${rollbackState.version}`, { targetVersion: rollbackState.version })
  if (!await restartAndCheck(rollbackState.version)) {
    atomicSymlink(currentTarget)
    await restartAndCheck(path.basename(currentTarget))
    throw new Error("Le rollback n’a pas passé le contrôle de santé ; la version initiale a été restaurée")
  }
  writeStatus("complete", 100, `Rollback vers BabyCare v${rollbackState.version} terminé`, { targetVersion: rollbackState.version })
}

async function main() {
  fs.mkdirSync(updateDirectory, { recursive: true })
  let lock
  try {
    lock = fs.openSync(lockPath, "wx", 0o600)
  } catch (error) {
    if (error.code === "EEXIST") return
    throw error
  }
  try {
    if (!fs.existsSync(requestPath)) return
    const request = JSON.parse(fs.readFileSync(requestPath, "utf8"))
    fs.rmSync(requestPath)
    if (request.action === "update") await installUpdate(request)
    else if (request.action === "rollback") await rollback()
    else throw new Error("Action de mise à jour inconnue")
  } catch (error) {
    writeStatus("error", 100, "Mise à jour interrompue", { message: error instanceof Error ? error.message : String(error) })
    process.exitCode = 1
  } finally {
    if (lock !== undefined) fs.closeSync(lock)
    fs.rmSync(lockPath, { force: true })
  }
}

await main()
