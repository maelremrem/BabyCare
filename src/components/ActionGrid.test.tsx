import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, test, vi } from "vitest"
import { ActionGrid } from "./ActionGrid"
import { api } from "@/lib/api"
import type { BabyEvent } from "@/lib/types"

vi.mock("@/lib/api", () => ({ api: { createEvent: vi.fn(), startEvent: vi.fn() } }))
const saved = { id: 1 } as BabyEvent
const props = () => ({ nextBreast: "breast_left" as const, feedingType: "mixed" as const, onChanged: vi.fn(async () => undefined), onOpenCare: vi.fn() })
afterEach(() => vi.resetAllMocks())

describe("ActionGrid recovery", () => {
  test.each([
    ["Température", "temperature"],
    ["Biberon", "bottle"],
    ["Tire-lait", "pump_left"],
    ["Ajouter une observation", "observation"]
  ])("conserve %s après un échec et permet de réessayer", async (name, type) => {
    const user = userEvent.setup()
    vi.mocked(api.createEvent).mockRejectedValueOnce(new Error("Réseau indisponible")).mockResolvedValueOnce(saved)
    const callbacks = props()
    render(<ActionGrid {...callbacks} />)
    await user.click(screen.getByText("Autres actions"))
    await user.click(screen.getByRole("button", { name }))
    const textbox = screen.queryByRole("textbox")
    if (textbox) await user.type(textbox, "Note à conserver")
    await user.click(screen.getByRole("button", { name: "Enregistrer" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Réseau indisponible")
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    if (textbox) expect(textbox).toHaveValue("Note à conserver")
    expect(callbacks.onChanged).not.toHaveBeenCalled()
    await user.click(screen.getByRole("button", { name: "Réessayer" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(api.createEvent).toHaveBeenLastCalledWith(expect.objectContaining({ type }))
    expect(callbacks.onChanged).toHaveBeenCalledOnce()
  })

  test("bloque un double enregistrement pendant la requête", async () => {
    const user = userEvent.setup()
    let finish!: (event: BabyEvent) => void
    vi.mocked(api.createEvent).mockImplementation(() => new Promise(resolve => { finish = resolve }))
    render(<ActionGrid {...props()} />)
    await user.click(screen.getByRole("button", { name: "Biberon" }))
    const save = screen.getByRole("button", { name: "Enregistrer" })
    fireEvent.click(save)
    fireEvent.click(save)
    expect(api.createEvent).toHaveBeenCalledOnce()
    expect(save).toBeDisabled()
    finish(saved)
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  })

  test("ne propose pas de réenregistrer une donnée déjà sauvée si le rafraîchissement échoue", async () => {
    const user = userEvent.setup()
    vi.mocked(api.createEvent).mockResolvedValue(saved)
    render(<ActionGrid {...props()} onChanged={vi.fn(async () => { throw new Error("refresh") })} />)
    await user.click(screen.getByRole("button", { name: "Biberon" }))
    await user.click(screen.getByRole("button", { name: "Enregistrer" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(api.createEvent).toHaveBeenCalledOnce()
  })
})
