import { useEffect, useRef, useState } from "react"
import { Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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
  const cancelledEdit = useRef(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const multiplier = 10 ** decimals

  useEffect(() => {
    currentValue.current = value
  }, [value])

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

  const beginEditing = () => {
    cancelledEdit.current = false
    setDraft(value.toFixed(decimals).replace(".", ","))
    setEditing(true)
  }

  const commitEditing = () => {
    setEditing(false)
    if (cancelledEdit.current) {
      cancelledEdit.current = false
      return
    }
    const parsed = Number(draft.trim().replace(",", "."))
    if (!Number.isFinite(parsed)) return
    const next = Math.min(max, Math.max(min, Math.round(parsed * multiplier) / multiplier))
    currentValue.current = next
    onChange(next)
  }

  const surrounding = [-2, -1, 0, 1, 2].map((offset) => {
    const measurement = Math.round((value + offset * step) * multiplier) / multiplier
    return measurement >= min && measurement <= max ? measurement.toFixed(decimals) : null
  })

  return (
    <div className="select-none py-3">
      <div className="flex items-center justify-center gap-4 sm:gap-5">
        <HoldStepButton label={`Diminuer ${label.toLowerCase()}`} disabled={value <= min} onStep={() => update(-1)}>
          <Minus />
        </HoldStepButton>
        <div
          role={editing ? undefined : "spinbutton"}
          tabIndex={editing ? -1 : 0}
          aria-label={editing ? undefined : `Sélecteur de ${label.toLowerCase()}`}
          aria-valuemin={editing ? undefined : min}
          aria-valuemax={editing ? undefined : max}
          aria-valuenow={editing ? undefined : value}
          aria-valuetext={editing ? undefined : `${value.toFixed(decimals)} ${unit}`}
          className="w-48 cursor-grab touch-none rounded-sm text-center outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
          onKeyDown={(event) => {
            if (editing) return
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
            if (editing) return
            event.preventDefault()
            wheelDelta.current += event.deltaY
            const steps = Math.trunc(wheelDelta.current / 120)
            if (steps === 0) return
            update(-steps)
            wheelDelta.current -= steps * 120
          }}
          onPointerDown={(event) => {
            if (editing) return
            if (event.detail >= 2 && (event.target as HTMLElement).closest("[data-direct-entry]")) {
              event.preventDefault()
              dragY.current = null
              beginEditing()
              return
            }
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
              data-direct-entry={index === 2 ? "true" : undefined}
              onDoubleClick={index === 2 && !editing ? (event) => {
                event.preventDefault()
                beginEditing()
              } : undefined}
              title={index === 2 ? "Double-cliquer pour saisir la valeur" : undefined}
            >
              {index === 2 && editing ? (
                <span className="inline-flex items-center justify-center gap-1">
                  <Input
                    autoFocus
                    aria-label={`Saisie directe de ${label.toLowerCase()}`}
                    className="h-11 w-28 text-center text-3xl font-semibold tabular-nums"
                    inputMode="decimal"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onFocus={(event) => event.currentTarget.select()}
                    onBlur={commitEditing}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur()
                      if (event.key === "Escape") {
                        cancelledEdit.current = true
                        event.currentTarget.blur()
                      }
                    }}
                  />
                  <span className="text-lg text-primary">{unit}</span>
                </span>
              ) : (
                <>{measurement}{index === 2 ? <span className="ml-1 text-lg text-primary">{unit}</span> : null}</>
              )}
            </div>
          ))}
        </div>
        <HoldStepButton label={`Augmenter ${label.toLowerCase()}`} disabled={value >= max} onStep={() => update(1)}>
          <Plus />
        </HoldStepButton>
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">Pas de {stepLabel} · maintenir +/− · double-clic pour saisir</p>
    </div>
  )
}

function HoldStepButton({ label, disabled, onStep, children }: {
  label: string
  disabled: boolean
  onStep: () => void
  children: React.ReactNode
}) {
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const repeats = useRef(0)

  useEffect(() => () => {
    if (timeout.current) clearTimeout(timeout.current)
  }, [])

  const stop = () => {
    if (timeout.current) clearTimeout(timeout.current)
    timeout.current = null
  }

  const start = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled) return
    event.currentTarget.setPointerCapture(event.pointerId)
    onStep()
    repeats.current = 0
    const repeat = () => {
      onStep()
      repeats.current += 1
      timeout.current = setTimeout(repeat, Math.max(45, 180 - repeats.current * 12))
    }
    timeout.current = setTimeout(repeat, 350)
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-lg"
      aria-label={label}
      disabled={disabled}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerCancel={stop}
      onClick={(event) => {
        if (event.detail === 0) onStep()
      }}
    >
      {children}
    </Button>
  )
}
