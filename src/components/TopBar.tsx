import { useEffect, useState, type FormEvent } from "react"
import { Baby, Calendar, Check, ChevronLeft, ChevronRight, Download, LoaderCircle, Mars, Plus, RotateCcw, Settings, Trash2, Venus } from "lucide-react"
import { toast } from "sonner"
import { BabyCareIcon } from "@/components/BabyCareIcon"
import { UpdateProgressDialog } from "@/components/UpdateProgressDialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useClock } from "@/hooks/useClock"
import { useAppUpdate } from "@/hooks/useAppUpdate"
import { formatAgeCompact, formatAgeDetailed, formatBirthDate, formatClock, formatLongDate, formatShortDate, getAgeParts } from "@/lib/dates"
import { getLocaleTag, interpolate, localizedErrorMessage, type LanguagePreference, useI18n } from "@/lib/i18n"
import { ACCENT_OPTIONS, type AccentColor, type AppSettings, type BabySex, type FeedingType } from "@/lib/types"

interface TopBarProps {
  settings: AppSettings
  onBabySelect: (babyId: number) => Promise<void>
  onBabyAdd: (babyName: string, birthDate: string, babySex: BabySex, feedingType: FeedingType, accentColor: AccentColor) => Promise<void>
  onBabyDelete: (babyId: number) => Promise<void>
  onLanguageChange: (language: LanguagePreference) => Promise<void>
  onProfileChange: (babyName: string, birthDate: string, babySex: BabySex, feedingType: FeedingType, accentColor: AccentColor) => Promise<void>
  onReset: () => Promise<void>
  preventSleepDuringTimer?: boolean
  wakeLockVideoFallback?: boolean
  onPreventSleepDuringTimerChange?: (enabled: boolean) => void
  onWakeLockVideoFallbackChange?: (enabled: boolean) => void
  hasRunningTimer?: boolean
}

const SEX_OPTIONS: { value: Exclude<BabySex, "">, icon: typeof Venus }[] = [
  { value: "girl", icon: Venus },
  { value: "boy", icon: Mars }
] as const

const LANGUAGE_OPTIONS: LanguagePreference[] = ["system", "fr", "en"]

function formatDateInput(value: string, locale: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return ""
  return locale === "en" ? `${match[2]}/${match[3]}/${match[1]}` : `${match[3]}/${match[2]}/${match[1]}`
}

function formatDateDraft(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

function parseDateInput(value: string, locale: string) {
  const trimmed = value.trim()
  if (!trimmed) return ""

  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed)
  if (!match) return null

  const day = Number(locale === "en" ? match[2] : match[1])
  const month = Number(locale === "en" ? match[1] : match[2])
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

export function TopBar({ settings, onBabySelect, onBabyAdd, onBabyDelete, onLanguageChange, onProfileChange, onReset, preventSleepDuringTimer = true, wakeLockVideoFallback = false, onPreventSleepDuringTimerChange, onWakeLockVideoFallbackChange, hasRunningTimer = false }: TopBarProps) {
  const { locale, t } = useI18n()
  const localeTag = getLocaleTag(locale)
  const now = useClock()
  const activeBabyColor = settings.babies.find((baby) => baby.id === settings.active_baby_id)?.accent_color || settings.accent_color
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [babyName, setBabyName] = useState(settings.baby_name)
  const [birthDateInput, setBirthDateInput] = useState(() => formatDateInput(settings.birth_date, locale))
  const [birthDatePickerOpen, setBirthDatePickerOpen] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(() => parseIsoDateOnly(settings.birth_date) ?? dateOnly(new Date()))
  const [babySex, setBabySex] = useState<BabySex>(settings.baby_sex)
  const [feedingType, setFeedingType] = useState<FeedingType>(settings.feeding_type || "breast")
  const [babyColor, setBabyColor] = useState<AccentColor>(activeBabyColor)
  const [addingBaby, setAddingBaby] = useState(false)
  const [saving, setSaving] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [deleteBabyOpen, setDeleteBabyOpen] = useState(false)
  const [deletingBaby, setDeletingBaby] = useState(false)
  const age = getAgeParts(settings.birth_date, now)
  const appUpdate = useAppUpdate()

  useEffect(() => setBabyName(settings.baby_name), [settings.baby_name])
  useEffect(() => {
    const parsedBirthDate = parseIsoDateOnly(settings.birth_date)
    setBirthDateInput(formatDateInput(settings.birth_date, locale))
    if (parsedBirthDate) setCalendarMonth(parsedBirthDate)
  }, [locale, settings.birth_date])
  useEffect(() => setBabySex(settings.baby_sex), [settings.baby_sex])
  useEffect(() => setFeedingType(settings.feeding_type || "breast"), [settings.feeding_type])
  useEffect(() => setBabyColor(activeBabyColor), [activeBabyColor])

  const today = dateOnly(now)
  const selectedBirthDate = parseIsoDateOnly(parseDateInput(birthDateInput, locale) || "")
  const weekdays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(2026, 0, 5 + index)
    return new Intl.DateTimeFormat(localeTag, { weekday: "short" }).format(date)
  })
  const monthFormatter = new Intl.DateTimeFormat(localeTag, { month: "long", year: "numeric" })

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsedBirthDate = parseDateInput(birthDateInput, locale)
    if (parsedBirthDate === null) {
      toast.error(t.settings.invalidBirthDate)
      return
    }
    if (parsedBirthDate && getAgeParts(parsedBirthDate, now) === null) {
      toast.error(t.settings.futureBirthDate)
      return
    }

    setSaving(true)
    try {
      if (addingBaby) {
        await onBabyAdd(babyName.trim(), parsedBirthDate, babySex, feedingType, babyColor)
        setAddingBaby(false)
      } else {
        await onProfileChange(babyName.trim(), parsedBirthDate, babySex, feedingType, babyColor)
      }
      setSettingsOpen(false)
      toast.success(t.settings.profileSaved)
    } catch (error) {
      toast.error(localizedErrorMessage(error, t, t.settings.profileSaveError))
    } finally {
      setSaving(false)
    }
  }

  function startAddingBaby() {
    setAddingBaby(true)
    setBabyName("")
    setBirthDateInput("")
    setBabySex("")
    setFeedingType("breast")
    setBabyColor("orange")
  }

  function cancelAddingBaby() {
    setAddingBaby(false)
    setBabyName(settings.baby_name)
    setBirthDateInput(formatDateInput(settings.birth_date, locale))
    setBabySex(settings.baby_sex)
    setFeedingType(settings.feeding_type || "breast")
    setBabyColor(activeBabyColor)
  }

  async function deleteBaby() {
    setDeletingBaby(true)
    try {
      await onBabyDelete(settings.active_baby_id)
      setDeleteBabyOpen(false)
    } catch (error) {
      toast.error(localizedErrorMessage(error, t, t.common.actionImpossible))
    } finally {
      setDeletingBaby(false)
    }
  }

  async function resetDatabase() {
    setResetting(true)
    try {
      await onReset()
      setResetOpen(false)
      setResetting(false)
    } catch (error) {
      toast.error(localizedErrorMessage(error, t, t.settings.resetError))
      setResetting(false)
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[73px] max-w-6xl items-center gap-1 px-3 py-3 sm:gap-3 sm:px-6">
        <BabyCareIcon accentColor={activeBabyColor} className="size-10 shrink-0 rounded-xl sm:size-11" />
        <div className="flex min-w-0 max-w-28 flex-col leading-tight sm:max-w-64 sm:flex-row sm:items-center sm:gap-2">
          <p className="shrink-0 text-sm font-semibold tracking-tight sm:text-lg">BabyCare</p>
          {settings.babies.length ? (
            <Select value={String(settings.active_baby_id)} onValueChange={(value) => onBabySelect(Number(value)).catch((error) => toast.error(localizedErrorMessage(error, t, t.common.actionImpossible)))}>
              <SelectTrigger aria-label={t.settings.selectBaby} className="h-7 min-w-0 border-0 bg-transparent px-1 text-xs font-medium shadow-none sm:text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {settings.babies.map((baby) => {
                  const color = ACCENT_OPTIONS.find((option) => option.id === baby.accent_color)?.value
                  return <SelectItem key={baby.id} value={String(baby.id)}><span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />{baby.name || t.settings.unnamedBaby}</span></SelectItem>
                })}
              </SelectContent>
            </Select>
          ) : null}
        </div>

        {age ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="h-8 shrink-0 rounded-lg px-1 text-[11px] font-medium text-primary sm:px-2 sm:text-sm">
                {formatAgeCompact(age, locale)}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72">
              <p className="mt-1 text-sm text-foreground">{formatAgeDetailed(age, locale)}</p>
              <p className="mt-2 text-xs text-muted-foreground">{interpolate(t.settings.bornOn, { date: formatBirthDate(settings.birth_date, locale) })}</p>
            </PopoverContent>
          </Popover>
        ) : null}

        <p className="ml-auto whitespace-nowrap text-[11px] text-muted-foreground md:hidden">{formatShortDate(now, locale)}</p>
        <p className="ml-auto hidden whitespace-nowrap text-sm text-muted-foreground md:block">{formatLongDate(now, locale)}</p>
        <time className="whitespace-nowrap font-mono text-xs font-medium tabular-nums sm:text-lg">{formatClock(now, locale)}</time>

        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative size-9 shrink-0 rounded-xl sm:size-10"
              aria-label={appUpdate.versionInfo?.updateAvailable
                ? `${t.settings.open} — ${interpolate(t.update.available, { version: appUpdate.versionInfo.availableVersion || "" })}`
                : t.settings.open}
            >
              <Settings className="size-5" />
              {appUpdate.versionInfo?.updateAvailable ? <span className="absolute right-1 top-1 size-2.5 rounded-full border-2 border-background bg-destructive" aria-hidden="true" /> : null}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t.settings.title}</DialogTitle>
              <DialogDescription>{t.settings.description}</DialogDescription>
            </DialogHeader>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="flex flex-col gap-5">
              <form onSubmit={saveProfile} autoComplete="off" className="space-y-4 rounded-2xl border bg-card/60 p-4">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{addingBaby ? t.settings.addBabyTitle : t.settings.profileTitle}</p>
                      <p className="text-xs text-muted-foreground">{addingBaby ? t.settings.addBabyDescription : t.settings.profileDescription}</p>
                    </div>
                    {addingBaby ? (
                      <Button type="button" variant="ghost" size="sm" onClick={cancelAddingBaby}>{t.common.cancel}</Button>
                    ) : (
                      <Button type="button" variant="outline" size="sm" onClick={startAddingBaby}><Plus /> {t.settings.addBaby}</Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="baby-name" className="text-sm font-medium">{t.settings.babyName}</label>
                  <Input
                    id="baby-name"
                    value={babyName}
                    required={addingBaby}
                    maxLength={80}
                    autoComplete="off"
                    data-1p-ignore="true"
                    data-lpignore="true"
                    placeholder={t.settings.babyNamePlaceholder}
                    onChange={(event) => setBabyName(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="birth-date" className="text-sm font-medium">{t.settings.birthDate}</label>
                  <div className="flex gap-2">
                    <Input
                      id="birth-date"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      data-1p-ignore="true"
                      data-lpignore="true"
                      placeholder={t.settings.birthDatePlaceholder}
                      value={birthDateInput}
                      onChange={(event) => setBirthDateInput(formatDateDraft(event.target.value))}
                    />
                    <Popover open={birthDatePickerOpen} onOpenChange={setBirthDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" size="icon" className="shrink-0" aria-label={t.settings.chooseBirthDate}>
                          <Calendar className="size-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-80 p-3">
                        <div className="mb-3 flex items-center justify-between">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t.settings.previousMonth}
                            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1, 12))}
                          >
                            <ChevronLeft className="size-4" />
                          </Button>
                          <p className="text-sm font-medium capitalize">{monthFormatter.format(calendarMonth)}</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t.settings.nextMonth}
                            disabled={new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1, 12) > today}
                            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1, 12))}
                          >
                            <ChevronRight className="size-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
                          {weekdays.map((weekday) => (
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
                                aria-label={interpolate(t.settings.chooseDate, { date: formatDateInput(isoDate, locale) })}
                                onClick={() => {
                                  setBirthDateInput(formatDateInput(isoDate, locale))
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
                  <p className="text-xs text-muted-foreground">{t.settings.hiddenAge}</p>
                </div>

                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">{t.settings.sex}</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {SEX_OPTIONS.map(({ value, icon: Icon }) => (
                      <Button
                        key={value}
                        type="button"
                        variant={babySex === value ? "default" : "outline"}
                        aria-pressed={babySex === value}
                        onClick={() => setBabySex((current) => current === value ? "" : value)}
                      >
                        <Icon aria-hidden="true" /> {t.settings.sexOptions[value]}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{t.settings.sexHelp}</p>
                </fieldset>

                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">{t.settings.babyColor}</legend>
                  <div className="grid grid-cols-5 gap-2">
                    {ACCENT_OPTIONS.map((option) => (
                      <Button key={option.id} type="button" variant="outline" size="icon" className="relative size-10 rounded-xl p-0" aria-label={interpolate(t.settings.useBabyColor, { color: option.label })} aria-pressed={babyColor === option.id} onClick={() => setBabyColor(option.id)}>
                        <span className="size-6 rounded-full" style={{ backgroundColor: option.value }} />
                        {babyColor === option.id ? <Check className="absolute size-3 text-white drop-shadow" /> : null}
                      </Button>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">{t.settings.feedingType}</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {(["breast", "bottle"] as const).map((value) => (
                      <Button
                        key={value}
                        type="button"
                        variant={feedingType === value ? "default" : "outline"}
                        aria-pressed={feedingType === value}
                        onClick={() => setFeedingType(value)}
                      >
                        {t.settings.feedingTypeOptions[value]}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{t.settings.feedingTypeHelp}</p>
                </fieldset>

                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? <LoaderCircle className="animate-spin" /> : null}
                  {addingBaby ? t.settings.createBaby : t.settings.saveProfile}
                </Button>
              </form>

              </div>

              <div className="rounded-2xl border bg-card/60 p-4">
                <div>
                  <p className="font-semibold">{t.settings.languageTitle}</p>
                  <p className="mb-3 text-xs text-muted-foreground">{t.settings.languageDescription}</p>
                  <label htmlFor="language-preference" className="mb-2 block text-sm font-medium">{t.settings.languageLabel}</label>
                  <Select value={settings.language_preference} onValueChange={(value) => onLanguageChange(value as LanguagePreference).catch((error) => toast.error(localizedErrorMessage(error, t, t.common.actionImpossible)))}>
                    <SelectTrigger id="language-preference" className="h-11 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>{t.settings.languageOptions[option]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator className="my-5" />

                <section aria-labelledby="screen-settings-title">
                  <p id="screen-settings-title" className="font-semibold">{t.settings.screenAwakeTitle}</p>
                  <p className="mb-3 text-xs text-muted-foreground">{t.settings.screenAwakeDescription}</p>
                  <label htmlFor="prevent-sleep-during-timer" className="flex cursor-pointer items-start gap-3 rounded-xl border p-3">
                    <Checkbox
                      id="prevent-sleep-during-timer"
                      className="mt-0.5"
                      checked={preventSleepDuringTimer}
                      onCheckedChange={(checked) => onPreventSleepDuringTimerChange?.(checked === true)}
                    />
                    <span>
                      <span className="block text-sm font-medium">{t.settings.screenAwakeLabel}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{t.settings.screenAwakeHelp}</span>
                    </span>
                  </label>
                  <div className={`ml-7 mt-2 ${preventSleepDuringTimer ? "" : "opacity-55"}`}>
                    <label htmlFor="wake-lock-video-fallback" className={`flex items-start gap-3 rounded-xl border p-3 ${preventSleepDuringTimer ? "cursor-pointer" : "cursor-not-allowed"}`}>
                      <Checkbox
                        id="wake-lock-video-fallback"
                        className="mt-0.5"
                        checked={wakeLockVideoFallback}
                        disabled={!preventSleepDuringTimer}
                        onCheckedChange={(checked) => onWakeLockVideoFallbackChange?.(checked === true)}
                      />
                      <span>
                        <span className="block text-sm font-medium">{t.settings.screenAwakeFallbackLabel}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">{t.settings.screenAwakeFallbackHelp}</span>
                      </span>
                    </label>
                  </div>
                </section>

                <Separator className="my-5" />

                <section aria-labelledby="update-settings-title">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p id="update-settings-title" className="font-semibold">{t.update.title}</p>
                      <p className="text-xs text-muted-foreground">{t.update.description}</p>
                    </div>
                    {appUpdate.versionInfo?.updateAvailable ? <span className="mt-1 size-2.5 shrink-0 rounded-full bg-destructive" aria-label={interpolate(t.update.available, { version: appUpdate.versionInfo.availableVersion || "" })} /> : null}
                  </div>
                  {appUpdate.versionInfo ? (
                    <p className="mt-3 text-xs text-muted-foreground">{interpolate(t.update.current, { version: appUpdate.versionInfo.currentVersion })}</p>
                  ) : null}
                  <Button
                    type="button"
                    className="mt-3 min-h-11 w-full whitespace-normal"
                    variant={appUpdate.versionInfo?.updateAvailable ? "default" : "outline"}
                    disabled={appUpdate.checking
                      || Boolean(hasRunningTimer && appUpdate.versionInfo?.updateAvailable)
                      || Boolean(appUpdate.versionInfo && !appUpdate.versionInfo.updateAvailable && !appUpdate.versionInfo.checkError)}
                    onClick={() => {
                      if (!appUpdate.versionInfo || appUpdate.versionInfo.checkError) {
                        appUpdate.refresh(true).catch((error) => toast.error(localizedErrorMessage(error, t, t.update.checkError)))
                        return
                      }
                      setSettingsOpen(false)
                      if (appUpdate.status?.active) {
                        appUpdate.setProgressOpen(true)
                        return
                      }
                      appUpdate.startUpdate().catch((error) => {
                        appUpdate.setProgressOpen(false)
                        toast.error(localizedErrorMessage(error, t, t.update.startError))
                      })
                    }}
                  >
                    {appUpdate.checking || appUpdate.status?.active ? <LoaderCircle className="animate-spin" /> : appUpdate.versionInfo?.updateAvailable ? <Download /> : null}
                    {hasRunningTimer && appUpdate.versionInfo?.updateAvailable
                      ? t.update.timerWaiting
                      : appUpdate.versionInfo?.updateAvailable
                        ? t.update.availableAction
                        : appUpdate.versionInfo && !appUpdate.versionInfo.checkError
                          ? t.update.noneAvailable
                          : t.update.check}
                  </Button>
                  {appUpdate.status?.canRollback ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-2 w-full"
                      disabled={hasRunningTimer || appUpdate.status.active}
                      onClick={() => {
                        setSettingsOpen(false)
                        appUpdate.rollback().catch((error) => {
                          appUpdate.setProgressOpen(false)
                          toast.error(localizedErrorMessage(error, t, t.update.startError))
                        })
                      }}
                    >
                      <RotateCcw />
                      {appUpdate.status.rollbackVersion
                        ? interpolate(t.update.rollback, { version: appUpdate.status.rollbackVersion })
                        : t.update.rollbackFallback}
                    </Button>
                  ) : null}
                </section>

                <Separator className="my-5" />

                <div>
                  <p className="font-semibold text-destructive">{t.settings.dangerTitle}</p>
                  <p className="mb-3 text-xs text-muted-foreground">{t.settings.dangerDescription}</p>
                  <Button type="button" variant="outline" className="mb-2 w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={settings.babies.length <= 1} onClick={() => {
                    setSettingsOpen(false)
                    setDeleteBabyOpen(true)
                  }}>
                    <Baby /> {interpolate(t.settings.deleteBaby, { name: settings.baby_name || t.settings.unnamedBaby })}
                  </Button>
                  <Button type="button" variant="destructive" className="w-full" onClick={() => {
                    setSettingsOpen(false)
                    setResetOpen(true)
                  }}>
                    <Trash2 /> {t.settings.resetDatabase}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <UpdateProgressDialog open={appUpdate.progressOpen} status={appUpdate.status} onOpenChange={appUpdate.setProgressOpen} />

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.settings.resetTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.settings.resetDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={resetting} onClick={resetDatabase}>
              {resetting ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
              {t.settings.resetConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteBabyOpen} onOpenChange={setDeleteBabyOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{interpolate(t.settings.deleteBabyTitle, { name: settings.baby_name || t.settings.unnamedBaby })}</AlertDialogTitle>
            <AlertDialogDescription>{interpolate(t.settings.deleteBabyDescription, { name: settings.baby_name || t.settings.unnamedBaby })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingBaby}>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={deletingBaby} onClick={deleteBaby}>
              {deletingBaby ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
              {t.settings.deleteBabyConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  )
}
