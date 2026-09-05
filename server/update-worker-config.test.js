import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import vm from "node:vm"
import { fileURLToPath } from "node:url"

const workerSource = fs.readFileSync(new URL("../scripts/update-worker.js", import.meta.url), "utf8")
const installerSource = fs.readFileSync(new URL("../scripts/install.sh", import.meta.url), "utf8")
const updateService = fs.readFileSync(new URL("../scripts/babycare-update.service", import.meta.url), "utf8")
const releaseWorkflow = fs.readFileSync(new URL("../.github/workflows/release.yml", import.meta.url), "utf8")
const releaseNpmrc = fs.readFileSync(new URL("../scripts/release.npmrc", import.meta.url), "utf8")
const dockerWorkerSource = fs.readFileSync(new URL("../scripts/docker-update-worker.sh", import.meta.url), "utf8")

test("publie un statut lisible par BabyCare même avec le umask systemd", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "babycare-status-permissions-"))
  const previousMask = process.umask(0o027)
  try {
    const source = workerSource.slice(workerSource.indexOf("function writeStatus("), workerSource.indexOf("\nfunction run("))
    let published = 0
    const context = vm.createContext({
      fs: { ...fs, renameSync(from, to) {
        assert.equal(fs.statSync(from).mode & 0o777, 0o644, "le statut doit être lisible avant sa publication")
        fs.renameSync(from, to)
        published += 1
      } },
      process, updateDirectory: directory, statusPath: path.join(directory, "status.json")
    })
    vm.runInContext(`${source}\nwriteStatus("downloading", 49, "Package téléchargé"); writeStatus("verifying", 54, "Vérification");`, context)
    assert.equal(published, 2)
  } finally {
    process.umask(previousMask)
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

test("the updater validates the packaged native runtime without rebuilding it", () => {
  assert.match(workerSource, /verify-native-runtime\.js/)
  assert.doesNotMatch(workerSource, /npm["'], \["rebuild"/)
})

test("the update progress dedicates 0-50 percent to downloading and details installation", () => {
  assert.match(workerSource, /archivePath, 0, 49/)
  assert.match(workerSource, /checksumPath, 49, 50/)
  assert.match(workerSource, /writeStatus\("verifying", 54/)
  assert.match(workerSource, /writeStatus\("extracting", 64/)
  assert.match(workerSource, /writeStatus\("installing", 70/)
  assert.match(workerSource, /writeStatus\("restarting", 95/)
  assert.match(workerSource, /writeStatus\("checking", 98/)

  assert.match(dockerWorkerSource, /write_status "downloading" 0/)
  assert.match(dockerWorkerSource, /write_status "downloading" 50/)
  assert.match(dockerWorkerSource, /write_status "verifying" 58/)
  assert.match(dockerWorkerSource, /write_status "installing" 70/)
  assert.match(dockerWorkerSource, /write_status "restarting" 95/)
  assert.match(dockerWorkerSource, /write_status "checking" 98/)
})

test("the updater remains isolated from home directories", () => {
  assert.match(updateService, /^ProtectHome=true$/m)
  assert.doesNotMatch(updateService, /^Environment=(?:HOME|XDG_CACHE_HOME|npm_config_devdir)=/m)
})

test("the installer verifies the native runtime instead of compiling on the server", () => {
  assert.match(installerSource, /verify-native-runtime\.js/)
  assert.match(installerSource, /require\('better-sqlite3'\)/)
  assert.doesNotMatch(installerSource, /npm rebuild better-sqlite3/)
})

test("release archives are verified and keep legacy updaters from running node-gyp", () => {
  assert.match(releaseWorkflow, /npm run verify:native-runtime/)
  assert.match(releaseWorkflow, /cp scripts\/release\.npmrc \.npmrc/)
  assert.match(releaseWorkflow, /scripts \.npmrc/)
  assert.match(releaseNpmrc, /^ignore-scripts=true$/m)
})

test("the legacy rebuild command becomes a successful no-op inside a release", () => {
  const releaseDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "babycare-legacy-rebuild-"))
  const dependencyDirectory = path.join(releaseDirectory, "node_modules", "native-probe")
  try {
    fs.mkdirSync(dependencyDirectory, { recursive: true })
    fs.writeFileSync(path.join(releaseDirectory, "package.json"), JSON.stringify({
      name: "babycare-release-probe",
      version: "1.0.0",
      private: true,
      dependencies: { "native-probe": "1.0.0" }
    }))
    fs.writeFileSync(path.join(releaseDirectory, ".npmrc"), releaseNpmrc)
    fs.writeFileSync(path.join(dependencyDirectory, "package.json"), JSON.stringify({
      name: "native-probe",
      version: "1.0.0",
      gypfile: true
    }))
    fs.writeFileSync(path.join(dependencyDirectory, "binding.gyp"), "this would fail if node-gyp ran")

    const rebuild = spawnSync("npm", ["rebuild", "native-probe", "--build-from-source", "--omit=dev", "--package-lock=false"], {
      cwd: releaseDirectory,
      encoding: "utf8"
    })
    assert.equal(rebuild.status, 0, rebuild.stderr || rebuild.stdout)
  } finally {
    fs.rmSync(releaseDirectory, { recursive: true, force: true })
  }
})

test("the native runtime verification succeeds in the current installation", () => {
  const verification = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/verify-native-runtime.js", import.meta.url))], { encoding: "utf8" })
  assert.equal(verification.status, 0, verification.stderr)
  assert.match(verification.stdout, /better-sqlite3 validé/)
})
