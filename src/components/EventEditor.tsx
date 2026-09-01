import { useEffect, useState } from "react"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import { localizedErrorMessage, useI18n } from "@/lib/i18n"
import { BABY_VITAMINS, IRRITATION_LOCATIONS, normalizeIrritationLocation, type BabyEvent } from "@/lib/types"

interface EventEditorProps {
  event: BabyEvent | null
  onOpenChange: (open: boolean) => void
  onChanged: () => Promise<void>
}

const toLocalInput = (value: string) => {
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export function EventEditor({ event, onOpenChange, onChanged }: EventEditorProps) {
  const { t } = useI18n()
  const [notes, setNotes] = useState("")
  const [startedAt, setStartedAt] = useState("")
  const [value, setValue] = useState("")
  const [detail, setDetail] = useState("")
  const [durationHours, setDurationHours] = useState("0")
  const [durationMinutes, setDurationMinutes] = useState("0")
  const [durationSeconds, setDurationSeconds] = useState("0")
  const [irritationLocations, setIrritationLocations] = useState<string[]>([])
  const [vitamins, setVitamins] = useState<string[]>([])

  useEffect(() => {
    if (!event) return
    setNotes(event.notes || "")
    setStartedAt(toLocalInput(event.started_at))
    setValue(event.value_real == null
      ? event.value_text || ""
      : event.type === "weight"
        ? event.value_real.toFixed(3)
        : event.type === "bottle"
          ? event.value_real.toFixed(0)
        : event.value_real.toFixed(1))
    setDetail(typeof event.metadata?.diaper_type === "string" ? event.metadata.diaper_type : "")
    const duration = event.duration_seconds || 0
    setDurationHours(String(Math.floor(duration / 3600)))
    setDurationMinutes(String(Math.floor((duration % 3600) / 60)))
    setDurationSeconds(String(duration % 60))
    const storedLocations = event.metadata?.locations
    const legacyLocation = event.metadata?.location
    setIrritationLocations(
      Array.isArray(storedLocations)
        ? storedLocations.map(normalizeIrritationLocation)
        : typeof legacyLocation === "string"
          ? [normalizeIrritationLocation(legacyLocation)]
          : []
    )
    const storedVitamins = event.metadata?.vitamins
    const legacyVitamin = event.metadata?.vitamin
    setVitamins(
      Array.isArray(storedVitamins)
        ? storedVitamins
        : typeof legacyVitamin === "string"
          ? [legacyVitamin]
          : []
    )
  }, [event])

  if (!event) return null

  const save = async () => {
    const isNumericMeasurement = event.type === "temperature" || event.type === "weight" || event.type === "height" || event.type === "bottle"
    const isTimer = event.type === "breast_left" || event.type === "breast_right" || event.type === "nap"
    const duration = Number(durationHours) * 3600 + Number(durationMinutes) * 60 + Number(durationSeconds)
    const metadata = event.type === "diaper"
      ? { ...event.metadata, diaper_type: detail }
      : event.type === "irritation"
        ? { locations: irritationLocations }
        : event.type === "vitamin"
          ? { vitamins }
        : event.metadata
    await api.updateEvent(event.id, {
      notes,
      started_at: new Date(startedAt).toISOString(),
      value_real: isNumericMeasurement ? Number(value) : event.value_real,
      value_text: !isNumericMeasurement && event.value_text != null ? value : event.value_text,
      duration_seconds: isTimer ? Math.round(duration) : undefined,
      metadata
    })
    toast.success(t.eventEditor.updated)
    onOpenChange(false)
    await onChanged()
  }

  return (
    <Sheet open={Boolean(event)} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader className="px-6 pt-6">
          <SheetTitle>{t.eventLabels[event.type]}</SheetTitle>
          <SheetDescription>{t.eventEditor.description}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
          <label className="grid gap-2 text-sm font-medium">
            {t.eventEditor.dateTime}
            <Input type="datetime-local" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} />
          </label>
          {event.type === "temperature" && (
            <label className="grid gap-2 text-sm font-medium">
              {t.eventEditor.temperature}
              <Input type="number" min="34" max="44" step="0.1" value={value} onChange={(e) => setValue(e.target.value)} />
            </label>
          )}
          {event.type === "weight" && (
            <label className="grid gap-2 text-sm font-medium">
              {t.eventEditor.weight}
              <Input type="number" min="0.3" max="30" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} />
            </label>
          )}
          {event.type === "height" && (
            <label className="grid gap-2 text-sm font-medium">
              {t.eventEditor.height}
              <Input type="number" min="20" max="200" step="0.1" value={value} onChange={(e) => setValue(e.target.value)} />
            </label>
          )}
          {event.type === "bottle" && (
            <label className="grid gap-2 text-sm font-medium">
              {t.eventEditor.bottleQuantity}
              <Input type="number" min="1" max="1000" step="1" value={value} onChange={(e) => setValue(e.target.value)} />
            </label>
          )}
          {(event.type === "breast_left" || event.type === "breast_right" || event.type === "nap") && (
            <fieldset className="grid gap-2">
              <legend className="text-sm font-medium">{t.eventEditor.duration}</legend>
              <div className="grid grid-cols-3 gap-3">
                <label className="grid gap-1 text-xs text-muted-foreground">
                  {t.eventEditor.hours}
                  <Input aria-label={t.eventEditor.hours} type="number" min="0" step="1" value={durationHours} onChange={(e) => setDurationHours(e.target.value)} />
                </label>
                <label className="grid gap-1 text-xs text-muted-foreground">
                  {t.eventEditor.minutes}
                  <Input aria-label={t.eventEditor.minutes} type="number" min="0" max="59" step="1" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />
                </label>
                <label className="grid gap-1 text-xs text-muted-foreground">
                  {t.eventEditor.seconds}
                  <Input aria-label={t.eventEditor.seconds} type="number" min="0" max="59" step="1" value={durationSeconds} onChange={(e) => setDurationSeconds(e.target.value)} />
                </label>
              </div>
            </fieldset>
          )}
          {event.type === "diaper" && (
            <div className="grid gap-2 text-sm font-medium">
              {t.eventEditor.diaperType}
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(t.diaperTypes).map(([option, label]) => (
                  <Button key={option} type="button" variant={detail === option ? "default" : "outline"} onClick={() => setDetail(option)}>
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {event.type === "irritation" && (
            <div className="grid gap-2 text-sm font-medium">
              {t.eventEditor.locations}
              <div className="grid grid-cols-2 gap-2">
                {IRRITATION_LOCATIONS.map((location) => {
                  const selected = irritationLocations.includes(location)
                  return (
                    <Button
                      key={location}
                      type="button"
                      aria-pressed={selected}
                      variant={selected ? "default" : "outline"}
                      onClick={() => setIrritationLocations((current) => current.includes(location)
                        ? current.filter((item) => item !== location)
                        : [...current, location])}
                    >
                      {t.irritationLocations[location]}
                    </Button>
                  )
                })}
              </div>
            </div>
          )}
          {event.type === "vitamin" && (
            <div className="grid gap-2 text-sm font-medium">
              {t.eventEditor.vitamins}
              <div className="grid grid-cols-2 gap-2">
                {BABY_VITAMINS.map((vitamin) => {
                  const selected = vitamins.includes(vitamin)
                  return (
                    <Button
                      key={vitamin}
                      type="button"
                      aria-pressed={selected}
                      variant={selected ? "default" : "outline"}
                      onClick={() => setVitamins((current) => current.includes(vitamin)
                        ? current.filter((item) => item !== vitamin)
                        : [...current, vitamin])}
                    >
                      {t.vitamins[vitamin]}
                    </Button>
                  )
                })}
              </div>
            </div>
          )}
          <label className="grid gap-2 text-sm font-medium">
            {t.common.observation}
            <Textarea className="min-h-28" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t.common.observation} />
          </label>
        </div>
        <SheetFooter className="grid grid-cols-2 gap-3 px-6 pb-6">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="h-12"><Trash2 /> {t.common.delete}</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t.eventEditor.deleteTitle}</AlertDialogTitle>
                <AlertDialogDescription>{t.eventEditor.deleteDescription}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={async () => {
                  await api.deleteEvent(event.id)
                  toast.success(t.eventEditor.deleted)
                  onOpenChange(false)
                  await onChanged()
                }}>{t.common.delete}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button className="h-12" onClick={() => save().catch((error) => toast.error(localizedErrorMessage(error, t, t.common.actionImpossible)))}>{t.common.save}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
