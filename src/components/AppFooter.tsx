import packageJson from "../../package.json"

export function AppFooter() {
  return (
    <footer className="border-t border-border/70 bg-card/30">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:px-6">
        <p><span className="font-semibold text-foreground">BabyCare</span> · version {packageJson.version}</p>
        <a
          href="https://github.com/maelremrem/BabyCare"
          target="_blank"
          rel="noreferrer"
          className="transition-colors hover:text-primary focus-visible:text-primary"
        >
          github.com/maelremrem/BabyCare
        </a>
      </div>
    </footer>
  )
}
