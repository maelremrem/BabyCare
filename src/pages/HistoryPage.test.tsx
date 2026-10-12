import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { api } from "@/lib/api"
import type { BabyEvent } from "@/lib/types"
import { HistoryPage } from "@/pages/HistoryPage"

if (!HTMLElement.prototype.scrollIntoView) HTMLElement.prototype.scrollIntoView = () => undefined

function event(overrides: Partial<BabyEvent>): BabyEvent {
  return {
    id: 1,
    type: "observation",
    status: "completed",
    started_at: "2026-08-01T08:00:00.000Z",
    ended_at: null,
    duration_seconds: null,
    value_real: null,
    value_text: null,
    notes: null,
    metadata: null,
    created_at: "2026-08-01T08:00:00.000Z",
    updated_at: "2026-08-01T08:00:00.000Z",
    ...overrides
  }
}

describe("HistoryPage", () => {
  afterEach(() => vi.restoreAllMocks())

  test("ne présente pas zéro ml si le chargement complet échoue et permet de réessayer", async () => {
    let unavailable = true
    vi.spyOn(api, "events").mockImplementation(async (params = new URLSearchParams()) => {
      if (params.get("limit") === "250" && unavailable) throw new Error("Connexion interrompue")
      return { events: [event({ type: "bottle", value_real: 120 })], total: 1, limit: Number(params.get("limit")), offset: 0 }
    })
    render(<HistoryPage refreshKey={0} onEdit={vi.fn()} />)
    const milk = screen.getByRole("region", { name: "Lait consommé sur la période" })
    expect(await within(milk).findByRole("alert")).toHaveTextContent("Connexion interrompue")
    expect(within(milk).queryByText("0 ml")).not.toBeInTheDocument()
    unavailable = false
    fireEvent.click(within(milk).getByRole("button", { name: "Réessayer" }))
    expect(await within(milk).findByText("120 ml")).toBeInTheDocument()
  })

  test("affiche un graphique combinant les unités et le masque à la demande", async () => {
    const today = new Date()
    today.setHours(9, 0, 0, 0)
    const rows = [
      event({ id: 1, type: "bottle", started_at: today.toISOString(), value_real: 120 }),
      event({ id: 2, type: "nap", started_at: today.toISOString(), duration_seconds: 1800 }),
      event({ id: 3, type: "temperature", started_at: today.toISOString(), value_real: 37.2 })
    ]
    vi.spyOn(api, "events").mockResolvedValue({ events: rows, total: rows.length, limit: 100, offset: 0 })
    render(<HistoryPage refreshKey={0} onEdit={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: "Afficher le graphique" }))
    const chart = await screen.findByRole("img", { name: "Évolution des données sélectionnées" })
    expect(chart.querySelector('[data-unit="ml"]')).toBeInTheDocument()
    expect(chart.querySelector('[data-unit="min"]')).toBeInTheDocument()
    expect(chart.querySelector('[data-unit="°C"]')).toBeInTheDocument()
    expect(screen.getByRole("slider", { name: "Explorer les valeurs du graphique" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Masquer le graphique" }))
    expect(screen.queryByRole("img", { name: "Évolution des données sélectionnées" })).not.toBeInTheDocument()
  })

  test("filtre une période personnalisée et refuse une plage inversée", async () => {
    const calls = vi.spyOn(api, "events").mockResolvedValue({ events: [], total: 0, limit: 100, offset: 0 })
    render(<HistoryPage refreshKey={0} onEdit={vi.fn()} />)
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Période" }), { key: "ArrowDown" })
    fireEvent.click(await screen.findByRole("option", { name: "Période personnalisée" }))
    fireEvent.change(screen.getByLabelText("Du"), { target: { value: "2026-08-01" } })
    fireEvent.change(screen.getByLabelText("Au"), { target: { value: "2026-08-05" } })
    await waitFor(() => expect(calls.mock.calls.some(([params]) => params?.get("limit") === "250" && params.get("from") === "2026-08-01" && params.get("to") === "2026-08-05")).toBe(true))
    expect(screen.getByRole("link", { name: "Exporter Excel" })).toHaveAttribute("href", expect.stringContaining("from=2026-08-01&to=2026-08-05"))
    const before = calls.mock.calls.length
    fireEvent.change(screen.getByLabelText("Du"), { target: { value: "2026-08-06" } })
    expect(screen.getByRole("alert")).toHaveTextContent("Choisissez une date de début antérieure ou égale à la date de fin.")
    expect(screen.queryByRole("link", { name: "Exporter Excel" })).not.toBeInTheDocument()
    expect(screen.queryByRole("img", { name: "Évolution des données sélectionnées" })).not.toBeInTheDocument()
    expect(calls.mock.calls.length).toBe(before)
  })

  test("sélectionne plusieurs types et partage les filtres avec les statistiques et l’export", async () => {
    const calls = vi.spyOn(api, "events").mockResolvedValue({ events: [], total: 0, limit: 100, offset: 0 })
    render(<HistoryPage babyId={3} refreshKey={0} onEdit={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: "Types de données" }))
    fireEvent.click(screen.getByRole("checkbox", { name: "Biberon" }))
    fireEvent.click(screen.getByRole("checkbox", { name: "Température" }))
    await waitFor(() => expect(calls.mock.calls.some(([params]) => params?.get("limit") === "250" && params.get("types") === "bottle,temperature" && params.get("baby_id") === "3")).toBe(true))
    await waitFor(() => expect(calls.mock.calls.some(([params]) => params?.get("limit") === "100" && params.get("types") === "bottle,temperature")).toBe(true))
    const url = new URL(screen.getByRole("link", { name: "Exporter Excel" }).getAttribute("href")!, "http://localhost")
    expect(url.searchParams.get("types")).toBe("bottle,temperature")
    expect(url.searchParams.get("type")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Tous les types" }))
    await waitFor(() => expect(screen.getByRole("link", { name: "Exporter Excel" }).getAttribute("href")).not.toContain("types="))
  })

  test("affiche le volume consommé sur toute la période même au-delà de la première page", async () => {
    const rows = Array.from({ length: 251 }, (_, index) => event({
      id: index + 1, type: "bottle", value_real: index === 250 ? 150 : 1
    }))
    vi.spyOn(api, "events").mockImplementation(async (params = new URLSearchParams()) => {
      const limit = Number(params.get("limit"))
      const offset = Number(params.get("offset") || 0)
      return { events: rows.slice(offset, offset + limit), total: rows.length, limit, offset }
    })

    render(<HistoryPage babyId={2} refreshKey={0} onEdit={vi.fn()} />)
    const milk = await screen.findByRole("region", { name: "Lait consommé sur la période" })
    expect(await within(milk).findByText("400 ml")).toBeInTheDocument()
    expect(within(milk).getByText("Volume des biberons enregistrés. Le lait tiré et les tétées ne sont pas inclus.")).toBeInTheDocument()
    expect(api.events).toHaveBeenCalledWith(expect.objectContaining({}))
  })

  test("affiche les statistiques calculées sur tous les événements de la sélection", async () => {
    const monthlyEvents = [
      event({ id: 1, type: "temperature", value_real: 36.8 }),
      event({ id: 2, type: "temperature", value_real: 37.4 }),
      event({ id: 3, type: "breast_left", started_at: "2026-08-01T08:00:00.000Z", duration_seconds: 600 }),
      event({ id: 4, type: "breast_right", started_at: "2026-08-01T10:00:00.000Z", duration_seconds: 1200 }),
      event({ id: 5, type: "diaper", started_at: "2026-08-01T08:00:00.000Z", metadata: { diaper_type: "stool" } }),
      event({ id: 6, type: "diaper", started_at: "2026-08-02T08:00:00.000Z", metadata: { diaper_type: "mixed" } })
    ]
    vi.spyOn(api, "events").mockImplementation(async (params = new URLSearchParams()) => params.get("limit") === "250"
      ? { events: monthlyEvents, total: monthlyEvents.length, limit: 250, offset: 0 }
      : { events: [], total: 0, limit: 100, offset: 0 })

    render(<HistoryPage refreshKey={0} onEdit={vi.fn()} />)

    const temperature = await screen.findByTestId("temperature-statistics")
    expect(within(temperature).getByText("37,1 °C")).toBeInTheDocument()
    expect(within(temperature).getByText("36,8 °C")).toBeInTheDocument()
    expect(within(temperature).getByText("37,4 °C")).toBeInTheDocument()

    const feeding = screen.getByTestId("feeding-statistics")
    expect(within(feeding).getByText("15 min 00 s")).toBeInTheDocument()
    expect(within(feeding).getByText("2 h 00 min")).toBeInTheDocument()
    expect(within(feeding).getByText("Temps moyen entre deux tétées")).toBeInTheDocument()
    expect(within(feeding).getByText("Temps moyen: 10 min 00 s")).toBeInTheDocument()
    expect(within(feeding).getByText("Temps moyen: 20 min 00 s")).toBeInTheDocument()
    expect(within(feeding).getAllByText("50 %", { exact: false })).toHaveLength(2)

    const stool = screen.getByTestId("stool-statistics")
    expect(within(stool).getByText("24 h 00 min")).toBeInTheDocument()
    await waitFor(() => expect(api.events).toHaveBeenCalledTimes(2))
  })

  test("affiche l’intervalle et la quantité moyenne en mode biberon", async () => {
    const monthlyEvents = [
      event({ id: 1, type: "bottle", started_at: "2026-08-01T08:00:00.000Z", value_real: 90 }),
      event({ id: 2, type: "bottle", started_at: "2026-08-01T11:00:00.000Z", value_real: 150 })
    ]
    vi.spyOn(api, "events").mockImplementation(async (params = new URLSearchParams()) => params.get("limit") === "250"
      ? { events: monthlyEvents, total: monthlyEvents.length, limit: 250, offset: 0 }
      : { events: [], total: 0, limit: 100, offset: 0 })

    render(<HistoryPage refreshKey={0} feedingType="bottle" onEdit={vi.fn()} />)

    const feeding = await screen.findByTestId("feeding-statistics")
    expect(within(feeding).getByText("3 h 00 min")).toBeInTheDocument()
    expect(within(feeding).getByText("120 ml")).toBeInTheDocument()
    expect(within(feeding).getByText("Temps moyen entre deux biberons")).toBeInTheDocument()
  })

  test("affiche les cartes sein et biberon en mode mixte", async () => {
    const monthlyEvents = [
      event({ id: 1, type: "breast_left", started_at: "2026-08-01T08:00:00.000Z", duration_seconds: 600 }),
      event({ id: 2, type: "bottle", started_at: "2026-08-01T09:00:00.000Z", value_real: 120 })
    ]
    vi.spyOn(api, "events").mockImplementation(async (params = new URLSearchParams()) => params.get("limit") === "250"
      ? { events: monthlyEvents, total: monthlyEvents.length, limit: 250, offset: 0 }
      : { events: [], total: 0, limit: 100, offset: 0 })

    render(<HistoryPage refreshKey={0} feedingType="mixed" onEdit={vi.fn()} />)

    expect(await screen.findByTestId("feeding-statistics")).toBeInTheDocument()
    expect(screen.getByTestId("bottle-statistics")).toBeInTheDocument()
  })
})

test("charge les événements au-delà de 100 et synchronise les filtres des statistiques", async () => {
  const rows = Array.from({ length: 101 }, (_, i) => event({ id: i + 1, notes: `Observation ${i + 1}` }))
  const calls = vi.spyOn(api, "events").mockImplementation(async (params = new URLSearchParams()) => {
    const offset = Number(params.get("offset") || 0)
    const limit = Number(params.get("limit") || 100)
    return { events: rows.slice(offset, offset + limit), total: rows.length, limit, offset }
  })
  render(<HistoryPage refreshKey={0} onEdit={vi.fn()} />)
  expect(await screen.findByText("100 événements sur 101")).toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: "Charger la suite" }))
  expect(await screen.findByText("101 événements sur 101")).toBeInTheDocument()
  expect(screen.getByText("Observation 101")).toBeInTheDocument()
  expect(screen.queryByRole("button", { name: "Charger la suite" })).not.toBeInTheDocument()
  fireEvent.change(screen.getByRole("textbox", { name: "Rechercher une observation…" }), { target: { value: "cible" } })
  await waitFor(() => expect(calls.mock.calls.some(([params]) => params?.get("limit") === "250" && params.get("search") === "cible")).toBe(true))
  await waitFor(() => expect(calls.mock.calls.some(([params]) => params?.get("limit") === "100" && params.get("search") === "cible")).toBe(true))
  calls.mockRestore()
}, 20_000)
