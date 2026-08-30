import { useState } from "react"
import {
  Bath, CircleDot, HeartPulse, MessageSquarePlus, Milk, Shirt, Smile, Thermometer, WalletCards
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { TemperaturePicker } from "@/components/TemperaturePicker"
import { api } from "@/lib/api"
import { interpolate, localizedErrorMessage, useI18n } from "@/lib/i18n"
import { IRRITATION_LOCATIONS, type EventType } from "@/lib/types"

interface ActionGridProps {
  nextBreast: "breast_left" | "breast_right"
  onChanged: () => Promise<void>
  onOpenCare: () => void
}

const actionClass = "h-24 flex-col gap-2 rounded-2xl border-border bg-card text-sm font-semibold tracking-wide shadow-none active:scale-[.97] sm:h-28"
const activeBreastClass = "border-primary/50 text-primary"

export function ActionGrid({ nextBreast, onChanged, onOpenCare }: ActionGridProps) {
  const { t } = useI18n()
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
      toast.success(interpolate(t.actions.started, { label }))
      await onChanged()
      scrollToActiveTimer()
    } catch (error) {
      toast.error(localizedErrorMessage(error, t, t.common.actionImpossible))
    }
  }

  const create = async (type: EventType, payload: Parameters<typeof api.createEvent>[0], label: string) => {
    try {
      await api.createEvent({ ...payload, type })
      toast.success(interpolate(t.actions.recorded, { label }))
      await onChanged()
    } catch (error) {
      toast.error(localizedErrorMessage(error, t, t.common.actionImpossible))
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Button variant="outline" className={actionClass} onClick={() => setTemperatureOpen(true)}>
          <Thermometer className="size-6" /> {t.eventLabels.temperature}
        </Button>

        <Popover open={diaperOpen} onOpenChange={setDiaperOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className={actionClass}><WalletCards className="size-6" /> {t.eventLabels.diaper}</Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="center">
            {Object.entries(t.diaperTypes).map(([value, label]) => (
              <Button key={value} variant="ghost" className="h-12 w-full justify-start" onClick={async () => {
                await create("diaper", { type: "diaper", metadata: { diaper_type: value } }, `${t.eventLabels.diaper} · ${label.toLowerCase()}`)
                setDiaperOpen(false)
              }}>
                {label}
              </Button>
            ))}
          </PopoverContent>
        </Popover>

        <Button variant="outline" className={actionClass} onClick={onOpenCare}>
          <Bath className="size-6" /> {t.eventLabels.bath}
        </Button>
        <Button variant="outline" className={`${actionClass} ${nextBreast === "breast_left" ? activeBreastClass : ""}`} onClick={() => start("breast_left", t.eventLabels.breast_left)}>
          <Milk className="size-6" /> {t.actions.leftBreast}
        </Button>
        <Button variant="outline" className={`${actionClass} ${nextBreast === "breast_right" ? activeBreastClass : ""}`} onClick={() => start("breast_right", t.eventLabels.breast_right)}>
          <Milk className="size-6" /> {t.actions.rightBreast}
        </Button>

        <Popover open={careOpen} onOpenChange={setCareOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className={actionClass}><Smile className="size-6" /> {t.actions.faceCord}</Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2">
            <Button variant="ghost" className="h-12 w-full justify-start" onClick={async () => { await create("face_care", { type: "face_care" }, t.actions.faceCare); setCareOpen(false) }}>{t.eventLabels.face_care}</Button>
            <Button variant="ghost" className="h-12 w-full justify-start" onClick={async () => { await create("cord_care", { type: "cord_care" }, t.actions.cordCare); setCareOpen(false) }}>{t.eventLabels.cord_care}</Button>
            <Button variant="ghost" className="h-12 w-full justify-start" onClick={async () => { await create("face_cord_care", { type: "face_cord_care" }, t.actions.faceCordCare); setCareOpen(false) }}>{t.actions.both}</Button>
          </PopoverContent>
        </Popover>

        <Button variant="outline" className={actionClass} onClick={() => create("clothes_change", { type: "clothes_change" }, t.actions.clothesChanged)}>
          <Shirt className="size-6" /> {t.eventLabels.clothes_change}
        </Button>
        <Button variant="outline" className={actionClass} onClick={() => setIrritationOpen(true)}>
          <HeartPulse className="size-6" /> {t.eventLabels.irritation}
        </Button>
        <Button variant="outline" className={actionClass} onClick={() => setObservationOpen(true)}>
          <MessageSquarePlus className="size-6" /> {t.actions.addObservation}
        </Button>
      </div>

      <Dialog open={temperatureOpen} onOpenChange={setTemperatureOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Thermometer /> {t.eventLabels.temperature}</DialogTitle>
            <DialogDescription>{t.actions.temperatureDescription}</DialogDescription>
          </DialogHeader>
          <TemperaturePicker value={temperature} onChange={setTemperature} />
          <Textarea value={temperatureNotes} onChange={(event) => setTemperatureNotes(event.target.value)} placeholder={t.common.optionalObservation} />
          <DialogFooter>
            <Button className="h-12" onClick={async () => {
              await create("temperature", { type: "temperature", value_real: temperature, notes: temperatureNotes }, `${t.eventLabels.temperature} · ${temperature.toFixed(1)} °C`)
              setTemperatureNotes("")
              setTemperatureOpen(false)
            }}>{t.common.save}</Button>
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
            <DialogTitle>{t.eventLabels.irritation}</DialogTitle>
            <DialogDescription>{t.actions.irritationDescription}</DialogDescription>
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
                <CircleDot /> {t.irritationLocations[item]}
              </Button>
            ))}
          </div>
          <Textarea value={irritationNotes} onChange={(event) => setIrritationNotes(event.target.value)} placeholder={t.common.observation} />
          <DialogFooter>
            <Button className="h-12" disabled={locations.length === 0} onClick={async () => {
              await create("irritation", {
                type: "irritation",
                metadata: { locations: locations.map((location) => location.toLowerCase()) },
                notes: irritationNotes
              }, `${t.eventLabels.irritation} · ${locations.map((location) => t.irritationLocations[location as keyof typeof t.irritationLocations]).join(", ")}`)
              setIrritationOpen(false)
            }}>{t.common.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={observationOpen} onOpenChange={(open) => {
        setObservationOpen(open)
        if (!open) setObservationNotes("")
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><MessageSquarePlus className="text-primary" /> {t.actions.addObservation}</DialogTitle>
            <DialogDescription>{t.actions.freeObservationDescription}</DialogDescription>
          </DialogHeader>
          <Textarea
            autoFocus
            className="min-h-32"
            value={observationNotes}
            onChange={(event) => setObservationNotes(event.target.value)}
            placeholder={t.actions.observationPlaceholder}
          />
          <DialogFooter>
            <Button className="h-12" disabled={!observationNotes.trim()} onClick={async () => {
              await create("observation", { type: "observation", notes: observationNotes }, t.eventLabels.observation)
              setObservationOpen(false)
            }}>{t.common.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
