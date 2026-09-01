import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, test, vi } from "vitest"
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

afterEach(() => {
  vi.useRealTimers()
})

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

  test("ouvre l’onglet soins depuis le bouton visage cordon bain", async () => {
    const user = userEvent.setup()
    const onOpenCare = vi.fn()
    render(
      <TrackingPage
        events={[temperatureEvent]}
        running={[]}
        loading={false}
        stoolAlert={{ ...overdueAlert, overdue: false }}
        onChanged={vi.fn(async () => undefined)}
        onEdit={vi.fn()}
        onOpenCare={onOpenCare}
      />
    )

    expect(screen.queryByRole("button", { name: "Visage / Cordon" })).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Soin Visage/Cordon - Bain" }))
    expect(onOpenCare).toHaveBeenCalledOnce()
  })

  test("affiche le temps écoulé depuis la dernière tétée ou le dernier biberon", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-29T20:30:00.000Z"))

    const { rerender } = render(
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

    expect(screen.getByText("Depuis la dernière tétée : 2 h 30 min")).toBeInTheDocument()

    const bottle = { ...temperatureEvent, id: 3, type: "bottle" as const, value_real: 120 }
    rerender(
      <TrackingPage
        events={[bottle, temperatureEvent]}
        running={[]}
        loading={false}
        stoolAlert={{ ...overdueAlert, overdue: false }}
        feedingType="bottle"
        onChanged={vi.fn(async () => undefined)}
        onEdit={vi.fn()}
        onOpenCare={vi.fn()}
      />
    )

    expect(screen.getByText("Depuis le dernier biberon : 2 h 30 min")).toBeInTheDocument()
    expect(within(screen.getByTestId("feeding-info-card")).queryByText("il y a 2 h")).not.toBeInTheDocument()
  })

  test("remplace les seins par une saisie de biberon en mode biberon", async () => {
    const user = userEvent.setup()
    const bottle = { ...temperatureEvent, id: 3, type: "bottle" as const, value_real: 120 }
    render(
      <TrackingPage
        events={[bottle, temperatureEvent]}
        running={[]}
        loading={false}
        stoolAlert={{ ...overdueAlert, overdue: false }}
        feedingType="bottle"
        onChanged={vi.fn(async () => undefined)}
        onEdit={vi.fn()}
        onOpenCare={vi.fn()}
      />
    )

    expect(screen.queryByRole("button", { name: "Sein Gauche" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Sein Droit" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Biberon" })).toBeInTheDocument()
    expect(screen.getAllByText("120 ml")).toHaveLength(2)
    await user.click(screen.getByRole("button", { name: "Biberon" }))
    const picker = screen.getByRole("spinbutton", { name: "Sélecteur de biberon" })
    expect(picker).toHaveAttribute("aria-valuenow", "120")
    await user.click(screen.getByRole("button", { name: "Augmenter biberon" }))
    expect(picker).toHaveAttribute("aria-valuenow", "130")
  })

  test("propose 150 ml lorsqu’aucun biberon n’a encore été saisi", async () => {
    const user = userEvent.setup()
    render(
      <TrackingPage
        events={[temperatureEvent]}
        running={[]}
        loading={false}
        stoolAlert={{ ...overdueAlert, overdue: false }}
        feedingType="bottle"
        onChanged={vi.fn(async () => undefined)}
        onEdit={vi.fn()}
        onOpenCare={vi.fn()}
      />
    )

    await user.click(screen.getByRole("button", { name: "Biberon" }))
    expect(screen.getByRole("spinbutton", { name: "Sélecteur de biberon" })).toHaveAttribute("aria-valuenow", "150")
  })
})
