import { useState } from "react"
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
import { api } from "@/lib/api"
import { careGuides, type CareGuideSection } from "@/lib/careGuides"
import { localizedErrorMessage, useI18n } from "@/lib/i18n"
import type { DailyCare } from "@/lib/types"

interface CarePageProps {
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

export function CarePage({ care, onChanged, onValidated }: CarePageProps) {
  const { locale, t } = useI18n()
  const guide = careGuides[locale]
  const [validating, setValidating] = useState(false)
  const [recordingBath, setRecordingBath] = useState(false)
  const careByType = new Map(care.map((item) => [item.care_type, item]))
  const dailyCareTypes = guide.daily.sections
    .map((section) => section.careType)
    .filter((careType): careType is DailyCare["care_type"] => Boolean(careType))

  const validate = async () => {
    setValidating(true)
    try {
      await Promise.all(dailyCareTypes.map((careType) => api.updateDailyCare(careType, true)))
      await api.validateDailyCare()
      toast.success(t.care.validated)
      await onChanged()
      onValidated?.()
    } catch (error) {
      toast.error(localizedErrorMessage(error, t, t.care.validationImpossible))
    } finally {
      setValidating(false)
    }
  }

  const recordBath = async () => {
    setRecordingBath(true)
    try {
      await api.createEvent({ type: "bath" })
      toast.success(t.care.bathRecorded)
      await onChanged()
      onValidated?.()
    } catch (error) {
      toast.error(localizedErrorMessage(error, t, t.common.actionImpossible))
    } finally {
      setRecordingBath(false)
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary"><FaceSlightlySmiling /></div>
          <CardTitle>{t.care.title}</CardTitle>
          <CardDescription>{t.care.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
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
          <Button className="h-12 w-full" disabled={validating} onClick={validate}>
            <Check /> {t.care.doneButton}
          </Button>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Droplets /></div>
          <CardTitle>{t.care.bathTitle}</CardTitle>
          <CardDescription>{t.care.bathDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {guide.bath.sections.map((section) => <GuideSection key={section.title} section={section} icon={bathIcons[guideNumber(section.title)]} />)}
          <div className="rounded-2xl bg-muted px-4 py-3 text-sm">
            <p className="font-semibold">{guide.bath.orderLabel}</p>
            <p className="mt-1 text-muted-foreground">{guide.bath.order}</p>
          </div>
          <Button className="h-12 w-full" disabled={recordingBath} onClick={recordBath}>
            <Check /> {t.care.bathDoneButton}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
