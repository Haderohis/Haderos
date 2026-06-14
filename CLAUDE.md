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
| `/checklist` | Checklist | Non |
| `/expenses` | Dépenses | Non |
| `/settings` | Paramètres | Non |
| `/collection` | Collection | Oui |
| `/dashboard` | Dashboard | Oui |
| `/sport` | Sport | Oui |
| `/calendar` | Calendrier | Oui |

## Structure des fichiers

```
src/
├── App.jsx                  # Définition des routes
├── main.jsx                 # Point d'entrée
├── pages/
│   ├── Home.jsx
│   ├── Login.jsx
│   ├── Checklist.jsx        # Deux modes : Worklist (DnD, filtres, tags, liens) + Checklist (groupes simples, persistant)
│   ├── Expenses.jsx         # Dépenses partagées + remboursements
│   ├── Settings.jsx         # Placeholder
│   ├── Dashboard.jsx
│   ├── Collection.jsx       # Collection perso (mangas + comics) avec partage
│   ├── Sport.jsx            # Suivi sport : calendrier semaine, exercices, séries
│   └── Calendar.jsx         # Calendrier partagé : événements perso/partagés, vues mois
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
├── sport_add_muscle.sql                # ALTER sport_exercises ADD COLUMN muscle text
├── checklist_items_migration.sql       # Table checklist_items (mode Checklist de /checklist)
├── calendar_migration.sql              # Tables calendar_shares + calendar_events + RLS
├── calendar_add_end_date.sql           # ALTER calendar_events ADD COLUMN end_date date NULL
└── calendar_shared_read_fix.sql        # Recrée policy shared_read sans filtre is_shared
```

## Schéma base de données (Supabase)

### `profiles`
`id` · `first_name` · `last_name` · `display_name` — lié à `auth.users`

### `tasks`
`id` · `label` · `group_name` · `tags` (JSON) · `due_date` · `done` · `completed_at` · `position` · `jira_url` · `figma_url`

### `checklist_items`
`id` · `user_id` · `label` · `group_name` · `done` (bool) · `is_shared` (bool, default false) · `item_date` (date, stocké mais non filtré) · `position` (int) · `created_at`
RLS : `checklist_own_all` (CRUD par `user_id`) · `checklist_shared_select` (SELECT si `is_shared=true` et `collection_shares` accepté) · `checklist_shared_update` (UPDATE idem)
- Tâches persistantes sans filtre de date — supprimées uniquement manuellement
- Groupes gérés côté client dans `localStorage('ck_groups')` et `localStorage('ck_group_shares')`
- Suppression de groupe possible même avec des tâches non cochées

### `expenses`
`id` · `amount` · `description` · `payer_id` · `debtor_id` · `created_by` · `expense_date` (date) · `tags` (text[]) · `created_at`
RLS : SELECT par `payer_id` ou `debtor_id` ; INSERT par `created_by` ; UPDATE par `payer_id` ou `debtor_id` ; DELETE par `created_by`.

### `reimbursements`
`id` · `expense_id` · `reimbursed_by` · `amount` · `reimbursement_date` · `created_at`
RLS : SELECT/INSERT si lié à une dépense accessible. DELETE si payer ou debtor de la dépense.

### `notifications`
`id` · `user_id` · `type` · `message` · `read` · `data` (jsonb) · `created_at`
Types : `new_expense` · `reimbursement` · `collection_share_request` · `collection_share_accepted` · `calendar_share_request` · `calendar_share_accepted` · `calendar_event_shared`
- `collection_share_request` / `calendar_share_request` : `data = { share_id, owner_id, recipient_name }`
- `calendar_event_shared` : message simple, pas de `data`
RLS : SELECT/UPDATE par `user_id` ; INSERT par tout utilisateur authentifié.

### `manga_collection`
`id` · `user_id` · `mal_id` (int) · `title` · `total_volumes` (int, null si inconnu) · `owned_volumes` (int[]) · `cover_url` (text, peut être base64) · `ongoing` (bool) · `category` (text default 'Mangas') · `created_at`
Contrainte unique : `(user_id, mal_id)`
RLS : CRUD par `user_id` + policy `shared_collection_read` (select si partage accepté)

### `collection_wishlist`
`id` · `user_id` · `title` · `category` (text default 'Mangas') · `created_at`
RLS : CRUD par `user_id`.

### `collection_shares`
`id` · `owner_id` · `shared_with_id` · `status` (pending/accepted/declined) · `created_at`
Contrainte unique : `(owner_id, shared_with_id)`
RLS : owner peut select/insert/delete ; recipient peut select/update/delete
- À l'acceptation, un partage inverse est créé automatiquement (bidirectionnel)

### `calendar_shares`
`id` · `owner_id` · `shared_with_id` · `status` (pending/accepted/declined) · `created_at`
Contrainte unique : `(owner_id, shared_with_id)`
RLS : owner peut select/insert/delete ; recipient peut select/update/delete
- Même pattern bidirectionnel que `collection_shares`

### `calendar_events`
`id` · `user_id` · `title` · `event_date` (date) · `end_date` (date, nullable) · `start_time` (time, nullable) · `color` (text, nullable) · `is_shared` (bool) · `created_at`
RLS : `owner_all` (CRUD par `user_id`) + `shared_read` (SELECT si partage accepté — tous les events visibles, pas seulement `is_shared=true`)
- `is_shared = true` signifie "le partenaire participe" (affichage différencié), pas "le partenaire peut voir"
- Tous les events sont visibles par le partenaire qui a un partage accepté

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
- **Temps réel** : `useNotifications`, `Collection.jsx` et `Calendar.jsx` utilisent `supabase.channel()` avec `postgres_changes`
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
Utilisé en interne par `AppHeader`. Gère `collection_share_request` et `calendar_share_request` (boutons Accepter/Refuser). Ne pas importer directement dans les pages.

### FormFields (`src/components/FormFields.jsx`)
- `<TextField label required error ...props>`
- `<DateField label value onChange>`
- `<SelectField label options value onChange>`
- `<SegmentedControl label options value onChange>`
- `<SubmitButton disabled onClick>`
- `<FieldLabel required>`

## Page Checklist (`/checklist`)

### Switch Checklist / Worklist
Switch compact pleine largeur (`h-8`, `bg-soft`, `rounded-[8px]`) persisté dans `localStorage('ck_viewMode')`.
- `viewMode` state : `'checklist'` | `'worklist'`

### Mode Worklist
- Stats (Total / Faites / En retard), navigation par jour, filtres, tags, liens Jira/Figma, DnD
- Barre de recherche + filtre visible
- Tâches du jour courant uniquement ; les non-faites restent sur today
- `top-[248px]` pour le contenu (header 76px + switch + search + date nav)

### Mode Checklist
- Pas de stats, pas de date, pas de tags ni liens
- Organisé par **groupes** (ex : Courses, Ménage) — le bouton `+` crée un groupe, les tâches s'ajoutent à la volée inline dans chaque groupe
- Groupes persistés dans `localStorage('ck_groups')` — existent même vides
- Tâches persistantes sans filtre de date — supprimées uniquement manuellement
- Ajout à la volée inline par groupe (Entrée = valider et rester ouvert, Échap/blur = fermer)
- Suppression individuelle de tâche possible même si cochée
- `top-[188px]` pour le contenu (header 76px + switch + search, sans date nav)
- La navigation de jour est masquée (`hidden`) en mode checklist
- Empty state : "Aucun groupe" si `ckGroups.length === 0` et pas d'items

### Actions sur les groupes (header de groupe)
- **Icône partage** → ouvre BottomSheet "Gérer le partage" avec recherche de profils + chips
- **Icône réinitialiser** → modal de confirmation → supprime toutes les tâches, groupe reste vide
- **Icône supprimer** → modal de confirmation → supprime le groupe et toutes ses tâches

### Création de groupe (`showCkModal`)
- Champ nom du groupe (requis)
- Champ de recherche "Partager avec" : recherche profils par nom, sélection → chips avec ×
- `ckForm` : `{ group: '', sharedWith: [{ id, name }] }`

### Partage checklist
- `ckGroupShares` : `{ groupName: [{ id, name }] }` — persisté dans `localStorage('ck_group_shares')`
- `is_shared = true` sur les items si le groupe a des utilisateurs dans `ckGroupShares`
- RLS : policy `checklist_own_all` (CRUD par `user_id`) + `checklist_shared_select/update` (via `collection_shares` accepté)
- Migration : `supabase/checklist_items_share.sql`
- Items partenaires affichés en lecture seule avec badge amber du prénom

### Décorations cottagecore (tâches checklist)
- 8 patterns, hash = `(parseInt(uuid.slice(-3,-1), 16) + itemIdx * 3) % 8`
- 3 décos par tâche, positions alternées haut/bas avec positions horizontales variées

## Page Collection

### Vues
Switch compact pleine largeur (`h-8`, `bg-soft`) **Collection / Envies** au-dessus du sélecteur de catégorie.
- `viewMode` state : `'collection'` | `'envies'`
- Le sélecteur Mangas/Comics s'applique aux deux vues

### Vue Collection
Affichage des `manga_collection` avec volumes, partage, etc.

#### Catégories
`Mangas` (Jikan API) · `Comics` (Open Library API). Stockées dans `manga_collection.category`.

#### Affichage des cartes
Liste verticale. Chaque carte :
- Ligne 1 : titre (tronqué) + chips "Moi" (violet) / prénom partagé (amber)
- Ligne 2 : cover (34×48px) | chips de volumes scrollables horizontalement | menu ⋮
- Bouton `+` masqué si `ongoing = false` (série terminée)

#### Menu ⋮ (MangaCard)
- **Modifier le titre** → BottomSheet avec TextField titre uniquement
- **Marquer comme terminé / Marquer en cours** → toggle `ongoing` immédiat, masque/affiche le `+`
- **Retirer le dernier tome**
- **Supprimer**

#### Couleurs des chips de volumes (partage)
- `#6c63ff` (violet foncé) — possédé par les deux
- `#ada7fd` (violet clair) — possédé uniquement par moi
- `#fbbf24` (amber) — possédé uniquement par l'autre
- `#d5d3dc` (gris) — non possédé

#### Partage de collection
- Bidirectionnel : à l'acceptation, un partage inverse est créé automatiquement
- `fetchCollection` fusionne `my items` + `shared items` par `mal_id`
- Temps réel : abonnement sur `collection_shares` pour refetch auto
- ShareSheet : liste les partages en cours avec statut, suppression bidirectionnelle

#### Recherche / ajout
- Mangas : `useMangaSearch` → Jikan `/manga?q=&limit=5`, fallback detail si volumes null
- Comics : `useComicsSearch` → Open Library `/search.json?q=&limit=5&fields=key,title,cover_i,author_name`
- Création manuelle disponible dès qu'il y a du texte (même si résultats présents)
- Titre éditable dans la vue de confirmation
- Image cliquable → picker fichier → resize canvas → base64

### Vue Envies (`collection_wishlist`)
Liste de souhaits sans notion de tomes ni de partage.
- `WishlistCard` : titre + bouton supprimer uniquement
- `AddWishlistSheet` : BottomSheet avec un seul champ titre
- Migration : `supabase/collection_wishlist_migration.sql`

## Page Sport

### Calendrier semaine
- Sous-header `sticky top-[76px]` (dans `pt-[76px]` wrapper, même pattern que Collection)
- Navigation semaine passée/courante uniquement (pas de futur)
- Cellules : lettre du jour + icône selon majorité des exercices du jour (altère musculation, coureur cardio)
- Icône calendrier : `sport_exercises(type)` chargé → si `cardioCount > total/2` → `CardioIcon`, sinon `DumbbellIcon`
- Jour sélectionné : `bg-[#6c63ff] rounded-[4px]` · Jour actuel : `border border-[#6c63ff]`
- L'icône ne s'affiche que si au moins 1 exercice (pas de session vide)
- `toDateStr()` définie dans `src/lib/date.js`, importée par Sport et Checklist — utilise `getFullYear/Month/Date` (pas `toISOString`) pour éviter le décalage timezone
- Les perfs précédentes sont chargées en parallèle (`Promise.all`) au lieu de séquentiellement
- Autocomplete exercices : 1 seule requête via join `!inner` sur `sport_sessions`, s'ouvre vers le haut (`bottom-full`)

### Cartes exercice
- Header : icône du **muscle ciblé** (stroke SVG) sur fond violet `rounded-[4px]` (37×36px) + nom + muscle label + crayon édition + × supprimer
- Colonnes **PREC / KG / REPS** (musculation) ou **PREC / Kcal / Durée** (cardio)
- Durée cardio : format `M` (minutes entières) ou `M,SS` (ex: `60` = 60min, `1,30` = 1min30) — `parseDuration()` / `formatDuration()` dans Sport.jsx
- PREC = données de la session précédente pour ce numéro de série exact
- Toutes les séries validées : `bg-[rgba(108,99,255,0.08)]`
- ✓ rempli cliquable → remet la série en édition inline (UPDATE en DB à la revalidation)
- ✓ outline sur lignes en attente (disabled si champs vides) · pas de croix sur les lignes en attente
- Saisir le poids sur la première ligne le propage à toutes les lignes en attente
- Valeurs min="0" sur tous les champs numériques

### Muscles (`sport_exercises.muscle`)
- 7 groupes : `pectoraux` · `biceps` · `triceps` · `dos` · `jambes` · `epaules` · `abdos`
- Icônes SVG style stroke (fill:none, strokeWidth:1.8) dans la constante `MUSCLES` — abdos : grille 3×2 rectangles
- Migration : `supabase/sport_add_muscle.sql` (ALTER TABLE sport_exercises ADD COLUMN muscle text)
- Chips sur **une seule ligne scrollable horizontalement** (`overflow-x-auto`, `shrink-0` sur chaque chip)
- Chips masquées si type `cardio` sélectionné dans la modal
- Sélectionner un chip pré-sélectionne aussi `newExerciseMuscle`
- Choisir une suggestion autocomplete hérite du muscle de l'exercice existant

### Flow d'ajout exercice
- BottomSheet avec `innerClassName="overflow-visible"` pour que l'autocomplete ne soit pas clippé
- Formulaire : input nom (autocomplete) → chips muscle (masquées si cardio) → toggle muscu/cardio → bouton Ajouter
- Icône cardio : `CardioIcon` (coureur filled) — même composant dans la modal et les cartes exercice
- Session auto-créée au premier `handleAddSet` via `ensureSession()`
- Exercice ajouté → ligne de saisie ouverte automatiquement
- Plusieurs lignes en attente simultanées possibles ("Ajouter une serie" toujours visible)
- Validation d'une série musculation → suppression de la ligne + déclenchement du `RestTimer`
- Validation d'une série cardio → suppression de la ligne uniquement (pas de RestTimer)

### Édition exercice
- Bouton crayon dans le header de la carte → BottomSheet avec nom pré-rempli + chips muscle
- `handleSaveExercise` → UPDATE `name` + `muscle` en DB

### RestTimer (`src/components/RestTimer.jsx`)
- Overlay fixe en **haut** de l'écran (`fixed top-6`), z-50
- 90 secondes, cercle SVG progressif, bouton "Passer"
- Bip sonore à la fin via Web Audio API (2 bips courts + 1 long)
- Se ferme automatiquement 1,2s après le bip

## Page Calendrier (`/calendar`)

### Vue mensuelle
- Navigation `< Mois Année >` sticky sous le header (`top-[76px]`) — flèches simples sans fond rond
- Grille `grid-cols-7`, en-têtes L M M J V S D
- Jour sélectionné : `bg-primary rounded-full text-white` · Aujourd'hui : `border border-primary rounded-full`
- Barres d'événements sous les numéros (pas de dots) — span multi-jours entre colonnes
- `toDateStr()` importé depuis `src/lib/date.js`
- Icône sport (haltère ou coureur) en fond des numéros de jours à `opacity: 0.45` si une séance existe ce jour — type majoritaire parmi les exercices de la séance (cardio si `cardioCount > total/2`, sinon strength)

### Barres d'événements
- Approche `allBars` : tous les events traités uniformément, qu'ils durent 1 jour ou plusieurs
- `endDs = e.end_date ?? e.event_date` → single-day = barre dans une seule cellule
- Positionnement : `left: calc(startCol/7 * 100% + inset)` / `right: calc((6-endCol)/7 * 100% + inset)`
- Border-radius : arrondi uniquement du côté où l'event commence/finit dans la semaine (plat si coupe la ligne)
- Couleurs : mes events → selon `color` stockée + thème · partner → amber (`rgba(251,191,36,0.85)`)
- Clic sur une barre → sélectionne le premier jour couvert dans la semaine
- **Lane packing** : events non-chevauchants partagent la même ligne — algorithme d'assignation par lane, hauteur du bloc = `maxLane * 20px`

### Panel événements du jour
- S'affiche sous la grille quand un jour est sélectionné
- Empty state : `bg-white/60 border rounded-[12px] h-[64px]` avec titre bold primary + sous-titre accent (même pattern que les autres écrans)
- EventCard : fond `bg-soft` (violet) si mes events ou si je participe · fond `rgba(251,191,36,0.10)` (amber) si event partenaire sans participation
- Badges : amber "Prénom participe" sur mes events `is_shared=true` · violet "Je participe" sur events partenaire `is_shared=true` · amber "Prénom" sur events partenaire `is_shared=false`
- Boutons crayon + × uniquement sur mes propres events (pattern `style={{ minWidth:0, minHeight:0 }}`)

### Partage (`CalendarShareSheet`)
- Même pattern que Collection : recherche par profil, invitation → notification `calendar_share_request`
- Bidirectionnel : `useNotifications.js` crée le partage inverse à l'acceptation
- Suppression bidirectionnelle (supprime les deux sens en même temps)
- ShareChip dans `titleExtra` du header

### Couleurs d'événements
- 7 couleurs : `violet` · `rose` · `red` · `orange` · `green` · `teal` · `blue` — stockées dans `calendar_events.color`
- Chaque couleur a une variante `bar`/`card` (thème violet) et `barCC`/`cardCC` (thème cottagecore — tons terreux/naturels, opacité 0.92)
- `getEventColor(colorKey, isMine, isCottagecore)` → `{ bar, card, text }` — events partenaire toujours amber
- Sélecteur : bulle unique colorée à droite du titre de la modal → dropdown au clic avec les 7 couleurs (couleurs adaptées au thème actif)

### Formulaire ajout/édition
- Titre (requis) · Date début · Date de fin (optionnelle) · Heure (optionnelle) · Couleur (bulle+dropdown) · Toggle "[Prénom] participe" (visible si partage accepté)
- `end_date` ignorée si ≤ `event_date` (stocké null)
- `fetchEvents()` appelé directement après INSERT (pas de dépendance au temps réel pour le rafraîchissement immédiat)

### Notifications
- `calendar_share_request` : envoyé à l'invitation de partage
- `calendar_share_accepted` : envoyé à l'acceptation (géré par `useNotifications.js`)
- `calendar_event_shared` : envoyé au partenaire quand `is_shared=true` (ajout ou modif)

### Icône sport sur le calendrier
- Icône haltère (strength) ou coureur (cardio) à `opacity: 0.45` dans le fond du numéro de jour
- Couleur : `white` si jour sélectionné · cottagecore `#a36252` · violet `rgb(var(--color-primary))`
- Visible uniquement si la séance a au moins 1 exercice (sessions vides ignorées)
- Type = majoritaire parmi les exercices (`cardioCount > total/2` → cardio, sinon strength)

### Cottagecore
- EventCards : 4 variantes, `decoIdx = parseInt(id.replace(/-/g,'').slice(-2), 16) % 4`
- Bouton fixe : 6 décos (même pattern Expenses/Sport)

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
- **AppHeader** : `h-[76px]`, `items-center` — burger et titre centrés verticalement. Ne pas utiliser `items-end pb-4`.
- **Switch de vue** (Checklist/Worklist, Collection/Envies) : `flex bg-soft rounded-[8px] p-[3px] h-8`, boutons avec `flex-1 text-[12px] font-semibold rounded-[6px]`, actif = `bg-white text-primary shadow-sm`, inactif = `text-muted`. Toujours pleine largeur.
- **Version dans le Drawer** : "HadeTools v0.1"
- iOS tap targets : utiliser `<div onClick>` (pas `<button>` ni `role="button"`) pour les chips décoratifs. Ajouter `min-w-0 min-h-0` aux boutons utilitaires à l'intérieur des chips.

## Système de thèmes

### ThemeContext (`src/contexts/ThemeContext.jsx`)
- Expose `{ theme, setTheme }` + constante `THEMES` (liste des thèmes disponibles)
- Persisté en `localStorage`, appliqué via `document.documentElement.setAttribute('data-theme', theme)`
- Thèmes disponibles : `violet` (défaut) · `cottagecore`
- Usage dans les pages : `const { theme } = useTheme()` + `const isCottagecore = theme === 'cottagecore'`

### CSS variables (`src/styles/index.css`)
- Tokens RGB sans virgule pour supporter l'opacité : `rgb(var(--color-primary) / 0.08)`
- Tokens Tailwind sémantiques : `primary` · `dark` · `base` · `muted` · `soft` · `accent`
- Classe `.cc-border` : active uniquement sur `[data-theme="cottagecore"]` → `border-color: #490D0D; border-width: 2px`

### Thème cottagecore — règles de décoration

#### Composants SVG (`src/components/CottageDecor.jsx`)
Exporte 4 SVG inline réutilisables : `LeafSmall` · `LeafBig` · `Flower` · `Mushroom`
- Props : `width` (défaut variable) · `rotate` (degrés) · `style` (objet style React)
- Toujours `pointer-events-none select-none`
- `LeafSmall` < `LeafBig` en taille ; `Mushroom` légèrement plus grand que les autres

#### Placement des décorations
- **Header** : éléments entre le burger et le titre, et entre le titre et la cloche — `position:absolute` par rapport au wrapper de page, `zIndex:35`
- **Cards / items** : proportionnel à la taille de l'élément. Wrapper de la carte doit être `relative`. Répartir sur haut, bas et côtés (1–2 coins max, privilégier haut/bas/côtés). Nombre actuel par élément :
  - TaskItem (Checklist) : 3 décos (4 patterns selon hash ASCII de l'id)
  - MangaCard (Collection) : 4 décos (4 patterns selon `_decoIdx % 4`)
  - ExpenseCard (Expenses) : 5 décos (4 patterns selon 2 derniers hex de l'UUID `% 4`)
  - Carte exercice (Sport) : 5 décos (5 patterns selon `exoIdx % 5`, `zIndex:20`)
  - EventCard (Calendar) : 4 décos (4 patterns selon `parseInt(id.replace(/-/g,'').slice(-2), 16) % 4`)
  - Settings card : 8 décos
  - Home card : ~12 décos positionnées depuis le wrapper de page
- **Bouton d'action fixe** : wrapper `<div className="fixed bottom-4 left-4 right-4 z-10" style={{height:48}}>` avec `<button>` pleine taille dedans + décos en `position:absolute` autour (`zIndex:11`). Nombre actuel :
  - Checklist, Collection, Expenses, Calendar : 6 décos chacun
  - Sport : 7 décos
- **Home** : décos positionnées par rapport au wrapper de page (`relative`), réparties sur les 4 bords de la `<main>` card (haut, bas, côté gauche ~35/50/65%, côté droit ~32/50/66%)

#### Règles overflow
- Les pages avec `overflow-hidden` sur un conteneur intermédiaire (ex: Checklist `<main>`) clippent les décos à valeurs négatives → utiliser `position` sans valeurs négatives ou retirer le `overflow-hidden` si le scroll est géré par un enfant
- Le wrapper racine des pages a `overflow-hidden` (pour les blobs) → les décos positionnées par rapport à lui ne doivent pas dépasser les bords de l'écran
- Ne jamais combiner `absolute` et `relative` sur le même élément (Tailwind last-write-wins → casse le layout)

#### Borders cottagecore
- Ajouter `cc-border` sur toutes les cards/items et sur les boutons d'action principaux
- Boutons d'action : ajouter aussi `border-2` pour que `cc-border` s'applique (la classe ne définit que la couleur+épaisseur)
- Thème violet : garder les borders fins d'origine (`border-white/85` etc.), ne pas modifier
