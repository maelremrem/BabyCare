import { CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { UpdateStatus } from "@/lib/types"
import { useI18n } from "@/lib/i18n"

interface UpdateProgressDialogProps {
  open: boolean
  status: UpdateStatus | null
  onOpenChange: (open: boolean) => void
}

export function UpdateProgressDialog({ open, status, onOpenChange }: UpdateProgressDialogProps) {
  const { t } = useI18n()
  const progress = Math.max(0, Math.min(100, status?.progress || 0))
  const finished = status?.state === "complete"
  const failed = status?.state === "error"
  const radius = 54
  const circumference = 2 * Math.PI * radius

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!status?.active) onOpenChange(nextOpen)
    }}>
      <DialogContent className="sm:max-w-md" showCloseButton={!status?.active}>
        <DialogHeader>
          <DialogTitle>{finished ? t.update.completeTitle : failed ? t.update.errorTitle : t.update.progressTitle}</DialogTitle>
          <DialogDescription>{finished ? t.update.completeDescription : failed ? t.update.errorDescription : t.update.progressDescription}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center py-5">
          <div className="relative size-36" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label={t.update.progressLabel}>
            <svg viewBox="0 0 128 128" className="size-full -rotate-90" aria-hidden="true">
              <circle cx="64" cy="64" r={radius} fill="none" stroke="currentColor" strokeWidth="9" className="text-muted/70" />
              <circle
                cx="64"
                cy="64"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress / 100)}
                className={failed ? "text-destructive transition-all duration-500" : "text-primary transition-all duration-500"}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              {finished ? <CheckCircle2 className="size-10 text-primary" /> : failed ? <CircleAlert className="size-10 text-destructive" /> : (
                <span className="text-2xl font-semibold tabular-nums">{progress}%</span>
              )}
            </div>
          </div>

          <p className="mt-5 min-h-5 text-center font-mono text-xs text-muted-foreground">{status?.command || t.update.preparing}</p>
          {status?.message ? <p className="mt-3 text-center text-sm text-destructive">{status.message}</p> : null}
          {status?.active ? <LoaderCircle className="mt-4 size-4 animate-spin text-muted-foreground" aria-hidden="true" /> : null}
        </div>

        {!status?.active ? <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t.update.close}</Button> : null}
      </DialogContent>
    </Dialog>
  )
}
