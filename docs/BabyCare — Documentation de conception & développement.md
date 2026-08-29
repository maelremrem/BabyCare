# BabyCare — Documentation de conception & développement

## 1. Objectif

**BabyCare** est une application web locale destinée principalement à une tablette permettant de suivre rapidement les soins quotidiens d’un bébé.

Objectifs principaux :

- enregistrer une action en quelques secondes ;
- mesurer automatiquement la durée de certains soins ;
- ajouter des observations à toutes les actions ;
- modifier ou supprimer une entrée ;
- suivre les soins quotidiens via des checklists ;
- consulter l’historique complet ;
- exporter les données au format Excel ;
- fonctionner entièrement sur le réseau local ;
- être simple à déployer dans un LXC.

Aucune authentification n’est prévue pour le MVP.

---

# 2. Architecture générale

```text
┌─────────────────────────────┐
│         Tablette            │
│                             │
│        BabyCare PWA         │
│                             │
│ React + shadcn/ui           │
└──────────────┬──────────────┘
               │
               │ REST / LAN
               ▼
┌─────────────────────────────┐
│         Debian LXC          │
│                             │
│ Node.js + Express           │
│                             │
│ API REST                    │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│           SQLite            │
│                             │
│      babycare.db            │
└─────────────────────────────┘
```

---

# 3. Stack technique

## Frontend

Utiliser :

```text
React
Vite
TypeScript
Tailwind CSS
shadcn/ui
Lucide Icons
```

ShadCN doit être utilisé comme base principale des composants UI.

Composants particulièrement utiles :

```text
Button
Card
Tabs
Dialog
Drawer
Popover
DropdownMenu
ScrollArea
Table
Input
Textarea
Badge
Separator
Sheet
Tooltip
AlertDialog
Checkbox
Command
```

L’interface reste personnalisée pour obtenir le design spécifique BabyCare.

---

## Backend

```text
Node.js
Express
better-sqlite3
```

Pour l’export Excel :

```text
ExcelJS
```

---

## Base de données

```text
SQLite
```

Fichier :

```text
/opt/babycare/data/babycare.db
```

---

# 4. Direction artistique

Style :

```text
Apple-inspired
Minimaliste
Noir / blanc
Accent orange
```

Palette :

```css
--background: #000000;
--surface: #111111;
--surface-secondary: #1C1C1E;
--border: #2C2C2E;

--foreground: #FFFFFF;
--muted: #8E8E93;

--accent: #FF7A00;
```

Les composants ShadCN sont adaptés via les variables CSS du thème.

L’orange est réservé à :

- action active ;
- chrono en cours ;
- élément sélectionné ;
- CTA principal ;
- informations nécessitant une attention visuelle.

---

# 5. Navigation

L’application possède désormais **trois onglets principaux** :

```text
SUIVI
SOINS
HISTORIQUE
```

Navigation ShadCN :

```text
Tabs
```

Sur tablette :

```text
┌──────────────────────────────────────────────────────┐
│ BabyCare        Samedi 29 août 2026        14:32:17 │
│                                                      │
│      SUIVI            SOINS          HISTORIQUE      │
└──────────────────────────────────────────────────────┘
```

La topbar reste fixe.

---

# 6. Topbar

Afficher en permanence :

- nom de l’application ;
- date actuelle ;
- heure avec secondes.

Exemple :

```text
BabyCare        Samedi 29 août 2026        14:32:17
```

L’heure est mise à jour localement chaque seconde.

Aucune requête backend n’est nécessaire.

---

# 7. Onglet Suivi

Structure :

```text
TOPBAR

DERNIÈRES INFORMATIONS

ACTIONS RAPIDES

CHRONO ACTIF éventuel

ACTIVITÉ RÉCENTE
```

---

# 8. Dernières informations

Afficher sous forme de `Card` ShadCN :

```text
DERNIÈRES INFORMATIONS

Tétée                 Couche               Bain
Sein droit             Mixte                09:05
18 min                 il y a 21 min        il y a 5 h
```

On pourra également afficher :

```text
Dernière température
Dernier soin Visage/Cordon
```

---

# 9. Actions principales

Grille tablette :

```text
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ TEMPÉRATURE  │ │    COUCHE    │ │     BAIN     │
└──────────────┘ └──────────────┘ └──────────────┘

┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│    SEIN G    │ │    SEIN D    │ │VISAGE/CORDON │
└──────────────┘ └──────────────┘ └──────────────┘

┌──────────────┐ ┌──────────────┐
│  VÊTEMENTS   │ │  IRRITATION  │
└──────────────┘ └──────────────┘
```

---

# 10. Actions et observations

Toutes les actions peuvent contenir :

```text
Date
Heure de début
Heure de fin
Durée
Valeur
Type
Observation
Métadonnées spécifiques
```

Chaque événement peut être :

- consulté ;
- modifié ;
- supprimé.

---

# 11. Chronomètres

Les actions chronométrables affichent immédiatement un chrono important.

Exemple :

```text
SEIN DROIT

        08:42

      ● EN COURS

[ TERMINER ]

+ Ajouter une observation
```

Format :

```text
MM:SS
```

Puis :

```text
HH:MM:SS
```

si nécessaire.

---

# 12. Fonctionnement du chrono

Lors du démarrage :

```text
POST /api/events/start
```

Le backend crée :

```text
status = running
started_at = maintenant
```

Le navigateur calcule ensuite l’affichage du chrono localement.

Aucune requête n’est envoyée chaque seconde.

À la fin :

```text
POST /api/events/:id/stop
```

Le serveur calcule :

```text
ended_at
duration_seconds
status = completed
```

---

# 13. Persistance des chronos

Les chronos actifs doivent survivre :

- au rafraîchissement ;
- à la fermeture de l’application ;
- à une reconnexion ;
- à un changement d’onglet.

Au démarrage :

```text
GET /api/events/running
```

Le frontend reconstruit les chronomètres.

---

# 14. Tétées

Les boutons :

```text
SEIN GAUCHE
SEIN DROIT
```

lancent directement le chrono.

Exemple :

```text
Sein droit

Début
14:32:04

Fin
14:50:19

Durée
18 min 15 s

Observation
A bien mangé.
```

Prévoir également :

```text
PASSER AU SEIN GAUCHE
PASSER AU SEIN DROIT
```

Cette action :

1. termine le chrono actuel ;
2. démarre immédiatement celui de l’autre sein.

---

# 15. Action Couche

Il existe un seul bouton :

```text
COUCHE
```

Un clic ouvre un `Popover` ShadCN directement au-dessus.

```text
      ┌───────────────────┐
      │      URINE        │
      │      SELLES       │
      │      MIXTE        │
      └───────────────────┘
              ▲
      ┌───────────────────┐
      │      COUCHE       │
      └───────────────────┘
```

Choix :

```text
Urine
Selles
Mixte
```

La sélection enregistre immédiatement l’événement.

---

# 16. Édition d’une couche

En ouvrant l’événement :

```text
COUCHE

29 août 2026 — 14:11

Type

○ Urine
○ Selles
● Mixte

Observation

[                              ]

[ SUPPRIMER ]      [ ENREGISTRER ]
```

---

# 17. Température

Le bouton température ouvre un `Dialog` ou `Drawer`.

L’élément principal n’est pas un simple champ numérique mais un **sélecteur glissable vertical**.

Valeur initiale :

```text
37.0 °C
```

Exemple :

```text
TEMPÉRATURE


       36.8
       36.9

     ─ 37.0 °C ─

       37.1
       37.2


[ ENREGISTRER ]
```

Le contrôle doit fonctionner au :

- swipe ;
- scroll ;
- drag tactile.

Pas :

```text
0.1 °C
```

Plage proposée :

```text
34.0 °C → 42.0 °C
```

Valeur sélectionnée au lancement :

```text
37.0 °C
```

Le chiffre actif est :

- plus grand ;
- blanc ;
- centré.

Les valeurs voisines sont grisées.

L’orange peut être utilisé comme repère central.

---

# 18. Observation température

Sous le sélecteur :

```text
Observation

[                                    ]
```

Puis :

```text
ENREGISTRER
```

---

# 19. Visage / Cordon

L’ancien bouton :

```text
VISAGE
```

devient :

```text
VISAGE / CORDON
```

Un `Popover` permet de choisir :

```text
VISAGE
CORDON
```

Exemple :

```text
      ┌───────────────────┐
      │      VISAGE       │
      │      CORDON       │
      └───────────────────┘
              ▲
      ┌───────────────────┐
      │ VISAGE / CORDON   │
      └───────────────────┘
```

La sélection lance le chrono correspondant.

Types :

```text
face_care
cord_care
```

Les deux acceptent une observation.

---

# 20. Irritation

Le bouton ouvre un `Dialog`.

Zones proposées :

```text
Visage
Cou
Torse
Dos
Bras
Jambes
Fesses
Autre
```

Puis :

```text
Observation
```

Exemple stockage :

```json
{
  "type": "irritation",
  "metadata": {
    "location": "fesses"
  },
  "notes": "Rougeur légère"
}
```

---

# 21. Activité récente

La page Suivi ne montre qu’une partie de l’historique.

Exemple :

```text
ACTIVITÉ RÉCENTE

14:32
Sein droit
18 min 15 s

14:11
Couche · Mixte

12:47
Température · 37.1 °C


HIER — 28 AOÛT

23:48
Sein gauche · 12 min

22:17
Couche · Urine
```

---

# 22. Gestion des jours

Aujourd’hui :

```text
14:32
```

Hier :

```text
Hier · 23:48
```

Plus ancien :

```text
27 août · 18:04
```

Dans les listes :

```text
AUJOURD’HUI — 29 AOÛT
```

puis :

```text
HIER — 28 AOÛT
```

puis :

```text
JEUDI 27 AOÛT
```

---

# 23. Nouvel onglet Historique

Le troisième onglet :

```text
HISTORIQUE
```

permet de consulter **l’intégralité des événements enregistrés**.

Contrairement à la page Suivi, aucune limite fonctionnelle n’est appliquée aux anciennes données.

---

# 24. Interface Historique

Exemple :

```text
HISTORIQUE

[ Aujourd’hui ▼ ] [ Tous les types ▼ ] [ 🔎 Recherche ]

                         [ EXPORTER EXCEL ]


29 AOÛT 2026

14:32   Sein droit        18 min 15 s
14:11   Couche            Mixte
12:47   Température       37.1 °C
11:20   Sein gauche       14 min


28 AOÛT 2026

23:48   Sein gauche       12 min
22:17   Couche            Urine
```

---

# 25. Filtres de l’historique

Prévoir les filtres suivants :

### Date

```text
Aujourd’hui
Hier
7 derniers jours
30 derniers jours
Tout
Intervalle personnalisé
```

### Type

```text
Tous
Température
Couche
Sein gauche
Sein droit
Bain
Visage
Cordon
Vêtements
Irritations
```

### Recherche texte

Recherche dans :

```text
observations
valeurs
type
```

---

# 26. Navigation historique

Utiliser :

```text
ScrollArea
```

L’historique peut être chargé par pages.

Exemple :

```text
GET /api/events?limit=100&offset=0
```

Puis :

```text
offset=100
```

Cela évite d’envoyer plusieurs années de données au navigateur d’un coup.

---

# 27. Modification depuis l’historique

Un clic sur n’importe quelle ligne ouvre :

```text
Sheet
```

ou :

```text
Dialog
```

contenant toutes les données de l’événement.

Exemple :

```text
SEIN DROIT

Date
29/08/2026

Début
14:32:04

Fin
14:50:19

Durée
18 min 15 s

Observation
[ A bien mangé ]

[ SUPPRIMER ]     [ ENREGISTRER ]
```

---

# 28. Export Excel

Dans l’onglet Historique :

```text
EXPORTER EXCEL
```

Le bouton exporte les événements correspondant aux filtres actuellement sélectionnés.

Exemples :

```text
Tout l’historique
7 derniers jours
Seulement les températures
Intervalle personnalisé
```

---

# 29. Format Excel

Nom :

```text
BabyCare_2026-08-29.xlsx
```

Ou pour une période :

```text
BabyCare_2026-08-01_2026-08-29.xlsx
```

---

# 30. Colonnes Excel

Feuille :

```text
Historique
```

Colonnes :

| Date | Heure début | Heure fin | Durée | Type | Valeur | Détail | Observation |
|---|---|---|---|---|---|---|---|

Exemple :

| Date | Début | Fin | Durée | Type | Valeur | Détail | Observation |
|---|---|---|---|---|---|---|---|
| 29/08/2026 | 14:32 | 14:50 | 18:15 | Sein droit | | | A bien mangé |
| 29/08/2026 | 14:11 | | | Couche | | Mixte | |
| 29/08/2026 | 12:47 | | | Température | 37.1 °C | | |

---

# 31. API export Excel

Endpoint :

```text
GET /api/export/xlsx
```

Filtres possibles :

```text
from
to
type
```

Exemple conceptuel :

```text
/api/export/xlsx?from=2026-08-01&to=2026-08-29
```

Réponse :

```text
application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
```

La génération est faite côté serveur avec ExcelJS.

---

# 32. Onglet Soins

Contient deux cartes principales :

```text
SOINS QUOTIDIENS

BAIN
```

---

# 33. Checklist quotidienne

Checklist initiale :

```text
Yeux
Nez
Cordon
Visage
```

Exemple :

```text
SOINS QUOTIDIENS

☑ Yeux
☑ Nez
☐ Cordon
☐ Visage

2 / 4 effectués
```

La checklist est associée au jour courant.

---

# 34. Rétention des checklists

Les checklists sont considérées comme des données temporaires.

Il n’est pas nécessaire de conserver leur historique à long terme.

Règle :

```text
Conservation maximale : 7 jours
```

Les entrées plus anciennes sont automatiquement supprimées.

---

# 35. Nettoyage automatique

Au démarrage du serveur :

```sql
DELETE FROM daily_care
WHERE date < date('now', '-7 days');
```

Le même nettoyage est ensuite lancé périodiquement.

Par exemple une fois par jour.

Aucun bouton utilisateur n’est nécessaire.

---

# 36. Checklist des bains

Les détails de checklist associés aux bains sont également temporaires.

Conservation :

```text
7 jours maximum
```

Les événements principaux :

```text
bath
```

restent en revanche conservés indéfiniment dans l’historique.

Ainsi :

```text
Bain du 20 août
Durée : 14 minutes
Observation : ...
```

reste disponible.

Mais les éléments :

```text
✓ Serviette préparée
✓ Température vérifiée
✓ Sécher les plis
```

peuvent disparaître au bout d’une semaine.

---

# 37. Principe de conservation

### Conservé sans limite

```text
events
```

Donc :

- températures ;
- couches ;
- tétées ;
- bains ;
- soins ;
- irritations ;
- observations.

### Conservé maximum 7 jours

```text
daily_care
bath_checks
```

Les checklists sont uniquement des aides opérationnelles.

---

# 38. Base SQLite — événements

```sql
CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed',

    started_at TEXT NOT NULL,
    ended_at TEXT,

    duration_seconds INTEGER,

    value_real REAL,
    value_text TEXT,

    notes TEXT,
    metadata TEXT,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

---

# 39. Types d’événements

```text
temperature
diaper
breast_left
breast_right
bath
face_care
cord_care
clothes_change
irritation
eye_care
nose_care
```

---

# 40. Table checklist quotidienne

```sql
CREATE TABLE daily_care (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    date TEXT NOT NULL,
    care_type TEXT NOT NULL,

    completed INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,

    UNIQUE(date, care_type)
);
```

---

# 41. Sessions bain

```sql
CREATE TABLE bath_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    started_at TEXT NOT NULL,
    completed_at TEXT
);
```

---

# 42. Checklist bain

```sql
CREATE TABLE bath_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    bath_session_id INTEGER NOT NULL,
    item TEXT NOT NULL,

    completed INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,

    FOREIGN KEY(bath_session_id)
        REFERENCES bath_sessions(id)
        ON DELETE CASCADE
);
```

---

# 43. Index

```sql
CREATE INDEX idx_events_started_at
ON events(started_at DESC);

CREATE INDEX idx_events_type
ON events(type);

CREATE INDEX idx_events_status
ON events(status);
```

---

# 44. API

Base :

```text
/api
```

### Historique

```text
GET /api/events
```

### Créer événement instantané

```text
POST /api/events
```

### Démarrer chrono

```text
POST /api/events/start
```

### Arrêter

```text
POST /api/events/:id/stop
```

### Chronos actifs

```text
GET /api/events/running
```

### Modifier

```text
PATCH /api/events/:id
```

### Supprimer

```text
DELETE /api/events/:id
```

### Export Excel

```text
GET /api/export/xlsx
```

### Checklist quotidienne

```text
GET /api/routines/daily
PUT /api/routines/daily/:careType
```

### Bain

```text
POST /api/baths
GET /api/baths/:id
PUT /api/baths/:bathId/items/:itemId
```

---

# 45. Organisation du projet

```text
babycare/
│
├── package.json
├── package-lock.json
│
├── vite.config.ts
│
├── tsconfig.json
│
├── components.json
│
│
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   │
│   ├── components/
│   │   ├── ui/
│   │   │   └── composants shadcn
│   │   │
│   │   ├── TopBar.tsx
│   │   ├── ActionGrid.tsx
│   │   ├── ActionButton.tsx
│   │   ├── ActiveTimer.tsx
│   │   ├── RecentActivity.tsx
│   │   ├── TemperaturePicker.tsx
│   │   ├── DiaperPopover.tsx
│   │   ├── CarePopover.tsx
│   │   └── EventEditor.tsx
│   │
│   ├── pages/
│   │   ├── TrackingPage.tsx
│   │   ├── CarePage.tsx
│   │   └── HistoryPage.tsx
│   │
│   ├── hooks/
│   │   ├── useClock.ts
│   │   ├── useTimer.ts
│   │   └── useEvents.ts
│   │
│   └── lib/
│       ├── api.ts
│       ├── dates.ts
│       └── utils.ts
│
├── server/
│   ├── app.js
│   ├── database.js
│   │
│   ├── routes/
│   │   ├── events.js
│   │   ├── routines.js
│   │   ├── baths.js
│   │   └── export.js
│   │
│   ├── services/
│   │   ├── eventService.js
│   │   ├── routineService.js
│   │   └── exportService.js
│   │
│   └── db/
│       └── migrations/
│
├── data/
│   └── babycare.db
│
├── scripts/
│   ├── install.sh
│   └── backup.sh
│
└── README.md
```

---

# 46. Responsive

### Tablette paysage

```text
3 colonnes actions
```

### Tablette portrait

```text
2 ou 3 colonnes
```

### Téléphone

```text
2 colonnes
```

Le design doit rester `touch-first`.

---

# 47. Composants tactiles

Hauteur minimale :

```text
64 px
```

Cible idéale :

```text
76–90 px
```

Rayon :

```text
18–24 px
```

Feedback :

```text
scale(0.97)
```

sur `pointerdown`.

---

# 48. Toasts

Utiliser le système de notification ShadCN/Sonner.

Exemple :

```text
✓ Couche mixte enregistrée

ANNULER
```

Ou :

```text
✓ Sein droit
18 min 15 s
```

---

# 49. Déploiement LXC

Configuration :

```text
Debian 13
1 vCPU
512 Mo RAM
4 Go disque
```

Installation :

```text
/opt/babycare
```

Base :

```text
/opt/babycare/data/babycare.db
```

---

# 50. Build frontend

En production :

```text
npm run build
```

Vite produit :

```text
dist/
```

Express sert directement les fichiers statiques de `dist`.

Il n’est donc nécessaire de lancer qu’un seul service Node.js.

---

# 51. systemd

```ini
[Unit]
Description=BabyCare
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/babycare
ExecStart=/usr/bin/node server/app.js
Restart=always
RestartSec=3

Environment=NODE_ENV=production
Environment=PORT=3000
Environment=DATABASE_PATH=/opt/babycare/data/babycare.db

[Install]
WantedBy=multi-user.target
```

---

# 52. Installation automatisée

`install.sh` :

```text
1. Vérification root
2. Installation Node.js
3. Création /opt/babycare
4. Installation des fichiers
5. npm ci
6. npm run build
7. Création data/
8. Création SQLite
9. Migrations
10. Nettoyage initial des checklists > 7 jours
11. Installation systemd
12. Activation du service
13. Démarrage BabyCare
```

---

# 53. Sauvegardes

Sauvegarder :

```text
babycare.db
```

Exemple :

```text
babycare-2026-08-29.db
```

Les événements constituent les données importantes à conserver.

---

# 54. PWA

BabyCare doit pouvoir être ajoutée à l’écran d’accueil.

```json
{
  "name": "BabyCare",
  "short_name": "BabyCare",
  "display": "standalone"
}
```

L’objectif sur tablette est d’avoir une expérience proche d’une application native.

---

# 55. Interface principale cible

```text
BabyCare                 Samedi 29 août 2026        14:32:17


       SUIVI             SOINS            HISTORIQUE


DERNIÈRES INFORMATIONS

 Tétée                Couche                Bain
 Sein D               Mixte                 09:05
 18 min                il y a 21 min         il y a 5 h


ACTIONS

┌────────────┐ ┌────────────┐ ┌────────────┐
│TEMPÉRATURE │ │   COUCHE   │ │    BAIN    │
└────────────┘ └────────────┘ └────────────┘

┌────────────┐ ┌────────────┐ ┌────────────┐
│   SEIN G   │ │   SEIN D   │ │  VISAGE /  │
│            │ │            │ │   CORDON   │
└────────────┘ └────────────┘ └────────────┘

┌────────────┐ ┌────────────┐
│ VÊTEMENTS  │ │ IRRITATION │
└────────────┘ └────────────┘


ACTIVITÉ RÉCENTE

14:32   Sein droit      18 min 15 s
14:11   Couche          Mixte
12:47   Température     37.1 °C


HIER — 28 AOÛT

23:48   Sein gauche     12 min 04 s
22:17   Couche          Urine
```

---

# 56. Critères MVP

## Interface

- [ ] React ;
- [ ] TypeScript ;
- [ ] Tailwind ;
- [ ] shadcn/ui ;
- [ ] design noir/blanc ;
- [ ] accent orange ;
- [ ] responsive tablette ;
- [ ] topbar avec date ;
- [ ] horloge HH:MM:SS.

## Navigation

- [ ] Suivi ;
- [ ] Soins ;
- [ ] Historique.

## Tétée

- [ ] Sein gauche ;
- [ ] Sein droit ;
- [ ] chrono ;
- [ ] persistance du chrono ;
- [ ] changement rapide de sein ;
- [ ] observations ;
- [ ] édition.

## Couche

- [ ] Popover ShadCN ;
- [ ] Urine ;
- [ ] Selles ;
- [ ] Mixte ;
- [ ] observations ;
- [ ] édition.

## Température

- [ ] valeur initiale 37.0 °C ;
- [ ] sélecteur scrollable ;
- [ ] swipe tactile ;
- [ ] pas de 0.1 °C ;
- [ ] observation ;
- [ ] édition.

## Visage / Cordon

- [ ] bouton commun ;
- [ ] popover ;
- [ ] Visage ;
- [ ] Cordon ;
- [ ] chrono ;
- [ ] observations.

## Historique

- [ ] tous les événements ;
- [ ] groupement par date ;
- [ ] mention Hier ;
- [ ] filtre période ;
- [ ] filtre type ;
- [ ] recherche ;
- [ ] modification ;
- [ ] suppression ;
- [ ] pagination ;
- [ ] export Excel.

## Checklists

- [ ] soins quotidiens ;
- [ ] bain ;
- [ ] SQLite ;
- [ ] rétention maximale 7 jours ;
- [ ] purge automatique.

## Backend

- [ ] Express ;
- [ ] SQLite ;
- [ ] migrations ;
- [ ] ExcelJS ;
- [ ] REST API.

## Déploiement

- [ ] Debian LXC ;
- [ ] `install.sh` ;
- [ ] build Vite ;
- [ ] systemd ;
- [ ] sauvegarde SQLite ;
- [ ] redémarrage automatique.

---

# 57. Choix techniques finaux

| Élément | Choix |
|---|---|
| Application | BabyCare |
| Frontend | React + TypeScript |
| Bundler | Vite |
| UI | shadcn/ui |
| CSS | Tailwind CSS |
| Icônes | Lucide |
| Backend | Node.js + Express |
| Base | SQLite |
| Excel | ExcelJS |
| Authentification | Aucune |
| Hébergement | Debian LXC |
| Navigation | Suivi / Soins / Historique |
| Tétées | Chronométrées |
| Couche | Urine / Selles / Mixte |
| Température | Picker scrollable, défaut 37.0 °C |
| Visage/Cordon | Action combinée + choix |
| Observations | Toutes les actions |
| Édition | Toutes les actions |
| Historique événements | Conservation permanente |
| Checklists | Conservation 7 jours |
| Export | `.xlsx` |
| PWA | Oui |
| Service | systemd |

Le principe central reste : **les actions fréquentes doivent demander le minimum d’interactions**, tandis que les détails, observations, modifications et historiques restent disponibles lorsqu’on en a besoin.