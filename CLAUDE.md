# Haderos — Documentation codebase

## Stack technique

- **Framework** : React 18.3 + Vite
- **Routing** : React Router DOM v6
- **Styling** : Tailwind CSS + PostCSS
- **Backend/BDD** : Supabase (PostgreSQL + Auth + Storage)
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
| `/sport` | Sport | Oui |

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
│   ├── Collection.jsx       # Collection perso (mangas + comics) avec partage
│   └── Sport.jsx            # Suivi sport : calendrier semaine, exercices, séries
├── components/
│   ├── AppHeader.jsx        # Header partagé (menu + notifications) — prop titleExtra
│   ├── Drawer.jsx           # Menu navigation latéral (fixed, nav scrollable)
│   ├── BottomSheet.jsx      # Modal overlay réutilisable
│   ├── FormFields.jsx       # TextField, DateField, SelectField, FieldLabel…
│   ├── NotificationBell.jsx # Cloche + panel notifications (partage accept/refus)
│   ├── RestTimer.jsx        # Timer de récupération 90s avec bip sonore
│   └── ProtectedRoute.jsx
├── hooks/
│   ├── useAuth.js           # Session, signIn, signOut
│   ├── useProfile.js        # Prénom/nom/display_name depuis Supabase
│   ├── useNotifications.js  # Abonnement temps réel + acceptShare/declineShare
│   ├── useMangaSearch.js    # Recherche manga via Jikan API (debounce + abort)
│   └── useComicsSearch.js   # Recherche comics via Open Library API (debounce + abort)
├── lib/
│   ├── supabase.js          # Client Supabase initialisé
│   └── date.js              # Utilitaire toDateStr() partagé (évite décalage timezone)
supabase/
├── expenses_migration.sql
├── manga_collection_migration.sql
├── manga_collection_add_ongoing.sql
├── manga_collection_owned_as_array.sql
├── manga_collection_add_category.sql   # ALTER: ajoute colonne category text default 'Mangas'
├── collection_shares_migration.sql     # Table collection_shares + policy shared_collection_read
├── collection_shares_recipient_delete.sql  # Policy: recipient peut supprimer un partage
├── sport_migration.sql                 # Tables sport_sessions, sport_exercises, sport_sets + RLS
└── sport_add_muscle.sql                # ALTER sport_exercises ADD COLUMN muscle text
```

## Schéma base de données (Supabase)

### `profiles`
`id` · `first_name` · `last_name` · `display_name` — lié à `auth.users`

### `tasks`
`id` · `label` · `group_name` · `tags` (JSON) · `due_date` · `done` · `completed_at` · `position` · `jira_url` · `figma_url`

### `expenses`
`id` · `amount` · `description` · `payer_id` · `debtor_id` · `created_by` · `expense_date` (date) · `tags` (text[]) · `created_at`
RLS : SELECT par `payer_id` ou `debtor_id` ; INSERT par `created_by` ; UPDATE par `payer_id` ou `debtor_id` ; DELETE par `created_by`.

### `reimbursements`
`id` · `expense_id` · `reimbursed_by` · `amount` · `reimbursement_date` · `created_at`
RLS : SELECT/INSERT si lié à une dépense accessible. DELETE si payer ou debtor de la dépense.

### `notifications`
`id` · `user_id` · `type` · `message` · `read` · `data` (jsonb) · `created_at`
Types : `new_expense` · `reimbursement` · `collection_share_request` · `collection_share_accepted`
- `collection_share_request` : `data = { share_id, owner_id, recipient_name }`
RLS : SELECT/UPDATE par `user_id` ; INSERT par tout utilisateur authentifié.

### `manga_collection`
`id` · `user_id` · `mal_id` (int) · `title` · `total_volumes` (int, null si inconnu) · `owned_volumes` (int[]) · `cover_url` (text, peut être base64) · `ongoing` (bool) · `category` (text default 'Mangas') · `created_at`
Contrainte unique : `(user_id, mal_id)`
RLS : CRUD par `user_id` + policy `shared_collection_read` (select si partage accepté)

### `collection_shares`
`id` · `owner_id` · `shared_with_id` · `status` (pending/accepted/declined) · `created_at`
Contrainte unique : `(owner_id, shared_with_id)`
RLS : owner peut select/insert/delete ; recipient peut select/update/delete
- À l'acceptation, un partage inverse est créé automatiquement (bidirectionnel)

### `sport_sessions`
`id` · `user_id` · `session_date` (date) · `name` (text, optionnel) · `created_at`
RLS : CRUD par `user_id`. Créée automatiquement au premier exercice du jour.

### `sport_exercises`
`id` · `session_id` · `name` (text) · `type` (strength|cardio) · `muscle` (text, nullable) · `position` (int) · `created_at`
RLS : accès via join `sport_sessions.user_id = auth.uid()`.

### `sport_sets`
`id` · `exercise_id` · `set_number` (int) · `reps` (int) · `weight_kg` (numeric) · `duration_seconds` (int) · `created_at`
RLS : accès via join `sport_exercises → sport_sessions.user_id = auth.uid()`.

Toutes les tables ont RLS activé.

## Patterns architecturaux

- **Fetch data** : `useEffect` → `supabase.from(table).select()` directement dans les pages
- **Optimistic updates** : certains composants mettent à jour le state local avant confirmation serveur
- **Temps réel** : `useNotifications` et `Collection.jsx` utilisent `supabase.channel()` avec `postgres_changes`
- **Auth guard** : `useAuth()` gère la session globalement, `<ProtectedRoute>` redirige vers `/login`
- **Upsert** : utiliser `onConflict` pour les tables avec contrainte unique
- **Images locales** : resize canvas → base64 JPEG (max 200×280, qualité 0.82) stocké dans `cover_url`

## Composants réutilisables

### `<BottomSheet onClose>`
Modal slide-up pour les formulaires. Toutes les pages d'ajout/édition l'utilisent.

### `<AppHeader title titleExtra?>`
Header commun avec bouton menu hamburger + cloche notifications. Gère lui-même le Drawer et `useNotifications`. `titleExtra` permet d'injecter un élément à droite du titre (ex: ShareChip). Ne pas dupliquer le header manuellement.

### `<Drawer open onClose>`
Position `fixed` (ne scroll pas avec la page). Navigation scrollable, déconnexion + version toujours visibles en bas.

### `<NotificationBell>`
Utilisé en interne par `AppHeader`. Gère `collection_share_request` (boutons Accepter/Refuser). Ne pas importer directement dans les pages.

### FormFields (`src/components/FormFields.jsx`)
- `<TextField label required error ...props>`
- `<DateField label value onChange>`
- `<SelectField label options value onChange>`
- `<SegmentedControl label options value onChange>`
- `<SubmitButton disabled onClick>`
- `<FieldLabel required>`

## Page Collection

### Catégories
`Mangas` (Jikan API) · `Comics` (Open Library API). Stockées dans `manga_collection.category`.

### Affichage des cartes
Liste verticale. Chaque carte :
- Ligne 1 : titre (tronqué) + chips "Moi" (violet) / prénom partagé (amber) 
- Ligne 2 : cover (34×48px) | chips de volumes scrollables horizontalement | menu ⋮

### Couleurs des chips de volumes (partage)
- `#6c63ff` (violet foncé) — possédé par les deux
- `#ada7fd` (violet clair) — possédé uniquement par moi
- `#fbbf24` (amber) — possédé uniquement par l'autre
- `#d5d3dc` (gris) — non possédé

### Partage de collection
- Bidirectionnel : à l'acceptation, un partage inverse est créé automatiquement
- `fetchCollection` fusionne `my items` + `shared items` par `mal_id`
- Temps réel : abonnement sur `collection_shares` pour refetch auto
- ShareSheet : liste les partages en cours avec statut, suppression bidirectionnelle

### Recherche / ajout
- Mangas : `useMangaSearch` → Jikan `/manga?q=&limit=5`, fallback detail si volumes null
- Comics : `useComicsSearch` → Open Library `/search.json?q=&limit=5&fields=key,title,cover_i,author_name`
- Création manuelle disponible dès qu'il y a du texte (même si résultats présents)
- Titre éditable dans la vue de confirmation
- Image cliquable → picker fichier → resize canvas → base64

## Page Sport

### Calendrier semaine
- Sous-header `sticky top-[76px]` (dans `pt-[76px]` wrapper, même pattern que Collection)
- Navigation semaine passée/courante uniquement (pas de futur)
- Cellules : lettre du jour + icône altère si session avec exercices ce jour-là
- Jour sélectionné : `bg-[#6c63ff] rounded-[4px]` · Jour actuel : `border border-[#6c63ff]`
- L'icône altère ne s'affiche que si `sport_exercises.count > 0` (pas de session vide)
- `toDateStr()` définie dans `src/lib/date.js`, importée par Sport et Checklist — utilise `getFullYear/Month/Date` (pas `toISOString`) pour éviter le décalage timezone
- Les perfs précédentes sont chargées en parallèle (`Promise.all`) au lieu de séquentiellement
- Autocomplete exercices : 1 seule requête via join `!inner` sur `sport_sessions`, s'ouvre vers le haut (`bottom-full`)

### Cartes exercice
- Header : icône du **muscle ciblé** (stroke SVG) sur fond violet `rounded-[4px]` (37×36px) + nom + muscle label + crayon édition + × supprimer
- Colonnes **PREC / KG / REPS** (musculation) ou **PREC / Kcal / Durée** (cardio)
- PREC = données de la session précédente pour ce numéro de série exact
- Toutes les séries validées : `bg-[rgba(108,99,255,0.08)]`
- ✓ rempli cliquable → remet la série en édition inline (UPDATE en DB à la revalidation)
- ✓ outline sur lignes en attente (disabled si champs vides) · pas de croix sur les lignes en attente
- Saisir le poids sur la première ligne le propage à toutes les lignes en attente
- Valeurs min="0" sur tous les champs numériques

### Muscles (`sport_exercises.muscle`)
- 6 groupes : `pectoraux` · `biceps` · `triceps` · `dos` · `jambes` · `epaules`
- Icônes SVG style stroke (fill:none, strokeWidth:1.8) dans la constante `MUSCLES`
- Migration : `supabase/sport_add_muscle.sql` (ALTER TABLE sport_exercises ADD COLUMN muscle text)
- Sélecteur chips dans le formulaire d'ajout/édition, filtre l'autocomplete par muscle
- Sélectionner un chip pré-sélectionne aussi `newExerciseMuscle`
- Choisir une suggestion autocomplete hérite du muscle de l'exercice existant

### Flow d'ajout exercice
- BottomSheet avec `innerClassName="overflow-visible"` pour que l'autocomplete ne soit pas clippé
- Formulaire : input nom (autocomplete) → chips muscle → toggle muscu/cardio → bouton Ajouter
- Session auto-créée au premier `handleAddSet` via `ensureSession()`
- Exercice ajouté → ligne de saisie ouverte automatiquement
- Plusieurs lignes en attente simultanées possibles ("Ajouter une serie" toujours visible)
- Validation d'une série → suppression de la ligne + déclenchement du `RestTimer`

### Édition exercice
- Bouton crayon dans le header de la carte → BottomSheet avec nom pré-rempli + chips muscle
- `handleSaveExercise` → UPDATE `name` + `muscle` en DB

### RestTimer (`src/components/RestTimer.jsx`)
- Overlay fixe en **haut** de l'écran (`fixed top-6`), z-50
- 90 secondes, cercle SVG progressif, bouton "Passer"
- Bip sonore à la fin via Web Audio API (2 bips courts + 1 long)
- Se ferme automatiquement 1,2s après le bip

## Comportements spécifiques Expenses

- **Tags** : saisie libre, majuscules autorisées, Entrée/virgule pour valider. Suggestions issues des tags existants.
- **Dates** : initialisées à aujourd'hui. Format `YYYY-MM-DD`.
- **Groupement par date** : trié par `expense_date ?? created_at` décroissant, séparateur de date par groupe.
- **Notifications** : créées côté client après INSERT expense (→ débiteur) et après INSERT reimbursement (→ payeur).

## API externes

### Jikan API v4 (MyAnimeList — sans clé)
- Recherche : `GET https://api.jikan.moe/v4/manga?q={query}&limit=5`
- Détail : `GET https://api.jikan.moe/v4/manga/{mal_id}`
- Rate limit : ~3 req/s → debounce 500ms

### Open Library (sans clé)
- Recherche : `GET https://openlibrary.org/search.json?q={query}&limit=5&fields=key,title,cover_i,author_name`
- Cover : `https://covers.openlibrary.org/b/id/{cover_i}-M.jpg`
- Debounce 500ms dans `useComicsSearch`

## Conventions de style

- Hauteur des champs : `h-12` (44px)
- Bordures : `rounded-[10px]` pour les inputs, `rounded-[12px]` pour les cards/sheets
- Fond des champs : `bg-[#f2edfa]`
- Bouton primaire : `bg-[#6c63ff] text-white font-semibold rounded-[12px]`
- Blobs décoratifs en fond de page : `absolute rounded-full blur-3xl opacity-20 pointer-events-none`
- Hauteur viewport : `min-h-dvh` (dynamic viewport height pour mobile)
- Padding top des pages (sous le header fixe) : `pt-[76px]`
- iOS tap targets : utiliser `<div onClick>` (pas `<button>` ni `role="button"`) pour les chips décoratifs. Ajouter `min-w-0 min-h-0` aux boutons utilitaires à l'intérieur des chips.
