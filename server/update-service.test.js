import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { compareVersions, createUpdateService } from "./update-service.js"

test("compare les versions sémantiques", () => {
  assert.equal(compareVersions("1.2.0", "1.1.9"), 1)
  assert.equal(compareVersions("v1.2.0", "1.2.0"), 0)
  assert.equal(compareVersions("1.2.0-beta.1", "1.2.0"), -1)
})

test("sélectionne uniquement l’artefact distribué correspondant au serveur", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "babycare-update-test-"))
  try {
    const release = {
      tag_name: "v0.2.0",
      name: "BabyCare 0.2.0",
      html_url: "https://github.com/maelremrem/BabyCare/releases/tag/v0.2.0",
      published_at: "2026-08-31T10:00:00.000Z",
      assets: [
        { name: "babycare-v0.2.0-linux-amd64.tar.gz", browser_download_url: "https://github.com/example/archive" },
        { name: "babycare-v0.2.0-linux-amd64.tar.gz.sha256", browser_download_url: "https://github.com/example/checksum" }
      ]
    }
    const service = createUpdateService({
      currentVersion: "0.1.0",
      enabled: true,
      updateDirectory: directory,
      assetSuffix: "linux-amd64",
      fetchImpl: async () => new Response(JSON.stringify(release), { status: 200, headers: { "content-type": "application/json" } })
    })
    const info = await service.versionInfo()
    assert.equal(info.updateAvailable, true)
    assert.equal(info.availableVersion, "0.2.0")

    const status = await service.requestUpdate()
    assert.equal(status.state, "queued")
    const request = JSON.parse(fs.readFileSync(path.join(directory, "request.json"), "utf8"))
    assert.equal(request.action, "update")
    assert.equal(request.version, "0.2.0")
    assert.equal(request.archiveUrl, "https://github.com/example/archive")
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

test("demande au sidecar Docker une image versionnée sans archive système", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "babycare-docker-update-test-"))
  try {
    const release = {
      tag_name: "v0.3.0",
      html_url: "https://github.com/maelremrem/BabyCare/releases/tag/v0.3.0",
      published_at: "2026-08-31T11:00:00.000Z",
      assets: []
    }
    const service = createUpdateService({
      currentVersion: "0.2.0",
      enabled: true,
      runtime: "docker",
      updateDirectory: directory,
      fetchImpl: async () => new Response(JSON.stringify(release), { status: 200, headers: { "content-type": "application/json" } })
    })

    const info = await service.versionInfo()
    assert.equal(info.runtime, "docker")
    assert.equal(info.updateAvailable, true)
    const status = await service.requestUpdate()
    assert.equal(status.state, "queued")
    const request = JSON.parse(fs.readFileSync(path.join(directory, "request.json"), "utf8"))
    assert.deepEqual({ action: request.action, runtime: request.runtime, version: request.version }, { action: "update", runtime: "docker", version: "0.3.0" })
    assert.equal("archiveUrl" in request, false)
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})
