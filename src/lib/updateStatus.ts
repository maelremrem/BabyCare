import type { UpdateStatus } from "@/lib/types"

// Version checks and progress polling can finish in a different order.
export function reconcileUpdateStatus(current: UpdateStatus | null, incoming: UpdateStatus): UpdateStatus {
  if (!current) return incoming
  if (current.updatedAt && incoming.updatedAt && Date.parse(incoming.updatedAt) < Date.parse(current.updatedAt)) {
    return current
  }
  if (current.active && incoming.state === "idle") return current
  if (current.active && incoming.active && current.targetVersion === incoming.targetVersion) {
    return { ...incoming, progress: Math.max(current.progress, incoming.progress) }
  }
  return incoming
}
