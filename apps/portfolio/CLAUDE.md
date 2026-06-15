# Haderos Portfolio — Documentation codebase

Site vitrine disponible sur `haderos.com` (prod) · `localhost:5173` (dev).

## Stack technique

- **Framework** : React 18.3 + Vite
- **Styling** : Tailwind CSS + PostCSS
- **Pas de router** : page unique, pas de React Router
- **Pas de BDD** : aucune connexion Supabase

## Structure des fichiers

```
src/
├── App.jsx      # Page unique — tout le contenu est ici
├── main.jsx     # Point d'entrée
└── index.css    # Tailwind + reset
public/
└── .htaccess    # SPA fallback Apache (RewriteBase /)
```

## Contenu actuel

Page vide (`bg-[#f6f4f9]`) — à construire.

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

- Blobs décoratifs en fond : `absolute rounded-full blur-3xl opacity-20 pointer-events-none`
- Cards glassmorphism : `bg-white/75 backdrop-blur-md rounded-[20px] border border-white/60 shadow-sm`
- Bouton primaire : `bg-[#6c63ff] text-white font-semibold rounded-[12px]`
- Hauteur viewport : `min-h-screen` ou `min-h-dvh`

## Vite config

- `base: '/'` en dev et en prod (racine du domaine)
- Port dev : `5173`
