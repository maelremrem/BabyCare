import { useCallback, useEffect, useRef, useState } from "react"
import { api } from "@/lib/api"
import type { UpdateStatus, VersionInfo } from "@/lib/types"

async function refreshForNewClient(serverVersion: string) {
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((registration) => registration.unregister()))
  }
  const url = new URL(window.location.href)
  url.searchParams.set("app-version", serverVersion)
  window.location.replace(url.toString())
}

export function useAppUpdate() {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null)
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  const [progressOpen, setProgressOpen] = useState(false)
  const [checking, setChecking] = useState(false)
  const refreshing = useRef(false)

  const loadVersion = useCallback(async (force = false) => {
    setChecking(true)
    try {
      const info = await api.versionInfo(force)
      setVersionInfo(info)
      setStatus(info.status)
      if (info.currentVersion !== __APP_VERSION__ && !refreshing.current) {
        refreshing.current = true
        await refreshForNewClient(info.currentVersion)
      }
    } finally {
      setChecking(false)
    }
  }, [])

  const loadStatus = useCallback(async () => {
    const nextStatus = await api.updateStatus()
    setStatus(nextStatus)
    if (nextStatus.state === "complete") await loadVersion(true)
  }, [loadVersion])

  useEffect(() => {
    loadVersion().catch(() => undefined)
    const interval = window.setInterval(() => loadVersion().catch(() => undefined), 30_000)
    const onVisibility = () => {
      if (document.visibilityState === "visible") loadVersion().catch(() => undefined)
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [loadVersion])

  useEffect(() => {
    if (!status?.active) return
    const interval = window.setInterval(() => loadStatus().catch(() => undefined), 750)
    return () => window.clearInterval(interval)
  }, [loadStatus, status?.active])

  async function startUpdate() {
    setProgressOpen(true)
    setStatus(await api.startUpdate())
  }

  async function rollback() {
    setProgressOpen(true)
    setStatus(await api.rollbackUpdate())
  }

  return { versionInfo, status, checking, progressOpen, setProgressOpen, startUpdate, rollback, refresh: loadVersion }
}
