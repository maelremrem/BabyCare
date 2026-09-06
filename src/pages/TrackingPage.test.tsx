import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, test, vi } from "vitest"
import type { BabyEvent, DailyCare, StoolAlert } from "@/lib/types"
import { TrackingPage } from "@/pages/TrackingPage"

const apiMock = vi.hoisted(() => ({
  updateDailyCare: vi.fn<(_careType: DailyCare["care_type"], _completed: boolean) => Promise<void>>(async () => undefined),
  validateDailyCare: vi.fn(async () => undefined)
}))

vi.mock("@/lib/api", () => ({
  api: {
    updateDailyCare: apiMock.updateDailyCare,
    validateDailyCare: apiMock.validateDailyCare,
    createEvent: vi.fn(async () => undefined),
    startEvent: vi.fn(async () => undefined)
  }
}))

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

const recentDailyCareEvent: BabyEvent = {
  ...temperatureEvent,
  id: 3,
  type: "daily_care",
  started_at: new Date().toISOString()
}

const overdueDailyCareEvent: BabyEvent = {
  ...temperatureEvent,
  id: 4,
  type: "daily_care",
  started_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
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
      events={[recentDailyCareEvent, temperatureEvent]}
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
  vi.clearAllMocks()
})

describe("TrackingPage", () => {
  test("présente le résumé puis les actions avant les informations secondaires", () => {
    renderTracking(overdueAlert)
    expect(screen.getByRole("alert")).toHaveTextContent("Aucune selle depuis 49 h")
    const summary = screen.getByRole("heading", { name: "En un coup d’œil" }).closest("section")!
    expect(summary).toHaveTextContent("Tétée")
    expect(summary).toHaveTextContent("Couche")
    expect(summary).toHaveTextContent("Sommeil")
    const actions = screen.getByRole("heading", { name: "Actions rapides" })
    expect(summary.compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(actions.compareDocumentPosition(screen.getByText("Dernières informations")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  test("masque l’alerte lorsque le transit est à jour", () => {
    renderTracking({ ...overdueAlert, overdue: false, hours_since: 2 })
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  test("un rappel ouvre les soins sans valider automatiquement la routine", async () => {
    const user = userEvent.setup()
    const onOpenCare = vi.fn()
    render(<TrackingPage events={[overdueDailyCareEvent]} running={[]} loading={false} stoolAlert={null} onChanged={vi.fn(async () => undefined)} onEdit={vi.fn()} onOpenCare={onOpenCare} />)
    expect(screen.getByRole("region", { name: "Rappel de soins" })).toHaveTextContent("24 heures")
    await user.click(screen.getByRole("button", { name: "Personnaliser les soins" }))
    expect(onOpenCare).toHaveBeenCalledOnce()
    expect(apiMock.validateDailyCare).not.toHaveBeenCalled()
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

    expect(screen.getByText("Il y a 2 h 30 min")).toBeInTheDocument()

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

    expect(screen.getByText("Il y a 2 h 30 min")).toBeInTheDocument()
    expect(within(screen.getByTestId("feeding-info-card")).queryByText("il y a 2 h")).not.toBeInTheDocument()
  })

  test("affiche les icônes associées dans l'activité récente", () => {
    renderTracking({ ...overdueAlert, overdue: false, hours_since: 2 })

    const recentActivity = screen.getByRole("heading", { name: "Activité récente" }).closest("section")
    expect(recentActivity).not.toBeNull()
    expect(recentActivity?.querySelector(".lucide-thermometer")).toBeInTheDocument()
    expect(recentActivity?.querySelector(".lucide-bath")).toBeInTheDocument()
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

  test("affiche les deux seins et le biberon en mode mixte sans casser l’alternance", () => {
    const leftBreast = { ...temperatureEvent, id: 3, type: "breast_left" as const, started_at: "2026-08-01T11:00:00.000Z", duration_seconds: 600 }
    const bottle = { ...temperatureEvent, id: 4, type: "bottle" as const, started_at: "2026-08-01T12:00:00.000Z", value_real: 120 }
    render(
      <TrackingPage
        events={[bottle, leftBreast, temperatureEvent]}
        running={[]}
        loading={false}
        stoolAlert={{ ...overdueAlert, overdue: false }}
        feedingType="mixed"
        onChanged={vi.fn(async () => undefined)}
        onEdit={vi.fn()}
        onOpenCare={vi.fn()}
      />
    )

    expect(screen.getByRole("button", { name: "Sein Gauche" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Sein Droit" })).toHaveClass("text-primary")
    expect(screen.getByRole("button", { name: "Biberon" })).toBeInTheDocument()
    expect(screen.getByTestId("feeding-info-card")).toBeInTheDocument()
    expect(screen.getByTestId("bottle-info-card")).toBeInTheDocument()
    expect(screen.getByTestId("feeding-info-grid")).toHaveClass("grid-cols-2")
  })
})

 test.each([
  ["pump_right", "Sein Gauche", "Sein Droit"],
  ["pump_left", "Sein Droit", "Sein Gauche"]
 ] as const)("alterne après %s sans changer la dernière tétée", (type, next, other) => {
  render(<TrackingPage events={[{ ...temperatureEvent, type, value_real: 90 }, leftBreastEvent]} running={[]} loading={false} stoolAlert={null} onChanged={vi.fn(async () => undefined)} onEdit={vi.fn()} onOpenCare={vi.fn()} />)
  expect(screen.getByRole("button", { name: next })).toHaveClass("text-primary")
  expect(screen.getByRole("button", { name: other })).not.toHaveClass("text-primary")
  expect(within(screen.getByTestId("feeding-info-card")).getByText("Sein gauche")).toBeInTheDocument()
 })

 test("enregistre le sein choisi et les millilitres du tire-lait", async () => {
  const { api } = await import("@/lib/api")
  const user = userEvent.setup()
  const onChanged = vi.fn(async () => undefined)
  render(<TrackingPage events={[]} running={[]} loading={false} stoolAlert={null} onChanged={onChanged} onEdit={vi.fn()} onOpenCare={vi.fn()} />)
  await user.click(screen.getByRole("button", { name: "Tire-lait" }))
  const dialog = within(screen.getByRole("dialog"))
  await user.click(dialog.getByRole("button", { name: "Sein droit" }))
  expect(dialog.getByRole("button", { name: "Sein droit" })).toHaveAttribute("aria-pressed", "true")
  await user.click(dialog.getByRole("button", { name: "Augmenter tire-lait" }))
  await user.click(dialog.getByRole("button", { name: "Enregistrer" }))
  expect(api.createEvent).toHaveBeenCalledWith({ type: "pump_right", value_real: 160 })
  expect(onChanged).toHaveBeenCalledOnce()
 })

test("un soin partiel ne masque pas le rappel d’un autre soin en retard", () => {
  render(<TrackingPage babyId={99} events={[
    { ...recentDailyCareEvent, metadata: { care_types: ["eyes"] } },
    { ...overdueDailyCareEvent, metadata: { care_types: ["face", "nose", "cord"] } }
  ]} running={[]} loading={false} stoolAlert={null} onChanged={vi.fn(async () => undefined)} onEdit={vi.fn()} onOpenCare={vi.fn()} />)
  expect(screen.getByRole("region", { name: "Rappel de soins" })).toHaveTextContent("24 heures")
})
