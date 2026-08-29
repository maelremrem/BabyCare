import { useState } from "react"
import {
  Bath, CircleDot, HeartPulse, Milk, PackageCheck, Shirt, Smile, Thermometer
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { TemperaturePicker } from "@/components/TemperaturePicker"
import { api } from "@/lib/api"
import type { EventType } from "@/lib/types"

interface ActionGridProps {
  onChanged: () => Promise<void>
}

const actionClass = "h-24 flex-col gap-2 rounded-2xl border-border bg-card text-sm font-semibold tracking-wide shadow-none active:scale-[.97] sm:h-28"

export function ActionGrid({ onChanged }: ActionGridProps) {
  const [temperatureOpen, setTemperatureOpen] = useState(false)
  const [irritationOpen, setIrritationOpen] = useState(false)
  const [diaperOpen, setDiaperOpen] = useState(false)
  const [careOpen, setCareOpen] = useState(false)
  const [temperature, setTemperature] = useState(37)
  const [notes, setNotes] = useState("")
  const [location, setLocation] = useState("Visage")

  const start = async (type: EventType, label: string) => {
    try {
      await api.startEvent(type)
      toast.success(`${label} démarré`)
      await onChanged()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action impossible")
    }
  }

  const create = async (type: EventType, payload: Parameters<typeof api.createEvent>[0], label: string) => {
    try {
      await api.createEvent({ ...payload, type })
      toast.success(`${label} enregistré`)
      setNotes("")
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

        <Button variant="outline" className={actionClass} onClick={() => start("bath", "Bain")}>
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
          </PopoverContent>
        </Popover>

        <Button variant="outline" className={actionClass} onClick={() => create("clothes_change", { type: "clothes_change" }, "Vêtements changés")}>
          <Shirt className="size-6" /> Vêtements
        </Button>
        <Button variant="outline" className={actionClass} onClick={() => setIrritationOpen(true)}>
          <HeartPulse className="size-6" /> Irritation
        </Button>
      </div>

      <Dialog open={temperatureOpen} onOpenChange={setTemperatureOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Thermometer className="text-primary" /> Température</DialogTitle>
            <DialogDescription>Sélectionnez la valeur mesurée.</DialogDescription>
          </DialogHeader>
          <TemperaturePicker value={temperature} onChange={setTemperature} />
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Observation (facultative)" />
          <DialogFooter>
            <Button className="h-12" onClick={async () => {
              await create("temperature", { type: "temperature", value_real: temperature, notes }, `Température · ${temperature.toFixed(1)} °C`)
              setTemperatureOpen(false)
            }}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={irritationOpen} onOpenChange={setIrritationOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Irritation</DialogTitle>
            <DialogDescription>Indiquez la zone et ajoutez une observation.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {["Visage", "Cou", "Torse", "Dos", "Bras", "Jambes", "Fesses", "Autre"].map((item) => (
              <Button key={item} type="button" variant={location === item ? "default" : "outline"} className="h-11" onClick={() => setLocation(item)}>
                <CircleDot /> {item}
              </Button>
            ))}
          </div>
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Observation" />
          <DialogFooter>
            <Button className="h-12" onClick={async () => {
              await create("irritation", { type: "irritation", metadata: { location: location.toLowerCase() }, notes }, `Irritation · ${location}`)
              setIrritationOpen(false)
            }}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
