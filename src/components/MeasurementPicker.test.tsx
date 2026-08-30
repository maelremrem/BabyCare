import { useState } from "react"
import { act, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, test, vi } from "vitest"
import { MeasurementPicker } from "@/components/MeasurementPicker"
import { TemperaturePicker } from "@/components/TemperaturePicker"

function TemperatureHarness() {
  const [value, setValue] = useState(37)
  return <TemperaturePicker value={value} onChange={setValue} />
}

describe("MeasurementPicker", () => {
  afterEach(() => vi.useRealTimers())

  test("accepte une saisie décimale française au double-clic", async () => {
    const user = userEvent.setup()
    render(<TemperatureHarness />)

    await user.dblClick(screen.getByTitle("Double-cliquer pour saisir la valeur"))
    const input = screen.getByRole("textbox", { name: "Saisie directe de température" })
    await user.clear(input)
    await user.type(input, "38,2{Enter}")

    expect(screen.getByRole("spinbutton", { name: "Sélecteur de température" })).toHaveAttribute("aria-valuetext", "38.2 °C")
  })

  test("accélère les pas lorsque le bouton reste maintenu", () => {
    vi.useFakeTimers()
    render(<TemperatureHarness />)
    const increase = screen.getByRole("button", { name: "Augmenter température" })

    fireEvent.pointerDown(increase, { pointerId: 1 })
    act(() => vi.advanceTimersByTime(1000))
    fireEvent.pointerUp(increase, { pointerId: 1 })

    expect(Number(screen.getByRole("spinbutton").getAttribute("aria-valuenow"))).toBeGreaterThanOrEqual(37.6)
  })

  test("respecte les limites et les flèches clavier", async () => {
    const user = userEvent.setup()
    const { unmount } = render(<TemperaturePicker value={44} onChange={vi.fn()} />)
    expect(screen.getByRole("button", { name: "Augmenter température" })).toBeDisabled()
    unmount()

    render(<TemperatureHarness />)
    const picker = screen.getByRole("spinbutton")
    await user.click(picker)
    await user.keyboard("{ArrowUp}")
    expect(screen.getByRole("spinbutton")).toHaveAttribute("aria-valuenow", "37.1")
  })

  test.each([
    { label: "Poids", value: 3.5, step: 0.01, decimals: 3, unit: "kg", expected: 3.51 },
    { label: "Taille", value: 50, step: 0.1, decimals: 1, unit: "cm", expected: 50.1 }
  ])("applique le pas prévu pour $label", async ({ label, value, step, decimals, unit, expected }) => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <MeasurementPicker
        value={value}
        onChange={onChange}
        min={0}
        max={200}
        step={step}
        decimals={decimals}
        unit={unit}
        label={label}
        stepLabel={`${step} ${unit}`}
      />
    )

    await user.click(screen.getByRole("button", { name: `Augmenter ${label.toLowerCase()}` }))
    expect(onChange).toHaveBeenCalledWith(expected)
  })
})
