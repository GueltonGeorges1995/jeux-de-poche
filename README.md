# Jeux de poche

Petite arcade de jeux solo et de jeux à deux sur un même écran. Les jeux et leurs scores fonctionnent directement dans le navigateur : aucun serveur Node.js ni service de jeu distant n'est nécessaire.

## Jeux

- **Solo** : Memory, Snake et 2048.
- **Duo sur un écran** : Tic-tac-toe et Puissance 4.

Les meilleurs scores et les résultats des parties à deux sont enregistrés dans le stockage local du navigateur. Ils restent propres à cet appareil et à ce navigateur.

## Développement local

Ouvre `public/index.html` directement dans un navigateur, ou sers le dossier `public/` avec n'importe quel serveur de fichiers statiques. Aucun `npm install` n'est nécessaire.

## Publication sur GitHub Pages

Le workflow `.github/workflows/pages.yml` publie automatiquement le contenu de `public/` sur GitHub Pages à chaque push sur `main`.

Dans le dépôt GitHub, règle **Settings → Pages → Build and deployment → Source** sur **GitHub Actions**. Après le premier déploiement, le site est accessible depuis l'URL affichée dans l'exécution du workflow.

Les liens et ressources sont relatifs afin de fonctionner aussi bien à la racine d'un domaine que sous le chemin d'un dépôt GitHub Pages.
