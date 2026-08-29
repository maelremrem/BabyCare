import { useEffect, useState, type FormEvent } from "react"
import { Calendar, Check, ChevronLeft, ChevronRight, LoaderCircle, Mars, Settings, Trash2, Venus } from "lucide-react"
import { toast } from "sonner"
import { BabyCareIcon } from "@/components/BabyCareIcon"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { useClock } from "@/hooks/useClock"
import { formatAgeCompact, formatAgeDetailed, formatBirthDate, formatClock, formatLongDate, formatShortDate, getAgeParts } from "@/lib/dates"
import { ACCENT_OPTIONS, type AccentColor, type AppSettings, type BabySex } from "@/lib/types"

interface TopBarProps {
  settings: AppSettings
  onAccentChange: (color: AccentColor) => Promise<void>
  onProfileChange: (babyName: string, birthDate: string, babySex: BabySex) => Promise<void>
  onReset: () => Promise<void>
}

const SEX_OPTIONS = [
  { value: "girl", label: "Fille", icon: Venus },
  { value: "boy", label: "Garçon", icon: Mars }
] as const

const WEEKDAYS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."]
const MONTH_FORMATTER = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" })

function formatFrenchDateInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return ""
  return `${match[3]}/${match[2]}/${match[1]}`
}

function formatFrenchDateDraft(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

function parseFrenchDateInput(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ""

  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed)
  if (!match) return null

  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  const date = new Date(year, month - 1, day, 12)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function dateOnly(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12)
}

function parseIsoDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day, 12)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null
}

function formatIsoDateOnly(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`
}

function monthDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1, 12)
  const mondayOffset = (firstDay.getDay() + 6) % 7
  const start = new Date(firstDay)
  start.setDate(firstDay.getDate() - mondayOffset)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return date
  })
}

export function TopBar({ settings, onAccentChange, onProfileChange, onReset }: TopBarProps) {
  const now = useClock()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [babyName, setBabyName] = useState(settings.baby_name)
  const [birthDateInput, setBirthDateInput] = useState(() => formatFrenchDateInput(settings.birth_date))
  const [birthDatePickerOpen, setBirthDatePickerOpen] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(() => parseIsoDateOnly(settings.birth_date) ?? dateOnly(new Date()))
  const [babySex, setBabySex] = useState<BabySex>(settings.baby_sex)
  const [saving, setSaving] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const age = getAgeParts(settings.birth_date, now)

  useEffect(() => setBabyName(settings.baby_name), [settings.baby_name])
  useEffect(() => {
    const parsedBirthDate = parseIsoDateOnly(settings.birth_date)
    setBirthDateInput(formatFrenchDateInput(settings.birth_date))
    if (parsedBirthDate) setCalendarMonth(parsedBirthDate)
  }, [settings.birth_date])
  useEffect(() => setBabySex(settings.baby_sex), [settings.baby_sex])

  const today = dateOnly(now)
  const selectedBirthDate = parseIsoDateOnly(parseFrenchDateInput(birthDateInput) || "")

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsedBirthDate = parseFrenchDateInput(birthDateInput)
    if (parsedBirthDate === null) {
      toast.error("Utilisez le format jj/mm/aaaa pour la date de naissance.")
      return
    }
    if (parsedBirthDate && getAgeParts(parsedBirthDate, now) === null) {
      toast.error("La date de naissance ne peut pas être dans le futur.")
      return
    }

    setSaving(true)
    try {
      await onProfileChange(babyName.trim(), parsedBirthDate, babySex)
      setSettingsOpen(false)
      toast.success("Profil du bébé enregistré")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d’enregistrer le profil.")
    } finally {
      setSaving(false)
    }
  }

  async function resetDatabase() {
    setResetting(true)
    try {
      await onReset()
      setResetOpen(false)
      setResetting(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de réinitialiser la base de données.")
      setResetting(false)
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

        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="size-9 shrink-0 rounded-xl sm:size-10" aria-label="Ouvrir les paramètres">
              <Settings className="size-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Paramètres de BabyCare</DialogTitle>
              <DialogDescription>Gérez le profil du bébé, l’apparence de l’application et les données locales.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-5 md:grid-cols-2">
              <form onSubmit={saveProfile} autoComplete="off" className="space-y-4 rounded-2xl border bg-card/60 p-4">
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
                    data-1p-ignore="true"
                    data-lpignore="true"
                    placeholder="Ex. Emma"
                    onChange={(event) => setBabyName(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="birth-date" className="text-sm font-medium">Date de naissance</label>
                  <div className="flex gap-2">
                    <Input
                      id="birth-date"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      data-1p-ignore="true"
                      data-lpignore="true"
                      placeholder="jj/mm/aaaa"
                      value={birthDateInput}
                      onChange={(event) => setBirthDateInput(formatFrenchDateDraft(event.target.value))}
                    />
                    <Popover open={birthDatePickerOpen} onOpenChange={setBirthDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" size="icon" className="shrink-0" aria-label="Choisir la date de naissance">
                          <Calendar className="size-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-80 p-3">
                        <div className="mb-3 flex items-center justify-between">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Mois précédent"
                            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1, 12))}
                          >
                            <ChevronLeft className="size-4" />
                          </Button>
                          <p className="text-sm font-medium capitalize">{MONTH_FORMATTER.format(calendarMonth)}</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Mois suivant"
                            disabled={new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1, 12) > today}
                            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1, 12))}
                          >
                            <ChevronRight className="size-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
                          {WEEKDAYS.map((weekday) => (
                            <span key={weekday}>{weekday}</span>
                          ))}
                        </div>
                        <div className="mt-2 grid grid-cols-7 gap-1">
                          {monthDays(calendarMonth).map((date) => {
                            const isoDate = formatIsoDateOnly(date)
                            const isSelected = selectedBirthDate?.toDateString() === date.toDateString()
                            const isOutsideMonth = date.getMonth() !== calendarMonth.getMonth()
                            const isFuture = date > today

                            return (
                              <Button
                                key={isoDate}
                                type="button"
                                variant={isSelected ? "default" : "ghost"}
                                size="icon-sm"
                                className={isOutsideMonth ? "text-muted-foreground/45" : ""}
                                disabled={isFuture}
                                aria-label={`Choisir le ${formatFrenchDateInput(isoDate)}`}
                                onClick={() => {
                                  setBirthDateInput(formatFrenchDateInput(isoDate))
                                  setBirthDatePickerOpen(false)
                                }}
                              >
                                {date.getDate()}
                              </Button>
                            )
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <p className="text-xs text-muted-foreground">L’âge reste masqué tant que ce champ est vide.</p>
                </div>

                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">Sexe</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {SEX_OPTIONS.map(({ value, label, icon: Icon }) => (
                      <Button
                        key={value}
                        type="button"
                        variant={babySex === value ? "default" : "outline"}
                        aria-pressed={babySex === value}
                        onClick={() => setBabySex((current) => current === value ? "" : value)}
                      >
                        <Icon aria-hidden="true" /> {label}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Nécessaire avec la date de naissance pour afficher les références OMS.</p>
                </fieldset>

                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? <LoaderCircle className="animate-spin" /> : null}
                  Enregistrer le profil
                </Button>
              </form>

              <div className="rounded-2xl border bg-card/60 p-4">
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

                <Separator className="my-5" />

                <div>
                  <p className="font-semibold text-destructive">Zone de danger</p>
                  <p className="mb-3 text-xs text-muted-foreground">Supprime définitivement le profil, les mesures, les soins et tout l’historique.</p>
                  <Button type="button" variant="destructive" className="w-full" onClick={() => {
                    setSettingsOpen(false)
                    setResetOpen(true)
                  }}>
                    <Trash2 /> Réinitialiser toute la base
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Réinitialiser toute la base de données ?</AlertDialogTitle>
            <AlertDialogDescription>
              Toutes les informations BabyCare seront supprimées définitivement. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Annuler</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={resetting} onClick={resetDatabase}>
              {resetting ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
              Confirmer la réinitialisation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  )
}
