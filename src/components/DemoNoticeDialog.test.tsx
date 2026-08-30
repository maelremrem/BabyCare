import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, test } from "vitest"
import { DemoNoticeDialog } from "@/components/DemoNoticeDialog"

describe("DemoNoticeDialog", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  test("affiche l'avertissement bilingue de premiere visite en mode demo", () => {
    render(<DemoNoticeDialog enabled />)

    expect(screen.getByRole("dialog", { name: "BabyCare demo / Demo BabyCare" })).toBeInTheDocument()
    expect(screen.getByText("Demo version")).toBeInTheDocument()
    expect(screen.getByText("Version démo")).toBeInTheDocument()
    expect(screen.getAllByRole("link", { name: /GitHub/i })).toHaveLength(2)
    expect(screen.getAllByRole("link", { name: /Ko-fi/i })).toHaveLength(2)
    expect(screen.getAllByRole("link", { name: /GitHub/i })[0]).toHaveAttribute("href", "https://github.com/maelremrem/BabyCare")
    expect(screen.getAllByRole("link", { name: /Ko-fi/i })[0]).toHaveAttribute("href", "https://ko-fi.com/maelremrem")
  })

  test("memorise la fermeture dans le navigateur", async () => {
    const user = userEvent.setup()
    const { rerender } = render(<DemoNoticeDialog enabled />)

    await user.click(screen.getByRole("button", { name: "I understand / J'ai compris" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())

    rerender(<DemoNoticeDialog enabled />)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(window.localStorage.getItem("babycare-demo-notice-seen-v1")).toBe("true")
  })

  test("reste masquee hors mode demo", () => {
    render(<DemoNoticeDialog enabled={false} />)

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})
