# HadeParty — Documentation codebase

App disponible sur `haderos.com/party` (prod) · `localhost:5175` (dev).

## Stack technique

- **Framework** : React 18.3 + Vite
- **Routing** : React Router DOM v6 — `basename={import.meta.env.BASE_URL}`
- **Styling** : Tailwind CSS + PostCSS
- **Backend/BDD** : Supabase dédié (projet séparé de HadeTools)
- **Langue UI** : Français

## Structure des fichiers

```
src/
├── App.jsx      # Routes (basename dynamique via import.meta.env.BASE_URL)
├── main.jsx     # Point d'entrée
└── index.css    # Tailwind + reset
public/
└── .htaccess    # SPA fallback Apache (RewriteBase /party/)
```

## Contenu actuel

Page placeholder "en construction" — à développer.

## Palette de couleurs

Identique au reste du projet Haderos :

| Variable | Valeur | Usage |
|---|---|---|
| Primary | `#6c63ff` | Boutons, accents |
| Dark text | `#211738` | Texte principal |
| Light bg | `#f6f4f9` | Fond de page |
| Muted | `#736694` | Texte secondaire |
| Soft purple | `#f2edfa` | Fonds de chips |
| Accent purple | `#a49ffe` | Décoratifs |

## Conventions de style

Même conventions que HadeTools — voir `apps/tools/CLAUDE.md` pour la référence complète.

## Vite config

- `base: command === 'build' ? '/party/' : '/'`
- Port dev : `5175`

## Supabase

Projet Supabase **séparé** de HadeTools. Variables dans `apps/party/.env.local` :
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Schéma base de données

À définir selon les fonctionnalités de gestion d'événements.
