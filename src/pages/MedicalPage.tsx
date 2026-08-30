import { useCallback, useEffect, useMemo, useState } from "react"
import { Ruler, Scale } from "lucide-react"
import { toast } from "sonner"
import { EventRow } from "@/components/EventRow"
import { ContentLoading } from "@/components/ContentLoading"
import { MeasurementPicker } from "@/components/MeasurementPicker"
import { MedicalChart } from "@/components/MedicalChart"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import { dayHeading, groupEventsByDay } from "@/lib/dates"
import { getLocaleTag, interpolate, localizedErrorMessage, useI18n } from "@/lib/i18n"
import type { AppSettings, BabyEvent } from "@/lib/types"
import { getAgeInMonths } from "@/lib/whoGrowth"

type MeasurementType = "weight" | "height"

const GROWTH_VIEW_MONTHS = 3
const MAX_GROWTH_MONTH = 60
const MIN_GROWTH_RANGE = 0.25

function clampGrowthWindowStart(value: number) {
  return Math.min(MAX_GROWTH_MONTH - GROWTH_VIEW_MONTHS, Math.max(0, Math.round(value * 4) / 4))
}

function defaultGrowthWindow(birthDate: string): [number, number] {
  const currentAge = getAgeInMonths(birthDate, new Date().toISOString())
  const start = clampGrowthWindowStart((currentAge ?? 1) - 1)
  return [start, start + GROWTH_VIEW_MONTHS]
}

function formatGrowthMonth(value: number, locale: "fr" | "en") {
  const measurement = Number.isInteger(value)
    ? String(value)
    : locale === "fr" ? value.toFixed(1).replace(".", ",") : value.toFixed(1)
  const unit = locale === "fr" ? "mois" : value === 1 ? "month" : "months"
  return `${measurement} ${unit}`
}

interface MedicalPageProps {
  settings: AppSettings
  refreshKey: number
  onChanged: () => Promise<void>
  onEdit: (event: BabyEvent) => void
}

const MEASUREMENT_CONFIG = {
  weight: {
    unit: "kg",
    min: 0.3,
    max: 30,
    step: 0.01,
    decimals: 3,
    defaultValue: 3.5,
    icon: Scale
  },
  height: {
    unit: "cm",
    min: 20,
    max: 200,
    step: 0.1,
    decimals: 1,
    defaultValue: 50,
    icon: Ruler
  }
} as const

function medicalParams(type: MeasurementType) {
  const params = new URLSearchParams({ type, limit: "250" })
  return params
}

function measurementDate(value: string, locale: "fr" | "en") {
  return new Intl.DateTimeFormat(getLocaleTag(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value))
}

export function MedicalPage({ settings, refreshKey, onChanged, onEdit }: MedicalPageProps) {
  const { locale, t } = useI18n()
  const [weights, setWeights] = useState<BabyEvent[]>([])
  const [heights, setHeights] = useState<BabyEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [measurementType, setMeasurementType] = useState<MeasurementType | null>(null)
  const [measurementValue, setMeasurementValue] = useState(0)
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [growthWindow, setGrowthWindow] = useState<[number, number]>(() => defaultGrowthWindow(settings.birth_date))
  const [growthWindowStart, growthWindowEnd] = growthWindow

  const loadMeasurements = useCallback(async () => {
    setLoading(true)
    try {
      const [weightResult, heightResult] = await Promise.all([
        api.events(medicalParams("weight")),
        api.events(medicalParams("height"))
      ])
      setWeights(weightResult.events)
      setHeights(heightResult.events)
    } catch (error) {
      toast.error(localizedErrorMessage(error, t, t.medical.unavailable))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadMeasurements()
  }, [loadMeasurements, refreshKey])

  useEffect(() => {
    setGrowthWindow(defaultGrowthWindow(settings.birth_date))
  }, [settings.birth_date, settings.baby_sex])

  const history = useMemo(
    () => [...weights, ...heights].sort((left, right) => Date.parse(right.started_at) - Date.parse(left.started_at)),
    [weights, heights]
  )
  const groups = groupEventsByDay(history)
  const config = measurementType ? MEASUREMENT_CONFIG[measurementType] : null
  const measurementLabels = {
    weight: t.eventLabels.weight,
    height: t.eventLabels.height
  }
  const measurementStepLabels = {
    weight: "10 g",
    height: locale === "fr" ? "0,1 cm" : "0.1 cm"
  }
  const MeasurementIcon = config?.icon
  const measurements = measurementType === "weight" ? weights : heights
  const lastMeasurement = measurements[0]

  const openMeasurement = (type: MeasurementType) => {
    const typeConfig = MEASUREMENT_CONFIG[type]
    const last = (type === "weight" ? weights : heights)[0]
    setMeasurementValue(last?.value_real ?? typeConfig.defaultValue)
    setNotes("")
    setMeasurementType(type)
  }

  const saveMeasurement = async () => {
    if (!measurementType || !config) return
    setSaving(true)
    try {
      await api.createEvent({ type: measurementType, value_real: measurementValue, notes })
      toast.success(`${measurementLabels[measurementType]} · ${measurementValue.toFixed(config.decimals)} ${config.unit}`)
      setMeasurementType(null)
      await onChanged()
    } catch (error) {
      toast.error(localizedErrorMessage(error, t, t.medical.saveError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{t.medical.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t.medical.description}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <MedicalChart title={t.medical.weightChart} indicator="weight" events={weights} unit="kg" decimals={3} settings={settings} windowStart={growthWindowStart} windowEnd={growthWindowEnd} />
        <MedicalChart title={t.medical.heightChart} indicator="height" events={heights} unit="cm" decimals={1} settings={settings} windowStart={growthWindowStart} windowEnd={growthWindowEnd} />
      </div>

      {!settings.birth_date || !settings.baby_sex ? (
        <p className="-mt-5 text-center text-xs text-muted-foreground">
          {t.medical.missingProfile}
        </p>
      ) : (
        <section aria-labelledby="growth-period-title" className="-mt-4 rounded-2xl border bg-card/70 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 id="growth-period-title" className="text-sm font-semibold">{t.medical.displayedPeriod}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t.medical.sharedPeriod}</p>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 font-mono text-xs tabular-nums text-muted-foreground">
              {formatGrowthMonth(growthWindowStart, locale)} → {formatGrowthMonth(growthWindowEnd, locale)}
            </span>
          </div>
          <label className="mt-4 block text-xs text-muted-foreground" htmlFor="growth-window">
            {t.medical.browseGrowth}
          </label>
          <div className="relative mt-2 h-8" data-testid="growth-range">
            <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-muted" aria-hidden="true" />
            <div
              className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-primary"
              style={{ left: `${growthWindowStart / MAX_GROWTH_MONTH * 100}%`, right: `${100 - growthWindowEnd / MAX_GROWTH_MONTH * 100}%` }}
              aria-hidden="true"
            />
            <input
              id="growth-window"
              aria-label={t.medical.growthStart}
              type="range"
              min="0"
              max={MAX_GROWTH_MONTH}
              step="0.25"
              value={growthWindowStart}
              onChange={(event) => setGrowthWindow(([, end]) => [Math.min(Number(event.target.value), end - MIN_GROWTH_RANGE), end])}
              className="growth-range-input"
            />
            <input
              aria-label={t.medical.growthEnd}
              type="range"
              min="0"
              max={MAX_GROWTH_MONTH}
              step="0.25"
              value={growthWindowEnd}
              onChange={(event) => setGrowthWindow(([start]) => [start, Math.max(Number(event.target.value), start + MIN_GROWTH_RANGE)])}
              className="growth-range-input"
            />
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {t.medical.whoDisclaimer}
          </p>
        </section>
      )}

      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[.18em] text-muted-foreground">{t.medical.addMeasurement}</h3>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-24 flex-col gap-2 rounded-2xl bg-card text-sm font-semibold sm:h-28" onClick={() => openMeasurement("weight")}>
            <Scale className="size-6 text-primary" /> {t.eventLabels.weight}
          </Button>
          <Button variant="outline" className="h-24 flex-col gap-2 rounded-2xl bg-card text-sm font-semibold sm:h-28" onClick={() => openMeasurement("height")}>
            <Ruler className="size-6 text-primary" /> {t.eventLabels.height}
          </Button>
        </div>
      </section>

      <section>
        <div className="mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-[.18em] text-muted-foreground">{t.medical.measurementsHistory}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{t.medical.editHint}</p>
        </div>
        <Card>
          <CardContent className="p-3 sm:p-5">
          {loading ? (
              <ContentLoading label={t.medical.loading} />
            ) : history.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">{t.medical.empty}</p>
            ) : Object.entries(groups).map(([key, events], groupIndex) => (
              <div key={key}>
                {groupIndex > 0 ? <Separator className="my-4" /> : null}
                <h4 className="px-2 py-2 text-xs font-semibold tracking-[.14em] text-muted-foreground">{dayHeading(key, locale)}</h4>
                {events?.map((event) => <EventRow key={event.id} event={event} onClick={() => onEdit(event)} />)}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <Dialog open={Boolean(measurementType)} onOpenChange={(open) => !open && setMeasurementType(null)}>
        {measurementType && config && MeasurementIcon ? (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MeasurementIcon className="text-primary" /> {measurementLabels[measurementType]}
              </DialogTitle>
              <DialogDescription>
                {lastMeasurement?.value_real != null
                  ? interpolate(t.medical.lastMeasurement, { value: lastMeasurement.value_real.toFixed(config.decimals), unit: config.unit, date: measurementDate(lastMeasurement.started_at, locale) })
                  : t.medical.noPreviousMeasurement}
              </DialogDescription>
            </DialogHeader>
            <MeasurementPicker
              value={measurementValue}
              onChange={setMeasurementValue}
              min={config.min}
              max={config.max}
              step={config.step}
              decimals={config.decimals}
              unit={config.unit}
              label={measurementLabels[measurementType]}
              stepLabel={measurementStepLabels[measurementType]}
            />
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={t.common.optionalObservation} />
            <DialogFooter>
              <Button className="h-12" disabled={saving} onClick={saveMeasurement}>{t.common.save}</Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  )
}
