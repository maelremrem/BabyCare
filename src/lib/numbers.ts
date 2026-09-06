import type { SupportedLocale } from "./i18n"

export function formatNumber(value: number, decimals: number, locale: SupportedLocale) {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals
  }).format(value)
}
