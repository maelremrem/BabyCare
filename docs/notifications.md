# Notifications BabyCare : cloche, ntfy et Gotify

## Consulter les dernières actions

La cloche, à côté de la roue crantée, affiche les actions enregistrées depuis la précédente ouverture ou connexion à BabyCare dans ce navigateur, ainsi que les actions de la connexion actuelle. Chaque connexion réussie actualise le repère pour la prochaine visite. Le repère est commun aux onglets, mais chaque onglet conserve son repère pendant sa session ; il est indépendant sur chaque appareil. À la première visite, seules les nouvelles actions sont affichées. Sans stockage local disponible, le repère est limité à la connexion actuelle.

Chaque navigateur possède un identifiant aléatoire local. Les actions effectuées depuis ce navigateur sont exclues de sa cloche et restent visibles sur les autres appareils. Cela concerne aussi les modifications, suppressions et arrêts automatiques de minuteurs. Les onglets d’un même navigateur partagent cet identifiant ; deux navigateurs différents sur un même appareil sont considérés comme deux appareils. Les anciennes actions sans origine connue restent visibles. Effacer le stockage du navigateur renouvelle son identité ; sans stockage disponible, cette identité ne dure que le temps de la page ouverte. Ce filtrage concerne la cloche BabyCare : le webhook externe partagé continue de recevoir toutes les actions.

Les créations, démarrages et arrêts de minuteurs, modifications et suppressions sont journalisés pour tous les bébés. Les soins quotidiens validés et les bains enregistrés sont inclus. Cocher une étape de soin, changer un profil ou modifier des réglages ne crée pas de notification. Une action antidatée apparaît à sa date d'enregistrement. Le journal démarre après installation de cette version, conserve les 1 000 dernières actions et affiche au maximum les 100 plus récentes depuis le repère. Ouvrir la cloche marque les actions affichées comme lues et retire le compteur. Elles restent consultables dans la modale, mais ne sont plus comptées comme nouvelles, même après rechargement. Les actions reçues pendant que la modale est ouverte sont également marquées comme lues. La petite balayette au-dessus de la liste devient **Nettoyer / Clear** au survol ou au focus (le texte est directement visible sur écran tactile). Elle vide les notifications affichées dans ce navigateur, y compris après rechargement, sans supprimer les soins ni le journal des autres appareils. Les actions suivantes apparaissent normalement. Le journal se synchronise pendant l'utilisation de l'application.

## Configurer un webhook

1. Ouvrir la **cloche**, puis **Notifications externes**.
2. Choisir **ntfy** ou **Gotify** et renseigner l'URL complète.
3. Renseigner le jeton requis par le service, puis activer les notifications.
4. Cliquer sur **Enregistrer et tester** et vérifier la réception.

La configuration est partagée par tous les appareils et bébés de cette installation. Les envois partent du serveur BabyCare, même si aucun navigateur n'est ouvert. Le mode démo n'envoie aucune notification. Pour désactiver les envois, décocher l'activation puis enregistrer.

Le bouton de test enregistre d'abord la configuration : si le test échoue, les réglages restent enregistrés et peuvent être corrigés. Le jeton sauvegardé n'est jamais renvoyé au navigateur. Un champ vide conserve le jeton existant ; **Supprimer le jeton** permet de l'effacer. Changer le service ou l'URL impose de saisir à nouveau le jeton pour éviter de le transmettre à une nouvelle destination.

### ntfy

Installer l'application ntfy ou ouvrir son interface web, puis s'abonner au même serveur et au même sujet que ceux utilisés dans BabyCare.

- URL : `https://ntfy.sh/mon-sujet-prive` ou `https://ntfy.example.com/mon-sujet`.
- Jeton : jeton d'accès ntfy si le sujet exige une authentification, sinon laisser vide.

BabyCare publie par POST sur l'URL du sujet, avec le titre `BabyCare`, un message texte et, si présent, le jeton dans l'en-tête `Authorization: Bearer …`. Utiliser un sujet protégé : sur un serveur public, un nom de sujet connu peut permettre à d'autres personnes de lire les messages.

Voir la [documentation officielle de publication ntfy](https://docs.ntfy.sh/publish/).

### Gotify

Dans l'interface Gotify, créer une application appelée **BabyCare** et copier son **jeton d'application** (pas un jeton client). Connecter ensuite l'application mobile ou web à ce serveur Gotify.

- URL : `https://gotify.example.com/message`.
- Avec un sous-chemin : `https://example.com/gotify/message`.
- Jeton : le jeton de l'application BabyCare, obligatoire lorsque l'envoi est activé.

BabyCare transmet un POST JSON contenant `title`, `message` et `priority` (5), avec le jeton dans `X-Gotify-Key`.

Voir la [documentation officielle Gotify](https://gotify.net/docs/pushmsg).

## Réseau, confidentialité et dépannage

L'URL doit être accessible depuis **le serveur BabyCare**. En Docker, `localhost` désigne le conteneur BabyCare : utiliser le nom DNS du service Gotify/ntfy sur un réseau partagé, ou une adresse joignable depuis le conteneur. Les serveurs internes HTTP sont acceptés pour les installations locales ; privilégier HTTPS lorsque les messages ou jetons transitent sur un réseau non fiable.

Les URL doivent utiliser HTTP ou HTTPS, sans identifiants intégrés, paramètres de requête ou fragment. Les redirections ne sont pas suivies : renseigner directement l'adresse finale. Pour Gotify, terminer l'URL par `/message` ; pour ntfy, inclure le sujet.

Les messages contiennent le nom du bébé, la catégorie et le type d'action, sans notes ni valeurs médicales détaillées. Les intitulés externes sont en français et le type d'événement est son identifiant technique (par exemple `bottle`). Le jeton est conservé dans la base SQLite, donc aussi dans ses sauvegardes : protéger ces fichiers. Les personnes ayant accès à l'installation peuvent modifier sa configuration partagée.

Un échec du webhook ne bloque pas l'enregistrement d'un soin. L'envoi expire après 5 secondes ; les erreurs automatiques sont signalées dans les logs du serveur sans URL ni jeton. Il n'y a pas de nouvelle tentative ni de reprise après redémarrage. Au-delà de 20 envois simultanés, les notifications supplémentaires ne sont pas expédiées ; le journal interne reste disponible. Ce mécanisme n'est pas une alarme médicale.

Si le test échoue, vérifier l'adresse finale, les droits du jeton, le certificat TLS et la connectivité depuis le serveur. Sur ntfy, vérifier que l'appareil est abonné au bon sujet ; sur Gotify, vérifier que le jeton appartient à une application. Une suppression de bébé journalise la suppression de ses événements ; une réinitialisation complète efface le journal et la configuration externe.
