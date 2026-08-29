import { useMemo } from "react"
import iconSvg from "@/assets/babycare-icon.svg?raw"
import { ACCENT_OPTIONS, type AccentColor } from "@/lib/types"
import { cn } from "@/lib/utils"

interface BabyCareIconProps {
  accentColor: AccentColor
  className?: string
}

export function BabyCareIcon({ accentColor, className }: BabyCareIconProps) {
  const source = useMemo(() => {
    const accent = ACCENT_OPTIONS.find((option) => option.id === accentColor) || ACCENT_OPTIONS[0]
    const synchronizedSvg = iconSvg.replace("#FD6D01", accent.value)
    return `data:image/svg+xml,${encodeURIComponent(synchronizedSvg)}`
  }, [accentColor])

  return <img src={source} alt="" aria-hidden="true" draggable={false} className={cn("select-none", className)} />
}
