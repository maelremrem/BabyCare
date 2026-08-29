import { Baby } from "lucide-react"
import { useClock } from "@/hooks/useClock"
import { formatClock, formatLongDate } from "@/lib/dates"

export function TopBar() {
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
        <time className="font-mono text-lg font-medium tabular-nums sm:text-right">{formatClock(now)}</time>
      </div>
    </header>
  )
}
