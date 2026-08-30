import { useState } from "react"
import { Check, ClipboardCheck, Droplets } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { api } from "@/lib/api"
import { useI18n } from "@/lib/i18n"
import type { DailyCare } from "@/lib/types"

interface CarePageProps {
  care: DailyCare[]
  onChanged: () => Promise<void>
}

export function CarePage({ care, onChanged }: CarePageProps) {
  const { t } = useI18n()
  const completed = care.filter((item) => item.completed).length
  const allCompleted = care.length > 0 && completed === care.length
  const [validating, setValidating] = useState(false)
  const careLabel = (careType: DailyCare["care_type"]) => ({
    eyes: t.eventLabels.eye_care,
    nose: t.eventLabels.nose_care,
    cord: t.eventLabels.cord_care,
    face: t.eventLabels.face_care
  })[careType]

  const validate = async () => {
    setValidating(true)
    try {
      await api.validateDailyCare()
      toast.success(t.care.validated)
      await onChanged()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.care.validationImpossible)
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
          {care.map((item) => (
            <label key={item.care_type} className="flex min-h-16 cursor-pointer items-center gap-4 rounded-2xl border border-border px-4 transition-colors hover:bg-muted/40">
              <Checkbox
                checked={Boolean(item.completed)}
                onCheckedChange={async (checked) => {
                  await api.updateDailyCare(item.care_type, Boolean(checked))
                  toast.success(`${careLabel(item.care_type)} ${checked ? t.care.completed : t.care.todo}`)
                  await onChanged()
                }}
                className="size-6"
              />
              <span className="flex-1 text-base font-medium">{careLabel(item.care_type)}</span>
              {item.completed ? <Check className="size-5 text-primary" /> : null}
            </label>
          ))}
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
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• {t.care.bathItems.towel}</p>
            <p>• {t.care.bathItems.temperature}</p>
            <p>• {t.care.bathItems.folds}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
