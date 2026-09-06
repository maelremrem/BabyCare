import { Children, Fragment, isValidElement, useEffect, useRef, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n"

export const TILE_ORDER_KEY = "babycare.action-tile-order.v1"

function tiles(nodes: ReactNode): { id: string; content: ReactNode }[] {
  const result: { id: string; content: ReactNode }[] = []
  Children.forEach(nodes, node => {
    if (!isValidElement<{ children?: ReactNode }>(node)) return
    if (node.type === Fragment) result.push(...tiles(node.props.children))
    else result.push({ id: String(node.key), content: node })
  })
  return result
}

function readOrder(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(TILE_ORDER_KEY) ?? "[]")
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === "string"))] : []
  } catch { return [] }
}

export function SortableTiles({ primary, secondary, secondaryLabel, labels = {} }: { primary: ReactNode; secondary: ReactNode; secondaryLabel: string; labels?: Record<string, string> }) {
  const { locale } = useI18n()
  const copy = locale === "fr" ? {
    edit: "Réorganiser", done: "Terminé", hint: "Maintenez une tuile pour la déplacer.",
    help: "Glissez les tuiles. Les premières restent visibles sur l’accueil. Au clavier, utilisez les flèches sur une tuile. Échap pour terminer.",
    error: "L’ordre est conservé pour cette session, mais le stockage de cet appareil est indisponible.",
    move: "Déplacer", position: "Position"
  } : {
    edit: "Reorder", done: "Done", hint: "Touch and hold a tile to move it.",
    help: "Drag the tiles. The first tiles stay visible on the home screen. Use arrow keys on a tile to move it. Escape to finish.",
    error: "The order is kept for this session, but this device’s storage is unavailable.",
    move: "Move", position: "Position"
  }
  const [order, setOrder] = useState(readOrder)
  const [editing, setEditing] = useState(false)
  const [dragging, setDragging] = useState<string | null>(null)
  const [storageError, setStorageError] = useState(false)
  const [announcement, setAnnouncement] = useState("")
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const gesture = useRef<{ id: string; x: number; y: number; active: boolean } | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const suppressClick = useRef(false)
  const main = tiles(primary)
  const all = [...main, ...tiles(secondary)]
  const byId = new Map(all.map(tile => [tile.id, tile]))
  const ids = [...order.filter(id => byId.has(id)), ...all.map(tile => tile.id).filter(id => !order.includes(id))]
  const visible = ids.map(id => byId.get(id)!)

  const cancelTimer = () => { if (timer.current) clearTimeout(timer.current); timer.current = null }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  function move(id: string, target: string) {
    if (id === target) return
    const next = [...ids]
    const from = next.indexOf(id)
    const to = next.indexOf(target)
    if (from < 0 || to < 0) return
    next.splice(from, 1)
    next.splice(to, 0, id)
    // Keep hidden feeding actions so switching feeding mode does not lose preferences.
    const saved = [...next, ...order.filter(key => !byId.has(key))]
    setOrder(saved)
    try { localStorage.setItem(TILE_ORDER_KEY, JSON.stringify(saved)); setStorageError(false) }
    catch { setStorageError(true) }
    setAnnouncement(`${copy.position} ${to + 1} / ${next.length}`)
  }

  function renderTile(tile: typeof visible[number]) {
    return <div key={tile.id} data-tile-id={tile.id}
      className={`min-w-0 [&>button]:w-full ${editing ? "tile-editing relative touch-none select-none rounded-2xl ring-1 ring-primary/40" : "touch-pan-y select-none"} ${dragging === tile.id ? "z-10 opacity-60 ring-2 ring-primary" : ""}`}
      onPointerDown={event => {
        if (event.button !== 0 || event.isPrimary === false) return
        if ((event.target as HTMLElement).closest("button:disabled")) return
        cancelTimer()
        suppressClick.current = false
        gesture.current = { id: tile.id, x: event.clientX, y: event.clientY, active: editing }
        if (editing) {
          setDragging(tile.id)
          root.current?.setPointerCapture?.(event.pointerId)
        } else {
          timer.current = setTimeout(() => {
            suppressClick.current = true
            setEditing(true)
            // Lift the finger after the long press, then drag with touch scrolling disabled.
            gesture.current = null
          }, 500)
        }
      }}
      onPointerLeave={() => { if (!gesture.current?.active) { cancelTimer(); gesture.current = null } }}
      onContextMenu={event => event.preventDefault()}>
      {editing ? <>
        <fieldset disabled className="pointer-events-none tile-preview min-w-0" aria-hidden="true" inert>{tile.content}</fieldset>
        <button type="button" className="absolute inset-0 cursor-grab rounded-2xl focus-visible:outline-2 focus-visible:outline-primary active:cursor-grabbing"
          aria-label={`${copy.move} ${labels[tile.id] ?? ids.indexOf(tile.id) + 1}`} aria-describedby="tile-reorder-help"
          onKeyDown={event => {
            const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -2, ArrowDown: 2 }[event.key]
            if (delta === undefined) return
            event.preventDefault()
            const target = ids[ids.indexOf(tile.id) + delta]
            if (target) move(tile.id, target)
          }} />
      </> : tile.content}
    </div>
  }

  return <div ref={root} className="space-y-3"
    onKeyDown={event => { if (event.key === "Escape") { setEditing(false); setDragging(null); gesture.current = null; cancelTimer() } }}
    onClickCapture={event => {
      if ((suppressClick.current || editing) && (event.target as HTMLElement).closest("[data-tile-id]")) {
        event.preventDefault(); event.stopPropagation(); suppressClick.current = false
      }
    }}
    onPointerMove={event => {
      const current = gesture.current
      if (!current) return
      if (!current.active) {
        if (Math.hypot(event.clientX - current.x, event.clientY - current.y) > 8) { cancelTimer(); gesture.current = null }
        return
      }
      event.preventDefault()
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-tile-id]")
      if (target && root.current?.contains(target)) move(current.id, target.dataset.tileId!)
      if (event.clientY < 120) window.scrollBy(0, -18)
      else if (event.clientY > window.innerHeight - 100) window.scrollBy(0, 18)
    }}
    onPointerUp={() => { cancelTimer(); gesture.current = null; setDragging(null) }}
    onPointerCancel={() => { cancelTimer(); gesture.current = null; setDragging(null) }}>
    <div className="flex items-center justify-between gap-3">
      <p id="tile-reorder-help" className="text-xs text-muted-foreground">{editing ? copy.help : copy.hint}</p>
      <Button type="button" variant={editing ? "default" : "ghost"} className="h-11 shrink-0" onClick={() => { setEditing(!editing); suppressClick.current = false }}>{editing ? copy.done : copy.edit}</Button>
    </div>
    {storageError && <p role="alert" className="text-sm text-destructive">{copy.error}</p>}
    <p role="status" className="sr-only">{announcement}</p>
    {editing ? <div className="grid grid-cols-2 gap-3">{visible.map(renderTile)}</div> : <>
      <div className="grid grid-cols-2 gap-3">{visible.slice(0, main.length).map(renderTile)}</div>
      <details className="rounded-2xl border bg-card">
        <summary className="min-h-12 cursor-pointer px-4 py-3 text-sm font-semibold">{secondaryLabel}</summary>
        <div className="grid grid-cols-2 gap-3 p-3 pt-0">{visible.slice(main.length).map(renderTile)}</div>
      </details>
    </>}
  </div>
}
