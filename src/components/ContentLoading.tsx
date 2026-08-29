import { LoaderCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

export function ContentLoading({ label }: { label: string }) {
  return (
    <div className="space-y-3 py-4" role="status" aria-label={label}>
      <div className="flex items-center justify-center gap-2 pb-2 text-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin text-primary" aria-hidden="true" />
        <span>{label}</span>
      </div>
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-4/5" />
    </div>
  )
}
