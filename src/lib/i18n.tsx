/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react"
import type { BabySex, EventType } from "@/lib/types"

export const SUPPORTED_LOCALES = ["fr", "en"] as const
export type SupportedLocale = typeof SUPPORTED_LOCALES[number]
export type LanguagePreference = "system" | SupportedLocale

const localeTags: Record<SupportedLocale, string> = {
  fr: "fr-FR",
  en: "en-US"
}

const fr = {
  common: {
    appUnavailable: "Impossible de joindre BabyCare.",
    cancel: "Annuler",
    delete: "Supprimer",
    save: "Enregistrer",
    none: "Aucune",
    noValue: "—",
    optionalObservation: "Observation (facultative)",
    observation: "Observation",
    actionImpossible: "Action impossible"
  },
  loading: {
    appLabel: "Chargement de BabyCare",
    appText: "Chargement de l’application…"
  },
  footer: {
    version: "version",
    support: "Soutenir"
  },
  update: {
    title: "Mise à jour",
    description: "Installez les releases BabyCare vérifiées sans toucher aux données locales.",
    available: "BabyCare v{version} est disponible",
    current: "Version actuelle : v{version}",
    install: "Installer la mise à jour",
    timerBlocked: "Arrêtez le chrono actif avant la mise à jour.",
    check: "Vérifier les mises à jour",
    noneAvailable: "Aucune mise à jour disponible",
    availableAction: "Mise à jour disponible !",
    timerWaiting: "La mise à jour sera disponible quand le chronomètre en cours sera terminé",
    checkError: "Impossible de vérifier les mises à jour.",
    rollback: "Revenir à la version v{version}",
    rollbackFallback: "Revenir à la version précédente",
    progressTitle: "Mise à jour de BabyCare",
    progressDescription: "L’application suit l’installation puis redémarre automatiquement.",
    progressLabel: "Progression de la mise à jour",
    downloadRange: "Téléchargement",
    installRange: "Installation",
    stepsLabel: "Étapes de la mise à jour",
    downloadPhase: "Télécharger la mise à jour",
    verifyPhase: "Vérifier son intégrité",
    extractPhase: "Extraire les fichiers",
    installPhase: "Activer la nouvelle version",
    restartPhase: "Redémarrer et contrôler BabyCare",
    preparing: "Préparation de la mise à jour…",
    completeTitle: "Mise à jour terminée",
    completeDescription: "La nouvelle version est prête. Les appareils connectés vont se rafraîchir.",
    errorTitle: "Mise à jour interrompue",
    errorDescription: "La version précédente reste active ou a été restaurée automatiquement.",
    close: "Fermer",
    startError: "Impossible de lancer la mise à jour."
  },
  tabs: {
    tracking: "Suivi",
    care: "Soins",
    medical: "Suivi médical",
    history: "Historique"
  },
  eventLabels: {
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
    vitamin: "Vitamine",
    observation: "Observation",
    daily_care: "Soins quotidiens",
    eye_care: "Yeux",
    nose_care: "Nez"
  } satisfies Record<EventType, string>,
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
    other: "Autre"
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
  },
  settings: {
    open: "Ouvrir les paramètres",
    title: "Paramètres de BabyCare",
    description: "Gérez le profil du bébé, la langue et les données locales.",
    profileTitle: "Profil du bébé",
    profileDescription: "Ces informations restent dans la base locale.",
    selectBaby: "Sélectionner un bébé",
    unnamedBaby: "Bébé sans nom",
    addBaby: "Ajouter un bébé",
    addBabyTitle: "Nouveau bébé",
    addBabyDescription: "Créez un profil avec ses propres données et sa couleur.",
    babyColor: "Couleur du bébé",
    createBaby: "Ajouter ce bébé",
    babyName: "Nom du bébé",
    babyNamePlaceholder: "Ex. Emma",
    birthDate: "Date de naissance",
    birthDatePlaceholder: "jj/mm/aaaa",
    chooseBirthDate: "Choisir la date de naissance",
    chooseDate: "Choisir le {date}",
    previousMonth: "Mois précédent",
    nextMonth: "Mois suivant",
    hiddenAge: "L’âge reste masqué tant que ce champ est vide.",
    sex: "Sexe",
    sexOptions: {
      girl: "Fille",
      boy: "Garçon"
    } satisfies Record<Exclude<BabySex, "">, string>,
    sexHelp: "Nécessaire avec la date de naissance pour afficher les références OMS.",
    feedingType: "Repas disponibles",
    feedingTypeOptions: {
      breast: "Au sein",
      bottle: "Au biberon"
    },
    feedingTypeHelp: "Activez le sein, le biberon ou les deux. Au moins un choix reste actif.",
    saveProfile: "Enregistrer le profil",
    invalidBirthDate: "Utilisez le format jj/mm/aaaa pour la date de naissance.",
    futureBirthDate: "La date de naissance ne peut pas être dans le futur.",
    profileSaved: "Profil du bébé enregistré",
    profileSaveError: "Impossible d’enregistrer le profil.",
    useBabyColor: "Choisir {color} pour ce bébé",
    languageTitle: "Langue",
    languageDescription: "Par défaut, BabyCare suit la langue du navigateur.",
    languageLabel: "Langue de l’interface",
    languageOptions: {
      system: "Langue du navigateur",
      fr: "Français",
      en: "English"
    } satisfies Record<LanguagePreference, string>,
    languageUpdated: "Langue mise à jour",
    screenAwakeTitle: "Maintien de l’écran",
    screenAwakeDescription: "Réglage propre à cet appareil.",
    screenAwakeLabel: "Empêcher la mise en veille pendant un chrono",
    screenAwakeHelp: "Utilise le verrouillage d’écran natif lorsqu’il est disponible.",
    screenAwakeFallbackLabel: "Utiliser le fallback vidéo",
    screenAwakeFallbackHelp: "Pour iOS 15 et les connexions HTTP. Lit une vidéo silencieuse pendant les chronos et peut augmenter la consommation de batterie. Ce choix reste sur cet appareil.",
    dangerTitle: "Zone de danger",
    dangerDescription: "Ces actions suppriment définitivement des données locales.",
    deleteBaby: "Supprimer bébé {name}",
    deleteBabyTitle: "Supprimer {name} ?",
    deleteBabyDescription: "Le profil de {name}, ses mesures, ses soins et tout son historique seront supprimés définitivement.",
    deleteBabyConfirm: "Supprimer ce bébé",
    resetDatabase: "Réinitialiser toute la base",
    resetTitle: "Réinitialiser toute la base de données ?",
    resetDescription: "Toutes les informations BabyCare seront supprimées définitivement. Cette action est irréversible.",
    resetConfirm: "Confirmer la réinitialisation",
    resetError: "Impossible de réinitialiser la base de données.",
    bornOn: "Né(e) le {date}"
  },
  tracking: {
    latestInfo: "Dernières informations",
    quickActions: "Actions rapides",
    activeTimer: "Chrono actif",
    recentActivity: "Activité récente",
    feeding: "Tétée",
    bottle: "Biberon",
    diaper: "Couche",
    bath: "Bain",
    feedingsTodaySingular: "tétée aujourd’hui",
    feedingsTodayPlural: "tétées aujourd’hui",
    bottlesTodaySingular: "biberon aujourd’hui",
    bottlesTodayPlural: "biberons aujourd’hui",
    sinceLastFeeding: "Depuis la dernière tétée : {duration}",
    sinceLastBottle: "Depuis le dernier biberon : {duration}",
    firstActions: "Les premières actions apparaîtront ici.",
    activityLoading: "Chargement de l’activité…",
    stoolAlertLabel: "Alerte transit",
    stoolMissingTitle: "Suivi des selles à renseigner",
    noStoolSince: "Aucune selle depuis {hours} h",
    lastStool: "Dernière selle enregistrée {relative}.",
    noStoolRecorded: "Aucune selle n’a encore été enregistrée.",
    stoolThreshold: "Le seuil de surveillance est fixé à {hours} heures.",
    dailyCareAlertLabel: "Alerte soins",
    dailyCareOverdueTitle: "Soins visage et cordon à effectuer",
    lastDailyCare: "Derniers soins enregistrés {relative}.",
    noDailyCareRecorded: "Aucun soin visage et cordon n’a encore été enregistré.",
    dailyCareThreshold: "Le seuil de surveillance est fixé à 24 heures.",
    dailyCareDoneButton: "Soin Visage/Cordon effectué"
  },
  widget: {
    title: "Widget",
    noBaby: "Configurer un bébé",
    profileHint: "Ajoutez une date de naissance dans l’application principale.",
    sync: "Sync",
    activeTimer: "Chrono actif",
    latestFeeding: "Dernière tétée",
    latestBottle: "Dernier biberon",
    latestTemperature: "Température",
    latestDiaper: "Couche",
    stool: "Transit",
    dailyCare: "Soins du jour",
    completedCare: "{count}/{total} faits",
    pendingCare: "Reste à compléter",
    recentEvents: "Récents",
    noRecentEvents: "Aucun événement récent",
    startedAt: "Démarré à {time}",
    noData: "Pas encore de donnée",
    monitoringOk: "RAS",
    overdue: "Alerte"
  },
  actions: {
    faceCord: "Visage / Cordon",
    careBath: "Soin Visage/Cordon - Bain",
    addObservation: "Ajouter une observation",
    leftBreast: "Sein Gauche",
    rightBreast: "Sein Droit",
    bottleDescription: "Indiquez la quantité bue, sans lancer de chrono.",
    bottleQuantity: "Quantité du biberon",
    both: "Les deux",
    temperatureDescription: "Sélectionnez la valeur mesurée.",
    irritationDescription: "Sélectionnez une ou plusieurs zones, puis ajoutez une observation.",
    vitaminDescription: "Sélectionnez une ou plusieurs vitamines administrées, puis ajoutez une observation.",
    freeObservationDescription: "Enregistrez une information libre dans l’historique.",
    observationPlaceholder: "Votre observation…",
    started: "{label} démarré",
    recorded: "{label} enregistré",
    faceCare: "Soin du visage",
    cordCare: "Soin du cordon",
    faceCordCare: "Soin du visage et du cordon",
    clothesChanged: "Vêtements changés"
  },
  activeTimer: {
    running: "En cours",
    addObservation: "Ajouter une observation",
    stop: "Terminer",
    switchBreast: "Changer de sein",
    switchedTo: "Passage au {label}"
  },
  eventEditor: {
    description: "Modifiez les informations enregistrées.",
    dateTime: "Date et heure",
    temperature: "Température (°C)",
    weight: "Poids (kg)",
    height: "Taille (cm)",
    bottleQuantity: "Quantité (ml)",
    duration: "Durée",
    hours: "Heures",
    minutes: "Minutes",
    seconds: "Secondes",
    diaperType: "Type de couche",
    locations: "Zones",
    vitamins: "Vitamines",
    updated: "Événement mis à jour",
    deleteTitle: "Supprimer cet événement ?",
    deleteDescription: "Cette action est définitive et retirera l’entrée de l’historique.",
    deleted: "Événement supprimé"
  },
  care: {
    title: "Soins quotidiens",
    description: "Préparation et gestes recommandés pour les soins du jour.",
    completed: "effectué",
    todo: "à faire",
    progress: "Progression",
    validate: "Valider les soins du jour",
    doneButton: "Soins effectués",
    validated: "Soins du jour ajoutés à l’historique",
    validationImpossible: "Validation impossible",
    bathTitle: "Bain",
    bathDescription: "Préparation, lavage, rinçage et séchage en toute sécurité.",
    bathDoneButton: "Bain effectué",
    bathRecorded: "Bain ajouté à l’historique"
  },
  history: {
    title: "Historique",
    statisticsTitle: "Statistiques de {month}",
    temperatureAverage: "Température moyenne",
    feedingAverage: "Tétées",
    feedingDurationAverage: "Durée moyenne",
    feedingIntervalAverage: "Temps moyen entre deux tétées",
    bottleStatistics: "Biberons",
    bottleIntervalAverage: "Temps moyen entre deux biberons",
    averageQuantity: "Quantité moyenne",
    bottleCount: "Biberons enregistrés",
    stoolIntervalAverage: "Temps moyen entre deux selles",
    average: "Moyenne",
    minimum: "Min",
    maximum: "Max",
    leftBreast: "Sein gauche",
    rightBreast: "Sein droit",
    leftBreastDurationAverage: "Temps moyen",
    rightBreastDurationAverage: "Temps moyen",
    noMonthlyData: "Aucune donnée ce mois-ci",
    notEnoughStools: "Au moins deux selles sont nécessaires",
    matchingSingular: "événement correspondant aux filtres",
    matchingPlural: "événements correspondant aux filtres",
    exportExcel: "Exporter Excel",
    periods: {
      today: "Aujourd’hui",
      yesterday: "Hier",
      seven: "7 derniers jours",
      thirty: "30 derniers jours",
      all: "Tout"
    },
    allTypes: "Tous les types",
    searchPlaceholder: "Rechercher une observation…",
    unavailable: "Historique indisponible",
    loading: "Chargement de l’historique…",
    empty: "Aucun événement ne correspond à ces filtres."
  },
  medical: {
    title: "Suivi médical",
    description: "Évolution du poids et de la taille.",
    weightChart: "Courbe de poids",
    heightChart: "Courbe de taille",
    missingProfile: "Renseignez la date de naissance et le sexe dans les paramètres pour afficher les zones de référence OMS.",
    displayedPeriod: "Période affichée",
    sharedPeriod: "Le poids et la taille utilisent exactement la même période.",
    browseGrowth: "Parcourir les courbes de 0 à 5 ans",
    growthStart: "Début de la période des courbes",
    growthEnd: "Fin de la période des courbes",
    whoDisclaimer: "Ces zones sont des repères statistiques OMS et ne remplacent pas l’avis d’un professionnel de santé.",
    add: "Ajouter",
    addMeasurement: "Ajouter une mesure",
    measurementsHistory: "Historique des mesures",
    editHint: "Touchez une ligne pour modifier ou supprimer la mesure.",
    loading: "Chargement des mesures…",
    empty: "Aucune mesure enregistrée.",
    noPreviousMeasurement: "Aucune mesure précédente. Sélectionnez la première valeur.",
    lastMeasurement: "Dernière mesure : {value} {unit}, le {date}.",
    saveError: "Mesure impossible à enregistrer",
    unavailable: "Suivi médical indisponible"
  },
  chart: {
    emptyDescription: "Aucune mesure enregistrée.",
    emptyBody: "Le graphique apparaîtra après la première mesure.",
    measurementsInView: "{count} mesure{plural} dans cette vue de {months}",
    measurementsDisplayed: "{count} mesure{plural} affichée{plural}",
    evolution: "Évolution : {title}",
    whoZone: "Zone de référence OMS (−2 à +2 z)"
  },
  temperatureSparkline: {
    aria: "Évolution sur {count} mesure{plural}. Zone idéale de 36,5 à 37,5 °C.",
    title: "Évolution de la température avec zone idéale de 36,5 à 37,5 °C",
    legend: "Zone idéale 36,5–37,5 °C"
  },
  measurement: {
    decrease: "Diminuer {label}",
    increase: "Augmenter {label}",
    selector: "Sélecteur de {label}",
    directEntry: "Saisie directe de {label}",
    directEntryTitle: "Double-cliquer pour saisir la valeur",
    instructions: "Pas de {step} · maintenir +/− · double-clic pour saisir"
  },
  apiErrors: {
    invalid_accent_color: "Couleur d’accent invalide.",
    invalid_language_preference: "Préférence de langue invalide.",
    baby_name_too_long: "Le nom du bébé ne peut pas dépasser 80 caractères.",
    invalid_birth_date: "La date de naissance est invalide ou située dans le futur.",
    invalid_baby_sex: "Le sexe renseigné est invalide.",
    invalid_feeding_type: "Le type d’allaitement est invalide.",
    baby_not_found: "Bébé introuvable.",
    cannot_delete_last_baby: "Le dernier bébé ne peut pas être supprimé.",
    invalid_event_type: "Type d’événement invalide.",
    invalid_temperature: "La température doit être comprise entre 34 et 44 °C.",
    invalid_weight: "Le poids doit être compris entre 0,3 et 30 kg.",
    invalid_height: "La taille doit être comprise entre 20 et 200 cm.",
    invalid_bottle_quantity: "La quantité du biberon doit être comprise entre 1 et 1000 ml.",
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
    internal_error: "Une erreur interne est survenue."
  },
  dates: {
    yearSingular: "an",
    yearPlural: "ans",
    month: "mois",
    daySingular: "jour",
    dayPlural: "jours",
    today: "AUJOURD’HUI",
    yesterday: "HIER",
    now: "à l’instant",
    hourShort: "h",
    minuteShort: "min",
    secondShort: "s"
  }
}

type DeepString<T> = {
  [Key in keyof T]: T[Key] extends string ? string : DeepString<T[Key]>
}

export type Messages = DeepString<typeof fr>

const en: Messages = {
  common: {
    appUnavailable: "Unable to reach BabyCare.",
    cancel: "Cancel",
    delete: "Delete",
    save: "Save",
    none: "None",
    noValue: "—",
    optionalObservation: "Observation (optional)",
    observation: "Observation",
    actionImpossible: "Action unavailable"
  },
  loading: {
    appLabel: "Loading BabyCare",
    appText: "Loading the app…"
  },
  footer: {
    version: "version",
    support: "Thank me"
  },
  update: {
    title: "Update",
    description: "Install verified BabyCare releases without changing local data.",
    available: "BabyCare v{version} is available",
    current: "Current version: v{version}",
    install: "Install update",
    timerBlocked: "Stop the active timer before updating.",
    check: "Check for updates",
    noneAvailable: "No update available",
    availableAction: "Update available!",
    timerWaiting: "The update will be available when the running timer has ended",
    checkError: "Unable to check for updates.",
    rollback: "Return to version v{version}",
    rollbackFallback: "Return to the previous version",
    progressTitle: "Updating BabyCare",
    progressDescription: "The app tracks installation progress and restarts automatically.",
    progressLabel: "Update progress",
    downloadRange: "Download",
    installRange: "Installation",
    stepsLabel: "Update steps",
    downloadPhase: "Download the update",
    verifyPhase: "Verify its integrity",
    extractPhase: "Extract the files",
    installPhase: "Activate the new version",
    restartPhase: "Restart and check BabyCare",
    preparing: "Preparing update…",
    completeTitle: "Update complete",
    completeDescription: "The new version is ready. Connected devices will refresh.",
    errorTitle: "Update interrupted",
    errorDescription: "The previous version remains active or was restored automatically.",
    close: "Close",
    startError: "Unable to start the update."
  },
  tabs: {
    tracking: "Tracking",
    care: "Care",
    medical: "Medical",
    history: "History"
  },
  eventLabels: {
    temperature: "Temperature",
    weight: "Weight",
    height: "Height",
    diaper: "Diaper",
    breast_left: "Left breast",
    breast_right: "Right breast",
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
    other: "Other"
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
  },
  settings: {
    open: "Open settings",
    title: "BabyCare settings",
    description: "Manage the baby profile, language, and local data.",
    profileTitle: "Baby profile",
    profileDescription: "This information stays in the local database.",
    selectBaby: "Select a baby",
    unnamedBaby: "Unnamed baby",
    addBaby: "Add a baby",
    addBabyTitle: "New baby",
    addBabyDescription: "Create a profile with separate data and its own color.",
    babyColor: "Baby color",
    createBaby: "Add this baby",
    babyName: "Baby name",
    babyNamePlaceholder: "E.g. Emma",
    birthDate: "Birth date",
    birthDatePlaceholder: "mm/dd/yyyy",
    chooseBirthDate: "Choose birth date",
    chooseDate: "Choose {date}",
    previousMonth: "Previous month",
    nextMonth: "Next month",
    hiddenAge: "The age stays hidden while this field is empty.",
    sex: "Sex",
    sexOptions: {
      girl: "Girl",
      boy: "Boy"
    },
    sexHelp: "Required with the birth date to show WHO reference ranges.",
    feedingType: "Available feedings",
    feedingTypeOptions: {
      breast: "Breastfeeding",
      bottle: "Bottle feeding"
    },
    feedingTypeHelp: "Enable breastfeeding, bottle feeding, or both. At least one option remains active.",
    saveProfile: "Save profile",
    invalidBirthDate: "Use the mm/dd/yyyy format for the birth date.",
    futureBirthDate: "The birth date cannot be in the future.",
    profileSaved: "Baby profile saved",
    profileSaveError: "Unable to save the profile.",
    useBabyColor: "Choose {color} for this baby",
    languageTitle: "Language",
    languageDescription: "By default, BabyCare follows the browser language.",
    languageLabel: "Interface language",
    languageOptions: {
      system: "Browser language",
      fr: "Français",
      en: "English"
    },
    languageUpdated: "Language updated",
    screenAwakeTitle: "Keep screen awake",
    screenAwakeDescription: "This setting only applies to this device.",
    screenAwakeLabel: "Prevent sleep while a timer is running",
    screenAwakeHelp: "Uses the native screen wake lock when available.",
    screenAwakeFallbackLabel: "Use the video fallback",
    screenAwakeFallbackHelp: "For iOS 15 and HTTP connections. Plays a silent video while timers run and may increase battery usage. This choice stays on this device.",
    dangerTitle: "Danger zone",
    dangerDescription: "These actions permanently delete local data.",
    deleteBaby: "Delete baby {name}",
    deleteBabyTitle: "Delete {name}?",
    deleteBabyDescription: "The profile for {name}, its measurements, care entries, and full history will be permanently deleted.",
    deleteBabyConfirm: "Delete this baby",
    resetDatabase: "Reset the whole database",
    resetTitle: "Reset the whole database?",
    resetDescription: "All BabyCare information will be permanently deleted. This action cannot be undone.",
    resetConfirm: "Confirm reset",
    resetError: "Unable to reset the database.",
    bornOn: "Born on {date}"
  },
  tracking: {
    latestInfo: "Latest information",
    quickActions: "Quick actions",
    activeTimer: "Active timer",
    recentActivity: "Recent activity",
    feeding: "Feeding",
    bottle: "Bottle",
    diaper: "Diaper",
    bath: "Bath",
    feedingsTodaySingular: "feeding today",
    feedingsTodayPlural: "feedings today",
    bottlesTodaySingular: "bottle today",
    bottlesTodayPlural: "bottles today",
    sinceLastFeeding: "Since last feeding: {duration}",
    sinceLastBottle: "Since last bottle: {duration}",
    firstActions: "The first actions will appear here.",
    activityLoading: "Loading activity…",
    stoolAlertLabel: "Bowel movement alert",
    stoolMissingTitle: "Bowel movement tracking needed",
    noStoolSince: "No stool for {hours} h",
    lastStool: "Last stool recorded {relative}.",
    noStoolRecorded: "No stool has been recorded yet.",
    stoolThreshold: "The monitoring threshold is set to {hours} hours.",
    dailyCareAlertLabel: "Care alert",
    dailyCareOverdueTitle: "Face and cord care due",
    lastDailyCare: "Last care recorded {relative}.",
    noDailyCareRecorded: "No face and cord care has been recorded yet.",
    dailyCareThreshold: "The monitoring threshold is set to 24 hours.",
    dailyCareDoneButton: "Face/Cord care completed"
  },
  widget: {
    title: "Widget",
    noBaby: "Set up a baby",
    profileHint: "Add a birth date in the main app.",
    sync: "Sync",
    activeTimer: "Active timer",
    latestFeeding: "Latest feeding",
    latestBottle: "Latest bottle",
    latestTemperature: "Temperature",
    latestDiaper: "Diaper",
    stool: "Stool",
    dailyCare: "Daily care",
    completedCare: "{count}/{total} done",
    pendingCare: "Still pending",
    recentEvents: "Recent",
    noRecentEvents: "No recent events",
    startedAt: "Started at {time}",
    noData: "No data yet",
    monitoringOk: "OK",
    overdue: "Alert"
  },
  actions: {
    faceCord: "Face / Cord",
    careBath: "Face/Cord care - Bath",
    addObservation: "Add an observation",
    leftBreast: "Left Breast",
    rightBreast: "Right Breast",
    bottleDescription: "Enter the amount consumed without starting a timer.",
    bottleQuantity: "Bottle quantity",
    both: "Both",
    temperatureDescription: "Select the measured value.",
    irritationDescription: "Select one or more areas, then add an observation.",
    vitaminDescription: "Select one or more administered vitamins, then add an observation.",
    freeObservationDescription: "Save a free-form note in the history.",
    observationPlaceholder: "Your observation…",
    started: "{label} started",
    recorded: "{label} recorded",
    faceCare: "Face care",
    cordCare: "Cord care",
    faceCordCare: "Face and cord care",
    clothesChanged: "Clothes changed"
  },
  activeTimer: {
    running: "Running",
    addObservation: "Add an observation",
    stop: "Stop",
    switchBreast: "Switch breast",
    switchedTo: "Switched to {label}"
  },
  eventEditor: {
    description: "Edit the saved information.",
    dateTime: "Date and time",
    temperature: "Temperature (°C)",
    weight: "Weight (kg)",
    height: "Height (cm)",
    bottleQuantity: "Quantity (ml)",
    duration: "Duration",
    hours: "Hours",
    minutes: "Minutes",
    seconds: "Seconds",
    diaperType: "Diaper type",
    locations: "Areas",
    vitamins: "Vitamins",
    updated: "Event updated",
    deleteTitle: "Delete this event?",
    deleteDescription: "This action is permanent and will remove the entry from the history.",
    deleted: "Event deleted"
  },
  care: {
    title: "Daily care",
    description: "Recommended preparation and care steps for today.",
    completed: "done",
    todo: "to do",
    progress: "Progress",
    validate: "Validate today’s care",
    doneButton: "Care completed",
    validated: "Today’s care added to history",
    validationImpossible: "Validation unavailable",
    bathTitle: "Bath",
    bathDescription: "Preparation, washing, rinsing, and safe drying.",
    bathDoneButton: "Bath completed",
    bathRecorded: "Bath added to history"
  },
  history: {
    title: "History",
    statisticsTitle: "Statistics for {month}",
    temperatureAverage: "Average temperature",
    feedingAverage: "Feedings",
    feedingDurationAverage: "Average duration",
    feedingIntervalAverage: "Average time between feedings",
    bottleStatistics: "Bottles",
    bottleIntervalAverage: "Average time between bottles",
    averageQuantity: "Average quantity",
    bottleCount: "Bottles recorded",
    stoolIntervalAverage: "Average time between stools",
    average: "Average",
    minimum: "Min",
    maximum: "Max",
    leftBreast: "Left breast",
    rightBreast: "Right breast",
    leftBreastDurationAverage: "Average time",
    rightBreastDurationAverage: "Average time",
    noMonthlyData: "No data this month",
    notEnoughStools: "At least two stools are needed",
    matchingSingular: "event matching the filters",
    matchingPlural: "events matching the filters",
    exportExcel: "Export Excel",
    periods: {
      today: "Today",
      yesterday: "Yesterday",
      seven: "Last 7 days",
      thirty: "Last 30 days",
      all: "All"
    },
    allTypes: "All types",
    searchPlaceholder: "Search observations…",
    unavailable: "History unavailable",
    loading: "Loading history…",
    empty: "No event matches these filters."
  },
  medical: {
    title: "Medical tracking",
    description: "Weight and height trends.",
    weightChart: "Weight curve",
    heightChart: "Height curve",
    missingProfile: "Enter the birth date and sex in settings to show WHO reference ranges.",
    displayedPeriod: "Displayed period",
    sharedPeriod: "Weight and height use exactly the same period.",
    browseGrowth: "Browse the curves from 0 to 5 years",
    growthStart: "Growth curve period start",
    growthEnd: "Growth curve period end",
    whoDisclaimer: "These ranges are WHO statistical references and do not replace medical advice.",
    add: "Add",
    addMeasurement: "Add a measurement",
    measurementsHistory: "Measurement history",
    editHint: "Tap a row to edit or delete the measurement.",
    loading: "Loading measurements…",
    empty: "No measurement recorded.",
    noPreviousMeasurement: "No previous measurement. Select the first value.",
    lastMeasurement: "Last measurement: {value} {unit}, on {date}.",
    saveError: "Unable to save measurement",
    unavailable: "Medical tracking unavailable"
  },
  chart: {
    emptyDescription: "No measurement recorded.",
    emptyBody: "The chart will appear after the first measurement.",
    measurementsInView: "{count} measurement{plural} in this {months} view",
    measurementsDisplayed: "{count} measurement{plural} displayed",
    evolution: "Trend: {title}",
    whoZone: "WHO reference range (-2 to +2 z)"
  },
  temperatureSparkline: {
    aria: "Trend over {count} measurement{plural}. Ideal range from 36.5 to 37.5 °C.",
    title: "Temperature trend with ideal range from 36.5 to 37.5 °C",
    legend: "Ideal range 36.5-37.5 °C"
  },
  measurement: {
    decrease: "Decrease {label}",
    increase: "Increase {label}",
    selector: "{label} selector",
    directEntry: "Direct {label} entry",
    directEntryTitle: "Double-click to enter the value",
    instructions: "{step} step · hold +/− · double-click to type"
  },
  apiErrors: {
    invalid_accent_color: "Invalid accent color.",
    invalid_language_preference: "Invalid language preference.",
    baby_name_too_long: "The baby name cannot exceed 80 characters.",
    invalid_birth_date: "The birth date is invalid or in the future.",
    invalid_baby_sex: "The selected sex is invalid.",
    invalid_feeding_type: "The selected feeding type is invalid.",
    baby_not_found: "Baby not found.",
    cannot_delete_last_baby: "The last baby cannot be deleted.",
    invalid_event_type: "Invalid event type.",
    invalid_temperature: "Temperature must be between 34 and 44 °C.",
    invalid_weight: "Weight must be between 0.3 and 30 kg.",
    invalid_height: "Height must be between 20 and 200 cm.",
    invalid_bottle_quantity: "Bottle quantity must be between 1 and 1000 ml.",
    invalid_duration: "Duration must be a positive number.",
    not_timer_event: "This action cannot be timed.",
    event_not_found: "Event not found.",
    timer_already_completed: "This timer is already finished.",
    incomplete_daily_care: "Finish the checklist before validating care.",
    invalid_daily_care: "Invalid daily care item.",
    bath_session_not_found: "Bath session not found.",
    bath_item_not_found: "Bath item not found.",
    update_not_configured: "Updates from the interface are not configured on this installation.",
    update_timer_running: "Stop all timers before starting an update.",
    update_already_running: "An update is already running.",
    no_update_available: "No new version is available.",
    unsupported_release: "This release is unavailable for the server architecture.",
    rollback_unavailable: "No previous version is available for rollback.",
    internal_error: "An internal error occurred."
  },
  dates: {
    yearSingular: "year",
    yearPlural: "years",
    month: "month",
    daySingular: "day",
    dayPlural: "days",
    today: "TODAY",
    yesterday: "YESTERDAY",
    now: "just now",
    hourShort: "h",
    minuteShort: "min",
    secondShort: "s"
  }
}

export const messages: Record<SupportedLocale, Messages> = { fr, en }

interface I18nContextValue {
  locale: SupportedLocale
  localeTag: string
  languagePreference: LanguagePreference
  t: Messages
}

const defaultLocale = "fr" satisfies SupportedLocale
const I18nContext = createContext<I18nContextValue>({
  locale: defaultLocale,
  localeTag: localeTags[defaultLocale],
  languagePreference: "system",
  t: messages[defaultLocale]
})

export function resolveLocale(preference: LanguagePreference, languages?: readonly string[]): SupportedLocale {
  if (preference !== "system") return preference

  const browserLanguages = languages
    ?? (typeof navigator === "undefined" ? [] : navigator.languages.length ? navigator.languages : [navigator.language])

  for (const language of browserLanguages) {
    const locale = language.toLowerCase().split("-")[0]
    if (SUPPORTED_LOCALES.includes(locale as SupportedLocale)) return locale as SupportedLocale
  }

  return defaultLocale
}

export function getLocaleTag(locale: SupportedLocale) {
  return localeTags[locale]
}

export function interpolate(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (message, [key, value]) => message.split(`{${key}}`).join(String(value)),
    template
  )
}

export function localizedErrorMessage(error: unknown, t: Messages, fallback: string) {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") {
    return t.apiErrors[error.code as keyof typeof t.apiErrors] || fallback
  }
  return error instanceof Error ? error.message : fallback
}

export function I18nProvider({ preference, children }: { preference: LanguagePreference, children: ReactNode }) {
  const locale = resolveLocale(preference)
  const value = useMemo<I18nContextValue>(() => ({
    locale,
    localeTag: localeTags[locale],
    languagePreference: preference,
    t: messages[locale]
  }), [locale, preference])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  return useContext(I18nContext)
}
