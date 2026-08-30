import { useCallback, useEffect, useState } from "react"
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
import { api, isDemoMode, subscribeToServerChanges } from "@/lib/api"
import { I18nProvider, localizedErrorMessage, messages, resolveLocale, type LanguagePreference } from "@/lib/i18n"
import { ACCENT_OPTIONS, type AppSettings, type BabyEvent, type DailyCare, type StoolAlert } from "@/lib/types"
import { CarePage } from "@/pages/CarePage"
import { HistoryPage } from "@/pages/HistoryPage"
import { MedicalPage } from "@/pages/MedicalPage"
import { TrackingPage } from "@/pages/TrackingPage"

const DEFAULT_SETTINGS: AppSettings = {
  active_baby_id: 0,
  babies: [],
  accent_color: "orange",
  baby_name: "",
  birth_date: "",
  baby_sex: "",
  language_preference: "system"
}

function activeAccentColor(settings: AppSettings) {
  return settings.babies.find((baby) => baby.id === settings.active_baby_id)?.accent_color || settings.accent_color
}

export default function App() {
  const { events, running, loading, refresh } = useEvents()
  const [care, setCare] = useState<DailyCare[]>([])
  const [editing, setEditing] = useState<BabyEvent | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [activeTab, setActiveTab] = useState("tracking")
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [stoolAlert, setStoolAlert] = useState<StoolAlert | null>(null)
  const [bootstrapLoading, setBootstrapLoading] = useState(true)
  const activeColor = activeAccentColor(settings)

  const refreshAll = useCallback(async () => {
    const [, daily, alert] = await Promise.all([refresh(), api.dailyCare(), api.stoolAlert()])
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
    Promise.all([refreshAll(), api.settings()])
      .then(([, nextSettings]) => setSettings(nextSettings))
      .catch(() => undefined)
  }), [refreshAll])

  useEffect(() => {
    const accent = ACCENT_OPTIONS.find((option) => option.id === activeColor) || ACCENT_OPTIONS[0]
    const root = document.documentElement
    root.style.setProperty("--primary", accent.value)
    root.style.setProperty("--ring", accent.value)
    root.style.setProperty("--sidebar-primary", accent.value)
  }, [activeColor])

  const locale = resolveLocale(settings.language_preference)
  const t = messages[locale]

  if (bootstrapLoading || loading) return <AppLoading accentColor={activeColor} />

  return (
    <I18nProvider preference={settings.language_preference}>
      <div className="flex min-h-dvh flex-col bg-background text-foreground">
        <TopBar
          settings={settings}
          onBabySelect={async (babyId) => {
            setSettings(await api.selectBaby(babyId))
            await refreshAll()
            setEditing(null)
          }}
          onBabyAdd={async (babyName, birthDate, babySex, accentColor) => {
            setSettings(await api.createBaby(babyName, birthDate, babySex, accentColor))
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
          onProfileChange={async (babyName, birthDate, babySex, accentColor) => {
            setSettings(await api.updateProfile(babyName, birthDate, babySex, accentColor))
          }}
          onReset={async () => {
            await api.resetDatabase()
            window.location.reload()
          }}
        />
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
              events={events}
              running={running}
              loading={loading}
              stoolAlert={stoolAlert}
              onChanged={refreshAll}
              onEdit={setEditing}
              onOpenCare={() => setActiveTab("care")}
            />
          </TabsContent>
          <TabsContent value="care" className="mt-5">
            <CarePage care={care} onChanged={refreshAll} onValidated={() => setActiveTab("tracking")} />
          </TabsContent>
          <TabsContent value="medical" className="mt-5">
            <MedicalPage settings={settings} refreshKey={refreshKey} onChanged={refreshAll} onEdit={setEditing} />
          </TabsContent>
          <TabsContent value="history" className="mt-5">
            <HistoryPage refreshKey={refreshKey} onEdit={setEditing} />
          </TabsContent>
        </Tabs>
        <AppFooter />
        <EventEditor event={editing} onOpenChange={(open) => !open && setEditing(null)} onChanged={refreshAll} />
        <DemoNoticeDialog enabled={isDemoMode} />
        <Toaster position="bottom-center" richColors />
      </div>
    </I18nProvider>
  )
}
