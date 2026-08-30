import { interpolate, useI18n } from "@/lib/i18n"

const IDEAL_MIN = 36.5
const IDEAL_MAX = 37.5

interface TemperatureSparklineProps {
  values: number[]
}

export function TemperatureSparkline({ values }: TemperatureSparklineProps) {
  const { locale, t } = useI18n()
  if (values.length === 0) return null

  const width = 210
  const height = 58
  const padding = 4
  const chartRight = 172
  const rawMin = Math.min(...values, IDEAL_MIN)
  const rawMax = Math.max(...values, IDEAL_MAX)
  const domainMin = rawMin - 0.2
  const domainMax = rawMax + 0.2
  const domainSpan = domainMax - domainMin
  const yFor = (value: number) => padding + (domainMax - value) * ((height - padding * 2) / domainSpan)
  const points = values.map((value, index) => {
    const x = values.length === 1
      ? chartRight / 2
      : padding + index * ((chartRight - padding * 2) / (values.length - 1))
    return `${x.toFixed(1)},${yFor(value).toFixed(1)}`
  })
  const idealTop = yFor(IDEAL_MAX)
  const idealBottom = yFor(IDEAL_MIN)
  const plural = values.length === 1 ? "" : "s"
  const formatTemperature = (temperature: number) => locale === "fr"
    ? temperature.toFixed(1).replace(".", ",")
    : temperature.toFixed(1)

  return (
    <div className="min-w-0">
      <svg
        className="h-14 w-36 overflow-visible"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={interpolate(t.temperatureSparkline.aria, { count: values.length, plural })}
      >
        <title>{t.temperatureSparkline.title}</title>
        <rect
          data-testid="ideal-temperature-zone"
          x={padding}
          y={idealTop}
          width={chartRight - padding}
          height={idealBottom - idealTop}
          rx="3"
          className="fill-emerald-500/15"
        />
        {[IDEAL_MAX, IDEAL_MIN].map((temperature) => {
          const y = yFor(temperature)
          return (
            <g key={temperature}>
              <line x1={padding} y1={y} x2={chartRight} y2={y} className="stroke-emerald-500/45" strokeDasharray="3 3" />
              <text x={width - 1} y={y + 3} textAnchor="end" className="fill-emerald-600 text-[9px] dark:fill-emerald-400">
                {formatTemperature(temperature)}°
              </text>
            </g>
          )
        })}
        {values.length > 1 ? (
          <polyline
            points={points.join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          />
        ) : null}
        {points.map((point, index) => {
          const [cx, cy] = point.split(",")
          return <circle key={`${point}-${index}`} cx={cx} cy={cy} r={index === values.length - 1 ? 4 : 2.5} className="fill-primary" />
        })}
      </svg>
      <p className="mt-1 flex items-center justify-end gap-1 text-[9px] leading-none text-muted-foreground">
        <span className="size-2 rounded-sm bg-emerald-500/25" aria-hidden="true" />
        {t.temperatureSparkline.legend}
      </p>
    </div>
  )
}
