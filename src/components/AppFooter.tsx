import { Coffee } from "lucide-react"
import packageJson from "../../package.json"
import { useI18n } from "@/lib/i18n"

export function AppFooter() {
  const { t } = useI18n()
  return (
    <footer className="border-t border-border/70 bg-card/30">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:px-6">
        <p><span className="font-semibold text-foreground">BabyCare</span> · {t.footer.version} {packageJson.version}</p>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <a
            href="https://ko-fi.com/maelremrem"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-primary focus-visible:text-primary"
          >
            <Coffee className="size-3.5" aria-hidden="true" />
            {t.footer.support}
          </a>
          <a
            href="https://github.com/maelremrem/BabyCare"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-primary focus-visible:text-primary"
          >
            github.com/maelremrem/BabyCare
          </a>
        </div>
      </div>
    </footer>
  )
}
