# Instructions de versionnage BabyCare

## Bump de version obligatoire

Toute modification destinée à déclencher une mise à jour distribuée doit augmenter la version sémantique du projet (`MAJOR.MINOR.PATCH`). Utiliser npm afin de maintenir `package.json` et `package-lock.json` synchronisés :

```bash
npm version --no-git-tag-version patch
# ou : minor / major
```

La version doit être incluse dans le commit qui est fusionné dans `main`. Le workflow GitHub Actions crée automatiquement le tag `vX.Y.Z` lorsqu'une version supérieure à la dernière release est détectée. Ce tag déclenche ensuite la construction et la publication de la release GitHub ainsi que des images Docker.

Ne pas créer manuellement un tag pour un bump normal. Vérifier les changements avec `npm run check` avant de pousser.
