# Haderos — Monorepo

## Structure

```
haderos/
├── apps/
│   ├── tools/       # haderos.com/tools — app outils du quotidien (React + Supabase)
│   ├── portfolio/   # haderos.com — portfolio vitrine (React, pas de BDD)
│   └── party/       # haderos.com/party — gestion d'événements (React + Supabase séparé)
├── scripts/
│   └── deploy.js    # fusionne les 3 dist/ en un dossier deploy/ pour o2switch
└── package.json     # workspaces npm + scripts racine
```

Chaque app a son propre `CLAUDE.md` avec la documentation détaillée.

## Stack commune

- **Framework** : React 18.3 + Vite
- **Styling** : Tailwind CSS + PostCSS
- **Hébergement** : Apache / o2switch (cPanel)
- **Langue UI** : Français

## Palette de couleurs partagée

| Variable | Valeur | Usage |
|---|---|---|
| Primary | `#6c63ff` | Boutons, accents, badges |
| Dark text | `#211738` | Texte principal |
| Light bg | `#f6f4f9` | Fond de page |
| Muted | `#736694` | Labels, texte secondaire |
| Soft purple | `#f2edfa` | Fonds de champs, chips |
| Accent purple | `#a49ffe` | Placeholders, décoratifs |

## Commandes

```bash
# Dev — chaque app sur son propre port
npm run dev              # lance les 3 apps en parallèle
npm run dev:portfolio    # localhost:5173
npm run dev:tools        # localhost:5174
npm run dev:party        # localhost:5175

# Build prod
npm run build            # build les 3 apps
npm run build:tools
npm run build:portfolio
npm run build:party

# Déploiement
npm run deploy           # génère deploy/ prêt à uploader sur o2switch
```

## Base Vite (conditionnel dev/prod)

Chaque app utilise `base: command === 'build' ? '/xxx/' : '/'` dans son `vite.config.js` pour que les assets soient préfixés correctement en prod sans casser le dev local.

## Déploiement (o2switch)

`npm run build && npm run deploy` génère :
```
deploy/
├── index.html        ← portfolio
├── assets/
├── tools/            ← app tools complète
└── party/            ← app party complète
```
Uploader le contenu de `deploy/` à la racine du domaine via cPanel File Manager.
