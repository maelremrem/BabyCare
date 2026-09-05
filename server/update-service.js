import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"))
const DEFAULT_RELEASE_API = "https://api.github.com/repos/maelremrem/BabyCare/releases/latest"
const ACTIVE_UPDATE_STATES = new Set(["queued", "downloading", "verifying", "extracting", "installing", "restarting", "checking"])

function normalizeVersion(value = "") {
  return String(value).trim().replace(/^v/i, "")
}

function versionParts(value) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(normalizeVersion(value))
  if (!match) return null
  return [Number(match[1]), Number(match[2]), Number(match[3]), match[4] || ""]
}

export function compareVersions(left, right) {
  const a = versionParts(left)
  const b = versionParts(right)
  if (!a || !b) return 0
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1
  }
  if (a[3] === b[3]) return 0
  if (!a[3]) return 1
  if (!b[3]) return -1
  return a[3].localeCompare(b[3])
}

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"))
  } catch {
    return fallback
  }
}

function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  const temporaryPath = `${filePath}.${process.pid}.tmp`
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o640 })
  fs.renameSync(temporaryPath, filePath)
}

function platformAssetSuffix() {
  const architectures = { x64: "amd64", arm64: "arm64" }
  return process.platform === "linux" && architectures[process.arch]
    ? `linux-${architectures[process.arch]}`
    : null
}

export function createUpdateService({
  currentVersion = packageJson.version,
  enabled = process.env.BABYCARE_UPDATE_ENABLED === "true",
  updateDirectory = process.env.BABYCARE_UPDATE_DIR || path.join(projectRoot, "data", "update"),
  releaseApiUrl = process.env.BABYCARE_RELEASE_API_URL || DEFAULT_RELEASE_API,
  fetchImpl = globalThis.fetch,
  cacheDurationMs = 5 * 60 * 1000,
  assetSuffix = platformAssetSuffix(),
  runtime = process.env.BABYCARE_UPDATE_RUNTIME || "systemd"
} = {}) {
  const statusPath = path.join(updateDirectory, "status.json")
  const requestPath = path.join(updateDirectory, "request.json")
  const rollbackPath = path.join(updateDirectory, "rollback.json")
  let cachedRelease = null
  let cachedAt = 0
  let lastStoredStatus = {}

  async function latestRelease(force = false) {
    if (!enabled) return null
    if (!force && cachedRelease && Date.now() - cachedAt < cacheDurationMs) return cachedRelease
    const response = await fetchImpl(releaseApiUrl, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": `BabyCare/${currentVersion}`,
        "X-GitHub-Api-Version": "2022-11-28"
      },
      signal: AbortSignal.timeout(10_000)
    })
    if (!response.ok) throw new Error(`GitHub Releases returned ${response.status}`)
    const release = await response.json()
    const version = normalizeVersion(release.tag_name)
    const suffix = assetSuffix
    const archiveName = suffix ? `babycare-v${version}-${suffix}.tar.gz` : ""
    const checksumName = `${archiveName}.sha256`
    const assets = Array.isArray(release.assets) ? release.assets : []
    const archive = assets.find((asset) => asset.name === archiveName)
    const checksum = assets.find((asset) => asset.name === checksumName)
    cachedRelease = {
      version,
      name: release.name || release.tag_name,
      publishedAt: release.published_at || null,
      releaseUrl: release.html_url || null,
      archiveUrl: archive?.browser_download_url || null,
      checksumUrl: checksum?.browser_download_url || null,
      supported: runtime === "docker" || Boolean(suffix && archive && checksum)
    }
    cachedAt = Date.now()
    return cachedRelease
  }

  function status() {
    const stored = readJson(statusPath, lastStoredStatus)
    lastStoredStatus = stored
    const rollback = readJson(rollbackPath)
    return {
      state: stored.state || "idle",
      progress: Number.isFinite(stored.progress) ? stored.progress : 0,
      command: stored.command || "",
      message: stored.message || "",
      targetVersion: stored.targetVersion || null,
      updatedAt: stored.updatedAt || null,
      canRollback: Boolean(rollback?.target),
      rollbackVersion: rollback?.version || null,
      active: ACTIVE_UPDATE_STATES.has(stored.state)
    }
  }

  async function versionInfo({ force = false } = {}) {
    const base = { currentVersion, enabled, runtime, updateAvailable: false, availableVersion: null, releaseUrl: null, supported: false }
    if (!enabled) return { ...base, status: status() }
    try {
      const release = await latestRelease(force)
      return {
        ...base,
        availableVersion: release.version,
        updateAvailable: release.supported && compareVersions(release.version, currentVersion) > 0,
        releaseUrl: release.releaseUrl,
        publishedAt: release.publishedAt,
        supported: release.supported,
        status: status()
      }
    } catch (error) {
      return { ...base, checkError: error instanceof Error ? error.message : String(error), status: status() }
    }
  }

  async function requestUpdate() {
    const info = await versionInfo({ force: true })
    if (!enabled) return { error: "update_not_configured" }
    if (status().active) return { error: "update_already_running" }
    if (!info.updateAvailable) return { error: "no_update_available" }
    const release = await latestRelease()
    if (!release.supported || (runtime !== "docker" && (!release.archiveUrl || !release.checksumUrl))) return { error: "unsupported_release" }
    const requestedAt = new Date().toISOString()
    writeJsonAtomic(statusPath, {
      state: "queued",
      progress: 0,
      command: `Préparation de BabyCare v${release.version}`,
      targetVersion: release.version,
      updatedAt: requestedAt
    })
    writeJsonAtomic(requestPath, {
      action: "update",
      runtime,
      version: release.version,
      ...(runtime === "docker" ? {} : { archiveUrl: release.archiveUrl, checksumUrl: release.checksumUrl }),
      requestedAt
    })
    return status()
  }

  function requestRollback() {
    if (!enabled) return { error: "update_not_configured" }
    if (status().active) return { error: "update_already_running" }
    const rollback = readJson(rollbackPath)
    if (!rollback?.target) return { error: "rollback_unavailable" }
    const requestedAt = new Date().toISOString()
    writeJsonAtomic(statusPath, {
      state: "queued",
      progress: 0,
      command: `Préparation du retour vers BabyCare v${rollback.version || "précédente"}`,
      targetVersion: rollback.version || null,
      updatedAt: requestedAt
    })
    writeJsonAtomic(requestPath, { action: "rollback", runtime, requestedAt })
    return status()
  }

  return { currentVersion, enabled, status, versionInfo, requestUpdate, requestRollback }
}
