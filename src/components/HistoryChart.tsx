import { useEffect, useRef, useState } from "react"
import { useI18n } from "@/lib/i18n"
import type { HistoryChartBucket, HistoryChartData, HistoryChartUnit } from "@/lib/historyChart"
import { EVENT_LABELS, type EventType } from "@/lib/types"

interface HistoryChartProps {
  buckets: HistoryChartBucket[]
  granularity: HistoryChartData["granularity"]
  series: { type: EventType; unit: HistoryChartUnit }[]
}

const WIDTH = 680
const LEFT = 80
const RIGHT = 24
const LANE_HEIGHT = 160
const PLOT_HEIGHT = 100
const EVENT_TYPES = Object.keys(EVENT_LABELS) as EventType[]
const DASHES = [undefined, "8 4", "2 4", "8 3 2 3", "12 4 2 4 2 4"]

function seriesStyle(type: EventType) {
  const index = EVENT_TYPES.indexOf(type)
  return { color: `var(--chart-${index % 5 + 1})`, dash: DASHES[Math.floor(index / 5)] }
}

export function HistoryChart({ buckets, granularity, series }: HistoryChartProps) {
  const { locale, t } = useI18n()
  const [selectedStart, setSelectedStart] = useState<number | null>(null)
  const plotRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(WIDTH)
  const hasData = Boolean(buckets.length && series.length && buckets.some((bucket) => series.some(({ type }) => bucket.values[type] != null)))
  useEffect(() => {
    if (!hasData || !plotRef.current) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.floor(entry.contentRect.width))))
    observer.observe(plotRef.current)
    return () => observer.disconnect()
  }, [hasData])
  const number = new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", { maximumFractionDigits: 2 })
  const date = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    day: "2-digit", month: "2-digit", year: "numeric",
    ...(granularity === "hour" ? { hour: "2-digit", minute: "2-digit" } : {})
  })
  const unitLabel = (unit: HistoryChartUnit) => unit === "count" ? t.history.chartCount : unit
  const periodLabel = (bucket: HistoryChartBucket) => granularity === "hour"
    ? date.format(bucket.start)
    : `${date.format(bucket.start)} – ${date.format(bucket.end - 1)}`
  const valueLabel = (bucket: HistoryChartBucket, type: EventType, unit: HistoryChartUnit) => {
    const value = bucket.values[type]
    return value == null ? "—" : `${number.format(value)} ${unitLabel(unit)}`
  }

  if (!hasData) return <p className="py-8 text-center text-sm text-muted-foreground">{t.history.chartEmpty}</p>

  const units = [...new Set(series.map((item) => item.unit))]
  const selectedIndex = buckets.findIndex((bucket) => bucket.start === selectedStart)
  const activeIndex = selectedIndex < 0 ? buckets.length - 1 : selectedIndex
  const activeBucket = buckets[activeIndex]
  const height = units.length * LANE_HEIGHT + 32
  const first = buckets[0].start
  const last = buckets[buckets.length - 1].end
  const xFor = (timestamp: number) => LEFT + (timestamp - first) / (last - first) * (width - LEFT - RIGHT)
  const bucketX = (bucket: HistoryChartBucket) => xFor((bucket.start + bucket.end) / 2)
  const tickCount = Math.min(buckets.length, width < 440 ? 3 : 5)
  const tickIndices = [...new Set(Array.from({ length: tickCount }, (_, index) => Math.round(index * (buckets.length - 1) / Math.max(1, tickCount - 1))))]
  const axisDate = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", granularity === "hour"
    ? { day: "2-digit", month: "2-digit", hour: "2-digit" }
    : { month: "short", ...(granularity === "month" ? { year: "2-digit" } : { day: "numeric" }) })

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold">{t.history.chartGrouping[granularity]}</p>
      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label={t.history.dataTypes}>
        {series.map(({ type, unit }) => {
          const style = seriesStyle(type)
          return <li key={type} className="flex items-center gap-2">
            <svg width="24" height="12" aria-hidden="true"><line x1="0" x2="24" y1="6" y2="6" stroke={style.color} strokeWidth="3" strokeDasharray={style.dash} /></svg>
            <span>{t.eventLabels[type]} <span className="text-muted-foreground">({unitLabel(unit)})</span></span>
          </li>
        })}
      </ul>
      <div ref={plotRef} className="rounded-xl border border-border/60">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t.history.chartAria} className="block w-full" style={{ height }} onClick={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect()
          if (!bounds.width) return
          const x = (event.clientX - bounds.left) / bounds.width * width
          const nearest = buckets.reduce((best, bucket, index) => Math.abs(bucketX(bucket) - x) < Math.abs(bucketX(buckets[best]) - x) ? index : best, 0)
          setSelectedStart(buckets[nearest].start)
        }}>
          {units.map((unit, laneIndex) => {
            const laneSeries = series.filter((item) => item.unit === unit)
            const values = buckets.flatMap((bucket) => laneSeries.flatMap(({ type }) => bucket.values[type] == null ? [] : [bucket.values[type]!]))
            const measured = unit === "°C" || unit === "kg" || unit === "cm"
            const rawMin = values.length ? Math.min(...values) : 0
            const rawMax = values.length ? Math.max(...values) : 0
            const padding = Math.max((rawMax - rawMin) * 0.1, measured ? 0.1 : 1)
            const minimum = measured ? Math.max(0, rawMin - padding) : 0
            const maximum = Math.max(minimum + 1, rawMax + padding)
            const top = laneIndex * LANE_HEIGHT + 38
            const yFor = (value: number) => top + (maximum - value) / (maximum - minimum) * PLOT_HEIGHT
            return <g key={unit} data-unit={unit}>
              <text x="16" y={top - 16} fill="currentColor" fontSize="14" fontWeight="600">{unitLabel(unit)}</text>
              {[0, 1, 2].map((line) => {
                const y = top + line / 2 * PLOT_HEIGHT
                return <g key={line}>
                  <line x1={LEFT} x2={width - RIGHT} y1={y} y2={y} stroke="currentColor" strokeOpacity="0.12" vectorEffect="non-scaling-stroke" />
                  <text x={LEFT - 10} y={y + 4} textAnchor="end" fill="currentColor" opacity="0.7" fontSize="12">{number.format(maximum - line / 2 * (maximum - minimum))}</text>
                </g>
              })}
              <line x1={bucketX(activeBucket)} x2={bucketX(activeBucket)} y1={top} y2={top + PLOT_HEIGHT} stroke="currentColor" strokeOpacity="0.3" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
              {laneSeries.map(({ type }) => {
                const style = seriesStyle(type)
                let previousDefined = false
                const path = buckets.map((bucket) => {
                  const value = bucket.values[type]
                  if (value == null) { previousDefined = false; return "" }
                  const command = previousDefined ? "L" : "M"
                  previousDefined = true
                  return `${command} ${bucketX(bucket).toFixed(2)} ${yFor(value).toFixed(2)}`
                }).join(" ")
                return <g key={type} data-series={type}>
                  <path d={path} fill="none" stroke={style.color} strokeWidth="2.5" strokeDasharray={style.dash} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                  {buckets.map((bucket, index) => bucket.values[type] == null ? null : <circle key={bucket.start} cx={bucketX(bucket)} cy={yFor(bucket.values[type]!)} r={index === activeIndex ? 4 : 2.5} fill={style.color}>
                    <title>{`${periodLabel(bucket)} · ${t.eventLabels[type]} : ${valueLabel(bucket, type, unit)}`}</title>
                  </circle>)}
                </g>
              })}
              {tickIndices.map((index) => <text key={index} x={bucketX(buckets[index])} y={top + PLOT_HEIGHT + 20} textAnchor="middle" fill="currentColor" opacity="0.7" fontSize="11">{axisDate.format(buckets[index].start)}</text>)}
            </g>
          })}
        </svg>
      </div>
      <div>
        <label className="block text-sm font-medium">
          {t.history.exploreChart}
          <input type="range" min="0" max={buckets.length - 1} value={activeIndex} onChange={(event) => setSelectedStart(buckets[Number(event.target.value)].start)} className="mt-1 min-h-11 w-full accent-primary" />
        </label>
        <div className="rounded-xl bg-muted/60 p-4" aria-live="polite">
          <p className="text-sm font-semibold">{periodLabel(activeBucket)}</p>
          <dl className="mt-2 grid gap-x-5 gap-y-2 text-sm sm:grid-cols-2">
            {series.map(({ type, unit }) => <div key={type} className="flex justify-between gap-3">
              <dt>{t.eventLabels[type]}</dt><dd className="font-semibold tabular-nums">{valueLabel(activeBucket, type, unit)}</dd>
            </div>)}
          </dl>
        </div>
      </div>
      <details>
        <summary className="min-h-11 cursor-pointer text-sm font-semibold">{t.history.chartValues}</summary>
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">{t.history.chartAria}</caption>
            <thead><tr><th scope="col" className="p-2">{t.history.chartPeriod}</th>{series.map(({ type, unit }) => <th key={type} scope="col" className="whitespace-nowrap p-2">{t.eventLabels[type]} ({unitLabel(unit)})</th>)}</tr></thead>
            <tbody>{buckets.map((bucket) => <tr key={bucket.start} className="border-t"><th scope="row" className="whitespace-nowrap p-2 font-normal">{periodLabel(bucket)}</th>{series.map(({ type, unit }) => <td key={type} className="whitespace-nowrap p-2 tabular-nums">{valueLabel(bucket, type, unit)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
