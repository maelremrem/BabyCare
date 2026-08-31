# BabyCare

**English** | [Français](#français)

BabyCare is a local-first, touch-friendly and installable web app for quickly recording a baby's daily care: feedings, diapers, temperature, bath steps, face and cord care, clothing changes, irritations, observations, weight and height.

Demo: [maelremrem.github.io/BabyCare](https://maelremrem.github.io/BabyCare/)

The public demo runs entirely in the browser. It uses sample data and stores changes in `localStorage`, so it does not need a database or server. The self-hosted/local version uses SQLite through the Express API.

If BabyCare helps you and you want to support the project: [ko-fi.com/maelremrem](https://ko-fi.com/maelremrem).

## Audience

BabyCare is designed for parents and caregivers sharing baby care inside the same household.

- main device: touch tablet in portrait or landscape mode;
- additional devices: phone or computer;
- network: private home network;
- recommended hosting: lightweight Debian LXC container;
- storage: local SQLite file;
- access: no user account in the MVP.

> [!IMPORTANT]
> BabyCare contains private family and health-adjacent information and does not include authentication yet. Do not expose it directly to the Internet. Keep it on your local network or put an authentication layer in front of it.

## Features

- quick actions for frequent care events;
- local baby profile with name, birth date, sex and accent color;
- multiple baby profiles;
- second-accurate top bar clock;
- persistent timers for feedings and timed care;
- daily feeding count;
- automatic stool alert after 48 hours without a stool diaper;
- recent temperature chart with the 36.5-37.5 °C reference zone;
- medical tracking for weight and height;
- WHO weight and height reference bands by age and sex from birth to 5 years;
- touch-friendly weight, height and temperature pickers;
- editable medical history;
- fast breast-side switching;
- irritation locations and free observations;
- daily care checklist;
- searchable and filterable history;
- event editing and deletion;
- Excel history export in server mode;
- CSV history export in GitHub Pages demo mode;
- French and English interface;
- responsive PWA interface;
- full confirmed database reset from settings.

## Tech Stack

| Area | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite |
| Design | Tailwind CSS, shadcn/ui, Radix UI, Lucide |
| Server | Node.js, Express |
| Database | SQLite with `better-sqlite3` |
| Export | ExcelJS |
| PWA | `vite-plugin-pwa` |
| Quality | TypeScript strict mode, ESLint, Vitest, Testing Library and Node.js integration tests |

During development, Vite serves the UI on `5173` and proxies `/api` requests to Express on `3000`. In production, Express selects `dist-modern/` or `dist-ios15/` from the browser User-Agent and serves it with the API from one port.

## Development

### Requirements

- Git;
- Node.js 22 or newer;
- npm;
- VS Code is recommended but optional.

On macOS, if `better-sqlite3` needs native compilation tools:

```bash
xcode-select --install
```

### Install

```bash
git clone https://github.com/maelremrem/BabyCare.git
cd BabyCare
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

To test from a tablet on the same Wi-Fi, use the network URL printed by Vite or find your local IP:

```bash
ipconfig getifaddr en0
```

Then open an address such as `http://192.168.1.20:5173` on the tablet.

Vite's regular development server requires a recent browser. For Safari/iOS 15, start the compatible development preview instead:

```bash
npm run dev:ios15
```

Open the network URL on port `3000`, for example `http://192.168.1.20:3000`. Express selects the iOS 15 build for the tablet and the modern build for recent browsers. The regular `npm run dev` command remains available for fast HMR on current browsers.

To run both development interfaces at the same time, use `npm run dev:all`: current browsers get fast HMR on port `5173`, while Safari/iOS 15 gets the compatible build on port `4173` through the distribution server.

The development database is created automatically at `data/babycare.db`. This file is ignored by Git.

### Useful Commands

```bash
# UI and API together
npm run dev

# Modern HMR and Safari/iOS 15 together
npm run dev:all

# Safari/iOS 15 compatible UI and API
npm run dev:ios15

# UI only
npm run dev:client

# API only
npm run dev:server

# TypeScript
npm run typecheck

# ESLint
npm run lint

# Server and UI tests
npm test

# Modern and Safari/iOS 15 distribution builds
npm run build:distribution

# Full pre-commit check
npm run check

# Start the production server
npm start

# Static GitHub Pages demo build
npm run build:pages
```

## GitHub Pages Demo

This repository includes a GitHub Actions workflow at `.github/workflows/pages.yml`.

To publish the demo:

1. push to `main`;
2. in GitHub, open the repository settings;
3. go to **Pages**;
4. set **Build and deployment** to **GitHub Actions**;
5. run the workflow manually or wait for the next push to `main`.

The demo URL is:

[https://maelremrem.github.io/BabyCare/](https://maelremrem.github.io/BabyCare/)

The Pages build uses:

```bash
npm run build:pages
```

In this mode BabyCare does not call `/api`. It uses a browser-only demo adapter backed by `localStorage`, which makes the interface usable without SQLite, Express or any hosted database.

## Project Layout

```text
BabyCare/
├── .github/workflows/      GitHub Pages deployment workflow
├── docs/                   Functional and design documentation
├── public/                 Icons and PWA assets
├── scripts/                Debian installer and systemd service
├── server/
│   ├── app.js              REST API and production server
│   ├── database.js         SQLite initialization and migrations
│   └── app.test.js         API integration tests
├── src/
│   ├── components/         Product and shadcn/ui components
│   ├── hooks/              Clock and event loading hooks
│   ├── lib/                Client API, demo API, dates, types and utilities
│   ├── pages/              Tracking, care, medical and history pages
│   ├── App.tsx             Navigation and main state
│   └── main.tsx            React entrypoint
├── data/                   Local SQLite database, not committed
├── package.json
└── vite.config.ts
```

## Configuration

The server accepts these environment variables:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Express HTTP port |
| `DATABASE_PATH` | `./data/babycare.db` | SQLite database path |
| `TZ` | `Europe/Paris` | Time zone used for daily routines |

Example:

```bash
PORT=3000 \
DATABASE_PATH=/opt/babycare/data/babycare.db \
TZ=Europe/Paris \
npm start
```

## Recommended Debian LXC Hosting

The simplest production setup is to run `npm run build:distribution`, then let Express select `dist-modern/` or `dist-ios15/`. Only one Node.js service is required.

Recommended minimum container: Debian 13, 1 vCPU, 512 MB RAM and 4 GB disk.

```bash
curl -fsSL https://raw.githubusercontent.com/maelremrem/BabyCare/main/scripts/install.sh | sudo bash
```

The script installs system dependencies, clones BabyCare into `/opt/babycare`, builds the app, creates a restricted `babycare` system user, preserves `/opt/babycare/data`, installs `babycare.service`, and starts it.

Useful diagnostics:

```bash
sudo systemctl status babycare
sudo journalctl -u babycare -f
```

To update, run the same install command again. The script uses `git pull --ff-only`, rebuilds the app and restarts the service while preserving local data.

## Docker

The official image runs both browser builds (modern and iOS 15 compatible) behind Express, with SQLite persisted in `./data`:

```bash
mkdir babycare && cd babycare
curl -O https://raw.githubusercontent.com/maelremrem/BabyCare/main/compose.yaml
docker compose up -d
```

Open `http://SERVER_IP:3000`. To update while preserving data, run `docker compose pull && docker compose up -d`.

The image can also be built locally with `docker build -t babycare:local .`.

## PWA and HTTPS

A full PWA install, especially service worker behavior, requires a secure context. `localhost` works during development, but a local-network IP should ideally be served through HTTPS.

For a durable tablet install, put BabyCare behind a local reverse proxy such as Caddy or Nginx, use a local DNS name and install a trusted certificate on the tablet. The proxy should forward requests to `http://127.0.0.1:3000`.

## Backup

The important data is stored in one file:

```text
/opt/babycare/data/babycare.db
```

Back it up regularly. To guarantee a consistent copy while the app is running, use SQLite backup tooling or briefly stop the service before copying the file.

## WHO Growth References

Medical charts use WHO child growth standards from birth to 5 years, separated by sex. BabyCare interpolates official LMS parameters by age and applies the WHO percentile formula to draw the median and the band between -2 and +2 z-scores.

- [WHO weight-for-age standards](https://www.who.int/tools/child-growth-standards/standards/weight-for-age)
- [WHO length/height-for-age standards](https://www.who.int/tools/child-growth-standards/standards/length-height-for-age)
- [WHO standard development methods](https://www.who.int/publications/i/item/924154693X)

These zones are statistical growth references and are not a medical diagnosis. Discuss any concerning measurement or trend with a healthcare professional.

## Contributing

Contributions are welcome, especially around touch ergonomics, accessibility, tests and local data reliability.

Recommended workflow:

1. create a branch from `main`: `git switch -c feature/short-name`;
2. keep changes focused and follow the existing architecture;
3. prefer components already present in `src/components/ui`;
4. check the interface on tablet and phone;
5. run `npm run check`;
6. describe the need, solution and test method in the pull request.

For database or API changes, preserve compatibility with existing databases and add an integration test in `server/app.test.js`. Never commit a real database, an Excel export containing private data or a config file containing secrets.

The full design and MVP criteria are available in the [functional documentation](./docs/BabyCare%20—%20Documentation%20de%20conception%20&%20développement.md).

## Project Status

BabyCare is under active development. The interface and main MVP flows are usable.

## License

BabyCare is copyright © 2026 Maël Remérand and is licensed under the GNU Affero General Public License v3.0, **AGPL-3.0-only**. See [`LICENSE`](./LICENSE) for the license text.

The BabyCare name and logo are reserved; see [`TRADEMARKS.md`](./TRADEMARKS.md). Contributions are encouraged through pull requests to the official repository; see [`CONTRIBUTING.md`](./CONTRIBUTING.md).

---

# Français

[English](#babycare) | **Français**

BabyCare est une application web locale, tactile et installable conçue pour enregistrer rapidement les soins quotidiens d’un bébé : tétées, couches, température, bain, soins du visage et du cordon, changements de vêtements, irritations, observations, poids et taille.

Démo : [maelremrem.github.io/BabyCare](https://maelremrem.github.io/BabyCare/)

La démo publique fonctionne entièrement dans le navigateur. Elle utilise des données d’exemple et conserve les modifications dans `localStorage`, sans base de données ni serveur. La version locale auto-hébergée utilise SQLite via l’API Express.

Si BabyCare vous aide au quotidien et que vous voulez soutenir le projet : [ko-fi.com/maelremrem](https://ko-fi.com/maelremrem).

## Public

BabyCare s’adresse principalement aux parents et aux personnes qui participent aux soins d’un bébé dans un même foyer.

- appareil principal : tablette tactile en mode portrait ou paysage ;
- appareils complémentaires : téléphone ou ordinateur ;
- réseau : réseau local privé du domicile ;
- hébergement recommandé : conteneur Debian LXC léger ;
- stockage : fichier SQLite local ;
- accès : sans compte utilisateur dans le MVP.

> [!IMPORTANT]
> BabyCare contient des informations privées, familiales et proches du domaine de la santé, et ne possède pas encore d’authentification. Ne l’exposez pas directement sur Internet. Limitez son accès au réseau local ou ajoutez une couche d’authentification devant le service.

## Fonctionnalités

- actions rapides pour les soins fréquents ;
- profil local du bébé avec nom, date de naissance, sexe et couleur ;
- gestion de plusieurs profils bébé ;
- topbar avec date et horloge à la seconde ;
- chronomètres persistants pour les tétées et les soins chronométrés ;
- compteur des tétées réalisées dans la journée ;
- alerte automatique lorsqu’aucune selle n’a été enregistrée depuis plus de 48 heures ;
- graphique récent de température avec repère de la zone 36,5-37,5 °C ;
- suivi médical du poids et de la taille ;
- zones de référence OMS du poids et de la taille, adaptées au sexe et à l’âge, de la naissance à 5 ans ;
- sélecteurs tactiles pour poids, taille et température ;
- historique médical modifiable ;
- passage rapide d’un sein à l’autre ;
- irritations associées à une ou plusieurs zones ;
- observations libres ajoutées à l’historique ;
- checklist des soins quotidiens ;
- historique filtrable et recherchable ;
- modification et suppression des événements ;
- export Excel de l’historique en mode serveur ;
- export CSV de l’historique en mode démo GitHub Pages ;
- interface disponible en français et en anglais ;
- interface responsive et installable comme PWA ;
- remise à zéro complète et confirmée de la base depuis les paramètres.

## Stack Technique

| Partie | Technologies |
|---|---|
| Interface | React, TypeScript, Vite |
| Design | Tailwind CSS, shadcn/ui, Radix UI, Lucide |
| Serveur | Node.js, Express |
| Base de données | SQLite avec `better-sqlite3` |
| Export | ExcelJS |
| PWA | `vite-plugin-pwa` |
| Qualité | TypeScript strict, ESLint, Vitest, Testing Library et tests d’intégration Node.js |

En développement, Vite sert l’interface sur le port `5173` et redirige les appels `/api` vers Express sur le port `3000`. En production, Express sélectionne automatiquement `dist-modern/` ou `dist-ios15/` selon le User-Agent, avec l’API sur un seul port.

## Développement

### Prérequis

- Git ;
- Node.js 22 ou plus récent ;
- npm ;
- VS Code, recommandé mais non obligatoire.

Sur macOS, si `better-sqlite3` nécessite une compilation native :

```bash
xcode-select --install
```

### Installation

```bash
git clone https://github.com/maelremrem/BabyCare.git
cd BabyCare
npm install
npm run dev
```

Ouvrez ensuite [http://localhost:5173](http://localhost:5173).

Pour tester depuis une tablette connectée au même Wi-Fi, utilisez l’adresse réseau affichée par Vite ou récupérez votre IP locale :

```bash
ipconfig getifaddr en0
```

Puis ouvrez une adresse comme `http://192.168.1.20:5173` sur la tablette.

Le serveur de développement Vite standard nécessite un navigateur récent. Pour Safari/iOS 15, lancez plutôt l’aperçu de développement compatible :

```bash
npm run dev:ios15
```

Ouvrez l’adresse réseau sur le port `3000`, par exemple `http://192.168.1.20:3000`. Express sélectionne le build iOS 15 pour la tablette et le build moderne pour les navigateurs récents. La commande `npm run dev` reste disponible pour conserver le HMR rapide sur les navigateurs récents.

Pour lancer simultanément les deux interfaces de développement, utilisez `npm run dev:all` : les navigateurs récents bénéficient du HMR rapide sur le port `5173`, tandis que Safari/iOS 15 utilise le build compatible sur le port `4173` via le serveur de distribution.

La base de développement est créée automatiquement dans `data/babycare.db`. Ce fichier est ignoré par Git.

### Commandes Utiles

```bash
# Interface et API ensemble
npm run dev

# HMR moderne et Safari/iOS 15 simultanément
npm run dev:all

# Interface et API compatibles Safari/iOS 15
npm run dev:ios15

# Interface uniquement
npm run dev:client

# API uniquement
npm run dev:server

# Vérification TypeScript
npm run typecheck

# Analyse statique ESLint
npm run lint

# Tous les tests serveur et interface
npm test

# Builds modernes et Safari/iOS 15 pour la distribution
npm run build:distribution

# Contrôle complet avant un commit
npm run check

# Lancer le serveur de production
npm start

# Build statique de démo GitHub Pages
npm run build:pages
```

## Démo GitHub Pages

Le dépôt contient un workflow GitHub Actions dans `.github/workflows/pages.yml`.

Pour publier la démo :

1. poussez vos changements sur `main` ;
2. ouvrez les paramètres du dépôt GitHub ;
3. allez dans **Pages** ;
4. réglez **Build and deployment** sur **GitHub Actions** ;
5. lancez le workflow manuellement ou attendez le prochain push sur `main`.

L’URL de démo est :

[https://maelremrem.github.io/BabyCare/](https://maelremrem.github.io/BabyCare/)

Le build Pages utilise :

```bash
npm run build:pages
```

Dans ce mode, BabyCare n’appelle pas `/api`. L’application utilise un adaptateur de démo côté navigateur, basé sur `localStorage`, ce qui rend l’interface utilisable sans SQLite, Express ni base hébergée.

## Organisation Du Projet

```text
BabyCare/
├── .github/workflows/      Workflow de déploiement GitHub Pages
├── docs/                   Documentation fonctionnelle
├── public/                 Icônes et ressources PWA
├── scripts/                Installateur Debian et service systemd
├── server/
│   ├── app.js              API REST et serveur de production
│   ├── database.js         Initialisation et migrations SQLite
│   └── app.test.js         Tests d’intégration de l’API
├── src/
│   ├── components/         Composants métier et shadcn/ui
│   ├── hooks/              Horloge et chargement des événements
│   ├── lib/                API cliente, API de démo, dates, types et utilitaires
│   ├── pages/              Suivi, soins, médical et historique
│   ├── App.tsx             Navigation et état principal
│   └── main.tsx            Entrée React
├── data/                   Base SQLite locale, non versionnée
├── package.json
└── vite.config.ts
```

## Configuration

Le serveur accepte les variables d’environnement suivantes :

| Variable | Valeur par défaut | Description |
|---|---|---|
| `PORT` | `3000` | Port HTTP du serveur Express |
| `DATABASE_PATH` | `./data/babycare.db` | Emplacement de la base SQLite |
| `TZ` | `Europe/Paris` | Fuseau utilisé pour les routines quotidiennes |

Exemple :

```bash
PORT=3000 \
DATABASE_PATH=/opt/babycare/data/babycare.db \
TZ=Europe/Paris \
npm start
```

## Hébergement Recommandé Dans Un LXC Debian

Le mode de production le plus simple consiste à lancer `npm run build:distribution`, puis à laisser Express sélectionner `dist-modern/` ou `dist-ios15/`. Un seul service Node.js est alors nécessaire.

Configuration minimale recommandée : Debian 13, 1 vCPU, 512 Mo de RAM et 4 Go de disque.

```bash
curl -fsSL https://raw.githubusercontent.com/maelremrem/BabyCare/main/scripts/install.sh | sudo bash
```

Le script installe les dépendances système, clone BabyCare dans `/opt/babycare`, compile l’application, crée l’utilisateur système limité `babycare`, préserve `/opt/babycare/data`, installe `babycare.service` et démarre le service.

Commandes de diagnostic utiles :

```bash
sudo systemctl status babycare
sudo journalctl -u babycare -f
```

Pour mettre à jour, relancez la même commande d’installation. Le script utilise `git pull --ff-only`, reconstruit l’application et redémarre le service en conservant les données locales.

## PWA Et HTTPS

Le mode PWA complet, notamment le service worker, nécessite un contexte sécurisé. `localhost` est accepté pendant le développement, mais un accès par adresse IP sur le réseau local doit idéalement passer en HTTPS.

Pour une installation durable sur tablette, placez BabyCare derrière un reverse proxy local comme Caddy ou Nginx, utilisez un nom DNS local et installez un certificat approuvé par la tablette. Le reverse proxy doit transmettre les requêtes vers `http://127.0.0.1:3000`.

## Sauvegarde

La donnée importante se trouve dans un seul fichier :

```text
/opt/babycare/data/babycare.db
```

Sauvegardez régulièrement ce fichier. Pour garantir une copie cohérente pendant que l’application fonctionne, utilisez la commande de sauvegarde SQLite ou arrêtez brièvement le service avant la copie.

## Références De Croissance OMS

Les zones affichées dans le suivi médical utilisent les standards OMS de croissance de 0 à 5 ans, séparés pour les filles et les garçons. BabyCare interpole les paramètres LMS officiels selon l’âge et applique la formule de centile OMS pour tracer la médiane et la bande comprise entre -2 et +2 z-scores.

- [standards OMS du poids pour l’âge](https://www.who.int/tools/child-growth-standards/standards/weight-for-age)
- [standards OMS de longueur/taille pour l’âge](https://www.who.int/tools/child-growth-standards/standards/length-height-for-age)
- [méthodes de développement des standards OMS](https://www.who.int/publications/i/item/924154693X)

Ces zones sont des repères statistiques de croissance et ne constituent pas un diagnostic médical. Une mesure ou une évolution préoccupante doit être discutée avec un professionnel de santé.

## Contribuer

Les contributions sont les bienvenues, en particulier sur l’ergonomie tactile, l’accessibilité, les tests et la fiabilité de la conservation des données.

Workflow conseillé :

1. créer une branche depuis `main` : `git switch -c feature/nom-court` ;
2. garder les changements ciblés et respecter l’architecture existante ;
3. utiliser en priorité les composants présents dans `src/components/ui` ;
4. vérifier l’interface sur tablette et téléphone ;
5. lancer `npm run check` ;
6. décrire clairement le besoin, la solution et la méthode de test dans la pull request.

Pour toute modification de la base ou de l’API, préservez la compatibilité avec les bases existantes et ajoutez un test dans `server/app.test.js`. Ne versionnez jamais une base réelle, un export Excel contenant des données privées ou un fichier de configuration comportant des secrets.

La conception complète et les critères du MVP se trouvent dans [la documentation fonctionnelle](./docs/BabyCare%20—%20Documentation%20de%20conception%20&%20développement.md).

## État Du Projet

BabyCare est en développement actif. L’interface et les principaux parcours du MVP sont utilisables.

## Licence

BabyCare est copyright © 2026 Maël Remérand et est distribué sous licence GNU Affero General Public License v3.0, **AGPL-3.0-only**. Consultez [`LICENSE`](./LICENSE) pour le texte de la licence.

Le nom et le logo BabyCare sont réservés ; consultez [`TRADEMARKS.md`](./TRADEMARKS.md). Les contributions sont encouragées sous forme de pull requests vers le dépôt officiel ; consultez [`CONTRIBUTING.md`](./CONTRIBUTING.md).
