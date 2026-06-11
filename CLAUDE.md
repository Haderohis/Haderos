# Haderos — Documentation codebase

## Stack technique

- **Framework** : React 18.3 + Vite
- **Routing** : React Router DOM v6
- **Styling** : Tailwind CSS + PostCSS
- **Backend/BDD** : Supabase (PostgreSQL + Auth)
- **Mobile** : Capacitor (Android/iOS)
- **Drag & drop** : @dnd-kit
- **Langue UI** : Français
- **Design** : Glassmorphism (`backdrop-blur`, fonds semi-transparents)

## Palette de couleurs

| Variable | Valeur | Usage |
|---|---|---|
| Primary | `#6c63ff` | Boutons, accents, badges |
| Dark text | `#211738` | Texte principal |
| Light bg | `#f6f4f9` | Fond de page |
| Muted | `#736694` | Labels, texte secondaire |
| Soft purple | `#f2edfa` | Fonds de champs, chips |
| Accent purple | `#a49ffe` | Placeholders, décoratifs |

## Routes

| Path | Page | Protégée |
|---|---|---|
| `/` | Home | Non |
| `/login` | Login | Non |
| `/checklist` | Worklist | Non |
| `/expenses` | Dépenses | Non |
| `/settings` | Paramètres | Non |
| `/collection` | Collection | Oui |
| `/dashboard` | Dashboard | Oui |

## Structure des fichiers

```
src/
├── App.jsx                  # Définition des routes
├── main.jsx                 # Point d'entrée
├── pages/
│   ├── Home.jsx
│   ├── Login.jsx
│   ├── Checklist.jsx        # Gestion de tâches (DnD, filtres, groupes, tags)
│   ├── Expenses.jsx         # Dépenses partagées + remboursements
│   ├── Settings.jsx         # Placeholder
│   ├── Dashboard.jsx
│   └── Collection.jsx       # Collection personnelle (mangas, …)
├── components/
│   ├── AppHeader.jsx        # Header partagé (menu + notifications)
│   ├── Drawer.jsx           # Menu navigation latéral
│   ├── BottomSheet.jsx      # Modal overlay réutilisable
│   ├── FormFields.jsx       # TextField, DateField, SelectField, FieldLabel…
│   ├── NotificationBell.jsx
│   └── ProtectedRoute.jsx
├── hooks/
│   ├── useAuth.js           # Session, signIn, signOut
│   ├── useProfile.js        # Prénom/nom/display_name depuis Supabase
│   ├── useNotifications.js  # Abonnement temps réel aux notifications
│   ├── useSupabase.js       # Wrapper générique requêtes Supabase
│   └── useMangaSearch.js    # Recherche manga via Jikan API (debounce + abort)
├── lib/
│   └── supabase.js          # Client Supabase initialisé
supabase/
├── expenses_migration.sql
└── manga_collection_migration.sql
```

## Schéma base de données (Supabase)

### `profiles`
`id` · `first_name` · `last_name` · `display_name` — lié à `auth.users`

### `tasks`
`id` · `label` · `group_name` · `tags` (JSON) · `due_date` · `done` · `completed_at` · `position` · `jira_url` · `figma_url`

### `expenses`
`id` · `amount` · `description` · `payer_id` · `debtor_id` · `created_by` · `expense_date` · `tags`

### `reimbursements`
Lié aux dépenses, track les paiements avec montant et date.

### `notifications`
`id` · `user_id` · `type` · `read` — nouvelles dépenses et remboursements.

### `manga_collection`
`id` · `user_id` · `mal_id` · `title` · `total_volumes` (null si en cours) · `owned_volumes` · `cover_url` · `created_at`
Contrainte unique : `(user_id, mal_id)`

Toutes les tables ont RLS activé (les utilisateurs ne voient que leurs propres données).

## Patterns architecturaux

- **Fetch data** : `useEffect` → `supabase.from(table).select()` directement dans les pages
- **Optimistic updates** : certains composants mettent à jour le state local avant confirmation serveur
- **Temps réel** : `useNotifications` utilise `supabase.channel()` avec `postgres_changes`
- **Auth guard** : `useAuth()` gère la session globalement, `<ProtectedRoute>` redirige vers `/login`
- **Upsert** : utiliser `onConflict` pour les tables avec contrainte unique (ex: manga_collection)

## Composants réutilisables

### `<BottomSheet onClose>`
Modal slide-up pour les formulaires. Toutes les pages d'ajout/édition l'utilisent.

### `<AppHeader title>`
Header commun avec bouton menu hamburger + cloche notifications. À utiliser sur chaque nouvelle page.

### FormFields (`src/components/FormFields.jsx`)
- `<TextField label required error ...props>`
- `<DateField label value onChange>`
- `<SelectField label options value onChange>`
- `<FieldLabel required>`

## API externes

### Jikan API v4 (MyAnimeList — sans clé)
- Recherche : `GET https://api.jikan.moe/v4/manga?q={query}&limit=5`
- Champs utiles : `mal_id`, `title`, `volumes`, `images.jpg.image_url`
- Rate limit : ~3 req/s → debounce 500ms dans `useMangaSearch`

## Conventions de style

- Hauteur des champs : `h-12` (44px)
- Bordures : `rounded-[10px]` pour les inputs, `rounded-[12px]` pour les cards/sheets
- Fond des champs : `bg-[#f2edfa]`
- Bouton primaire : `bg-[#6c63ff] text-white font-semibold rounded-[12px]`
- Blobs décoratifs en fond de page : `absolute rounded-full blur-3xl opacity-20 pointer-events-none`
- Hauteur viewport : `min-h-dvh` (dynamic viewport height pour mobile)
- Padding top des pages (sous le header fixe) : `pt-[76px]`
