# Connexion, sauvegardes et mise à niveau

## Première connexion à partir de la version 0.2

L’API, les exports et le widget nécessitent désormais une connexion. Les installations existantes conservent leurs données. L’écran de connexion apparaît après la mise à niveau.

Au premier démarrage, BabyCare crée un mot de passe aléatoire de **6 caractères** (lettres et chiffres) dans `.auth-password`, dans le même dossier que `babycare.db`. Le fichier est créé avec les permissions `0600`. Le journal du serveur indique le chemin, sans afficher le secret.

Le script d’installation Debian attend que le serveur réponde puis affiche ce mot de passe dans son récapitulatif final, avec l’adresse de connexion. Lors d’une réinstallation, le mot de passe existant est conservé et affiché à nouveau. Un mot de passe personnalisé configuré pour le service reste prioritaire.

- Installation systemd : `sudo cat /var/lib/babycare/.auth-password`
- Docker : `docker compose exec babycare cat /data/.auth-password`
- Développement : lire `data/.auth-password` sur le serveur.

Le mot de passe familial donne accès à tous les profils et aux opérations d’administration, y compris suppression, mise à jour et retour à la version précédente. Il ne s’agit pas de comptes individuels avec des rôles distincts.

Pour choisir le mot de passe, configurer `BABYCARE_PASSWORD` ou `BABYCARE_PASSWORD_FILE` dans l’environnement du service, puis le redémarrer. Il doit contenir au moins 6 caractères. Éviter de placer le secret dans le dépôt. Sans variable, modifier le fichier généré et redémarrer permet de le renouveler. Les sessions existantes sont alors invalidées.

Dans **Paramètres → Mot de passe**, renseigner le mot de passe actuel, le nouveau (au moins 6 caractères) et sa confirmation. Le changement est enregistré dans le fichier de mot de passe et reste actif après redémarrage. La session courante est renouvelée et les autres sessions sont invalidées. Les mots de passe existants ne sont pas raccourcis automatiquement. Si `BABYCARE_PASSWORD` est défini, il reste géré par la configuration du serveur et le changement dans l’interface est refusé. Un fichier fourni par `BABYCARE_PASSWORD_FILE` doit être remplaçable par le compte du service.

Les sessions durent au maximum sept jours et sont invalidées au redémarrage du serveur. Le bouton « Se déconnecter » termine la session du navigateur. Les cookies sont `HttpOnly` et `SameSite=Strict`. Sur une installation HTTPS, configurer `BABYCARE_COOKIE_SECURE=true` dans l’environnement du conteneur/service. Le mode HTTP reste utilisable sur le réseau local de confiance, mais ne chiffre pas les échanges. L’API de santé `/api/health` reste publique pour les contrôles Docker et les mises à jour.

Le choix du bébé est conservé par appareil, sans modifier celui des autres parents. Les clients de l’API doivent désormais joindre `X-Baby-Id` aux requêtes de suivi et `X-BabyCare-Request: 1` aux écritures, en plus du cookie de session obtenu avec `POST /api/auth/session`. Les exports par lien utilisent `baby_id` dans la query string. Un contexte manquant ou supprimé est refusé ; une écriture n’est jamais reportée automatiquement sur un autre bébé.

## Sauvegardes automatiques

Les sauvegardes sont créées dans `backups/`, à côté de la base :

- au démarrage, avant les migrations d’une base existante ;
- toutes les 24 heures tant que le serveur fonctionne ;
- avant une réinitialisation ou une demande de mise à jour/rollback depuis l’interface.

Les 14 dernières sauvegardes sont conservées. Il s’agit de 14 fichiers, pas nécessairement de 14 jours. Les snapshots utilisent l’API de sauvegarde SQLite, incluent les écritures WAL, sont vérifiés (`integrity_check` et clés étrangères), puis publiés par renommage. Une sauvegarde finale ne dépend pas de fichiers `-wal` ou `-shm`. Si la sauvegarde préalable échoue, la réinitialisation/mise à jour n’est pas lancée. Une erreur de sauvegarde périodique est journalisée.

Une sauvegarde manuelle peut être demandée sur le serveur :

```bash
npm run backup
# Installation native : préciser DATABASE_PATH=/var/lib/babycare/babycare.db
# Docker : docker compose exec babycare npm run backup
```

Les sauvegardes locales ne protègent pas contre la perte du disque. Copier régulièrement les snapshots terminés sur un support distinct, protégé comme les données originales. Le mot de passe se trouve dans un fichier séparé et n’est pas inclus dans les sauvegardes de la base.

## Restaurer sans écraser la base active

La commande restaure vers un **nouveau fichier** et refuse d’écraser un chemin existant :

```bash
npm run restore -- /chemin/backups/babycare-SNAPSHOT.db /chemin/babycare-restored.db
```

Elle vérifie la source et le résultat. Pour utiliser le résultat : arrêter le service, modifier `DATABASE_PATH` pour pointer vers ce nouveau fichier dans le dossier de données persistant, puis redémarrer. Vérifier que le compte du service peut lire et écrire le fichier. Conserver l’ancienne base et ses fichiers WAL/SHM jusqu’à validation de la restauration. Ne pas remplacer une base pendant qu’un serveur l’utilise.

Le rollback applicatif ne restaure pas automatiquement la base : sélectionner explicitement une sauvegarde antérieure si une migration impose aussi de revenir sur les données.

## Maintenance

Les versions directes des dépendances sont fixées sur celles du lockfile. Utiliser `npm ci` pour une installation reproductible. Actualiser les paquets explicitement, avec revue du lockfile et `npm run check`.

Le serveur sépare les routes d’événements (`events-routes.js`), les routines (`routines-routes.js`), la validation (`validation.js`), les accès partagés (`repository.js`), l’authentification (`auth.js`) et les sauvegardes (`backups.js`). Les transactions restent proches des opérations métier.

Les pages Soins, Médical et Historique ainsi que le widget sont chargés à la demande. L’historique médical récupère toutes les pages de mesures. Les réponses d’une ancienne sélection et les chargements supplantés sont ignorés ; la reconnexion du flux, le retour au premier plan et le retour du réseau déclenchent une actualisation.

La CI exécute `npm run check` et construit également les distributions moderne et iOS 15. Avant une release, vérifier la connexion, les changements de bébé sur deux appareils, le retour après coupure réseau et une restauration vers une base temporaire.

Références de conception : [sessions OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [protection CSRF OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).
