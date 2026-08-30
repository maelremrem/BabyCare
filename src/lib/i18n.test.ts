import { describe, expect, test } from "vitest"
import { ApiError } from "@/lib/api"
import { localizedErrorMessage, messages, resolveLocale } from "@/lib/i18n"

describe("i18n", () => {
  test("résout la locale depuis la préférence navigateur", () => {
    expect(resolveLocale("system", ["en-US", "fr-FR"])).toBe("en")
    expect(resolveLocale("system", ["de-DE"])).toBe("fr")
  })

  test("traduit les erreurs API codées dans la locale active", () => {
    const error = new ApiError("La température doit être comprise entre 34 et 44 °C.", 400, "invalid_temperature")
    expect(localizedErrorMessage(error, messages.en, "Fallback")).toBe("Temperature must be between 34 and 44 °C.")
    expect(localizedErrorMessage(error, messages.fr, "Fallback")).toBe("La température doit être comprise entre 34 et 44 °C.")
  })
})
