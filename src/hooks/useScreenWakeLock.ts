import { useCallback, useEffect, useRef } from "react"
import NoSleep from "nosleep.js"

export function useScreenWakeLock(enabled: boolean, videoFallbackEnabled = false) {
  const noSleepRef = useRef<NoSleep | null>(null)

  const activateVideoFallback = useCallback((force = false) => {
    if ((!force && !videoFallbackEnabled) || navigator.wakeLock) return

    const noSleep = noSleepRef.current ?? new NoSleep()
    noSleepRef.current = noSleep
    if (!noSleep.isEnabled) void noSleep.enable().catch(() => undefined)
  }, [videoFallbackEnabled])

  const deactivateVideoFallback = useCallback(() => {
    if (noSleepRef.current?.isEnabled) noSleepRef.current.disable()
  }, [])

  useEffect(() => {
    if (!enabled) return

    const wakeLock = navigator.wakeLock
    if (!wakeLock) return

    let sentinel: WakeLockSentinel | null = null
    let disposed = false

    const request = async () => {
      if (disposed || document.visibilityState !== "visible" || sentinel) return

      try {
        const nextSentinel = await wakeLock.request("screen")
        if (disposed) {
          await nextSentinel.release()
          return
        }
        sentinel = nextSentinel
      } catch {
        // The browser can refuse a wake lock, for example in power-saving mode.
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        sentinel = null
        return
      }
      void request()
    }

    document.addEventListener("visibilitychange", onVisibilityChange)
    void request()

    return () => {
      disposed = true
      document.removeEventListener("visibilitychange", onVisibilityChange)
      if (sentinel && !sentinel.released) void sentinel.release()
      sentinel = null
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled || !videoFallbackEnabled || navigator.wakeLock) {
      deactivateVideoFallback()
      return
    }

    activateVideoFallback()
    const retryFromUserGesture = () => activateVideoFallback()
    document.addEventListener("click", retryFromUserGesture, { capture: true })

    return () => {
      document.removeEventListener("click", retryFromUserGesture, { capture: true })
      deactivateVideoFallback()
    }
  }, [activateVideoFallback, deactivateVideoFallback, enabled, videoFallbackEnabled])

  return { activateVideoFallback, deactivateVideoFallback }
}
