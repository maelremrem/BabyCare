import { useRef } from "react"
import { Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MeasurementPickerProps {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step: number
  decimals: number
  unit: string
  label: string
  stepLabel: string
}

export function MeasurementPicker({ value, onChange, min, max, step, decimals, unit, label, stepLabel }: MeasurementPickerProps) {
  const currentValue = useRef(value)
  const dragY = useRef<number | null>(null)
  const wheelDelta = useRef(0)
  const multiplier = 10 ** decimals
  currentValue.current = value

  const update = (steps: number) => {
    const next = Math.min(max, Math.max(min, Math.round((currentValue.current + steps * step) * multiplier) / multiplier))
    currentValue.current = next
    onChange(next)
  }

  const dragTo = (clientY: number) => {
    if (dragY.current == null) return
    const steps = Math.trunc((dragY.current - clientY) / 28)
    if (steps === 0) return
    update(steps)
    dragY.current -= steps * 28
  }

  const surrounding = [-2, -1, 0, 1, 2].map((offset) => {
    const measurement = Math.round((value + offset * step) * multiplier) / multiplier
    return measurement >= min && measurement <= max ? measurement.toFixed(decimals) : null
  })

  return (
    <div className="select-none py-3">
      <div className="flex items-center justify-center gap-4 sm:gap-5">
        <Button variant="outline" size="icon-lg" aria-label={`Diminuer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => update(-1)}>
          <Minus />
        </Button>
        <div
          role="spinbutton"
          tabIndex={0}
          aria-label={`Sélecteur de ${label.toLowerCase()}`}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={`${value.toFixed(decimals)} ${unit}`}
          className="w-48 cursor-grab touch-none text-center outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
          onKeyDown={(event) => {
            if (event.key === "ArrowUp" || event.key === "ArrowRight") {
              event.preventDefault()
              update(1)
            }
            if (event.key === "ArrowDown" || event.key === "ArrowLeft") {
              event.preventDefault()
              update(-1)
            }
          }}
          onWheel={(event) => {
            event.preventDefault()
            wheelDelta.current += event.deltaY
            const steps = Math.trunc(wheelDelta.current / 120)
            if (steps === 0) return
            update(-steps)
            wheelDelta.current -= steps * 120
          }}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId)
            dragY.current = event.clientY
          }}
          onPointerMove={(event) => dragTo(event.clientY)}
          onPointerUp={(event) => {
            event.currentTarget.releasePointerCapture(event.pointerId)
            dragY.current = null
          }}
          onPointerCancel={() => { dragY.current = null }}
        >
          {surrounding.map((measurement, index) => (
            <div
              key={`${index}-${measurement ?? "limit"}`}
              className={index === 2
                ? "my-1 border-y border-primary py-2 text-4xl font-semibold tabular-nums text-foreground"
                : "min-h-7 py-1 text-base tabular-nums text-muted-foreground/55"}
            >
              {measurement}{index === 2 ? <span className="ml-1 text-lg text-primary">{unit}</span> : null}
            </div>
          ))}
        </div>
        <Button variant="outline" size="icon-lg" aria-label={`Augmenter ${label.toLowerCase()}`} disabled={value >= max} onClick={() => update(1)}>
          <Plus />
        </Button>
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">Pas de {stepLabel} · glisser, molette ou flèches</p>
    </div>
  )
}
