import { useRef } from "react"
import { Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TemperaturePickerProps {
  value: number
  onChange: (value: number) => void
}

export function TemperaturePicker({ value, onChange }: TemperaturePickerProps) {
  const touchY = useRef<number | null>(null)
  const update = (delta: number) => onChange(Math.min(42, Math.max(34, Math.round((value + delta) * 10) / 10)))
  const surrounding = [-0.2, -0.1, 0, 0.1, 0.2].map((delta) => (value + delta).toFixed(1))

  return (
    <div
      className="touch-none select-none py-3"
      onWheel={(event) => {
        event.preventDefault()
        update(event.deltaY > 0 ? 0.1 : -0.1)
      }}
      onTouchStart={(event) => { touchY.current = event.touches[0].clientY }}
      onTouchMove={(event) => {
        if (touchY.current == null) return
        const delta = touchY.current - event.touches[0].clientY
        if (Math.abs(delta) > 18) {
          update(delta > 0 ? 0.1 : -0.1)
          touchY.current = event.touches[0].clientY
        }
      }}
      onTouchEnd={() => { touchY.current = null }}
    >
      <div className="flex items-center justify-center gap-5">
        <Button variant="outline" size="icon-lg" aria-label="Diminuer la température" onClick={() => update(-0.1)}>
          <Minus />
        </Button>
        <div className="w-44 text-center" aria-live="polite">
          {surrounding.map((temperature, index) => (
            <div
              key={`${temperature}-${index}`}
              className={index === 2
                ? "my-1 border-y border-primary py-2 text-4xl font-semibold tabular-nums text-foreground"
                : "py-1 text-base tabular-nums text-muted-foreground/55"}
            >
              {temperature}{index === 2 && <span className="ml-1 text-lg text-primary">°C</span>}
            </div>
          ))}
        </div>
        <Button variant="outline" size="icon-lg" aria-label="Augmenter la température" onClick={() => update(0.1)}>
          <Plus />
        </Button>
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">Glisser verticalement ou utiliser la molette</p>
    </div>
  )
}
