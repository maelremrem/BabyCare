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
import { IRRITATION_LOCATIONS, normalizeIrritationLocation, type BabyEvent } from "@/lib/types"

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
  const [irritationLocations, setIrritationLocations] = useState<string[]>([])

  useEffect(() => {
    if (!event) return
    setNotes(event.notes || "")
    setStartedAt(toLocalInput(event.started_at))
    setValue(event.value_real == null
      ? event.value_text || ""
      : event.type === "weight"
        ? event.value_real.toFixed(3)
        : event.value_real.toFixed(1))
    setDetail(typeof event.metadata?.diaper_type === "string" ? event.metadata.diaper_type : "")
    const storedLocations = event.metadata?.locations
    const legacyLocation = event.metadata?.location
    setIrritationLocations(
      Array.isArray(storedLocations)
        ? storedLocations.map(normalizeIrritationLocation)
        : typeof legacyLocation === "string"
          ? [normalizeIrritationLocation(legacyLocation)]
          : []
    )
  }, [event])

  if (!event) return null

  const save = async () => {
    const isNumericMeasurement = event.type === "temperature" || event.type === "weight" || event.type === "height"
    const metadata = event.type === "diaper"
      ? { ...event.metadata, diaper_type: detail }
      : event.type === "irritation"
        ? { locations: irritationLocations }
        : event.metadata
    await api.updateEvent(event.id, {
      notes,
      started_at: new Date(startedAt).toISOString(),
      value_real: isNumericMeasurement ? Number(value) : event.value_real,
      value_text: !isNumericMeasurement && event.value_text != null ? value : event.value_text,
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
              <Input type="number" min="0.3" max="30" step="0.05" value={value} onChange={(e) => setValue(e.target.value)} />
            </label>
          )}
          {event.type === "height" && (
            <label className="grid gap-2 text-sm font-medium">
              {t.eventEditor.height}
              <Input type="number" min="20" max="200" step="0.1" value={value} onChange={(e) => setValue(e.target.value)} />
            </label>
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
