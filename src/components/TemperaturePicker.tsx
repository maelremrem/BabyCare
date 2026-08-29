import { useRef } from "react"
import { Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TemperaturePickerProps {
  value: number
  onChange: (value: number) => void
}

export function TemperaturePicker({ value, onChange }: TemperaturePickerProps) {
  const currentValue = useRef(value)
  const dragY = useRef<number | null>(null)
  const wheelDelta = useRef(0)
  currentValue.current = value

  const update = (delta: number) => {
    const next = Math.min(44, Math.max(34, Math.round((currentValue.current + delta) * 10) / 10))
    currentValue.current = next
    onChange(next)
  }
  const dragTo = (clientY: number) => {
    if (dragY.current == null) return
    const distance = dragY.current - clientY
    const steps = Math.trunc(distance / 28)
    if (steps !== 0) {
      update(steps * 0.1)
      dragY.current -= steps * 28
    }
  }
  const surrounding = [-0.2, -0.1, 0, 0.1, 0.2].map((delta) => {
    const temperature = Math.round((value + delta) * 10) / 10
    return temperature >= 34 && temperature <= 44 ? temperature.toFixed(1) : null
  })

  return (
    <div className="select-none py-3">
      <div className="flex items-center justify-center gap-5">
        <Button variant="outline" size="icon-lg" aria-label="Diminuer la température" disabled={value <= 34} onClick={() => update(-0.1)}>
          <Minus />
        </Button>
        <div
          className="w-44 cursor-grab touch-none text-center active:cursor-grabbing"
          aria-label="Sélecteur de température, glissez verticalement"
          aria-live="polite"
          onWheel={(event) => {
            event.preventDefault()
            wheelDelta.current += event.deltaY
            const steps = Math.trunc(wheelDelta.current / 120)
            if (steps !== 0) {
              update(steps * 0.1)
              wheelDelta.current -= steps * 120
            }
          }}
          onMouseDown={(event) => {
            dragY.current = event.clientY
          }}
          onMouseMove={(event) => {
            if ((event.buttons & 1) === 0) {
              dragY.current = null
              return
            }
            dragTo(event.clientY)
          }}
          onMouseUp={() => { dragY.current = null }}
          onMouseLeave={() => { dragY.current = null }}
          onTouchStart={(event) => { dragY.current = event.touches[0].clientY }}
          onTouchMove={(event) => dragTo(event.touches[0].clientY)}
          onTouchEnd={() => { dragY.current = null }}
          onTouchCancel={() => { dragY.current = null }}
        >
          {surrounding.map((temperature, index) => (
            <div
              key={`${index}-${temperature ?? "limit"}`}
              className={index === 2
                ? "my-1 border-y border-primary py-2 text-4xl font-semibold tabular-nums text-foreground"
                : "min-h-7 py-1 text-base tabular-nums text-muted-foreground/55"}
            >
              {temperature}{index === 2 && <span className="ml-1 text-lg text-primary">°C</span>}
            </div>
          ))}
        </div>
        <Button variant="outline" size="icon-lg" aria-label="Augmenter la température" disabled={value >= 44} onClick={() => update(0.1)}>
          <Plus />
        </Button>
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">Glisser verticalement ou utiliser la molette</p>
    </div>
  )
}
