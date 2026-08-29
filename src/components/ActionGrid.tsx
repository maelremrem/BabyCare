import { useState } from "react"
import {
  Bath, CircleDot, HeartPulse, MessageSquarePlus, Milk, PackageCheck, Shirt, Smile, Thermometer
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { TemperaturePicker } from "@/components/TemperaturePicker"
import { api } from "@/lib/api"
import { IRRITATION_LOCATIONS, type EventType } from "@/lib/types"

interface ActionGridProps {
  onChanged: () => Promise<void>
  onOpenCare: () => void
}

const actionClass = "h-24 flex-col gap-2 rounded-2xl border-border bg-card text-sm font-semibold tracking-wide shadow-none active:scale-[.97] sm:h-28"

export function ActionGrid({ onChanged, onOpenCare }: ActionGridProps) {
  const [temperatureOpen, setTemperatureOpen] = useState(false)
  const [irritationOpen, setIrritationOpen] = useState(false)
  const [observationOpen, setObservationOpen] = useState(false)
  const [diaperOpen, setDiaperOpen] = useState(false)
  const [careOpen, setCareOpen] = useState(false)
  const [temperature, setTemperature] = useState(37)
  const [temperatureNotes, setTemperatureNotes] = useState("")
  const [irritationNotes, setIrritationNotes] = useState("")
  const [observationNotes, setObservationNotes] = useState("")
  const [locations, setLocations] = useState<string[]>([])

  const scrollToActiveTimer = () => {
    window.setTimeout(() => {
      document.getElementById("active-timers")?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 80)
  }

  const start = async (type: EventType, label: string) => {
    try {
      await api.startEvent(type)
      toast.success(`${label} démarré`)
      await onChanged()
      scrollToActiveTimer()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action impossible")
    }
  }

  const create = async (type: EventType, payload: Parameters<typeof api.createEvent>[0], label: string) => {
    try {
      await api.createEvent({ ...payload, type })
      toast.success(`${label} enregistré`)
      await onChanged()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action impossible")
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Button variant="outline" className={actionClass} onClick={() => setTemperatureOpen(true)}>
          <Thermometer className="size-6 text-primary" /> Température
        </Button>

        <Popover open={diaperOpen} onOpenChange={setDiaperOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className={actionClass}><PackageCheck className="size-6" /> Couche</Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="center">
            {[["Urine", "urine"], ["Selles", "stool"], ["Mixte", "mixed"]].map(([label, value]) => (
              <Button key={value} variant="ghost" className="h-12 w-full justify-start" onClick={async () => {
                await create("diaper", { type: "diaper", metadata: { diaper_type: value } }, `Couche · ${label.toLowerCase()}`)
                setDiaperOpen(false)
              }}>
                {label}
              </Button>
            ))}
          </PopoverContent>
        </Popover>

        <Button variant="outline" className={actionClass} onClick={onOpenCare}>
          <Bath className="size-6" /> Bain
        </Button>
        <Button variant="outline" className={actionClass} onClick={() => start("breast_left", "Sein gauche")}>
          <Milk className="size-6" /> Sein G
        </Button>
        <Button variant="outline" className={actionClass} onClick={() => start("breast_right", "Sein droit")}>
          <Milk className="size-6" /> Sein D
        </Button>

        <Popover open={careOpen} onOpenChange={setCareOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className={actionClass}><Smile className="size-6" /> Visage / Cordon</Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2">
            <Button variant="ghost" className="h-12 w-full justify-start" onClick={async () => { await start("face_care", "Soin du visage"); setCareOpen(false) }}>Visage</Button>
            <Button variant="ghost" className="h-12 w-full justify-start" onClick={async () => { await start("cord_care", "Soin du cordon"); setCareOpen(false) }}>Cordon</Button>
            <Button variant="ghost" className="h-12 w-full justify-start" onClick={async () => { await start("face_cord_care", "Soin du visage et du cordon"); setCareOpen(false) }}>Les deux</Button>
          </PopoverContent>
        </Popover>

        <Button variant="outline" className={actionClass} onClick={() => create("clothes_change", { type: "clothes_change" }, "Vêtements changés")}>
          <Shirt className="size-6" /> Vêtements
        </Button>
        <Button variant="outline" className={actionClass} onClick={() => setIrritationOpen(true)}>
          <HeartPulse className="size-6" /> Irritation
        </Button>
        <Button variant="outline" className={actionClass} onClick={() => setObservationOpen(true)}>
          <MessageSquarePlus className="size-6" /> Ajouter une observation
        </Button>
      </div>

      <Dialog open={temperatureOpen} onOpenChange={setTemperatureOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Thermometer className="text-primary" /> Température</DialogTitle>
            <DialogDescription>Sélectionnez la valeur mesurée.</DialogDescription>
          </DialogHeader>
          <TemperaturePicker value={temperature} onChange={setTemperature} />
          <Textarea value={temperatureNotes} onChange={(event) => setTemperatureNotes(event.target.value)} placeholder="Observation (facultative)" />
          <DialogFooter>
            <Button className="h-12" onClick={async () => {
              await create("temperature", { type: "temperature", value_real: temperature, notes: temperatureNotes }, `Température · ${temperature.toFixed(1)} °C`)
              setTemperatureNotes("")
              setTemperatureOpen(false)
            }}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={irritationOpen} onOpenChange={(open) => {
        setIrritationOpen(open)
        if (!open) {
          setLocations([])
          setIrritationNotes("")
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Irritation</DialogTitle>
            <DialogDescription>Sélectionnez une ou plusieurs zones, puis ajoutez une observation.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {IRRITATION_LOCATIONS.map((item) => (
              <Button
                key={item}
                type="button"
                aria-pressed={locations.includes(item)}
                variant={locations.includes(item) ? "default" : "outline"}
                className="h-11"
                onClick={() => setLocations((current) => current.includes(item) ? current.filter((location) => location !== item) : [...current, item])}
              >
                <CircleDot /> {item}
              </Button>
            ))}
          </div>
          <Textarea value={irritationNotes} onChange={(event) => setIrritationNotes(event.target.value)} placeholder="Observation" />
          <DialogFooter>
            <Button className="h-12" disabled={locations.length === 0} onClick={async () => {
              await create("irritation", {
                type: "irritation",
                metadata: { locations: locations.map((location) => location.toLowerCase()) },
                notes: irritationNotes
              }, `Irritation · ${locations.join(", ")}`)
              setIrritationOpen(false)
            }}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={observationOpen} onOpenChange={(open) => {
        setObservationOpen(open)
        if (!open) setObservationNotes("")
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><MessageSquarePlus className="text-primary" /> Ajouter une observation</DialogTitle>
            <DialogDescription>Enregistrez une information libre dans l’historique.</DialogDescription>
          </DialogHeader>
          <Textarea
            autoFocus
            className="min-h-32"
            value={observationNotes}
            onChange={(event) => setObservationNotes(event.target.value)}
            placeholder="Votre observation…"
          />
          <DialogFooter>
            <Button className="h-12" disabled={!observationNotes.trim()} onClick={async () => {
              await create("observation", { type: "observation", notes: observationNotes }, "Observation")
              setObservationOpen(false)
            }}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
