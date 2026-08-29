# BabyCare

BabyCare est une application web locale, tactile et installable conçue pour enregistrer rapidement les soins quotidiens d’un bébé : tétées, couches, température, bain, soins du visage et du cordon, changements de vêtements et irritations.

L’application privilégie un minimum d’interactions, une lecture immédiate sur tablette et la conservation locale des données. Elle ne nécessite aucun service cloud et ne comporte pas d’authentification dans sa version MVP.

## Public et usage cible

BabyCare s’adresse principalement aux parents et aux personnes qui participent aux soins d’un bébé dans un même foyer.

- appareil principal : tablette tactile en mode portrait ou paysage ;
- appareils complémentaires : téléphone ou ordinateur ;
- réseau : réseau local privé du domicile ;
- hébergement cible : conteneur Debian LXC léger ;
- stockage : fichier SQLite local ;
- accès : sans compte utilisateur pour le MVP.

> [!IMPORTANT]
> L’application contient des informations privées et ne possède pas encore d’authentification. Ne l’exposez pas directement sur Internet. Limitez son accès au réseau local ou ajoutez une couche d’authentification devant le service.

## Fonctionnalités actuelles

- actions rapides pour les soins fréquents ;
- profil local du bébé avec son nom, sa date de naissance et son âge exact ;
- topbar avec date et horloge à la seconde ;
- chronomètres persistants pour les tétées et les soins chronométrés ;
- compteur des tétées réalisées dans la journée ;
- alerte automatique lorsqu’aucune selle n’a été enregistrée depuis plus de 48 heures ;
- aperçu graphique de l’évolution récente de la température avec repère de la zone idéale de 36,5 à 37,5 °C ;
- suivi médical avec courbes du poids et de la taille ;
- zones de référence OMS du poids et de la taille, adaptées au sexe et à l’âge, dans une fenêtre mobile de trois mois de la naissance à 5 ans ;
- saisie tactile des mesures par pas de 50 g et 0,1 cm, avec accélération au maintien et saisie clavier au double-clic ;
- historique médical modifiable ;
- passage rapide d’un sein à l’autre ;
- sélecteur tactile de température limité de 34 à 44 °C, avec saisie clavier au double-clic ;
- irritations associées à une ou plusieurs zones ;
- observations libres ajoutées directement à l’historique ;
- observations sur les événements ;
- checklist des soins quotidiens ;
- validation de la checklist complète dans l’historique ;
- réinitialisation automatique de la checklist après chaque validation ;
- historique filtrable et recherchable ;
- modification et suppression des événements ;
- export de l’historique au format Excel ;
- interface responsive et installable comme PWA ;
- stockage permanent des événements dans SQLite.

La conception complète et les critères du MVP se trouvent dans [la documentation fonctionnelle](./docs/BabyCare%20—%20Documentation%20de%20conception%20&%20développement.md).

### Références de croissance OMS

Les zones affichées dans le suivi médical utilisent les standards OMS de croissance de 0 à 5 ans, séparés pour les filles et les garçons. BabyCare interpole les paramètres LMS officiels selon l’âge et applique la formule de centile OMS pour tracer la médiane et la bande comprise entre −2 et +2 z-scores.

- [standards OMS du poids pour l’âge](https://www.who.int/tools/child-growth-standards/standards/weight-for-age) ;
- [standards OMS de longueur/taille pour l’âge](https://www.who.int/tools/child-growth-standards/standards/length-height-for-age) ;
- [méthodes de développement des standards OMS](https://www.who.int/publications/i/item/924154693X).

Ces zones sont des repères statistiques de croissance et ne constituent pas un diagnostic médical. Une mesure ou une évolution préoccupante doit être discutée avec un professionnel de santé.

## Stack technique

| Partie | Technologies |
|---|---|
| Interface | React, TypeScript, Vite |
| Design | Tailwind CSS, shadcn/ui, Radix UI, Lucide |
| Serveur | Node.js, Express |
| Base de données | SQLite avec `better-sqlite3` |
| Export | ExcelJS |
| Installation tablette | PWA avec `vite-plugin-pwa` |
| Qualité | TypeScript strict, ESLint, Vitest, Testing Library et tests d’intégration Node.js |

En développement, Vite sert l’interface sur le port `5173` et redirige les appels `/api` vers Express sur le port `3000`. En production, Express sert à la fois l’interface compilée et l’API sur un seul port.

## Démarrer le développement

### Prérequis

- Git ;
- Node.js 22 ou plus récent ;
- npm ;
- VS Code, recommandé mais non obligatoire.

Si l’installation de `better-sqlite3` nécessite une compilation native, installez les outils Apple si vous êtes sur macOS :

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

Pour tester depuis une tablette connectée au même Wi-Fi, utilisez l’adresse réseau affichée par Vite.

```bash
ipconfig getifaddr en0
```

Puis ouvrez, par exemple, `http://192.168.1.20:5173` sur la tablette.

La base de développement est créée automatiquement dans `data/babycare.db`. Ce fichier est ignoré par Git.

### Commandes utiles

```bash
# Interface et API ensemble
npm run dev

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

# Tests séparés si nécessaire
npm run test:server
npm run test:ui

# Build de production
npm run build

# Contrôle complet avant un commit
npm run check

# Lancer le build de production
npm start
```

Vite recharge automatiquement les modifications de l’interface. Après une modification du serveur Express, redémarrez `npm run dev`.

### Port déjà utilisé

BabyCare utilise les ports `3000` pour l’API et `5173` pour l’interface. Si un ancien lancement est encore actif, recherchez son processus :

Relancez ensuite `npm run dev` et ouvrez exactement l’adresse `Local` affichée par Vite.

## Organisation du projet

```text
BabyCare/
├── docs/                   Documentation fonctionnelle
├── public/                 Icônes et ressources PWA
├── scripts/                Installateur Debian et service systemd
├── server/
│   ├── app.js              API REST et serveur de production
│   ├── database.js         Initialisation et entretien de SQLite
│   └── app.test.js         Tests d’intégration de l’API
├── src/
│   ├── components/         Composants métier et shadcn/ui
│   ├── hooks/              Horloge et chargement des événements
│   ├── lib/                API cliente, dates, types et utilitaires
│   ├── pages/              Suivi, Soins et Historique
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

## Hébergement recommandé dans un LXC Debian

Le mode de production le plus simple consiste à compiler l’interface puis à laisser Express servir le dossier `dist/` et l’API. Un seul service Node.js est alors nécessaire.

### Installation automatique

Configuration minimale recommandée : Debian 13, 1 vCPU, 512 Mo de RAM et 4 Go de disque.

Dans le conteneur Debian, une seule commande suffit :

```bash
curl -fsSL https://raw.githubusercontent.com/maelremrem/BabyCare/main/scripts/install.sh | sudo bash
```

Le script :

- installe Git, Node.js 22 et les dépendances système nécessaires ;
- clone et compile BabyCare dans `/opt/babycare` ;
- crée l’utilisateur système limité `babycare` ;
- préserve le contenu de `/opt/babycare/data` lors d’une réinstallation ;
- installe, active et démarre le service `babycare.service` ;
- configure le redémarrage automatique du serveur après un redémarrage de Debian.

L’application est alors accessible sur `http://ADRESSE_DU_LXC:3000` depuis le réseau local.

Commandes de diagnostic utiles :

```bash
sudo systemctl status babycare
sudo journalctl -u babycare -f
```

### Mise à jour

Relancez exactement la même commande. Le script détecte l’installation, récupère la branche `main` avec `git pull --ff-only`, reconstruit l’application et redémarre le service. Les données de `/opt/babycare/data` sont conservées.

### HTTPS et installation PWA

Le mode PWA complet, notamment le service worker, nécessite un contexte sécurisé. `localhost` est accepté pendant le développement, mais un accès par adresse IP sur le réseau local doit idéalement passer en HTTPS.

Pour une installation durable sur tablette, placez BabyCare derrière un reverse proxy local comme Caddy ou Nginx, utilisez un nom DNS local et un certificat approuvé par la tablette. Le reverse proxy doit transmettre les requêtes vers `http://127.0.0.1:3000`.

### Sauvegarde

La donnée importante se trouve dans un seul fichier :

```text
/opt/babycare/data/babycare.db
```

Sauvegardez régulièrement ce fichier vers un autre emplacement. Pour garantir une copie cohérente pendant que l’application fonctionne, utilisez la commande de sauvegarde SQLite ou arrêtez brièvement le service avant la copie.

## Reprendre le développement

Pour reprendre le projet après une interruption :

1. lire la [documentation fonctionnelle](./docs/BabyCare%20—%20Documentation%20de%20conception%20&%20développement.md) ;
2. vérifier l’état Git avec `git status` et récupérer les changements avec `git pull --ff-only` ;
3. installer les dépendances avec `npm install` ou `npm ci` ;
4. lancer `npm run dev` ;
5. valider les changements avec `npm run check`.

Les prochains chantiers identifiés sont notamment :

- connecter complètement la checklist de bain à l’interface ;
- ajouter les intervalles personnalisés dans l’historique ;
- ajouter un script de sauvegarde vérifiée pour SQLite ;
- compléter les tests des parcours tactiles ;
- renforcer la sécurité avant tout accès hors du réseau local.

## Contribuer

Les contributions sont les bienvenues, en particulier sur l’ergonomie tactile, l’accessibilité, les tests et la fiabilité de la conservation des données.

### Workflow conseillé

1. créer une branche depuis `main` : `git switch -c feature/nom-court` ;
2. garder les changements ciblés et respecter l’architecture existante ;
3. utiliser en priorité les composants présents dans `src/components/ui` ;
4. vérifier l’interface sur tablette et téléphone ;
5. lancer le contrôle complet avant de proposer le changement :

```bash
npm run check
```

6. décrire clairement le besoin, la solution et la méthode de test dans la pull request.

Pour toute modification de la base ou de l’API, préserver la compatibilité avec les bases existantes et ajouter un test dans `server/app.test.js`. Ne versionnez jamais une base réelle, un export Excel contenant des données privées ou un fichier de configuration comportant des secrets.

## État du projet

BabyCare est en développement actif. L’interface et les principaux parcours du MVP sont utilisables, mais le projet n’est pas encore considéré comme prêt pour une exposition publique ou un usage médical critique.

## Licence

Aucune licence n’est encore définie. Tant qu’un fichier `LICENSE` n’est pas ajouté, le code reste soumis au droit d’auteur de son propriétaire et sa réutilisation n’est pas implicitement autorisée.
