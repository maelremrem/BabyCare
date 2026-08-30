export const EVENT_LABELS = {
  temperature: "Température",
  weight: "Poids",
  height: "Taille",
  diaper: "Couche",
  breast_left: "Sein gauche",
  breast_right: "Sein droit",
  bottle: "Biberon",
  nap: "Sieste",
  bath: "Bain",
  face_care: "Visage",
  cord_care: "Cordon",
  face_cord_care: "Visage et cordon",
  clothes_change: "Vêtements",
  irritation: "Irritation",
  observation: "Observation",
  daily_care: "Soins quotidiens",
  eye_care: "Yeux",
  nose_care: "Nez"
} as const

export type EventType = keyof typeof EVENT_LABELS

export const IRRITATION_LOCATIONS = ["face", "neck", "chest", "back", "arms", "legs", "bottom", "other"] as const
export type IrritationLocation = typeof IRRITATION_LOCATIONS[number]

const LEGACY_IRRITATION_LOCATIONS: Record<string, IrritationLocation> = {
  visage: "face",
  cou: "neck",
  torse: "chest",
  dos: "back",
  bras: "arms",
  jambes: "legs",
  fesses: "bottom",
  autre: "other"
}

export function normalizeIrritationLocation(value: string) {
  if ((IRRITATION_LOCATIONS as readonly string[]).includes(value)) return value as IrritationLocation
  return LEGACY_IRRITATION_LOCATIONS[value] || value
}

export const ACCENT_OPTIONS = [
  { id: "orange", label: "Orange", value: "#FD6D01" },
  { id: "blue", label: "Bleu", value: "#2F80ED" },
  { id: "green", label: "Vert", value: "#34C759" },
  { id: "pink", label: "Rose", value: "#FF2D92" },
  { id: "purple", label: "Violet", value: "#AF52DE" }
] as const

export type AccentColor = typeof ACCENT_OPTIONS[number]["id"]
export type BabySex = "" | "girl" | "boy"
export type FeedingType = "breast" | "bottle"

export interface BabyProfile {
  id: number
  name: string
  birth_date: string
  baby_sex: BabySex
  feeding_type?: FeedingType
  accent_color: AccentColor
}

export interface AppSettings {
  active_baby_id: number
  babies: BabyProfile[]
  accent_color: AccentColor
  baby_name: string
  birth_date: string
  baby_sex: BabySex
  feeding_type?: FeedingType
  language_preference: "system" | "fr" | "en"
}

export interface BabyEvent {
  id: number
  type: EventType
  status: "running" | "completed"
  started_at: string
  ended_at: string | null
  duration_seconds: number | null
  value_real: number | null
  value_text: string | null
  notes: string | null
  metadata: Record<string, string | string[]> | null
  created_at: string
  updated_at: string
}

export interface DailyCare {
  id: number
  date: string
  care_type: "eyes" | "nose" | "cord" | "face"
  completed: 0 | 1
  completed_at: string | null
  validated_at: string | null
}

export interface StoolAlert {
  overdue: boolean
  last_stool_at: string | null
  hours_since: number | null
  threshold_hours: number
}

export interface EventList {
  events: BabyEvent[]
  total: number
  limit: number
  offset: number
}

export type EventPayload = Partial<Pick<BabyEvent,
  "type" | "started_at" | "ended_at" | "duration_seconds" | "value_real" | "value_text" | "notes" | "metadata"
>> & { type: EventType }
