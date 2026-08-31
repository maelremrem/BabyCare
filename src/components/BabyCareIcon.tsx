import { useEffect, useMemo, useState } from "react"
import iconSvg from "@/assets/babycare-icon.svg?raw"
import { ACCENT_OPTIONS, type AccentColor } from "@/lib/types"
import { cn } from "@/lib/utils"

interface BabyCareIconProps {
  accentColor: AccentColor
  className?: string
}

export function BabyCareIcon({ accentColor, className }: BabyCareIconProps) {
  const [hasDataUriFailed, setHasDataUriFailed] = useState(false)
  const source = useMemo(() => {
    const accent = ACCENT_OPTIONS.find((option) => option.id === accentColor) || ACCENT_OPTIONS[0]
    const synchronizedSvg = iconSvg.replace("#FD6D01", accent.value)
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(synchronizedSvg)}`
  }, [accentColor])

  useEffect(() => {
    setHasDataUriFailed(false)
  }, [source])

  return (
    <img
      src={hasDataUriFailed ? "/babycare-icon.svg" : source}
      alt=""
      aria-hidden="true"
      draggable={false}
      width={1254}
      height={1254}
      onError={() => setHasDataUriFailed(true)}
      className={cn("select-none", className)}
    />
  )
}
