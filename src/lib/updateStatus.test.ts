import { describe, expect, test } from "vitest"
import { reconcileUpdateStatus } from "./updateStatus"
import type { UpdateStatus } from "./types"

const downloading: UpdateStatus = {
  state: "downloading", progress: 32, command: "Téléchargement", message: "",
  targetVersion: "0.1.30", updatedAt: "2026-09-05T12:00:30Z",
  canRollback: false, rollbackVersion: null, active: true
}

describe("progression de mise à jour", () => {
  test("ignore une réponse de version antérieure à la progression reçue", () => {
    expect(reconcileUpdateStatus(downloading, {
      ...downloading, state: "queued", progress: 0, updatedAt: "2026-09-05T12:00:00Z"
    })).toEqual(downloading)
  })

  test("ne revient pas à zéro si le worker republie le téléchargement", () => {
    expect(reconcileUpdateStatus(downloading, {
      ...downloading, progress: 0, updatedAt: "2026-09-05T12:00:31Z"
    }).progress).toBe(32)
  })

  test("conserve le suivi actif en cas de statut temporairement indisponible", () => {
    expect(reconcileUpdateStatus(downloading, {
      ...downloading, state: "idle", progress: 0, active: false, targetVersion: null, updatedAt: null
    })).toEqual(downloading)
  })

  test.each(["verifying", "complete", "error"] as const)("accepte la transition vers %s", (state) => {
    const next = { ...downloading, state, progress: state === "verifying" ? 54 : 100, active: state === "verifying" }
    expect(reconcileUpdateStatus(downloading, next)).toEqual(next)
  })

  test("accepte une nouvelle mise à jour après la précédente", () => {
    const next = { ...downloading, state: "queued" as const, progress: 0, updatedAt: "2026-09-05T13:00:00Z" }
    expect(reconcileUpdateStatus({ ...downloading, state: "complete", progress: 100, active: false }, next)).toEqual(next)
    expect(reconcileUpdateStatus(null, next)).toEqual(next)
  })
})
