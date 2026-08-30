import { MeasurementPicker } from "@/components/MeasurementPicker"
import { useI18n } from "@/lib/i18n"

interface TemperaturePickerProps {
  value: number
  onChange: (value: number) => void
}

export function TemperaturePicker({ value, onChange }: TemperaturePickerProps) {
  const { locale, t } = useI18n()
  return (
    <MeasurementPicker
      value={value}
      onChange={onChange}
      min={34}
      max={44}
      step={0.1}
      decimals={1}
      unit="°C"
      label={t.eventLabels.temperature}
      stepLabel={locale === "fr" ? "0,1 °C" : "0.1 °C"}
    />
  )
}
