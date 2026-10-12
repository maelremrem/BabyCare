import { fireEvent, render, screen, within } from "@testing-library/react"
import { expect, test, vi } from "vitest"
import { HistoryChart } from "@/components/HistoryChart"

const first = new Date(2026, 7, 1).getTime()
const second = new Date(2026, 7, 2).getTime()
const third = new Date(2026, 7, 3).getTime()

test("adapte la largeur du tracé au téléphone sans masquer la fin de la période", () => {
  vi.stubGlobal("ResizeObserver", class {
    constructor(private callback: ResizeObserverCallback) {}
    observe() { this.callback([{ contentRect: { width: 320 } } as ResizeObserverEntry], this as unknown as ResizeObserver) }
    disconnect() {}
  })
  try {
    render(<HistoryChart buckets={[{ start: first, end: second, values: { bottle: 120 } }]} granularity="day" series={[{ type: "bottle", unit: "ml" }]} />)
    expect(screen.getByRole("img").getAttribute("viewBox")?.split(" ")[2]).toBe("320")
  } finally { vi.unstubAllGlobals() }
})

test("ne dessine pas de mesure inventée lorsqu’aucune valeur n’est disponible", () => {
  render(<HistoryChart buckets={[{ start: first, end: second, values: {} }]} granularity="day" series={[{ type: "temperature", unit: "°C" }]} />)
  expect(screen.getByText("Aucune donnée terminée à tracer pour cette sélection.")).toBeInTheDocument()
  expect(screen.queryByRole("img")).not.toBeInTheDocument()
})

test("superpose les volumes sur la même échelle et explore les valeurs sans inventer les mesures absentes", () => {
  const { rerender } = render(<HistoryChart buckets={[
    { start: first, end: second, values: { bottle: 60, pump_left: 30 } },
    { start: second, end: third, values: { bottle: 120, pump_left: 40, temperature: 37.2 } }
  ]} granularity="day" series={[
    { type: "bottle", unit: "ml" }, { type: "pump_left", unit: "ml" }, { type: "temperature", unit: "°C" }
  ]} />)
  const chart = screen.getByRole("img", { name: "Évolution des données sélectionnées" })
  expect(chart.querySelectorAll('[data-unit="ml"]')).toHaveLength(1)
  expect(chart.querySelectorAll('[data-unit="ml"] [data-series]')).toHaveLength(2)
  expect(chart.querySelectorAll('[data-series="temperature"] circle')).toHaveLength(1)
  const slider = screen.getByRole("slider", { name: "Explorer les valeurs du graphique" })
  const details = slider.closest("div")!
  expect(within(details).getByText("37,2 °C")).toBeInTheDocument()
  fireEvent.change(slider, { target: { value: "0" } })
  expect(within(details).getByText("60 ml")).toBeInTheDocument()
  expect(within(details).getByText("30 ml")).toBeInTheDocument()
  expect(within(details).getByText("—")).toBeInTheDocument()
  expect(chart.innerHTML).not.toMatch(/NaN|Infinity/)
  rerender(<HistoryChart buckets={[{ start: second, end: third, values: { bottle: 150 } }]} granularity="day" series={[{ type: "bottle", unit: "ml" }]} />)
  expect(within(slider.closest("div")!).getByText("150 ml")).toBeInTheDocument()
  expect(screen.getByRole("img").querySelector('[data-unit="°C"]')).not.toBeInTheDocument()
})
