import { memo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { BabyEvent } from "@/lib/types"

interface MedicalChartProps {
  title: string
  events: BabyEvent[]
  unit: string
  decimals: number
}

const WIDTH = 600
const HEIGHT = 220
const PADDING_X = 48
const PADDING_Y = 28
const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" })

function shortDate(value: string) {
  return SHORT_DATE_FORMATTER.format(new Date(value))
}

export const MedicalChart = memo(function MedicalChart({ title, events, unit, decimals }: MedicalChartProps) {
  const measurements = events
    .filter((event) => event.value_real != null)
    .slice(0, 20)
    .reverse()

  const latest = measurements.at(-1)

  if (measurements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Aucune mesure enregistrée.</CardDescription>
        </CardHeader>
        <CardContent className="grid h-52 place-items-center text-sm text-muted-foreground">
          Le graphique apparaîtra après la première mesure.
        </CardContent>
      </Card>
    )
  }

  const values = measurements.map((event) => event.value_real as number)
  const rawMin = Math.min(...values)
  const rawMax = Math.max(...values)
  const naturalSpan = rawMax - rawMin
  const padding = naturalSpan === 0 ? Math.max(rawMax * 0.03, 0.2) : naturalSpan * 0.18
  const minimum = rawMin - padding
  const maximum = rawMax + padding
  const range = maximum - minimum
  const drawableWidth = WIDTH - PADDING_X * 2
  const drawableHeight = HEIGHT - PADDING_Y * 2
  const points = measurements.map((event, index) => {
    const x = measurements.length === 1 ? WIDTH / 2 : PADDING_X + index / (measurements.length - 1) * drawableWidth
    const y = PADDING_Y + (maximum - (event.value_real as number)) / range * drawableHeight
    return { event, x, y }
  })
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ")

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{measurements.length} mesure{measurements.length > 1 ? "s" : ""} affichée{measurements.length > 1 ? "s" : ""}</CardDescription>
        </div>
        <p className="font-mono text-xl font-semibold tabular-nums text-primary">
          {latest?.value_real?.toFixed(decimals)} <span className="text-sm">{unit}</span>
        </p>
      </CardHeader>
      <CardContent>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`Évolution : ${title.toLowerCase()}`} className="h-52 w-full overflow-visible">
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
          {points.length > 1 ? <path d={path} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /> : null}
          {points.map((point) => (
            <circle key={point.event.id} cx={point.x} cy={point.y} r="5" fill="var(--primary)" stroke="var(--card)" strokeWidth="3">
              <title>{`${shortDate(point.event.started_at)} : ${point.event.value_real?.toFixed(decimals)} ${unit}`}</title>
            </circle>
          ))}
          <text x={PADDING_X} y={HEIGHT - 5} fill="currentColor" opacity="0.55" fontSize="11">{shortDate(measurements[0].started_at)}</text>
          <text x={WIDTH - PADDING_X} y={HEIGHT - 5} textAnchor="end" fill="currentColor" opacity="0.55" fontSize="11">{shortDate(measurements.at(-1)?.started_at || "")}</text>
        </svg>
      </CardContent>
    </Card>
  )
})
