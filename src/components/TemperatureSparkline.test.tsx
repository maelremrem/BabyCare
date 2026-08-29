import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { TemperatureSparkline } from "@/components/TemperatureSparkline"

describe("TemperatureSparkline", () => {
  test("affiche la zone idéale et les mesures", () => {
    render(<TemperatureSparkline values={[36.4, 37, 38.1]} />)

    expect(screen.getByRole("img", { name: /Zone idéale de 36,5 à 37,5 °C/i })).toBeInTheDocument()
    expect(screen.getByText("Zone idéale 36,5–37,5 °C")).toBeInTheDocument()
    expect(screen.getByText("36,5°")).toBeInTheDocument()
    expect(screen.getByText("37,5°")).toBeInTheDocument()
    expect(screen.getByTestId("ideal-temperature-zone")).toHaveAttribute("height")
  })

  test("ne produit aucun graphique sans mesure", () => {
    const { container } = render(<TemperatureSparkline values={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
