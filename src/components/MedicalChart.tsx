import { memo, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { interpolate, useI18n } from "@/lib/i18n"
import type { AppSettings, BabyEvent } from "@/lib/types"
import { getAgeInMonths, getWhoGrowthReferenceAtAge } from "@/lib/whoGrowth"

interface MedicalChartProps {
  title: string
  indicator: "weight" | "height"
  events: BabyEvent[]
  unit: string
  decimals: number
  settings: AppSettings
  windowStart: number
  windowEnd: number
}

const WIDTH = 600
const HEIGHT = 220
const PADDING_X = 48
const PADDING_Y = 28
function shortDate(value: string, locale: "fr" | "en") {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", { day: "2-digit", month: "2-digit" }).format(new Date(value))
}

function formatMonth(value: number, locale: "fr" | "en") {
  const measurement = Number.isInteger(value)
    ? String(value)
    : locale === "fr" ? value.toFixed(1).replace(".", ",") : value.toFixed(1)
  const unit = locale === "fr" ? "mois" : value === 1 ? "month" : "months"
  return `${measurement} ${unit}`
}

export const MedicalChart = memo(function MedicalChart({ title, indicator, events, unit, decimals, settings, windowStart, windowEnd }: MedicalChartProps) {
  const { locale, t } = useI18n()
  const referenceEnabled = Boolean(settings.birth_date && settings.baby_sex)
  const viewMonths = Math.max(0.25, windowEnd - windowStart)
  const referenceSamples = Math.ceil(viewMonths * 4) + 1

  const allMeasurements = useMemo(() => events
    .filter((event) => event.value_real != null)
    .slice(0, 250)
    .reverse(), [events])
  const measurementsWithAge = allMeasurements.map((event) => ({
    event,
    ageMonths: getAgeInMonths(settings.birth_date, event.started_at)
  }))
  const visibleMeasurements = referenceEnabled
    ? measurementsWithAge.filter(({ ageMonths }) => ageMonths != null && ageMonths >= windowStart && ageMonths <= windowEnd)
    : measurementsWithAge.slice(-20)
  const references = referenceEnabled
    ? Array.from({ length: referenceSamples }, (_, index) => {
        const ageMonths = windowStart + index / (referenceSamples - 1) * viewMonths
        const reference = getWhoGrowthReferenceAtAge(indicator, settings.baby_sex, ageMonths)
        return reference ? { ...reference, ageMonths } : null
      }).filter((reference) => reference != null)
    : []
  const latest = allMeasurements.at(-1)

  if (visibleMeasurements.length === 0 && references.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{t.chart.emptyDescription}</CardDescription>
        </CardHeader>
        <CardContent className="grid h-52 place-items-center text-sm text-muted-foreground">
          {t.chart.emptyBody}
        </CardContent>
      </Card>
    )
  }

  const values = [
    ...visibleMeasurements.map(({ event }) => event.value_real as number),
    ...references.flatMap((reference) => [reference.lower, reference.upper])
  ]
  const rawMin = Math.min(...values)
  const rawMax = Math.max(...values)
  const naturalSpan = rawMax - rawMin
  const padding = naturalSpan === 0 ? Math.max(rawMax * 0.03, 0.2) : naturalSpan * 0.12
  const minimum = rawMin - padding
  const maximum = rawMax + padding
  const range = maximum - minimum
  const drawableWidth = WIDTH - PADDING_X * 2
  const drawableHeight = HEIGHT - PADDING_Y * 2
  const yFor = (value: number) => PADDING_Y + (maximum - value) / range * drawableHeight
  const xForAge = (ageMonths: number) => PADDING_X + (ageMonths - windowStart) / viewMonths * drawableWidth
  const xForIndex = (index: number) => visibleMeasurements.length === 1
    ? WIDTH / 2
    : PADDING_X + index / (visibleMeasurements.length - 1) * drawableWidth
  const points = visibleMeasurements.map(({ event, ageMonths }, index) => ({
    event,
    x: referenceEnabled && ageMonths != null ? xForAge(ageMonths) : xForIndex(index),
    y: yFor(event.value_real as number)
  }))
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ")
  const referencePoints = references.map((reference) => ({
    x: xForAge(reference.ageMonths),
    lowerY: yFor(reference.lower),
    medianY: yFor(reference.median),
    upperY: yFor(reference.upper)
  }))
  const referenceArea = referencePoints.length > 1
    ? [
        ...referencePoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.upperY.toFixed(1)}`),
        ...[...referencePoints].reverse().map((point) => `L ${point.x.toFixed(1)} ${point.lowerY.toFixed(1)}`),
        "Z"
      ].join(" ")
    : ""
  const medianPath = referencePoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.medianY.toFixed(1)}`).join(" ")
  const measurementPlural = visibleMeasurements.length === 1 ? "" : "s"

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {referenceEnabled
              ? interpolate(t.chart.measurementsInView, { count: visibleMeasurements.length, plural: measurementPlural, months: formatMonth(viewMonths, locale) })
              : interpolate(t.chart.measurementsDisplayed, { count: visibleMeasurements.length, plural: measurementPlural })}
          </CardDescription>
        </div>
        <p className="font-mono text-xl font-semibold tabular-nums text-primary">
          {latest?.value_real?.toFixed(decimals) ?? "—"} <span className="text-sm">{unit}</span>
        </p>
      </CardHeader>
      <CardContent>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={interpolate(t.chart.evolution, { title: title.toLowerCase() })} className="h-52 w-full overflow-visible">
          {[0, 1, 2, 3, 4].map((line) => {
            const y = PADDING_Y + line / 4 * drawableHeight
            const label = maximum - line / 4 * range
            return (
              <g key={line}>
                <line x1={PADDING_X} x2={WIDTH - PADDING_X} y1={y} y2={y} stroke="currentColor" strokeOpacity="0.12" vectorEffect="non-scaling-stroke" />
                <text x={PADDING_X - 8} y={y + 4} textAnchor="end" fill="currentColor" opacity="0.55" fontSize="11">{label.toFixed(decimals)}</text>
              </g>
            )
          })}
          {referenceArea ? (
            <g data-testid="who-reference-zone">
              <path d={referenceArea} className="fill-emerald-500/15" />
              <path d={medianPath} fill="none" className="stroke-emerald-500/70" strokeWidth="1.5" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
            </g>
          ) : null}
          {points.length > 1 ? <path d={path} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /> : null}
          {points.map((point) => (
            <circle key={point.event.id} cx={point.x} cy={point.y} r="5" fill="var(--primary)" stroke="var(--card)" strokeWidth="3">
              <title>{`${shortDate(point.event.started_at, locale)} : ${point.event.value_real?.toFixed(decimals)} ${unit}`}</title>
            </circle>
          ))}
          <text x={PADDING_X} y={HEIGHT - 5} fill="currentColor" opacity="0.55" fontSize="11">
            {referenceEnabled ? formatMonth(windowStart, locale) : shortDate(visibleMeasurements[0].event.started_at, locale)}
          </text>
          <text x={WIDTH - PADDING_X} y={HEIGHT - 5} textAnchor="end" fill="currentColor" opacity="0.55" fontSize="11">
            {referenceEnabled ? formatMonth(windowEnd, locale) : shortDate(visibleMeasurements.at(-1)?.event.started_at || "", locale)}
          </text>
        </svg>

        {referenceEnabled ? (
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="size-2.5 rounded-sm bg-emerald-500/25" aria-hidden="true" />
            {t.chart.whoZone}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
})
