import { MeasurementPicker } from "@/components/MeasurementPicker"

interface TemperaturePickerProps {
  value: number
  onChange: (value: number) => void
}

export function TemperaturePicker({ value, onChange }: TemperaturePickerProps) {
  return (
    <MeasurementPicker
      value={value}
      onChange={onChange}
      min={34}
      max={44}
      step={0.1}
      decimals={1}
      unit="°C"
      label="Température"
      stepLabel="0,1 °C"
    />
  )
}
