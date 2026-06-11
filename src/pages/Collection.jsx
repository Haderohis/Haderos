import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { useMangaSearch } from '../hooks/useMangaSearch'
import AppHeader from '../components/AppHeader'
import BottomSheet from '../components/BottomSheet'
import { TextField, FieldLabel } from '../components/FormFields'

const CATEGORIES = ['Mangas', 'Jeux vidéo', 'Comics', 'Livres', 'Cartes']

function formatOwnedLabel(ownedArr, total) {
  const count = ownedArr.length
  if (total) return `${count} / ${total} tomes`
  return `${count} tome${count !== 1 ? 's' : ''}`
}

// ─── MangaCard ────────────────────────────────────────────────────────────────
function MangaCard({ item, onDelete }) {
  const owned = item.owned_volumes ?? []
  const missing = item.total_volumes
    ? Array.from({ length: item.total_volumes }, (_, i) => i + 1).filter(n => !owned.includes(n))
    : []

  return (
    <div className="relative flex flex-col rounded-[16px] overflow-hidden bg-white/60 backdrop-blur-sm border border-white/80 shadow-sm">
      {item.cover_url
        ? <img src={item.cover_url} alt={item.title} className="w-full aspect-[2/3] object-cover" />
        : <div className="w-full aspect-[2/3] bg-[#f2edfa] flex items-center justify-center">
            <span className="text-[#a49ffe] text-[11px] text-center px-2">Pas de couverture</span>
          </div>
      }
      <div className="px-3 py-3 flex flex-col gap-1.5">
        <p className="text-[13px] font-semibold text-[#211738] leading-snug line-clamp-2">{item.title}</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-[#6c63ff] font-medium bg-[#f2edfa] px-2 py-0.5 rounded-full whitespace-nowrap">
            {formatOwnedLabel(owned, item.total_volumes)}
          </span>
          {item.ongoing && (
            <span className="text-[10px] text-[#f59e0b] font-semibold bg-[#fef3c7] px-2 py-0.5 rounded-full whitespace-nowrap">
              en cours
            </span>
          )}
          {missing.length > 0 && (
            <span className="text-[10px] text-[#ef4444] font-semibold bg-[#fee2e2] px-2 py-0.5 rounded-full whitespace-nowrap">
              {missing.length} manquant{missing.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => onDelete(item.id)}
        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[rgba(33,23,56,0.45)] flex items-center justify-center"
        aria-label="Supprimer"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

// ─── VolumeGrid ───────────────────────────────────────────────────────────────
function VolumeGrid({ owned, total, ongoing, onChange }) {
  const lastOwned = owned.length ? Math.max(...owned) : 0
  const [displayMax, setDisplayMax] = useState(() => total ?? Math.max(10, lastOwned + 5))

  const toggle = (n) => {
    if (owned.includes(n)) onChange(owned.filter(v => v !== n))
    else onChange([...owned, n].sort((a, b) => a - b))
  }

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>Tomes possédés — {owned.length}{total ? ` / ${total}` : ''}</FieldLabel>
      <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto pr-1">
        {Array.from({ length: displayMax }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            onClick={() => toggle(n)}
            className={`w-9 h-9 rounded-[8px] text-[13px] font-semibold transition-colors ${
              owned.includes(n) ? 'bg-[#6c63ff] text-white' : 'bg-[#f2edfa] text-[#736694]'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      {(!total || ongoing) && (
        <button onClick={() => setDisplayMax(d => d + 10)} className="text-[12px] text-[#6c63ff] font-medium self-start">
          + Afficher 10 de plus
        </button>
      )}
    </div>
  )
}

// ─── AddMangaSheet ────────────────────────────────────────────────────────────
function AddMangaSheet({ onClose, onSaved }) {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [owned, setOwned] = useState([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const { results, loading: searching, error: searchError } = useMangaSearch(query)

  const handleSelect = async (manga) => {
    setSelected(manga)
    setOwned([])
    setQuery('')
    if (manga.volumes == null) {
      setLoadingDetail(true)
      try {
        const res = await fetch(`https://api.jikan.moe/v4/manga/${manga.mal_id}`)
        if (res.ok) {
          const json = await res.json()
          const detail = json.data
          setSelected({ ...manga, volumes: detail.volumes ?? null, ongoing: detail.publishing ?? manga.ongoing })
        }
      } catch {}
      setLoadingDetail(false)
    }
  }

  const handleSave = async () => {
    if (!selected || !user || owned.length === 0) return
    setSaving(true)
    setSaveError(null)
    const { error } = await supabase.from('manga_collection').upsert(
      {
        user_id: user.id,
        mal_id: selected.mal_id,
        title: selected.title,
        total_volumes: selected.volumes,
        owned_volumes: owned,
        cover_url: selected.cover_url,
        ongoing: selected.ongoing,
      },
      { onConflict: 'user_id,mal_id' }
    )
    setSaving(false)
    if (error) { setSaveError(error.message); return }
    onSaved()
    onClose()
  }

  return (
    <BottomSheet onClose={onClose}>
      <h2 className="text-[17px] font-bold text-[#211738]">Ajouter un manga</h2>
      {!selected && (
        <>
          <TextField
            label="Rechercher un titre"
            placeholder="Ex: One Piece, Naruto..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          {searching && <p className="text-[13px] text-[#736694] text-center py-2">Recherche...</p>}
          {searchError && <p className="text-[12px] text-red-500">{searchError}</p>}
          {!searching && results.length > 0 && (
            <ul className="flex flex-col divide-y divide-[#f2edfa]">
              {results.map(m => (
                <li key={m.mal_id}>
                  <button onClick={() => handleSelect(m)} className="flex items-center gap-3 w-full py-3 text-left">
                    {m.cover_url
                      ? <img src={m.cover_url} alt={m.title} className="w-10 h-14 object-cover rounded-[6px] shrink-0" />
                      : <div className="w-10 h-14 bg-[#f2edfa] rounded-[6px] shrink-0" />
                    }
                    <div>
                      <p className="text-[14px] font-medium text-[#211738]">{m.title}</p>
                      <p className="text-[12px] text-[#736694]">
                        {m.volumes ? `${m.volumes} tome${m.volumes > 1 ? 's' : ''}${m.ongoing ? ' parus' : ''}` : m.ongoing ? 'En cours' : 'Terminé'}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {selected && (
        <>
          <div className="flex items-center gap-4 p-3 bg-[#f2edfa] rounded-[12px]">
            {selected.cover_url && (
              <img src={selected.cover_url} alt={selected.title} className="w-14 h-20 object-cover rounded-[8px] shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold text-[#211738] truncate">{selected.title}</p>
              <p className="text-[12px] text-[#6c63ff] mt-1">
                {loadingDetail ? 'Récupération...'
                  : selected.volumes
                    ? `${selected.volumes} tome${selected.volumes > 1 ? 's' : ''} ${selected.ongoing ? 'parus' : 'au total'}`
                    : selected.ongoing ? 'Nombre de tomes inconnu' : 'Terminé'
                }
              </p>
            </div>
            <button onClick={() => setSelected(null)} className="text-[#736694] text-[12px] underline shrink-0">Changer</button>
          </div>
          {!loadingDetail && (
            <VolumeGrid owned={owned} total={selected.volumes} ongoing={selected.ongoing} onChange={setOwned} />
          )}
          {saveError && <p className="text-[12px] text-red-500">{saveError}</p>}
          <button
            onClick={handleSave}
            disabled={saving || owned.length === 0}
            className="h-12 w-full bg-[#6c63ff] text-white font-semibold text-[15px] rounded-[12px] disabled:opacity-40"
          >
            {saving ? 'Enregistrement...' : owned.length === 0 ? 'Sélectionne au moins un tome' : 'Ajouter à ma collection'}
          </button>
        </>
      )}
    </BottomSheet>
  )
}

// ─── ShareSheet ───────────────────────────────────────────────────────────────
function ShareSheet({ sharedWith, onClose }) {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [added, setAdded] = useState(sharedWith ?? [])
  const [saving, setSaving] = useState(false)
  const [ownerProfile, setOwnerProfile] = useState(null)

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('first_name, last_name, display_name').eq('id', user.id).single()
      .then(({ data }) => setOwnerProfile(data))
  }, [user])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, display_name')
        .neq('id', user?.id)
        .or(`display_name.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
        .limit(5)
      setResults(data ?? [])
      setSearching(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, user])

  const toggle = (profile) => {
    setAdded(prev =>
      prev.find(p => p.id === profile.id)
        ? prev.filter(p => p.id !== profile.id)
        : [...prev, profile]
    )
  }

  const displayName = (p) => p.display_name || `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Utilisateur'

  const handleConfirm = async () => {
    if (!added.length) { onClose([]); return }
    setSaving(true)

    const ownerName = ownerProfile ? displayName(ownerProfile) : 'Un utilisateur'

    for (const profile of added) {
      const { data: share } = await supabase
        .from('collection_shares')
        .upsert(
          { owner_id: user.id, shared_with_id: profile.id, status: 'pending' },
          { onConflict: 'owner_id,shared_with_id' }
        )
        .select()
        .single()

      if (share) {
        await supabase.from('notifications').insert({
          user_id: profile.id,
          type: 'collection_share_request',
          message: `${ownerName} souhaite partager sa collection avec toi.`,
          read: false,
          data: {
            share_id: share.id,
            owner_id: user.id,
            recipient_name: displayName(profile),
          },
        })
      }
    }

    setSaving(false)
    onClose(added)
  }

  return (
    <BottomSheet onClose={() => onClose(added)}>
      <h2 className="text-[17px] font-bold text-[#211738]">Partager la collection</h2>

      <div className="flex flex-col gap-2">
        <label className="text-[12px] font-medium text-[#736694]">Utilisateurs</label>
        <div className="relative bg-[#f2edfa] rounded-[10px] min-h-12 px-3 py-2 flex flex-wrap gap-2 items-center">
          {added.map(p => (
            <span key={p.id} className="flex items-center gap-1 text-[12px] font-medium px-2 py-1 rounded-full shrink-0 bg-[#e0d9ff] text-[#6c63ff]">
              {displayName(p)}
              <button
                onPointerDown={e => { e.preventDefault(); toggle(p) }}
                className="leading-none w-4 h-4 flex items-center justify-center"
              >&times;</button>
            </span>
          ))}
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={added.length === 0 ? 'Prénom, nom ou pseudo...' : ''}
            className="bg-transparent text-[14px] text-[#211738] outline-none placeholder:text-[#a49ffe] min-w-[80px] flex-1"
            autoFocus
          />
          {searching && (
            <span className="text-[11px] text-[#a49ffe] shrink-0">Recherche...</span>
          )}
          {!searching && results.length > 0 && (
            <ul className="absolute left-0 right-0 top-full mt-1 bg-white rounded-[10px] shadow-lg z-10 overflow-hidden border border-[#f2edfa]">
              {results.map(p => (
                <li key={p.id}>
                  <button
                    onPointerDown={e => { e.preventDefault(); toggle(p); setQuery('') }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#f2edfa]"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#f2edfa] flex items-center justify-center shrink-0">
                      <span className="text-[12px] font-bold text-[#6c63ff]">
                        {((p.first_name?.[0] ?? '') + (p.last_name?.[0] ?? '')).toUpperCase() || '?'}
                      </span>
                    </div>
                    <p className="flex-1 text-[13px] font-medium text-[#211738]">{displayName(p)}</p>
                    {added.find(a => a.id === p.id) && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#6c63ff">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <button
        onClick={handleConfirm}
        disabled={saving}
        className="h-12 w-full bg-[#6c63ff] text-white font-semibold text-[15px] rounded-[12px] disabled:opacity-60"
      >
        {saving ? 'Envoi...' : added.length > 0 ? `Envoyer ${added.length} invitation${added.length > 1 ? 's' : ''}` : 'Fermer'}
      </button>
    </BottomSheet>
  )
}

// ─── CategoryDropdown ─────────────────────────────────────────────────────────
function CategoryDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between gap-2 bg-white/70 border border-white/85 rounded-[12px] px-4 h-11 w-full"
      >
        <span className="text-[14px] font-semibold text-[#211738]">{value}</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#211738"
          className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M7 10l5 5 5-5H7z" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-20 bg-white/90 backdrop-blur-md border border-white/80 rounded-[12px] shadow-lg overflow-hidden">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => { onChange(cat); setOpen(false) }}
              className={`flex items-center justify-between w-full px-4 h-11 text-[14px] font-medium ${
                cat === value ? 'text-[#6c63ff] bg-[#f2edfa]' : 'text-[#211738]'
              }`}
            >
              {cat}
              {cat === value && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#6c63ff">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── ShareChip ────────────────────────────────────────────────────────────────
function ShareChip({ isShared, onClick }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-[5px] bg-[#e9ebfd] rounded-full px-2.5 h-6 cursor-pointer"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="#7168ff">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
      </svg>
      <span className="text-[10px] font-medium leading-none text-[#7168ff]">{isShared ? 'Partagée' : 'Partager'}</span>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="#7168ff">
        <path d="M7 10l5 5 5-5H7z" />
      </svg>
    </div>
  )
}

// ─── Collection (page) ────────────────────────────────────────────────────────
export default function Collection() {
  const { user } = useAuth()
  const [mangas, setMangas] = useState([])
  const [loading, setLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [sharedWith, setSharedWith] = useState([])
  const [category, setCategory] = useState('Mangas')
  const [search, setSearch] = useState('')

  const fetchCollection = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('manga_collection')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setMangas(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchCollection() }, [fetchCollection])

  const handleDelete = async (id) => {
    await supabase.from('manga_collection').delete().eq('id', id)
    setMangas(prev => prev.filter(m => m.id !== id))
  }

  const filtered = useMemo(() =>
    search.trim()
      ? mangas.filter(m => m.title.toLowerCase().includes(search.toLowerCase()))
      : mangas,
    [mangas, search]
  )

  const categoryLabel = category === 'Mangas' ? 'manga' : category.toLowerCase()

  const shareChip = (
    <ShareChip
      isShared={sharedWith.length > 0}
      onClick={() => setShareOpen(true)}
    />
  )

  return (
    <div className="relative min-h-dvh bg-[#f6f4f9] overflow-hidden">
      <div className="absolute -top-10 -left-10 w-64 h-64 rounded-full bg-[#c4b5fd] opacity-20 blur-3xl pointer-events-none" />
      <div className="absolute top-32 right-0 w-56 h-56 rounded-full bg-[#a5f3fc] opacity-10 blur-3xl pointer-events-none" />

      <AppHeader title="Collection" titleExtra={shareChip} />

      {/* Barre de recherche */}
      <div className="pt-[76px]">
        <div className="bg-white/55 backdrop-blur-sm border-b border-white/80 px-4 py-3 flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-white/70 border border-white/85 rounded-[8px] px-3 h-[44px]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#a49ffe">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher"
              className="flex-1 bg-transparent text-[14px] font-semibold text-[#211738] placeholder:text-[#ada7fd] outline-none"
            />
          </div>
          <button className="w-[44px] h-[44px] flex items-center justify-center bg-white/75 border border-white/85 rounded-[8px]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#736694">
              <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
            </svg>
          </button>
        </div>

        <main className="px-4 pb-28">
          <div className="mt-4 mb-3">
            <CategoryDropdown value={category} onChange={setCategory} />
          </div>

          {loading ? (
            <p className="text-[14px] text-[#736694] text-center mt-12">Chargement...</p>
          ) : filtered.length === 0 ? (
            <div className="bg-white/60 border border-[#c0befe]/50 rounded-[12px] h-[64px] flex flex-col items-center justify-center mt-2">
              <p className="text-[22px] font-bold text-[#6c63ff] leading-tight">
                {search ? 'Aucun résultat' : `Aucun ${categoryLabel}`}
              </p>
              <p className="text-[11px] text-[#a49ffe]">pour le moment</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {filtered.map(item => (
                <MangaCard key={item.id} item={item} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Bouton fixe en bas */}
      <div className="fixed bottom-4 left-4 right-4 z-10">
        <button
          onClick={() => setSheetOpen(true)}
          className="w-full h-12 bg-[#6c63ff] text-white font-semibold text-[14px] rounded-[12px]"
        >
          Ajouter un {categoryLabel}
        </button>
      </div>

      {sheetOpen && (
        <AddMangaSheet onClose={() => setSheetOpen(false)} onSaved={fetchCollection} />
      )}
      {shareOpen && (
        <ShareSheet
          sharedWith={sharedWith}
          onClose={(updated) => {
            if (updated) setSharedWith(updated)
            setShareOpen(false)
          }}
        />
      )}
    </div>
  )
}
