import { LoaderCircle } from "lucide-react"
import { BabyCareIcon } from "@/components/BabyCareIcon"
import { Skeleton } from "@/components/ui/skeleton"
import type { AccentColor } from "@/lib/types"

export function AppLoading({ accentColor }: { accentColor: AccentColor }) {
  return (
    <div className="min-h-dvh bg-background px-4 py-6 text-foreground" role="status" aria-label="Chargement de BabyCare">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-3 border-b border-border/70 pb-5">
          <BabyCareIcon accentColor={accentColor} className="size-11 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <LoaderCircle className="ml-auto size-6 animate-spin text-primary" aria-hidden="true" />
        </div>
        <Skeleton className="mt-5 h-14 w-full rounded-2xl" />
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-36 rounded-2xl" />)}
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-28 rounded-2xl" />)}
        </div>
        <span className="sr-only">Chargement de l’application…</span>
      </div>
    </div>
  )
}
