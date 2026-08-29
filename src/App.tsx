import { useCallback, useEffect, useState } from "react"
import { ClipboardCheck, History, LayoutDashboard } from "lucide-react"
import { toast } from "sonner"
import { EventEditor } from "@/components/EventEditor"
import { TopBar } from "@/components/TopBar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Toaster } from "@/components/ui/sonner"
import { useEvents } from "@/hooks/useEvents"
import { api } from "@/lib/api"
import type { BabyEvent, DailyCare } from "@/lib/types"
import { CarePage } from "@/pages/CarePage"
import { HistoryPage } from "@/pages/HistoryPage"
import { TrackingPage } from "@/pages/TrackingPage"

export default function App() {
  const { events, running, loading, refresh } = useEvents()
  const [care, setCare] = useState<DailyCare[]>([])
  const [editing, setEditing] = useState<BabyEvent | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refreshAll = useCallback(async () => {
    const [, daily] = await Promise.all([refresh(), api.dailyCare()])
    setCare(daily)
    setRefreshKey((value) => value + 1)
  }, [refresh])

  useEffect(() => {
    api.dailyCare().then(setCare).catch((error) => toast.error(error.message))
  }, [])

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <TopBar />
      <Tabs defaultValue="tracking" className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
        <div className="sticky top-[73px] z-30 -mx-4 bg-background/95 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
          <TabsList className="grid h-14 w-full grid-cols-3 rounded-2xl bg-card p-1.5">
            <TabsTrigger value="tracking" className="h-full rounded-xl text-xs font-semibold tracking-wider sm:text-sm"><LayoutDashboard /> <span>Suivi</span></TabsTrigger>
            <TabsTrigger value="care" className="h-full rounded-xl text-xs font-semibold tracking-wider sm:text-sm"><ClipboardCheck /> <span>Soins</span></TabsTrigger>
            <TabsTrigger value="history" className="h-full rounded-xl text-xs font-semibold tracking-wider sm:text-sm"><History /> <span>Historique</span></TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="tracking" className="mt-5">
          <TrackingPage events={events} running={running} loading={loading} onChanged={refreshAll} onEdit={setEditing} />
        </TabsContent>
        <TabsContent value="care" className="mt-5">
          <CarePage
            care={care}
            onChanged={refreshAll}
            onStartBath={async () => {
              await api.startEvent("bath")
              toast.success("Bain démarré")
              await refreshAll()
            }}
          />
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
