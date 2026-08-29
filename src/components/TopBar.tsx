import { useEffect, useState, type FormEvent } from "react"
import { Check, LoaderCircle, Settings } from "lucide-react"
import { toast } from "sonner"
import { BabyCareIcon } from "@/components/BabyCareIcon"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { useClock } from "@/hooks/useClock"
import { dateKey, formatAgeCompact, formatAgeDetailed, formatBirthDate, formatClock, formatLongDate, formatShortDate, getAgeParts } from "@/lib/dates"
import { ACCENT_OPTIONS, type AccentColor, type AppSettings } from "@/lib/types"

interface TopBarProps {
  settings: AppSettings
  onAccentChange: (color: AccentColor) => Promise<void>
  onProfileChange: (babyName: string, birthDate: string) => Promise<void>
}

export function TopBar({ settings, onAccentChange, onProfileChange }: TopBarProps) {
  const now = useClock()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [babyName, setBabyName] = useState(settings.baby_name)
  const [birthDate, setBirthDate] = useState(settings.birth_date)
  const [saving, setSaving] = useState(false)
  const age = getAgeParts(settings.birth_date, now)

  useEffect(() => setBabyName(settings.baby_name), [settings.baby_name])
  useEffect(() => setBirthDate(settings.birth_date), [settings.birth_date])

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      await onProfileChange(babyName.trim(), birthDate)
      setSettingsOpen(false)
      toast.success("Profil du bébé enregistré")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d’enregistrer le profil.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[73px] max-w-6xl items-center gap-1 px-3 py-3 sm:gap-3 sm:px-6">
        <BabyCareIcon accentColor={settings.accent_color} className="size-10 shrink-0 rounded-xl sm:size-11" />
        <div className="flex min-w-0 max-w-20 flex-col leading-tight sm:max-w-64 sm:flex-row sm:items-baseline sm:gap-2">
          <p className="shrink-0 text-sm font-semibold tracking-tight sm:text-lg">BabyCare</p>
          {settings.baby_name ? (
            <p className="truncate text-xs font-medium text-muted-foreground sm:text-base sm:text-foreground">{settings.baby_name}</p>
          ) : null}
        </div>

        {age ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="h-8 shrink-0 rounded-lg px-1 text-[11px] font-medium text-primary sm:px-2 sm:text-sm">
                {formatAgeCompact(age)}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72">
              <p className="mt-1 text-sm text-foreground">{formatAgeDetailed(age)}</p>
              <p className="mt-2 text-xs text-muted-foreground">Né(e) le {formatBirthDate(settings.birth_date)}</p>
            </PopoverContent>
          </Popover>
        ) : null}

        <p className="ml-auto whitespace-nowrap text-[11px] text-muted-foreground md:hidden">{formatShortDate(now)}</p>
        <p className="ml-auto hidden whitespace-nowrap text-sm text-muted-foreground md:block">{formatLongDate(now)}</p>
        <time className="whitespace-nowrap font-mono text-xs font-medium tabular-nums sm:text-lg">{formatClock(now)}</time>

        <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="size-9 shrink-0 rounded-xl sm:size-10" aria-label="Ouvrir les paramètres">
              <Settings className="size-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-4">
            <form onSubmit={saveProfile} className="space-y-4">
              <div>
                <p className="font-semibold">Profil du bébé</p>
                <p className="text-xs text-muted-foreground">Ces informations restent dans la base locale.</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="baby-name" className="text-sm font-medium">Nom du bébé</label>
                <Input
                  id="baby-name"
                  value={babyName}
                  maxLength={80}
                  autoComplete="off"
                  placeholder="Ex. Emma"
                  onChange={(event) => setBabyName(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="birth-date" className="text-sm font-medium">Date de naissance</label>
                <Input
                  id="birth-date"
                  type="date"
                  value={birthDate}
                  max={dateKey(now.toISOString())}
                  onChange={(event) => setBirthDate(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">L’âge reste masqué tant que ce champ est vide.</p>
              </div>

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? <LoaderCircle className="animate-spin" /> : null}
                Enregistrer le profil
              </Button>
            </form>

            <Separator className="my-4" />

            <div>
              <p className="font-semibold">Couleur d’accent</p>
              <p className="mb-3 text-xs text-muted-foreground">L’icône et l’interface restent synchronisées.</p>
              <div className="grid grid-cols-5 gap-2">
                {ACCENT_OPTIONS.map((option) => (
                  <Button
                    key={option.id}
                    type="button"
                    variant="outline"
                    size="icon"
                    className="relative size-10 rounded-xl p-0"
                    aria-label={`Utiliser la couleur ${option.label}`}
                    aria-pressed={settings.accent_color === option.id}
                    onClick={() => onAccentChange(option.id).catch((error) => toast.error(error.message))}
                  >
                    <span className="size-6 rounded-full" style={{ backgroundColor: option.value }} />
                    {settings.accent_color === option.id ? <Check className="absolute size-3 text-white drop-shadow" /> : null}
                  </Button>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  )
}
