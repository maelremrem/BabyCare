import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { SortableTiles, TILE_ORDER_KEY } from "./SortableTiles"

const action = vi.fn()
function grid() {
  return render(<SortableTiles secondaryLabel="Autres actions" primary={<><button key="a" onClick={action}>A</button><button key="b">B</button></>} secondary={<button key="c">C</button>} />)
}
const order = (container: HTMLElement) => [...container.querySelectorAll("[data-tile-id]")].map(node => node.textContent)
beforeEach(() => { localStorage.clear(); action.mockClear(); vi.stubGlobal("PointerEvent", MouseEvent) })
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

test("l’appui long active les vibrations sans déclencher l’action", () => {
  vi.useFakeTimers()
  const { container } = grid()
  fireEvent.pointerDown(screen.getByText("A"), { button: 0, clientX: 20, clientY: 20 })
  act(() => vi.advanceTimersByTime(550))
  expect(screen.getByRole("button", { name: "Terminé" })).toBeInTheDocument()
  expect(container.querySelectorAll(".tile-editing")).toHaveLength(3)
  fireEvent.pointerUp(container.firstChild!)
  fireEvent.click(screen.getByRole("button", { name: "Déplacer 1" }))
  expect(action).not.toHaveBeenCalled()
})

test("un défilement annule l’appui long", () => {
  vi.useFakeTimers()
  grid()
  fireEvent.pointerDown(screen.getByText("A"), { button: 0, clientX: 20, clientY: 20 })
  fireEvent.pointerMove(screen.getByText("A"), { clientX: 20, clientY: 60 })
  act(() => vi.advanceTimersByTime(550))
  expect(screen.queryByRole("button", { name: "Terminé" })).not.toBeInTheDocument()
})

test("le déplacement au clavier persiste et permet de promouvoir une action secondaire", () => {
  const view = grid()
  fireEvent.click(screen.getByRole("button", { name: "Réorganiser" }))
  fireEvent.keyDown(screen.getByRole("button", { name: "Déplacer 3" }), { key: "ArrowUp" })
  expect(order(view.container)).toEqual(["C", "A", "B"])
  fireEvent.click(screen.getByRole("button", { name: "Terminé" }))
  view.unmount()
  const restored = grid()
  expect(order(restored.container)).toEqual(["C", "A", "B"])
  expect(restored.container.querySelector("details")?.textContent).toContain("B")
})

test("une préférence corrompue est ignorée et un stockage indisponible ne bloque pas le déplacement", () => {
  localStorage.setItem(TILE_ORDER_KEY, "bad json")
  const view = grid()
  expect(order(view.container)).toEqual(["A", "B", "C"])
  // jsdom Storage intercepts instance properties, so spying on setItem does not
  // reliably replace it. Stub the storage boundary in both jsdom and Node.
  const save = vi.fn(() => { throw new Error("full") })
  vi.stubGlobal("localStorage", {
    getItem: localStorage.getItem.bind(localStorage),
    setItem: save
  })
  fireEvent.click(screen.getByRole("button", { name: "Réorganiser" }))
  fireEvent.keyDown(screen.getByRole("button", { name: "Déplacer 1" }), { key: "ArrowRight" })
  expect(order(view.container)).toEqual(["B", "A", "C"])
  expect(save).toHaveBeenCalledWith(TILE_ORDER_KEY, JSON.stringify(["b", "a", "c"]))
  expect(screen.getByRole("alert")).toHaveTextContent("indisponible")
})

test("un clic court conserve le fonctionnement normal", () => {
  vi.useFakeTimers()
  grid()
  const tile = screen.getByText("A")
  fireEvent.pointerDown(tile, { button: 0 })
  fireEvent.pointerUp(tile)
  fireEvent.click(tile)
  act(() => vi.advanceTimersByTime(600))
  expect(action).toHaveBeenCalledOnce()
  expect(screen.queryByRole("button", { name: "Terminé" })).not.toBeInTheDocument()
})

test("le glisser-déposer réordonne les tuiles et Échap quitte le mode édition", () => {
  const view = grid()
  fireEvent.click(screen.getByRole("button", { name: "Réorganiser" }))
  const target = view.container.querySelector('[data-tile-id="b"]')!
  Object.defineProperty(document, "elementFromPoint", { configurable: true, value: vi.fn(() => target) })
  fireEvent.pointerDown(screen.getByRole("button", { name: "Déplacer 1" }), { button: 0, clientX: 20, clientY: 200 })
  fireEvent.pointerMove(view.container.firstChild!, { clientX: 220, clientY: 200 })
  fireEvent.pointerUp(view.container.firstChild!)
  expect(order(view.container)).toEqual(["B", "A", "C"])
  fireEvent.keyDown(screen.getByRole("button", { name: "Déplacer 2" }), { key: "Escape" })
  expect(screen.getByRole("button", { name: "Réorganiser" })).toBeInTheDocument()
  expect(action).not.toHaveBeenCalled()
})
