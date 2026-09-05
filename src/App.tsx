import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react"
import { ClipboardCheck, History, LayoutDashboard, Stethoscope } from "lucide-react"
import { toast } from "sonner"
import { EventEditor } from "@/components/EventEditor"
import { AppFooter } from "@/components/AppFooter"
import { AppLoading } from "@/components/AppLoading"
import { DemoNoticeDialog } from "@/components/DemoNoticeDialog"
import { TopBar } from "@/components/TopBar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Toaster } from "@/components/ui/sonner"
import { useEvents } from "@/hooks/useEvents"
import { useScreenWakeLock } from "@/hooks/useScreenWakeLock"
import { api, isDemoMode, subscribeToServerChanges } from "@/lib/api"
import { I18nProvider, localizedErrorMessage, messages, resolveLocale, type LanguagePreference } from "@/lib/i18n"
import { ACCENT_OPTIONS, type AppSettings, type BabyEvent, type DailyCare, type StoolAlert } from "@/lib/types"
const CarePage = lazy(() => import("@/pages/CarePage").then((module) => ({ default: module.CarePage })))
const HistoryPage = lazy(() => import("@/pages/HistoryPage").then((module) => ({ default: module.HistoryPage })))
const MedicalPage = lazy(() => import("@/pages/MedicalPage").then((module) => ({ default: module.MedicalPage })))
import { TrackingPage } from "@/pages/TrackingPage"

const DEFAULT_SETTINGS: AppSettings = {
  active_baby_id: 0,
  babies: [],
  accent_color: "orange",
  baby_name: "",
  birth_date: "",
  baby_sex: "",
  feeding_type: "breast",
  language_preference: "system"
}

const SCREEN_AWAKE_PREFERENCES_STORAGE_KEY = "babycare-screen-awake-preferences"

interface ScreenAwakePreferences {
  enabled: boolean
  videoFallback: boolean
}

function readScreenAwakePreferences(): ScreenAwakePreferences {
  try {
    const stored = window.localStorage.getItem(SCREEN_AWAKE_PREFERENCES_STORAGE_KEY)
    if (!stored) return { enabled: true, videoFallback: false }
    const parsed = JSON.parse(stored) as Partial<ScreenAwakePreferences>
    return {
      enabled: parsed.enabled !== false,
      videoFallback: parsed.videoFallback === true
    }
  } catch {
    return { enabled: true, videoFallback: false }
  }
}

function saveScreenAwakePreferences(preferences: ScreenAwakePreferences) {
  try {
    window.localStorage.setItem(SCREEN_AWAKE_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences))
  } catch {
    // The preference remains active for this session if storage is unavailable.
  }
}

function activeAccentColor(settings: AppSettings) {
  return settings.babies.find((baby) => baby.id === settings.active_baby_id)?.accent_color || settings.accent_color
}

export default function App() {
  const { events, running, loading, refresh } = useEvents()
  const [screenAwakePreferences, setScreenAwakePreferences] = useState(readScreenAwakePreferences)
  const preventSleep = screenAwakePreferences.enabled && running.length > 0
  const useVideoFallback = screenAwakePreferences.enabled && screenAwakePreferences.videoFallback
  const { activateVideoFallback, deactivateVideoFallback } = useScreenWakeLock(preventSleep, useVideoFallback)
  const refreshGeneration = useRef(0)
  const [connected, setConnected] = useState(true)
  const [switching, setSwitching] = useState(false)
  const [care, setCare] = useState<DailyCare[]>([])
  const [editing, setEditing] = useState<BabyEvent | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [activeTab, setActiveTab] = useState("tracking")
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [stoolAlert, setStoolAlert] = useState<StoolAlert | null>(null)
  const [bootstrapLoading, setBootstrapLoading] = useState(true)
  const activeColor = activeAccentColor(settings)

  const refreshAll = useCallback(async () => {
    const generation = ++refreshGeneration.current
    const [, daily, alert] = await Promise.all([refresh(), api.dailyCare(), api.stoolAlert()])
    if (generation !== refreshGeneration.current) return
    setCare(daily)
    setStoolAlert(alert)
    setRefreshKey((value) => value + 1)
  }, [refresh])

  useEffect(() => {
    Promise.all([api.dailyCare(), api.settings(), api.stoolAlert()])
      .then(([daily, settings, alert]) => {
        setCare(daily)
        setSettings(settings)
        setStoolAlert(alert)
      })
      .catch((error) => {
        const fallbackMessages = messages[resolveLocale("system")]
        toast.error(localizedErrorMessage(error, fallbackMessages, fallbackMessages.common.appUnavailable))
      })
      .finally(() => setBootstrapLoading(false))
  }, [])

  useEffect(() => subscribeToServerChanges(() => {
    api.settings()
      .then(async (nextSettings) => { setSettings(nextSettings); await refreshAll() })
      .catch(() => undefined)
  }, setConnected), [refreshAll])

  useEffect(() => { setEditing(null) }, [settings.active_baby_id])

  useEffect(() => {
    const accent = ACCENT_OPTIONS.find((option) => option.id === activeColor) || ACCENT_OPTIONS[0]
    const root = document.documentElement
    root.style.setProperty("--primary", accent.value)
    root.style.setProperty("--ring", accent.value)
    root.style.setProperty("--sidebar-primary", accent.value)
  }, [activeColor])

  const locale = resolveLocale(settings.language_preference)
  const t = messages[locale]

  if (bootstrapLoading || loading || switching) return <AppLoading accentColor={activeColor} />

  return (
    <I18nProvider preference={settings.language_preference}>
      <div className="flex min-h-dvh flex-col bg-background text-foreground">
        <TopBar
          settings={settings}
          onBabySelect={async (babyId) => {
            setSwitching(true)
            setEditing(null)
            try {
              setSettings(await api.selectBaby(babyId))
              await refreshAll()
            } finally { setSwitching(false) }
          }}
          onBabyAdd={async (babyName, birthDate, babySex, feedingType, accentColor) => {
            setSettings(await api.createBaby(babyName, birthDate, babySex, feedingType, accentColor))
            await refreshAll()
          }}
          onBabyDelete={async (babyId) => {
            setSettings(await api.deleteBaby(babyId))
            await refreshAll()
            setEditing(null)
          }}
          onLanguageChange={async (language: LanguagePreference) => {
            setSettings(await api.updateLanguage(language))
            toast.success(t.settings.languageUpdated)
          }}
          onProfileChange={async (babyName, birthDate, babySex, feedingType, accentColor) => {
            setSettings(await api.updateProfile(babyName, birthDate, babySex, feedingType, accentColor))
          }}
          onReset={async () => {
            await api.resetDatabase()
            window.location.reload()
          }}
          preventSleepDuringTimer={screenAwakePreferences.enabled}
          wakeLockVideoFallback={screenAwakePreferences.videoFallback}
          onPreventSleepDuringTimerChange={(enabled) => {
            if (!enabled) deactivateVideoFallback()
            const next = { ...screenAwakePreferences, enabled }
            setScreenAwakePreferences(next)
            saveScreenAwakePreferences(next)
          }}
          onWakeLockVideoFallbackChange={(enabled) => {
            if (enabled && preventSleep) activateVideoFallback(true)
            const next = { ...screenAwakePreferences, videoFallback: enabled }
            setScreenAwakePreferences(next)
            saveScreenAwakePreferences(next)
          }}
          hasRunningTimer={running.length > 0}
        />
        {!connected && <p role="status" className="px-4 py-2 text-center text-sm text-amber-600">{locale === "fr" ? "Connexion interrompue. Les données seront actualisées à la reconnexion." : "Connection lost. Data will refresh when reconnected."}</p>}
        <Suspense fallback={<AppLoading accentColor={activeColor} />}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mx-auto w-full max-w-6xl flex-1 px-4 pb-14 sm:px-6">
          <div className="sticky top-[73px] z-30 -mx-4 bg-background/95 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
            <TabsList className="grid h-14 w-full grid-cols-4 rounded-2xl bg-card p-1.5">
              <TabsTrigger value="tracking" className="h-full gap-1 rounded-xl px-1 text-[10px] font-semibold tracking-wide sm:text-sm"><LayoutDashboard className="hidden sm:block" /> <span>{t.tabs.tracking}</span></TabsTrigger>
              <TabsTrigger value="care" className="h-full gap-1 rounded-xl px-1 text-[10px] font-semibold tracking-wide sm:text-sm"><ClipboardCheck className="hidden sm:block" /> <span>{t.tabs.care}</span></TabsTrigger>
              <TabsTrigger value="medical" className="h-full gap-1 rounded-xl px-1 text-[10px] font-semibold tracking-wide sm:text-sm"><Stethoscope className="hidden sm:block" /> <span>{t.tabs.medical}</span></TabsTrigger>
              <TabsTrigger value="history" className="h-full gap-1 rounded-xl px-1 text-[10px] font-semibold tracking-wide sm:text-sm"><History className="hidden sm:block" /> <span>{t.tabs.history}</span></TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="tracking" className="mt-5">
            <TrackingPage
              key={settings.active_baby_id}
              events={events}
              running={running}
              loading={loading}
              stoolAlert={stoolAlert}
              feedingType={settings.feeding_type || "breast"}
              onChanged={refreshAll}
              onEdit={setEditing}
              onOpenCare={() => setActiveTab("care")}
              onTimerStartAttempt={activateVideoFallback}
              onTimerStartFailed={deactivateVideoFallback}
            />
          </TabsContent>
          <TabsContent value="care" className="mt-5">
            <CarePage key={settings.active_baby_id} care={care} onChanged={refreshAll} onValidated={() => setActiveTab("tracking")} />
          </TabsContent>
          <TabsContent value="medical" className="mt-5">
            <MedicalPage key={settings.active_baby_id} settings={settings} refreshKey={refreshKey} onChanged={refreshAll} onEdit={setEditing} />
          </TabsContent>
          <TabsContent value="history" className="mt-5">
            <HistoryPage key={settings.active_baby_id} babyId={settings.active_baby_id} refreshKey={refreshKey} feedingType={settings.feeding_type || "breast"} onEdit={setEditing} />
          </TabsContent>
        </Tabs>
        </Suspense>
        <AppFooter />
        <EventEditor event={editing} onOpenChange={(open) => !open && setEditing(null)} onChanged={refreshAll} />
        <DemoNoticeDialog enabled={isDemoMode} />
        <Toaster position="bottom-center" richColors />
      </div>
    </I18nProvider>
  )
}
