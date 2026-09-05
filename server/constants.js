export const EVENT_TYPES = new Set([
  "temperature",
  "weight",
  "height",
  "diaper",
  "breast_left",
  "breast_right",
  "bottle",
  "pump_left",
  "pump_right",
  "nap",
  "bath",
  "face_care",
  "cord_care",
  "face_cord_care",
  "clothes_change",
  "irritation",
  "vitamin",
  "observation",
  "daily_care",
  "eye_care",
  "nose_care"
])
export const TIMER_TYPES = new Set(["breast_left", "breast_right", "nap"])
export const ACCENT_COLORS = new Set(["orange", "blue", "green", "pink", "purple"])
export const BABY_SEXES = new Set(["", "girl", "boy"])
export const FEEDING_TYPES = new Set(["breast", "bottle", "mixed"])
export const LANGUAGE_PREFERENCES = new Set(["system", "fr", "en"])
export const DAILY_CARE_TYPES = ["eyes", "face", "nose", "cord"]
export const BATH_ITEMS = [
  "Préparation",
  "Fesses si souillées",
  "Mise à l’eau",
  "Tête",
  "Haut du corps",
  "Bas du corps",
  "Organes génitaux",
  "Fesses",
  "Rinçage",
  "Sortie du bain",
  "Séchage",
  "Cordon",
  "Couche",
  "Habillage"
]
export const EDITABLE_FIELDS = new Set([
  "type",
  "started_at",
  "ended_at",
  "duration_seconds",
  "value_real",
  "value_text",
  "notes",
  "metadata"
])
export const API_ERRORS = {
  invalid_accent_color: "Couleur d’accent invalide.",
  invalid_language_preference: "Préférence de langue invalide.",
  baby_name_too_long: "Le nom du bébé ne peut pas dépasser 80 caractères.",
  invalid_birth_date: "La date de naissance est invalide ou située dans le futur.",
  invalid_baby_sex: "Le sexe renseigné est invalide.",
  invalid_feeding_type: "Le type d’allaitement est invalide.",
  invalid_pump_quantity: "La quantité de lait recueillie doit être comprise entre 1 et 1000 ml.",
  invalid_bottle_quantity: "La quantité du biberon doit être comprise entre 1 et 1000 ml.",
  baby_not_found: "Bébé introuvable.",
  cannot_delete_last_baby: "Le dernier bébé ne peut pas être supprimé.",
  invalid_event_type: "Type d’événement invalide.",
  invalid_temperature: "La température doit être comprise entre 34 et 44 °C.",
  invalid_weight: "Le poids doit être compris entre 0,3 et 30 kg.",
  invalid_height: "La taille doit être comprise entre 20 et 200 cm.",
  invalid_duration: "La durée doit être un nombre positif.",
  not_timer_event: "Cette action ne peut pas être chronométrée.",
  event_not_found: "Événement introuvable.",
  timer_already_completed: "Ce chrono est déjà terminé.",
  incomplete_daily_care: "Terminez la checklist avant de valider les soins.",
  invalid_daily_care: "Soin quotidien invalide.",
  bath_session_not_found: "Session de bain introuvable.",
  bath_item_not_found: "Élément de bain introuvable.",
  update_not_configured: "Les mises à jour depuis l’interface ne sont pas configurées sur cette installation.",
  update_timer_running: "Arrêtez tous les chronos avant de lancer une mise à jour.",
  update_already_running: "Une mise à jour est déjà en cours.",
  no_update_available: "Aucune nouvelle version n’est disponible.",
  unsupported_release: "Cette release n’est pas disponible pour l’architecture du serveur.",
  rollback_unavailable: "Aucune version précédente n’est disponible pour le rollback.",
  baby_context_required: "Sélectionnez un bébé avant de continuer.",
  invalid_payload: "Les données envoyées sont invalides.",
  invalid_date: "La date ou la fin de l’événement est invalide.",
  invalid_pagination: "La pagination est invalide.",
  internal_error: "Une erreur interne est survenue."
}
export const EXPORT_LOCALES = new Set(["fr", "en"])
export const EXPORT_LOCALE_TAGS = {
  fr: "fr-FR",
  en: "en-US"
}
export const EXPORT_MESSAGES = {
  fr: {
    sheetName: "Historique",
    columns: {
      date: "Date",
      start: "Heure début",
      end: "Heure fin",
      duration: "Durée",
      type: "Type",
      value: "Valeur",
      detail: "Détail",
      notes: "Observation"
    },
    eventLabels: {
      temperature: "Température",
      weight: "Poids",
      height: "Taille",
      diaper: "Couche",
      breast_left: "Sein gauche",
      breast_right: "Sein droit",
      pump_left: "Tire-lait · Sein gauche",
      pump_right: "Tire-lait · Sein droit",
      bottle: "Biberon",
      nap: "Sieste",
      bath: "Bain",
      face_care: "Visage",
      cord_care: "Cordon",
      face_cord_care: "Visage et cordon",
      clothes_change: "Vêtements",
      irritation: "Irritation",
      vitamin: "Vitamine",
      observation: "Observation",
      daily_care: "Soins quotidiens",
      eye_care: "Yeux",
      nose_care: "Nez"
    },
    diaperTypes: {
      urine: "Urine",
      stool: "Selles",
      mixed: "Urine + Selles"
    },
    irritationLocations: {
      face: "Visage",
      neck: "Cou",
      chest: "Torse",
      back: "Dos",
      arms: "Bras",
      legs: "Jambes",
      bottom: "Fesses",
      other: "Autre",
      visage: "Visage",
      cou: "Cou",
      torse: "Torse",
      dos: "Dos",
      bras: "Bras",
      jambes: "Jambes",
      fesses: "Fesses",
      autre: "Autre"
    },
    vitamins: {
      vitamin_d: "Vitamine D",
      vitamin_k: "Vitamine K",
      vitamin_a: "Vitamine A",
      vitamin_b1: "Vitamine B1",
      vitamin_b2: "Vitamine B2",
      vitamin_b3: "Vitamine B3",
      vitamin_b5: "Vitamine B5",
      vitamin_b6: "Vitamine B6",
      vitamin_b7: "Vitamine B7/B8",
      vitamin_b9: "Vitamine B9",
      vitamin_b12: "Vitamine B12",
      vitamin_c: "Vitamine C",
      vitamin_e: "Vitamine E",
      multivitamins: "Multivitamines"
    }
  },
  en: {
    sheetName: "Events",
    columns: {
      date: "Date",
      start: "Start time",
      end: "End time",
      duration: "Duration",
      type: "Type",
      value: "Value",
      detail: "Detail",
      notes: "Observation"
    },
    eventLabels: {
      temperature: "Temperature",
      weight: "Weight",
      height: "Height",
      diaper: "Diaper",
      breast_left: "Left breast",
      breast_right: "Right breast",
      pump_left: "Breast pump · Left breast",
      pump_right: "Breast pump · Right breast",
      bottle: "Bottle",
      nap: "Nap",
      bath: "Bath",
      face_care: "Face",
      cord_care: "Cord",
      face_cord_care: "Face and cord",
      clothes_change: "Clothes",
      irritation: "Irritation",
      vitamin: "Vitamin",
      observation: "Observation",
      daily_care: "Daily care",
      eye_care: "Eyes",
      nose_care: "Nose"
    },
    diaperTypes: {
      urine: "Urine",
      stool: "Stool",
      mixed: "Urine + Stool"
    },
    irritationLocations: {
      face: "Face",
      neck: "Neck",
      chest: "Chest",
      back: "Back",
      arms: "Arms",
      legs: "Legs",
      bottom: "Bottom",
      other: "Other",
      visage: "Face",
      cou: "Neck",
      torse: "Chest",
      dos: "Back",
      bras: "Arms",
      jambes: "Legs",
      fesses: "Bottom",
      autre: "Other"
    },
    vitamins: {
      vitamin_d: "Vitamin D",
      vitamin_k: "Vitamin K",
      vitamin_a: "Vitamin A",
      vitamin_b1: "Vitamin B1",
      vitamin_b2: "Vitamin B2",
      vitamin_b3: "Vitamin B3",
      vitamin_b5: "Vitamin B5",
      vitamin_b6: "Vitamin B6",
      vitamin_b7: "Vitamin B7/B8",
      vitamin_b9: "Vitamin B9",
      vitamin_b12: "Vitamin B12",
      vitamin_c: "Vitamin C",
      vitamin_e: "Vitamin E",
      multivitamins: "Multivitamins"
    }
  }
}

export const nowIso = () => new Date().toISOString()
export const localDate = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: process.env.TZ || "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).format(new Date())

export function sendApiError(response, status, code) {
  return response.status(status).json({ error: API_ERRORS[code], code })
}

export function resolveExportLocale(value) {
  return EXPORT_LOCALES.has(value) ? value : "fr"
}

