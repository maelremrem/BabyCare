import { useRef, useState } from "react"
import {
  Bath, CircleDot, HeartPulse, MessageSquarePlus, Milk, Moon, Pill, Shirt, Thermometer, WalletCards
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MeasurementPicker } from "@/components/MeasurementPicker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { TemperaturePicker } from "@/components/TemperaturePicker"
import { formatNumber } from "@/lib/numbers"
import { api } from "@/lib/api"
import { interpolate, localizedErrorMessage, useI18n } from "@/lib/i18n"
import { BABY_VITAMINS, hasBottleFeeding, hasBreastFeeding, IRRITATION_LOCATIONS, type EventType, type FeedingType } from "@/lib/types"

interface ActionGridProps {
  nextBreast: "breast_left" | "breast_right"
  feedingType: FeedingType
  bottleDefaultQuantity?: number
  onChanged: () => Promise<void>
  onOpenCare: () => void
  onTimerStartAttempt?: () => void
  onTimerStartFailed?: () => void
}

const actionClass = "h-20 min-w-0 whitespace-normal flex-col gap-2 rounded-2xl border-border bg-card text-sm font-semibold tracking-wide shadow-none active:scale-[.97] sm:h-24"
const activeBreastClass = "border-primary/50 text-primary"

export function ActionGrid({ nextBreast, feedingType, bottleDefaultQuantity = 150, onChanged, onOpenCare, onTimerStartAttempt, onTimerStartFailed }: ActionGridProps) {
  const { locale, t } = useI18n()
  const busy = useRef(false)
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState<{type: EventType; message: string} | null>(null)
  const [temperatureOpen, setTemperatureOpen] = useState(false)
  const [irritationOpen, setIrritationOpen] = useState(false)
  const [vitaminOpen, setVitaminOpen] = useState(false)
  const [observationOpen, setObservationOpen] = useState(false)
  const [diaperOpen, setDiaperOpen] = useState(false)
  const [pumpOpen, setPumpOpen] = useState(false)
  const [pumpSide, setPumpSide] = useState<"pump_left" | "pump_right">("pump_left")
  const [pumpQuantity, setPumpQuantity] = useState(150)
  const [bottleOpen, setBottleOpen] = useState(false)
  const [bottleQuantity, setBottleQuantity] = useState(bottleDefaultQuantity)
  const [temperature, setTemperature] = useState(37)
  const [temperatureNotes, setTemperatureNotes] = useState("")
  const [irritationNotes, setIrritationNotes] = useState("")
  const [vitaminNotes, setVitaminNotes] = useState("")
  const [observationNotes, setObservationNotes] = useState("")
  const [locations, setLocations] = useState<string[]>([])
  const [vitamins, setVitamins] = useState<string[]>([])

  const refreshAfterSave = async () => {
    try { await onChanged() }
    catch { toast.warning(t.ux.refreshError) }
  }
  const start = async (type: EventType, label: string) => {
    if (busy.current) return
    busy.current = true
    setSaving(true)
    setFailure(null)
    onTimerStartAttempt?.()
    try {
      await api.startEvent(type)
      toast.success(interpolate(t.actions.started, { label }))
      await refreshAfterSave()
    } catch (error) {
      onTimerStartFailed?.()
      const message = localizedErrorMessage(error, t, t.common.actionImpossible)
      setFailure({ type, message })
      toast.error(message)
    } finally { busy.current = false; setSaving(false) }
  }

  const create = async (type: EventType, payload: Parameters<typeof api.createEvent>[0], label: string) => {
    if (busy.current) return false
    busy.current = true
    setSaving(true)
    setFailure(null)
    try {
      await api.createEvent({ ...payload, type })
      toast.success(interpolate(t.actions.recorded, { label }))
      await refreshAfterSave()
      return true
    } catch (error) {
      const message = localizedErrorMessage(error, t, t.common.actionImpossible)
      setFailure({ type, message })
      toast.error(message)
      return false
    } finally { busy.current = false; setSaving(false) }
  }
  const saveLabel = (type: EventType) => saving ? t.ux.saving : failure?.type === type ? t.ux.retry : t.common.save
  const errorMessage = (type: EventType) => failure?.type === type
    ? <p role="alert" className="rounded-xl border border-destructive/40 p-3 text-sm text-destructive">{failure.message}</p>
    : null

  return (
    <>
      <fieldset disabled={saving} className="min-w-0 space-y-3" aria-busy={saving}>
      <legend className="sr-only">{t.tracking.quickActions}</legend>
      <div className="grid grid-cols-2 gap-3">
        {hasBreastFeeding(feedingType) ? (
          <>
            <Button variant="outline" className={`${actionClass} ${nextBreast === "breast_left" ? activeBreastClass : ""}`} onClick={() => start("breast_left", t.eventLabels.breast_left)}>
              <Milk className="size-6" /> {t.actions.leftBreast}
            </Button>
            <Button variant="outline" className={`${actionClass} ${nextBreast === "breast_right" ? activeBreastClass : ""}`} onClick={() => start("breast_right", t.eventLabels.breast_right)}>
              <Milk className="size-6" /> {t.actions.rightBreast}
            </Button>
          </>
        ) : null}
        {hasBottleFeeding(feedingType) ? (
          <Button variant="outline" className={actionClass} onClick={() => {
            setBottleQuantity(bottleDefaultQuantity)
            setBottleOpen(true)
          }}>
            <Milk className="size-6" /> {t.eventLabels.bottle}
          </Button>
        ) : null}
        <Popover open={diaperOpen} onOpenChange={open => { if (!busy.current) setDiaperOpen(open) }}>
          <PopoverTrigger asChild>
            <Button variant="outline" className={actionClass}><WalletCards className="size-6" /> {t.eventLabels.diaper}</Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="center">
            {Object.entries(t.diaperTypes).map(([value, label]) => (
              <Button key={value} variant="ghost" className="h-12 w-full justify-start" onClick={async () => {
                if (!await create("diaper", { type: "diaper", metadata: { diaper_type: value } }, `${t.eventLabels.diaper} · ${label.toLowerCase()}`)) return
                setDiaperOpen(false)
              }}>
                {label}
              </Button>
            ))}
          </PopoverContent>
        </Popover>

        <Button variant="outline" className={actionClass} onClick={() => start("nap", t.eventLabels.nap)}>
          <Moon className="size-6" /> {t.eventLabels.nap}
        </Button>

      </div>
      <details className="rounded-2xl border bg-card">
        <summary className="min-h-12 cursor-pointer px-4 py-3 text-sm font-semibold">{t.ux.otherActions}</summary>
        <div className="grid grid-cols-2 gap-3 p-3 pt-0">
        <Button variant="outline" className={actionClass} onClick={() => setTemperatureOpen(true)}>
          <Thermometer className="size-6" /> {t.eventLabels.temperature}
        </Button>

        <Button variant="outline" className={actionClass} onClick={onOpenCare}>
          <Bath className="size-6" /> {t.actions.careBath}
        </Button>
        <Button variant="outline" className={actionClass} onClick={() => {
          setPumpSide(nextBreast === "breast_left" ? "pump_left" : "pump_right")
          setPumpOpen(true)
        }}>
          <Milk className="size-6" /> {t.actions.pump}
        </Button>
        <Button variant="outline" className={actionClass} onClick={() => create("clothes_change", { type: "clothes_change" }, t.actions.clothesChanged)}>
          <Shirt className="size-6" /> {t.eventLabels.clothes_change}
        </Button>
        <Button variant="outline" className={actionClass} onClick={() => setIrritationOpen(true)}>
          <HeartPulse className="size-6" /> {t.eventLabels.irritation}
        </Button>
        <Button variant="outline" className={actionClass} onClick={() => setVitaminOpen(true)}>
          <Pill className="size-6" /> {t.eventLabels.vitamin}
        </Button>
        <Button variant="outline" className={actionClass} onClick={() => setObservationOpen(true)}>
          <MessageSquarePlus className="size-6" /> {t.actions.addObservation}
        </Button>
        </div>
      </details>
      </fieldset>
      {!temperatureOpen && !bottleOpen && !pumpOpen && !irritationOpen && !vitaminOpen && !observationOpen && failure ? <p role="alert" className="text-sm text-destructive">{failure.message}</p> : null}

      <Dialog open={pumpOpen} onOpenChange={open => { if (!busy.current) setPumpOpen(open) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Milk /> {t.actions.pump}</DialogTitle>
            <DialogDescription>{t.actions.pumpDescription}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {(["pump_left", "pump_right"] as const).map((side) => (
              <Button key={side} className="h-12" aria-pressed={pumpSide === side} variant={pumpSide === side ? "default" : "outline"} onClick={() => setPumpSide(side)}>
                {side === "pump_left" ? t.eventLabels.breast_left : t.eventLabels.breast_right}
              </Button>
            ))}
          </div>
          <MeasurementPicker value={pumpQuantity} onChange={setPumpQuantity} min={10} max={1000} step={10} decimals={0} unit="ml" label={t.actions.pump} stepLabel="10 ml" />
          {errorMessage(pumpSide)}
          <DialogFooter>
            <Button className="h-12" disabled={saving} onClick={async () => {
              if (await create(pumpSide, { type: pumpSide, value_real: pumpQuantity }, `${t.eventLabels[pumpSide]} · ${pumpQuantity} ml`)) setPumpOpen(false)
            }}>{saveLabel(pumpSide)}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bottleOpen} onOpenChange={open => { if (!busy.current) setBottleOpen(open) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Milk /> {t.eventLabels.bottle}</DialogTitle>
            <DialogDescription>{t.actions.bottleDescription}</DialogDescription>
          </DialogHeader>
          <MeasurementPicker
            value={bottleQuantity}
            onChange={setBottleQuantity}
            min={10}
            max={1000}
            step={10}
            decimals={0}
            unit="ml"
            label={t.eventLabels.bottle}
            stepLabel="10 ml"
          />
          {errorMessage("bottle")}
          <DialogFooter>
            <Button className="h-12" disabled={saving} onClick={async () => {
              if (!await create("bottle", { type: "bottle", value_real: bottleQuantity }, `${t.eventLabels.bottle} · ${bottleQuantity} ml`)) return
              setBottleOpen(false)
            }}>{saveLabel("bottle")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={temperatureOpen} onOpenChange={open => { if (!busy.current) setTemperatureOpen(open) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Thermometer /> {t.eventLabels.temperature}</DialogTitle>
            <DialogDescription>{t.actions.temperatureDescription}</DialogDescription>
          </DialogHeader>
          <TemperaturePicker value={temperature} onChange={setTemperature} />
          <Textarea value={temperatureNotes} onChange={(event) => setTemperatureNotes(event.target.value)} placeholder={t.common.optionalObservation} />
          {errorMessage("temperature")}
          <DialogFooter>
            <Button className="h-12" disabled={saving} onClick={async () => {
              if (!await create("temperature", { type: "temperature", value_real: temperature, notes: temperatureNotes }, `${t.eventLabels.temperature} · ${formatNumber(temperature, 1, locale)} °C`)) return
              setTemperatureNotes("")
              setTemperatureOpen(false)
            }}>{saveLabel("temperature")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={irritationOpen} onOpenChange={(open) => {
        if (busy.current) return
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
          {errorMessage("irritation")}
          <DialogFooter>
            <Button className="h-12" disabled={saving || locations.length === 0} onClick={async () => {
              if (!await create("irritation", {
                type: "irritation",
                metadata: { locations: locations.map((location) => location.toLowerCase()) },
                notes: irritationNotes
              }, `${t.eventLabels.irritation} · ${locations.map((location) => t.irritationLocations[location as keyof typeof t.irritationLocations]).join(", ")}`)) return
              setIrritationOpen(false)
            }}>{saveLabel("irritation")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={vitaminOpen} onOpenChange={(open) => {
        if (busy.current) return
        setVitaminOpen(open)
        if (!open) {
          setVitamins([])
          setVitaminNotes("")
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.eventLabels.vitamin}</DialogTitle>
            <DialogDescription>{t.actions.vitaminDescription}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {BABY_VITAMINS.map((item) => (
              <Button
                key={item}
                type="button"
                aria-pressed={vitamins.includes(item)}
                variant={vitamins.includes(item) ? "default" : "outline"}
                className="h-11"
                onClick={() => setVitamins((current) => current.includes(item) ? current.filter((vitamin) => vitamin !== item) : [...current, item])}
              >
                <CircleDot /> {t.vitamins[item]}
              </Button>
            ))}
          </div>
          <Textarea value={vitaminNotes} onChange={(event) => setVitaminNotes(event.target.value)} placeholder={t.common.observation} />
          {errorMessage("vitamin")}
          <DialogFooter>
            <Button className="h-12" disabled={saving || vitamins.length === 0} onClick={async () => {
              if (!await create("vitamin", {
                type: "vitamin",
                metadata: { vitamins },
                notes: vitaminNotes
              }, `${t.eventLabels.vitamin} · ${vitamins.map((vitamin) => t.vitamins[vitamin as keyof typeof t.vitamins]).join(", ")}`)) return
              setVitaminOpen(false)
            }}>{saveLabel("vitamin")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={observationOpen} onOpenChange={(open) => {
        if (busy.current) return
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
          {errorMessage("observation")}
          <DialogFooter>
            <Button className="h-12" disabled={saving || !observationNotes.trim()} onClick={async () => {
              if (!await create("observation", { type: "observation", notes: observationNotes }, t.eventLabels.observation)) return
              setObservationOpen(false)
            }}>{saveLabel("observation")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
