import { useState } from "react"
import { Coffee, ExternalLink, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const DEMO_NOTICE_STORAGE_KEY = "babycare-demo-notice-seen-v1"

function hasSeenDemoNotice() {
  if (typeof window === "undefined") return true

  try {
    return window.localStorage.getItem(DEMO_NOTICE_STORAGE_KEY) === "true"
  } catch {
    return false
  }
}

function rememberDemoNotice() {
  try {
    window.localStorage.setItem(DEMO_NOTICE_STORAGE_KEY, "true")
  } catch {
    // Private browsing or locked-down storage should not block the user.
  }
}

export function DemoNoticeDialog({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(() => enabled && !hasSeenDemoNotice())

  if (!enabled) return null

  function closeNotice() {
    rememberDemoNotice()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) closeNotice()
      else setOpen(true)
    }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2 text-center sm:justify-start sm:text-left">
            <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
            BabyCare demo / Demo BabyCare
          </DialogTitle>
          <DialogDescription className="sr-only">
            Information about the BabyCare browser demo in English and French.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 text-sm leading-6 text-muted-foreground md:grid-cols-2 md:gap-0 md:divide-x md:divide-border">
          <section lang="en" className="space-y-3 md:pr-6">
            <h2 className="text-base font-semibold text-foreground">Demo version</h2>
            <p>
              This is a demo version of BabyCare. Your information is stored only in this browser,
              and nothing is sent to a server.
            </p>
            <p>
              BabyCare is free and open source. You can find more information on{" "}
              <a
                href="https://github.com/maelremrem/BabyCare"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline focus-visible:underline"
              >
                GitHub
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>.
            </p>
            <p>
              If you enjoy the app, you can support the project with a donation on{" "}
              <a
                href="https://ko-fi.com/maelremrem"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline focus-visible:underline"
              >
                Ko-fi
                <Coffee className="size-3.5" aria-hidden="true" />
              </a>.
            </p>
          </section>

          <section lang="fr" className="space-y-3 md:pl-6">
            <h2 className="text-base font-semibold text-foreground">Version démo</h2>
            <p>
              Ceci est une version démo de BabyCare. Vos informations sont conservées uniquement
              dans ce navigateur, et rien n'est envoyé sur un serveur.
            </p>
            <p>
              BabyCare est gratuit et open source. Vous pouvez trouver plus d'informations sur{" "}
              <a
                href="https://github.com/maelremrem/BabyCare"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline focus-visible:underline"
              >
                GitHub
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>.
            </p>
            <p>
              Si vous appréciez l'application, vous pouvez soutenir le projet avec un don sur{" "}
              <a
                href="https://ko-fi.com/maelremrem"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline focus-visible:underline"
              >
                Ko-fi
                <Coffee className="size-3.5" aria-hidden="true" />
              </a>.
            </p>
          </section>
        </div>

        <DialogFooter>
          <Button type="button" onClick={closeNotice}>I understand / J'ai compris</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
