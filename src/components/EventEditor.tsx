import { useEffect, useState } from "react"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import { EVENT_LABELS, type BabyEvent } from "@/lib/types"

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
  const [notes, setNotes] = useState("")
  const [startedAt, setStartedAt] = useState("")
  const [value, setValue] = useState("")
  const [detail, setDetail] = useState("")

  useEffect(() => {
    if (!event) return
    setNotes(event.notes || "")
    setStartedAt(toLocalInput(event.started_at))
    setValue(event.value_real?.toFixed(1) || event.value_text || "")
    setDetail(event.metadata?.diaper_type || event.metadata?.location || "")
  }, [event])

  if (!event) return null

  const save = async () => {
    const metadata = event.type === "diaper"
      ? { ...event.metadata, diaper_type: detail }
      : event.type === "irritation"
        ? { ...event.metadata, location: detail }
        : event.metadata
    await api.updateEvent(event.id, {
      notes,
      started_at: new Date(startedAt).toISOString(),
      value_real: event.type === "temperature" ? Number(value) : event.value_real,
      value_text: event.type !== "temperature" && event.value_text != null ? value : event.value_text,
      metadata
    })
    toast.success("Événement mis à jour")
    onOpenChange(false)
    await onChanged()
  }

  return (
    <Sheet open={Boolean(event)} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader className="px-6 pt-6">
          <SheetTitle>{EVENT_LABELS[event.type]}</SheetTitle>
          <SheetDescription>Modifiez les informations enregistrées.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
          <label className="grid gap-2 text-sm font-medium">
            Date et heure
            <Input type="datetime-local" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} />
          </label>
          {event.type === "temperature" && (
            <label className="grid gap-2 text-sm font-medium">
              Température (°C)
              <Input type="number" min="34" max="42" step="0.1" value={value} onChange={(e) => setValue(e.target.value)} />
            </label>
          )}
          {event.type === "diaper" && (
            <div className="grid gap-2 text-sm font-medium">
              Type de couche
              <div className="grid grid-cols-3 gap-2">
                {[["Urine", "urine"], ["Selles", "stool"], ["Mixte", "mixed"]].map(([label, option]) => (
                  <Button key={option} type="button" variant={detail === option ? "default" : "outline"} onClick={() => setDetail(option)}>
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {event.type === "irritation" && (
            <label className="grid gap-2 text-sm font-medium">
              Zone
              <Input value={detail} onChange={(e) => setDetail(e.target.value)} />
            </label>
          )}
          <label className="grid gap-2 text-sm font-medium">
            Observation
            <Textarea className="min-h-28" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observation" />
          </label>
        </div>
        <SheetFooter className="grid grid-cols-2 gap-3 px-6 pb-6">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="h-12"><Trash2 /> Supprimer</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer cet événement ?</AlertDialogTitle>
                <AlertDialogDescription>Cette action est définitive et retirera l’entrée de l’historique.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={async () => {
                  await api.deleteEvent(event.id)
                  toast.success("Événement supprimé")
                  onOpenChange(false)
                  await onChanged()
                }}>Supprimer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button className="h-12" onClick={() => save().catch((error) => toast.error(error.message))}>Enregistrer</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
