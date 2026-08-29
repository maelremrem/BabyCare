import { Baby, Check, Settings } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useClock } from "@/hooks/useClock"
import { formatClock, formatLongDate } from "@/lib/dates"
import { ACCENT_OPTIONS, type AccentColor } from "@/lib/types"

interface TopBarProps {
  accentColor: AccentColor
  onAccentChange: (color: AccentColor) => Promise<void>
}

export function TopBar({ accentColor, onAccentChange }: TopBarProps) {
  const now = useClock()
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur-xl">
      <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto] items-center gap-4 px-4 py-4 sm:grid-cols-3 sm:px-6">
        <div className="flex items-center gap-3 text-lg font-semibold tracking-tight">
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Baby className="size-5" />
          </span>
          BabyCare
        </div>
        <p className="hidden text-center text-sm text-muted-foreground sm:block">{formatLongDate(now)}</p>
        <div className="flex items-center justify-end gap-2">
          <time className="font-mono text-base font-medium tabular-nums sm:text-lg">{formatClock(now)}</time>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl" aria-label="Ouvrir les paramètres">
                <Settings className="size-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-3">
              <div className="mb-3">
                <p className="font-semibold">Paramètres</p>
                <p className="text-xs text-muted-foreground">Couleur d’accent</p>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {ACCENT_OPTIONS.map((option) => (
                  <Button
                    key={option.id}
                    type="button"
                    variant="outline"
                    size="icon"
                    className="relative size-10 rounded-xl p-0"
                    aria-label={`Utiliser la couleur ${option.label}`}
                    aria-pressed={accentColor === option.id}
                    onClick={() => onAccentChange(option.id).catch((error) => toast.error(error.message))}
                  >
                    <span className="size-6 rounded-full" style={{ backgroundColor: option.value }} />
                    {accentColor === option.id ? <Check className="absolute size-3 text-white drop-shadow" /> : null}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  )
}
