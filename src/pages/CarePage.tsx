import { useState } from "react"
import { Check, ChevronDown, ClipboardCheck, Droplets } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { api } from "@/lib/api"
import { careGuides, type CareGuideSection } from "@/lib/careGuides"
import { localizedErrorMessage, useI18n } from "@/lib/i18n"
import type { DailyCare } from "@/lib/types"

interface CarePageProps {
  care: DailyCare[]
  onChanged: () => Promise<void>
}

function GuideSection({ section, checked, onCheckedChange }: {
  section: CareGuideSection
  checked?: boolean
  onCheckedChange?: (checked: boolean) => Promise<void>
}) {
  return (
    <details className="group rounded-2xl border border-border bg-muted/20 open:bg-muted/30">
      <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        {onCheckedChange ? (
          <Checkbox
            checked={checked}
            aria-label={section.title}
            onClick={(event) => event.stopPropagation()}
            onCheckedChange={(value) => void onCheckedChange(Boolean(value))}
            className="size-6 shrink-0"
          />
        ) : null}
        <span className="flex-1 text-base font-semibold">{section.title}</span>
        {checked ? <Check className="size-5 shrink-0 text-primary" /> : null}
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

export function CarePage({ care, onChanged }: CarePageProps) {
  const { locale, t } = useI18n()
  const guide = careGuides[locale]
  const completed = care.filter((item) => item.completed).length
  const allCompleted = care.length > 0 && completed === care.length
  const [validating, setValidating] = useState(false)
  const careLabel = (careType: DailyCare["care_type"]) => ({
    eyes: t.eventLabels.eye_care,
    nose: t.eventLabels.nose_care,
    cord: t.eventLabels.cord_care,
    face: t.eventLabels.face_care
  })[careType]
  const careByType = new Map(care.map((item) => [item.care_type, item]))

  const validate = async () => {
    setValidating(true)
    try {
      await api.validateDailyCare()
      toast.success(t.care.validated)
      await onChanged()
    } catch (error) {
      toast.error(localizedErrorMessage(error, t, t.care.validationImpossible))
    } finally {
      setValidating(false)
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t.care.title}</CardTitle>
          <CardDescription>{t.care.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <GuideSection section={guide.daily.preparation} />
          {guide.daily.sections.map((section) => {
            const item = section.careType ? careByType.get(section.careType) : undefined
            if (!item) return null
            return (
              <GuideSection
                key={item.care_type}
                section={section}
                checked={Boolean(item.completed)}
                onCheckedChange={async (checked) => {
                  await api.updateDailyCare(item.care_type, checked)
                  toast.success(`${careLabel(item.care_type)} ${checked ? t.care.completed : t.care.todo}`)
                  await onChanged()
                }}
              />
            )
          })}
          <div className="rounded-2xl bg-muted px-4 py-3 text-sm">
            <p className="font-semibold">{guide.daily.orderLabel}</p>
            <p className="mt-1 text-muted-foreground">{guide.daily.order}</p>
          </div>
          <div className="pt-3">
            <div className="mb-2 flex justify-between text-sm"><span className="text-muted-foreground">{t.care.progress}</span><strong>{completed} / {care.length}</strong></div>
            <Progress value={care.length ? completed / care.length * 100 : 0} />
          </div>
          {allCompleted ? (
            <Button className="h-12 w-full" disabled={validating} onClick={validate}>
              <ClipboardCheck /> {t.care.validate}
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Droplets /></div>
          <CardTitle>{t.care.bathTitle}</CardTitle>
          <CardDescription>{t.care.bathDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {guide.bath.sections.map((section) => <GuideSection key={section.title} section={section} />)}
          <div className="rounded-2xl bg-muted px-4 py-3 text-sm">
            <p className="font-semibold">{guide.bath.orderLabel}</p>
            <p className="mt-1 text-muted-foreground">{guide.bath.order}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
