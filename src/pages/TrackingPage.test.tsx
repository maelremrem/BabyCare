import { render, screen, within } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"
import type { BabyEvent, StoolAlert } from "@/lib/types"
import { TrackingPage } from "@/pages/TrackingPage"

const temperatureEvent: BabyEvent = {
  id: 1,
  type: "temperature",
  status: "completed",
  started_at: "2026-08-29T18:00:00.000Z",
  ended_at: "2026-08-29T18:00:00.000Z",
  duration_seconds: null,
  value_real: 37.1,
  value_text: null,
  notes: null,
  metadata: null,
  created_at: "2026-08-29T18:00:00.000Z",
  updated_at: "2026-08-29T18:00:00.000Z"
}

const leftBreastEvent: BabyEvent = {
  ...temperatureEvent,
  id: 2,
  type: "breast_left",
  duration_seconds: 420
}

const overdueAlert: StoolAlert = {
  overdue: true,
  last_stool_at: "2026-08-27T17:00:00.000Z",
  hours_since: 49,
  threshold_hours: 48
}

function renderTracking(stoolAlert: StoolAlert) {
  return render(
    <TrackingPage
      events={[temperatureEvent]}
      running={[]}
      loading={false}
      stoolAlert={stoolAlert}
      onChanged={vi.fn(async () => undefined)}
      onEdit={vi.fn()}
      onOpenCare={vi.fn()}
    />
  )
}

describe("TrackingPage", () => {
  test("place l’alerte avant les informations et la température en deuxième", () => {
    renderTracking(overdueAlert)

    const alert = screen.getByRole("alert")
    expect(alert).toHaveTextContent("Aucune selle depuis 49 h")

    const informationSection = screen.getByRole("heading", { name: "Dernières informations" }).closest("section")
    expect(informationSection).not.toBeNull()
    const labels = ["Tétée", "Température", "Couche", "Bain"].map((label) => (
      within(informationSection!).getByText(label, { exact: true })
    ))
    expect(labels.map((element) => element.textContent)).toEqual(["Tétée", "Température", "Couche", "Bain"])
    expect(labels[2].closest('[data-slot="card"]')?.querySelector(".lucide-wallet-cards")).toBeInTheDocument()
    labels.slice(1).forEach((element, index) => {
      expect(labels[index].compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })
    expect(informationSection).toHaveTextContent("Zone idéale 36,5–37,5 °C")
    expect(screen.getByTestId("temperature-info-card")).toHaveClass("lg:col-span-2")
    const compactStack = screen.getByTestId("bath-diaper-stack")
    expect(within(compactStack).getByText("Couche", { exact: true })).toBeInTheDocument()
    expect(within(compactStack).getByText("Bain", { exact: true })).toBeInTheDocument()
  })

  test("masque l’alerte lorsque le transit est à jour", () => {
    renderTracking({ ...overdueAlert, overdue: false, hours_since: 2 })
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  test("accentue le sein à utiliser après la dernière tétée", () => {
    render(
      <TrackingPage
        events={[leftBreastEvent, temperatureEvent]}
        running={[]}
        loading={false}
        stoolAlert={{ ...overdueAlert, overdue: false }}
        onChanged={vi.fn(async () => undefined)}
        onEdit={vi.fn()}
        onOpenCare={vi.fn()}
      />
    )

    expect(screen.getByRole("button", { name: "Température" })).not.toHaveClass("text-primary")
    expect(screen.getByRole("button", { name: "Sein Gauche" })).not.toHaveClass("text-primary")
    expect(screen.getByRole("button", { name: "Sein Droit" })).toHaveClass("text-primary")
  })
})
