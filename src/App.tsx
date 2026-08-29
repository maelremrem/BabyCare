import { useCallback, useEffect, useState } from "react"
import { ClipboardCheck, History, LayoutDashboard, Stethoscope } from "lucide-react"
import { toast } from "sonner"
import { EventEditor } from "@/components/EventEditor"
import { TopBar } from "@/components/TopBar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Toaster } from "@/components/ui/sonner"
import { useEvents } from "@/hooks/useEvents"
import { api } from "@/lib/api"
import { ACCENT_OPTIONS, type AppSettings, type BabyEvent, type DailyCare, type StoolAlert } from "@/lib/types"
import { CarePage } from "@/pages/CarePage"
import { HistoryPage } from "@/pages/HistoryPage"
import { MedicalPage } from "@/pages/MedicalPage"
import { TrackingPage } from "@/pages/TrackingPage"

const DEFAULT_SETTINGS: AppSettings = {
  accent_color: "orange",
  baby_name: "",
  birth_date: "",
  baby_sex: ""
}

export default function App() {
  const { events, running, loading, refresh } = useEvents()
  const [care, setCare] = useState<DailyCare[]>([])
  const [editing, setEditing] = useState<BabyEvent | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [activeTab, setActiveTab] = useState("tracking")
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [stoolAlert, setStoolAlert] = useState<StoolAlert | null>(null)

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
      .catch((error) => toast.error(error.message))
  }, [])

  useEffect(() => {
    const accent = ACCENT_OPTIONS.find((option) => option.id === settings.accent_color) || ACCENT_OPTIONS[0]
    const root = document.documentElement
    root.style.setProperty("--primary", accent.value)
    root.style.setProperty("--ring", accent.value)
    root.style.setProperty("--sidebar-primary", accent.value)
  }, [settings.accent_color])

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <TopBar
        settings={settings}
        onAccentChange={async (color) => {
          const updatedSettings = await api.updateAccent(color)
          setSettings(updatedSettings)
          toast.success(`Couleur ${ACCENT_OPTIONS.find((option) => option.id === color)?.label.toLowerCase()} appliquée`)
        }}
        onProfileChange={async (babyName, birthDate, babySex) => {
          setSettings(await api.updateProfile(babyName, birthDate, babySex))
        }}
      />
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
        <div className="sticky top-[73px] z-30 -mx-4 bg-background/95 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
          <TabsList className="grid h-14 w-full grid-cols-4 rounded-2xl bg-card p-1.5">
            <TabsTrigger value="tracking" className="h-full gap-1 rounded-xl px-1 text-[10px] font-semibold tracking-wide sm:text-sm"><LayoutDashboard className="hidden sm:block" /> <span>Suivi</span></TabsTrigger>
            <TabsTrigger value="care" className="h-full gap-1 rounded-xl px-1 text-[10px] font-semibold tracking-wide sm:text-sm"><ClipboardCheck className="hidden sm:block" /> <span>Soins</span></TabsTrigger>
            <TabsTrigger value="medical" className="h-full gap-1 rounded-xl px-1 text-[10px] font-semibold tracking-wide sm:text-sm"><Stethoscope className="hidden sm:block" /> <span>Suivi médical</span></TabsTrigger>
            <TabsTrigger value="history" className="h-full gap-1 rounded-xl px-1 text-[10px] font-semibold tracking-wide sm:text-sm"><History className="hidden sm:block" /> <span>Historique</span></TabsTrigger>
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
          <CarePage care={care} onChanged={refreshAll} />
        </TabsContent>
        <TabsContent value="medical" className="mt-5">
          <MedicalPage settings={settings} refreshKey={refreshKey} onChanged={refreshAll} onEdit={setEditing} />
        </TabsContent>
        <TabsContent value="history" className="mt-5">
          <HistoryPage refreshKey={refreshKey} onEdit={setEditing} />
        </TabsContent>
      </Tabs>
      <EventEditor event={editing} onOpenChange={(open) => !open && setEditing(null)} onChanged={refreshAll} />
      <Toaster position="bottom-center" richColors />
    </div>
  )
}
