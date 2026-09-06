# Redesign UX — validation du 6 septembre 2026

Branche : `codex/redesign-ux`.

## Couverture de l’audit

| Point | Réalisation | Vérification |
| --- | --- | --- |
| Actions accessibles dès l’accueil | Résumé compact, repas/couche/sommeil prioritaires, autres actions repliées | Navigation réelle à 320 × 568 et 390 × 844 ; tétée accessible sans défiler |
| Tablette paysage | Actions à gauche, résumé et activité à droite | Capture inspectée à 1024 × 768, sans débordement horizontal |
| Chronomètre permanent | Composant partagé entre onglets, notes conservées, arrêt et changement de sein | Tétée commencée sur l’accueil, note conservée dans Historique, arrêt puis note visible dans l’événement |
| Navigation | Barre basse sur téléphone, barre haute sur tablette ; retour en haut à chaque changement | Navigation réelle et inspection du défilement ; chargements locaux aux panneaux |
| Récupération après erreur | Saisie conservée, erreur affichée dans le formulaire, bouton Réessayer ; verrou pendant l’enregistrement | Tests de température, biberon, tire-lait, observation, double clic et échec du rafraîchissement après réussite |
| Rappels | Absence de données présentée sans alarme ; routine, activation et intervalle personnalisables | Tests de stockage par bébé et de rappel après soin partiel |
| Soins | Sélection explicite, raccourci Tout effectué pour la routine, API atomique acceptant la sélection | Test serveur des sélections valides/invalides et de la persistance ; test UI de récupération ; soin Yeux enregistré seul dans la démo |
| Bain et guides | Bouton Bain effectué placé avant le guide repliable | Inspection navigateur et tests CarePage |
| Historique | Filtres avant la liste, statistiques repliables suivant les filtres, chargement des pages suivantes | Test de 103 événements et concordance des paramètres des statistiques |
| Croissance | Dernière valeur et date visibles, graduations agrandies, périodes 1 mois/3 mois/Tout | Inspection des courbes et tests MedicalPage/MedicalChart |
| Saisie des mesures | Commande Saisir une valeur, saisie décimale localisée et dialogue défilable sur petit écran | Saisie puis enregistrement de 4,950 kg à 320 px ; tests MeasurementPicker |
| Finitions | En-tête mobile simplifié, commandes principales agrandies, décimales localisées, export démo nommé CSV | Inspection visuelle et tests existants |

## Contrôles

`npm run check` réussi dans une copie temporaire contenant le redesign : TypeScript, ESLint, 46 tests serveur, 82 tests UI et build de production. Aucune erreur console observée dans les parcours testés.

La copie de validation a été constituée depuis le commit de départ et les fichiers du redesign. Les modifications de l’authentification apparues simultanément dans le dossier partagé en ont été exclues ; le changement de `validateDailyCare` dans `src/lib/api.ts` y a été inclus seul. Les fichiers du redesign ont été comparés à la copie vérifiée après les contrôles.

Les préférences de routine restent propres à chaque bébé sur chaque appareil, ce qui est indiqué dans l’interface. Les soins enregistrés restent partagés par le serveur. La validation visuelle utilise la démo locale et des données fictives ; les comportements serveur sont couverts par les tests d’intégration SQLite.
