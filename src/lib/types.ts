export const EVENT_LABELS = {
  temperature: "Température",
  diaper: "Couche",
  breast_left: "Sein gauche",
  breast_right: "Sein droit",
  bath: "Bain",
  face_care: "Visage",
  cord_care: "Cordon",
  clothes_change: "Vêtements",
  irritation: "Irritation",
  eye_care: "Yeux",
  nose_care: "Nez"
} as const

export type EventType = keyof typeof EVENT_LABELS

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
  metadata: Record<string, string> | null
  created_at: string
  updated_at: string
}

export interface DailyCare {
  id: number
  date: string
  care_type: "eyes" | "nose" | "cord" | "face"
  completed: 0 | 1
  completed_at: string | null
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
