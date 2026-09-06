import { useRef, useState } from "react"
import {
  Baby,
  Bandage,
  Bath,
  Check,
  ChevronDown,
  ClipboardCheck,
  Droplets,
  Eye,
  FaceSlightlySmiling,
  Hand,
  type LucideIcon,
  Shirt,
  ShowerHead,
  Wind
} from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { CARE_TYPES, useRoutinePreferences } from "@/hooks/useRoutinePreferences"
import { api } from "@/lib/api"
import { careGuides, type CareGuideSection } from "@/lib/careGuides"
import { localizedErrorMessage, useI18n } from "@/lib/i18n"
import type { DailyCare } from "@/lib/types"

interface CarePageProps {
  babyId?: number
  care: DailyCare[]
  onChanged: () => Promise<void>
  onValidated?: () => void
}

const dailyCareIcons: Record<DailyCare["care_type"], LucideIcon> = {
  eyes: Eye,
  face: FaceSlightlySmiling,
  nose: Wind,
  cord: Bandage
}

const bathIcons: Record<string, LucideIcon> = {
  "1": Bath,
  "2": Baby,
  "3": Hand,
  "4": ShowerHead,
  "5": Droplets,
  "6": Hand,
  "7": Shirt,
  "8": Bandage
}

function guideNumber(title: string) {
  return title.split(".")[0]
}

function GuideSection({ section, icon: Icon }: {
  section: CareGuideSection
  icon?: LucideIcon
}) {
  return (
    <details className="group rounded-xl border border-border bg-muted/20 open:bg-muted/30">
      <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        {Icon ? (
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-5" />
          </span>
        ) : null}
        <span className="flex-1 text-base font-semibold">{section.title}</span>
        <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-4 border-t border-border px-4 py-4 text-sm leading-6">
        {section.intro ? <p className="font-medium text-foreground">{section.intro}</p> : null}
        {section.groups.map((group, index) => {
          const List = group.ordered ? "ol" : "ul"
          return (
            <div key={`${group.title ?? "group"}-${index}`}>
              {group.title ? <h3 className="mb-1.5 font-semibold text-foreground">{group.title}</h3> : null}
              <List className={`space-y-1 pl-5 text-muted-foreground ${group.ordered ? "list-decimal" : "list-disc"}`}>
                {group.items.map((item) => <li key={item}>{item}</li>)}
              </List>
            </div>
          )
        })}
        {section.notes?.map((note) => (
          <p key={note} className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-foreground">{note}</p>
        ))}
      </div>
    </details>
  )
}

export function CarePage({ babyId, care, onChanged, onValidated }: CarePageProps) {
  const { locale, t } = useI18n()
  const guide = careGuides[locale]
  const [routine, saveRoutine] = useRoutinePreferences(babyId)
  const [selected, setSelected] = useState<DailyCare["care_type"][]>(() => care.filter(item => item.completed).map(item => item.care_type))
  const [error, setError] = useState("")
  const busy = useRef(false)
  const careNames = { eyes: t.eventLabels.eye_care, face: t.eventLabels.face_care, nose: t.eventLabels.nose_care, cord: t.eventLabels.cord_care }
  const [validating, setValidating] = useState(false)
  const [recordingBath, setRecordingBath] = useState(false)
  const careByType = new Map(care.map((item) => [item.care_type, item]))

  const validate = async (types = selected) => {
    if (busy.current || !types.length) return
    busy.current = true
    setError("")
    setValidating(true)
    try {
      await api.validateDailyCare(types)
      setSelected([])
      toast.success(t.care.validated)
      try { await onChanged() } catch { toast.warning(t.ux.refreshError) }
      onValidated?.()
    } catch (error) {
      setError(localizedErrorMessage(error, t, t.care.validationImpossible))
    } finally {
      busy.current = false
      setValidating(false)
    }
  }

  const recordBath = async () => {
    if (busy.current) return
    busy.current = true
    setError("")
    setRecordingBath(true)
    try {
      await api.createEvent({ type: "bath" })
      toast.success(t.care.bathRecorded)
      try { await onChanged() } catch { toast.warning(t.ux.refreshError) }
      onValidated?.()
    } catch (error) {
      setError(localizedErrorMessage(error, t, t.common.actionImpossible))
    } finally {
      busy.current = false
      setRecordingBath(false)
    }
  }

  return (
    <div className="space-y-5">
      {error ? <p role="alert" className="rounded-xl border border-destructive/40 p-3 text-sm text-destructive">{error}</p> : null}
      <details className="rounded-2xl border bg-card p-4">
        <summary className="min-h-11 cursor-pointer font-semibold">{t.ux.routine}</summary>
        <p className="mb-3 text-sm text-muted-foreground">{t.ux.routineHelp}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {CARE_TYPES.map(type => <label key={type} className="flex min-h-12 items-center gap-3 rounded-xl border px-3">
            <Checkbox checked={routine.types.includes(type)} onCheckedChange={checked => saveRoutine({ ...routine, types: checked ? [...routine.types, type] : routine.types.filter(item => item !== type) })} />{careNames[type]}
          </label>)}
        </div>
        <label className="mt-3 flex min-h-12 items-center gap-3"><Checkbox checked={routine.reminders} onCheckedChange={checked => saveRoutine({ ...routine, reminders: checked === true })} />{t.ux.reminders}</label>
        <label className="flex min-h-12 items-center gap-3 text-sm">{t.ux.interval}
          <select className="h-12 rounded-xl border bg-background px-3" value={routine.hours} disabled={!routine.reminders} onChange={event => saveRoutine({ ...routine, hours: Number(event.target.value) })}>
            {[12,24,48,72].map(hours => <option key={hours} value={hours}>{hours} {t.ux.hours}</option>)}
          </select>
        </label>
      </details>
      <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary"><FaceSlightlySmiling /></div>
          <CardTitle>{t.care.title}</CardTitle>
          <CardDescription>{t.ux.careIntro}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {CARE_TYPES.map(type => <label key={type} className={`flex min-h-14 items-center gap-2 rounded-xl border p-3 text-sm ${selected.includes(type) ? "border-primary/50 bg-primary/10" : ""}`}>
              <Checkbox disabled={validating} checked={selected.includes(type)} onCheckedChange={checked => setSelected(current => checked ? [...current, type] : current.filter(item => item !== type))} />{careNames[type]}
            </label>)}
          </div>
          <Button className="min-h-12 w-full whitespace-normal" disabled={validating || recordingBath || !selected.length} onClick={() => void validate()}><Check />{validating ? t.ux.saving : t.ux.saveSelected}</Button>
          <Button variant="outline" className="min-h-12 w-full" disabled={validating || recordingBath || !routine.types.length} onClick={() => void validate(routine.types)}>{t.ux.allDone} · {routine.types.length}</Button>
          <details>
          <summary className="min-h-12 cursor-pointer py-3 text-sm font-semibold">{t.ux.guide}</summary>
          <div className="space-y-3">
          <GuideSection section={guide.daily.preparation} icon={ClipboardCheck} />
          {guide.daily.sections.map((section) => {
            const item = section.careType ? careByType.get(section.careType) : undefined
            if (!item) return null
            return (
              <GuideSection
                key={item.care_type}
                section={section}
                icon={dailyCareIcons[item.care_type]}
              />
            )
          })}
          <div className="rounded-2xl bg-muted px-4 py-3 text-sm">
            <p className="font-semibold">{guide.daily.orderLabel}</p>
            <p className="mt-1 text-muted-foreground">{guide.daily.order}</p>
          </div>
          </div></details>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Droplets /></div>
          <CardTitle>{t.care.bathTitle}</CardTitle>
          <CardDescription>{t.care.bathDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="h-12 w-full" disabled={recordingBath || validating} onClick={recordBath}><Check />{recordingBath ? t.ux.saving : t.care.bathDoneButton}</Button>
          <details><summary className="min-h-12 cursor-pointer py-3 text-sm font-semibold">{t.ux.guide}</summary><div className="space-y-3">
          {guide.bath.sections.map((section) => <GuideSection key={section.title} section={section} icon={bathIcons[guideNumber(section.title)]} />)}
          <div className="rounded-2xl bg-muted px-4 py-3 text-sm">
            <p className="font-semibold">{guide.bath.orderLabel}</p>
            <p className="mt-1 text-muted-foreground">{guide.bath.order}</p>
          </div>
          </div></details>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
