import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { useMangaSearch } from '../hooks/useMangaSearch'
import { useComicsSearch } from '../hooks/useComicsSearch'
import AppHeader from '../components/AppHeader'
import { useTheme } from '../contexts/ThemeContext'
import { LeafSmall, LeafBig, Flower, Mushroom } from '../components/CottageDecor'
import BottomSheet from '../components/BottomSheet'
import { TextField, FieldLabel } from '../components/FormFields'

const CATEGORIES = ['Mangas', 'Comics']

function formatOwnedLabel(ownedArr, total) {
  const count = ownedArr.length
  if (total) return `${count} / ${total} tomes`
  return `${count} tome${count !== 1 ? 's' : ''}`
}

// ─── MangaCard ────────────────────────────────────────────────────────────────
function MangaCard({ item, onDelete, onUpdateOwned, onCreateOwned, isCottagecore = false }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [myOwned, setMyOwned] = useState(item.myOwned ?? [])
  const [displayMax, setDisplayMax] = useState(() => {
    const allOwned = [...(item.myOwned ?? []), ...(item.theirOwned ?? [])]
    const maxOwned = allOwned.length ? Math.max(...allOwned) : 0
    const base = item.total_volumes ?? maxOwned
    return item.ongoing ? Math.max(base, maxOwned + 5) : base
  })

  const chipStyle = (n) => {
    const mine = myOwned.includes(n)
    const theirs = item.theirOwned.includes(n)
    if (mine && theirs) return 'bg-primary text-white'
    if (mine) return 'bg-accent text-black'
    if (theirs) return 'bg-[#fbbf24] text-black'
    return 'bg-[#d5d3dc] text-black'
  }

  const toggleVolume = async (n) => {
    const next = myOwned.includes(n)
      ? myOwned.filter(v => v !== n)
      : [...myOwned, n].sort((a, b) => a - b)
    setMyOwned(next)
    if (item.myItemId) {
      await onUpdateOwned(item.myItemId, next)
    } else {
      await onCreateOwned(item, next)
    }
  }

  const changeDisplayMax = async (next) => {
    setDisplayMax(next)
    const id = item.myItemId ?? item.theirItemId
    if (id) await supabase.from('manga_collection').update({ total_volumes: next }).eq('id', id)
  }

  return (
    <div className={`bg-white/70 border rounded-[8px] p-2 flex flex-col gap-2 relative ${isCottagecore ? 'cc-border' : 'border-white/85'}`}>
      {isCottagecore && item._decoIdx === 0 && <><LeafBig   width={22} rotate={-25} style={{ position:'absolute', left:-9,  top:-8,  zIndex:10, pointerEvents:'none' }} /><Flower    width={14} rotate={20}  style={{ position:'absolute', left:'44%',top:-9,  zIndex:10, pointerEvents:'none' }} /><LeafSmall width={12} rotate={70}  style={{ position:'absolute', right:-5, bottom:-5,zIndex:10, pointerEvents:'none' }} /><Mushroom  width={16} rotate={-8}  style={{ position:'absolute', right:-7, top:'35%',zIndex:10, pointerEvents:'none' }} /></>}
      {isCottagecore && item._decoIdx === 1 && <><Mushroom  width={24} rotate={10}  style={{ position:'absolute', right:-9, top:-8,  zIndex:10, pointerEvents:'none' }} /><LeafSmall width={12} rotate={55}  style={{ position:'absolute', left:'40%',top:-7,  zIndex:10, pointerEvents:'none' }} /><Flower    width={14} rotate={-20} style={{ position:'absolute', left:-6,  bottom:-5,zIndex:10, pointerEvents:'none' }} /><LeafBig   width={16} rotate={30}  style={{ position:'absolute', left:-7,  top:'30%',zIndex:10, pointerEvents:'none' }} /></>}
      {isCottagecore && item._decoIdx === 2 && <><Flower    width={16} rotate={30}  style={{ position:'absolute', left:-7,  top:-7,  zIndex:10, pointerEvents:'none' }} /><LeafSmall width={12} rotate={65}  style={{ position:'absolute', left:'46%',top:-6,  zIndex:10, pointerEvents:'none' }} /><LeafBig   width={18} rotate={-10} style={{ position:'absolute', right:-8, top:-6,  zIndex:10, pointerEvents:'none' }} /><Mushroom  width={15} rotate={20}  style={{ position:'absolute', right:-6, bottom:-5,zIndex:10, pointerEvents:'none' }} /></>}
      {isCottagecore && item._decoIdx === 3 && <><LeafSmall width={13} rotate={50}  style={{ position:'absolute', left:-5,  top:-6,  zIndex:10, pointerEvents:'none' }} /><Flower    width={14} rotate={-30} style={{ position:'absolute', left:'42%',top:-7,  zIndex:10, pointerEvents:'none' }} /><Mushroom  width={20} rotate={-15} style={{ position:'absolute', right:-8, bottom:-7,zIndex:10, pointerEvents:'none' }} /><LeafBig   width={16} rotate={45}  style={{ position:'absolute', left:-7,  bottom:-5,zIndex:10, pointerEvents:'none' }} /></>}
      {/* Row 1 — title + ownership chips + "En cours" */}
      <div className="flex items-center gap-1.5 min-w-0">
        <p className="text-[14px] font-bold text-dark leading-snug truncate flex-1 min-w-0">{item.title}</p>
        {item.myItemId && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-soft text-primary shrink-0 whitespace-nowrap">Moi</span>
        )}
        {item.theirName && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#fef3c7] text-[#d97706] shrink-0 whitespace-nowrap">{item.theirName}</span>
        )}
      </div>

      {/* Row 2 — cover + volumes + menu */}
      <div className="flex items-center gap-3">
        {item.cover_url
          ? <img src={item.cover_url} alt={item.title} className="w-[34px] h-[48px] object-cover rounded-[4px] shrink-0" />
          : <div className="w-[34px] h-[48px] bg-soft rounded-[4px] shrink-0" />
        }

        {/* Volume chips — horizontal scroll, centered when few */}
        <div className="flex-1 overflow-x-auto min-w-0 flex">
          <div className="flex items-center gap-1 mx-auto py-1 px-1">
            {Array.from({ length: displayMax }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                onClick={() => toggleVolume(n)}
                className={`h-[32px] min-w-[24px] px-1 flex items-center justify-center rounded-[2px] text-[14px] font-semibold transition-colors ${chipStyle(n)}`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => changeDisplayMax(displayMax + 1)}
              className="h-[32px] w-[32px] flex items-center justify-center rounded-[2px] text-[18px] font-semibold text-primary bg-soft"
              aria-label="Ajouter un tome"
            >
              +
            </button>
          </div>
        </div>

        {/* Three-dot menu */}
        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="w-8 h-8 flex items-center justify-center"
            aria-label="Options"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="rgb(var(--color-muted))">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-[10px] shadow-lg border border-[#f0ebfa] overflow-hidden min-w-[140px]">
              <button
                onClick={() => { setMenuOpen(false); changeDisplayMax(Math.max(displayMax - 1, myOwned.length > 0 ? Math.max(...myOwned) : 0)) }}
                className="w-full px-4 py-3 text-left text-[13px] text-dark font-medium hover:bg-soft border-b border-[#f0ebfa]"
              >
                Retirer le dernier tome
              </button>
              {item.myItemId && (
                <button
                  onClick={() => { setMenuOpen(false); onDelete(item.myItemId) }}
                  className="w-full px-4 py-3 text-left text-[13px] text-[#ef4444] font-medium hover:bg-[#fee2e2]"
                >
                  Supprimer
                </button>
              )}
            </div>
          )}
        </div>
      </div>
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
              owned.includes(n) ? 'bg-primary text-white' : 'bg-soft text-muted'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      {(!total || ongoing) && (
        <button onClick={() => setDisplayMax(d => d + 10)} className="text-[12px] text-primary font-medium self-start">
          + Afficher 10 de plus
        </button>
      )}
    </div>
  )
}

// Hash string → positive int (pour les créations manuelles)
const strHash = (str) => {
  let h = 0
  for (let i = 0; i < str.length; i++) { h = Math.imul(31, h) + str.charCodeAt(i) | 0 }
  return Math.abs(h) || 1
}

// Resize image file → base64 JPEG (max 200×280)
const resizeImage = (file) => new Promise((resolve) => {
  const img = new Image()
  const url = URL.createObjectURL(file)
  img.onload = () => {
    const ratio = Math.min(200 / img.width, 280 / img.height, 1)
    const canvas = document.createElement('canvas')
    canvas.width = img.width * ratio
    canvas.height = img.height * ratio
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
    URL.revokeObjectURL(url)
    resolve(canvas.toDataURL('image/jpeg', 0.82))
  }
  img.src = url
})

// ─── AddMangaSheet ────────────────────────────────────────────────────────────
function AddMangaSheet({ onClose, onSaved, category }) {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [owned, setOwned] = useState([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const mangaSearch = useMangaSearch(category === 'Comics' ? '' : query)
  const comicsSearch = useComicsSearch(category === 'Comics' ? query : '')
  const { results, loading: searching, error: searchError } = category === 'Comics' ? comicsSearch : mangaSearch

  const handleSelect = async (manga) => {
    setSelected(manga)
    setOwned([])
    setQuery('')
    if (manga.volumes == null && category !== 'Comics') {
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

  const handleCreateManual = () => {
    setSelected({ mal_id: strHash(query || Date.now().toString()), title: query, volumes: null, ongoing: false, cover_url: null })
    setOwned([])
  }

  const handleImagePick = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await resizeImage(file)
    setSelected(prev => ({ ...prev, cover_url: dataUrl }))
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
        category: category ?? 'Mangas',
      },
      { onConflict: 'user_id,mal_id' }
    )
    setSaving(false)
    if (error) { setSaveError(error.message); return }
    onSaved()
    onClose()
  }

  const isComics = category === 'Comics'
  const label = isComics ? 'comics' : 'manga'

  return (
    <BottomSheet onClose={onClose}>
      <h2 className="text-[17px] font-bold text-dark">Ajouter un {label}</h2>
      {!selected && (
        <>
          <TextField
            label="Rechercher un titre"
            placeholder={isComics ? 'Ex: Batman, Spider-Man...' : 'Ex: One Piece, Naruto...'}
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          {searching && <p className="text-[13px] text-muted text-center py-2">Recherche...</p>}
          {searchError && <p className="text-[12px] text-red-500">{searchError}</p>}
          {!searching && results.length > 0 && (
            <ul className="flex flex-col divide-y divide-soft">
              {results.map(m => (
                <li key={m.mal_id}>
                  <button onClick={() => handleSelect(m)} className="flex items-center gap-3 w-full py-3 text-left">
                    {m.cover_url
                      ? <img src={m.cover_url} alt={m.title} className="w-10 h-14 object-cover rounded-[6px] shrink-0" />
                      : <div className="w-10 h-14 bg-soft rounded-[6px] shrink-0" />
                    }
                    <div>
                      <p className="text-[14px] font-medium text-dark">{m.title}</p>
                      <p className="text-[12px] text-muted">
                        {isComics
                          ? (m.author ?? 'Auteur inconnu')
                          : (m.volumes ? `${m.volumes} tome${m.volumes > 1 ? 's' : ''}${m.ongoing ? ' parus' : ''}` : m.ongoing ? 'En cours' : 'Terminé')
                        }
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!searching && query.trim() && (
            <button
              onClick={handleCreateManual}
              className="w-full h-11 border border-dashed border-accent rounded-[12px] text-[13px] font-medium text-primary"
            >
              Créer « {query} » manuellement
            </button>
          )}
        </>
      )}
      {selected && (
        <>
          <div className="flex items-center gap-4 p-3 bg-soft rounded-[12px]">
            <label className="relative shrink-0 cursor-pointer group">
              {selected.cover_url
                ? <img src={selected.cover_url} alt={selected.title} className="w-14 h-20 object-cover rounded-[8px]" />
                : <div className="w-14 h-20 bg-white/70 border border-dashed border-accent rounded-[8px] flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="rgb(var(--color-accent))"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                  </div>
              }
              <div className="absolute inset-0 rounded-[8px] bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
            </label>
            <div className="flex-1 min-w-0">
              <input
                value={selected.title}
                onChange={e => setSelected(prev => ({ ...prev, title: e.target.value }))}
                className="w-full text-[15px] font-bold text-dark bg-transparent outline-none border-b border-accent pb-0.5 truncate"
              />
              <p className="text-[12px] text-primary mt-1">
                {loadingDetail ? 'Récupération...'
                  : selected.volumes
                    ? `${selected.volumes} tome${selected.volumes > 1 ? 's' : ''} ${selected.ongoing ? 'parus' : 'au total'}`
                    : selected.ongoing ? 'Nombre de tomes inconnu' : 'Terminé'
                }
              </p>
              {!selected.cover_url && <p className="text-[11px] text-accent mt-0.5">Toucher pour ajouter une image</p>}
            </div>
            <button onClick={() => setSelected(null)} className="text-muted text-[12px] underline shrink-0">Changer</button>
          </div>
          {!loadingDetail && (
            <VolumeGrid owned={owned} total={selected.volumes} ongoing={selected.ongoing} onChange={setOwned} />
          )}
          {saveError && <p className="text-[12px] text-red-500">{saveError}</p>}
          <button
            onClick={handleSave}
            disabled={saving || owned.length === 0}
            className="h-12 w-full bg-primary text-white font-semibold text-[15px] rounded-[12px] disabled:opacity-40"
          >
            {saving ? 'Enregistrement...' : owned.length === 0 ? 'Sélectionne au moins un tome' : 'Ajouter à ma collection'}
          </button>
        </>
      )}
    </BottomSheet>
  )
}

// ─── ShareSheet ───────────────────────────────────────────────────────────────
const STATUS_LABEL = { pending: 'En attente', accepted: 'Accepté', declined: 'Refusé' }
const STATUS_COLOR = { pending: 'text-[#f59e0b]', accepted: 'text-primary', declined: 'text-[#ef4444]' }

function ShareSheet({ onClose }) {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [added, setAdded] = useState([])
  const [saving, setSaving] = useState(false)
  const [ownerProfile, setOwnerProfile] = useState(null)
  const [shares, setShares] = useState([])
  const [loadingShares, setLoadingShares] = useState(true)

  const displayName = (p) => p?.display_name || `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim() || 'Utilisateur'

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('first_name, last_name, display_name').eq('id', user.id).single()
      .then(({ data }) => setOwnerProfile(data))
  }, [user])

  const fetchShares = useCallback(async () => {
    if (!user) return
    setLoadingShares(true)
    const { data } = await supabase
      .from('collection_shares')
      .select('id, status, shared_with_id, owner_id')
      .or(`owner_id.eq.${user.id},shared_with_id.eq.${user.id}`)
    if (!data?.length) { setShares([]); setLoadingShares(false); return }
    const otherIds = [...new Set(data.map(s => s.owner_id === user.id ? s.shared_with_id : s.owner_id))]
    const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name, display_name').in('id', otherIds)
    setShares(data.map(s => ({
      ...s,
      isMine: s.owner_id === user.id,
      profile: profiles?.find(p => p.id === (s.owner_id === user.id ? s.shared_with_id : s.owner_id)),
    })))
    setLoadingShares(false)
  }, [user])

  useEffect(() => {
    fetchShares()
    if (!user) return
    const channel = supabase
      .channel(`shares:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collection_shares' }, fetchShares)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user, fetchShares])

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

  const handleDeleteShare = async (share) => {
    const otherId = share.owner_id === user.id ? share.shared_with_id : share.owner_id
    // Supprime les deux sens en deux appels séparés (RLS : owner ou recipient)
    await Promise.all([
      supabase.from('collection_shares').delete().eq('owner_id', user.id).eq('shared_with_id', otherId),
      supabase.from('collection_shares').delete().eq('owner_id', otherId).eq('shared_with_id', user.id),
    ])
    setShares(prev => prev.filter(s => {
      const sOther = s.owner_id === user.id ? s.shared_with_id : s.owner_id
      return sOther !== otherId
    }))
  }

  const handleConfirm = async () => {
    if (!added.length) return
    setSaving(true)
    const ownerName = ownerProfile ? displayName(ownerProfile) : 'Un utilisateur'
    for (const profile of added) {
      const { data: share } = await supabase
        .from('collection_shares')
        .upsert({ owner_id: user.id, shared_with_id: profile.id, status: 'pending' }, { onConflict: 'owner_id,shared_with_id' })
        .select().single()
      if (share) {
        await supabase.from('notifications').insert({
          user_id: profile.id, type: 'collection_share_request',
          message: `${ownerName} souhaite partager sa collection avec toi.`,
          read: false,
          data: { share_id: share.id, owner_id: user.id, recipient_name: displayName(profile) },
        })
        setShares(prev => [...prev.filter(s => !(s.isMine && s.shared_with_id === profile.id)), {
          id: share.id, status: 'pending', owner_id: user.id, shared_with_id: profile.id,
          isMine: true, profile,
        }])
      }
    }
    setAdded([])
    setSaving(false)
  }

  // Dédoublonne : n'afficher qu'une entrée par autre utilisateur
  const uniqueShares = shares.reduce((acc, s) => {
    const otherId = s.owner_id === user.id ? s.shared_with_id : s.owner_id
    if (!acc.find(a => (a.owner_id === user.id ? a.shared_with_id : a.owner_id) === otherId)) acc.push(s)
    return acc
  }, [])

  return (
    <BottomSheet onClose={onClose}>
      <h2 className="text-[17px] font-bold text-dark">Partager la collection</h2>

      {/* Partages en cours */}
      {loadingShares ? (
        <p className="text-[13px] text-muted">Chargement...</p>
      ) : uniqueShares.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-[12px] font-medium text-muted">Partages en cours</p>
          {uniqueShares.map(s => (
            <div key={s.id} className="flex items-center justify-between bg-soft rounded-[10px] px-3 h-11">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-soft flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold text-primary">
                    {((s.profile?.first_name?.[0] ?? '') + (s.profile?.last_name?.[0] ?? '')).toUpperCase() || '?'}
                  </span>
                </div>
                <p className="text-[13px] font-medium text-dark">{displayName(s.profile)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-medium ${STATUS_COLOR[s.status] ?? 'text-muted'}`}>
                  {STATUS_LABEL[s.status] ?? s.status}
                </span>
                <button
                  onClick={() => handleDeleteShare(s)}
                  className="w-6 h-6 flex items-center justify-center rounded-full bg-white text-[#ef4444]"
                  aria-label="Supprimer"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ajouter un partage */}
      <div className="flex flex-col gap-2">
        <label className="text-[12px] font-medium text-muted">Inviter quelqu'un</label>
        <div className="relative bg-soft rounded-[10px] min-h-12 px-3 py-2 flex flex-wrap gap-2 items-center">
          {added.map(p => (
            <span key={p.id} className="flex items-center gap-1 text-[12px] font-medium px-2 py-1 rounded-full shrink-0 bg-soft text-primary">
              {displayName(p)}
              <button onPointerDown={e => { e.preventDefault(); toggle(p) }} className="leading-none min-w-0 min-h-0 w-4 h-4">&times;</button>
            </span>
          ))}
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={added.length === 0 ? 'Prénom, nom ou pseudo...' : ''}
            className="bg-transparent text-[14px] text-dark outline-none placeholder:text-accent min-w-[80px] flex-1"
          />
          {searching && <span className="text-[11px] text-accent shrink-0">Recherche...</span>}
          {!searching && results.length > 0 && (
            <ul className="absolute left-0 right-0 bottom-full mb-1 bg-white rounded-[10px] shadow-lg z-10 overflow-hidden border border-soft">
              {results.map(p => (
                <li key={p.id}>
                  <button
                    onPointerDown={e => { e.preventDefault(); toggle(p); setQuery('') }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-soft"
                  >
                    <div className="w-8 h-8 rounded-full bg-soft flex items-center justify-center shrink-0">
                      <span className="text-[12px] font-bold text-primary">
                        {((p.first_name?.[0] ?? '') + (p.last_name?.[0] ?? '')).toUpperCase() || '?'}
                      </span>
                    </div>
                    <p className="flex-1 text-[13px] font-medium text-dark">{displayName(p)}</p>
                    {added.find(a => a.id === p.id) && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="rgb(var(--color-primary))">
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

      {added.length > 0 && (
        <button
          onClick={handleConfirm}
          disabled={saving}
          className="h-12 w-full bg-primary text-white font-semibold text-[15px] rounded-[12px] disabled:opacity-60"
        >
          {saving ? 'Envoi...' : `Envoyer ${added.length} invitation${added.length > 1 ? 's' : ''}`}
        </button>
      )}
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
        <span className="text-[14px] font-semibold text-dark">{value}</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="rgb(var(--color-dark))"
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
                cat === value ? 'text-primary bg-soft' : 'text-dark'
              }`}
            >
              {cat}
              {cat === value && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="rgb(var(--color-primary))">
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
      className="flex items-center gap-[5px] bg-soft rounded-full px-2.5 h-6 cursor-pointer"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="rgb(var(--color-primary))">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
      </svg>
      <span className="text-[10px] font-medium leading-none text-primary">{isShared ? 'Partagée' : 'Partager'}</span>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="rgb(var(--color-primary))">
        <path d="M7 10l5 5 5-5H7z" />
      </svg>
    </div>
  )
}

// ─── Collection (page) ────────────────────────────────────────────────────────
export default function Collection() {
  const { user } = useAuth()
  const { theme } = useTheme()
  const isCottagecore = theme === 'cottagecore'
  const [mangas, setMangas] = useState([])
  const [loading, setLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [category, setCategory] = useState('Mangas')
  const [search, setSearch] = useState('')

  const fetchCollection = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const displayName = (p) => p?.display_name || `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim() || 'Utilisateur'

    const [{ data: myItems }, { data: shares }] = await Promise.all([
      supabase.from('manga_collection').select('*').eq('user_id', user.id).eq('category', category).order('created_at', { ascending: false }),
      supabase.from('collection_shares').select('owner_id').eq('shared_with_id', user.id).eq('status', 'accepted'),
    ])

    const ownerIds = shares?.map(s => s.owner_id) ?? []
    let sharedItems = [], ownerProfiles = []

    if (ownerIds.length > 0) {
      const [{ data: shared }, { data: profiles }] = await Promise.all([
        supabase.from('manga_collection').select('*').in('user_id', ownerIds).eq('category', category),
        supabase.from('profiles').select('id, display_name, first_name, last_name').in('id', ownerIds),
      ])
      sharedItems = shared ?? []
      ownerProfiles = profiles ?? []
    }

    const byMalId = {}
    for (const it of (myItems ?? [])) {
      byMalId[it.mal_id] = {
        mal_id: it.mal_id, title: it.title, cover_url: it.cover_url,
        total_volumes: it.total_volumes, ongoing: it.ongoing, category: it.category,
        myItemId: it.id, myOwned: it.owned_volumes ?? [],
        theirItemId: null, theirOwned: [], theirName: null,
      }
    }
    for (const it of sharedItems) {
      const name = displayName(ownerProfiles.find(p => p.id === it.user_id))
      if (byMalId[it.mal_id]) {
        byMalId[it.mal_id].theirItemId = it.id
        byMalId[it.mal_id].theirOwned = it.owned_volumes ?? []
        byMalId[it.mal_id].theirName = name
      } else {
        byMalId[it.mal_id] = {
          mal_id: it.mal_id, title: it.title, cover_url: it.cover_url,
          total_volumes: it.total_volumes, ongoing: it.ongoing, category: it.category,
          myItemId: null, myOwned: [],
          theirItemId: it.id, theirOwned: it.owned_volumes ?? [], theirName: name,
        }
      }
    }

    setMangas(Object.values(byMalId))
    setLoading(false)
  }, [user, category])

  useEffect(() => {
    fetchCollection()
    if (!user) return
    const channel = supabase
      .channel(`collection_shares_watch:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collection_shares' }, fetchCollection)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchCollection, user])

  const handleDelete = async (myItemId) => {
    await supabase.from('manga_collection').delete().eq('id', myItemId)
    setMangas(prev => prev.map(m => {
      if (m.myItemId !== myItemId) return m
      if (m.theirItemId) return { ...m, myItemId: null, myOwned: [] }
      return null
    }).filter(Boolean))
  }

  const handleUpdateOwned = async (id, newOwned) => {
    await supabase.from('manga_collection').update({ owned_volumes: newOwned }).eq('id', id)
    setMangas(prev => prev.map(m => m.myItemId === id ? { ...m, myOwned: newOwned } : m))
  }

  const handleCreateOwned = async (mergedItem, newOwned) => {
    const { data } = await supabase.from('manga_collection').upsert({
      user_id: user.id, mal_id: mergedItem.mal_id, title: mergedItem.title,
      total_volumes: mergedItem.total_volumes, owned_volumes: newOwned,
      cover_url: mergedItem.cover_url, ongoing: mergedItem.ongoing,
      category: mergedItem.category ?? category,
    }, { onConflict: 'user_id,mal_id' }).select().single()
    if (data) {
      setMangas(prev => prev.map(m => m.mal_id === mergedItem.mal_id ? { ...m, myItemId: data.id, myOwned: newOwned } : m))
    }
  }

  const filtered = useMemo(() =>
    search.trim()
      ? mangas.filter(m => m.title.toLowerCase().includes(search.toLowerCase()))
      : mangas
  , [mangas, search])

  const categoryLabel = category === 'Mangas' ? 'manga' : category.toLowerCase()

  const shareChip = (
    <ShareChip
      isShared={false}
      onClick={() => setShareOpen(true)}
    />
  )

  return (
    <div className="relative min-h-dvh bg-base overflow-hidden">
      <div className="absolute -top-10 -left-10 w-64 h-64 rounded-full bg-[#c4b5fd] opacity-20 blur-3xl pointer-events-none" />
      <div className="absolute top-32 right-0 w-56 h-56 rounded-full bg-[#a5f3fc] opacity-10 blur-3xl pointer-events-none" />

      <AppHeader title="Collection" titleExtra={shareChip} />

      {/* Barre de recherche */}
      <div className="pt-[76px]">
        <div className="bg-white/55 backdrop-blur-sm border-b border-white/80 px-4 py-3 flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-white/70 border border-white/85 rounded-[8px] px-3 h-[44px]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="rgb(var(--color-accent))">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher"
              className="flex-1 bg-transparent text-[14px] font-semibold text-dark placeholder:text-accent outline-none"
            />
          </div>
          <button className="w-[44px] h-[44px] flex items-center justify-center bg-white/75 border border-white/85 rounded-[8px]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="rgb(var(--color-muted))">
              <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
            </svg>
          </button>
        </div>

        <main className="px-4 pb-28">
          <div className="mt-4 mb-3">
            <CategoryDropdown value={category} onChange={setCategory} />
          </div>

          {loading ? (
            <p className="text-[14px] text-muted text-center mt-12">Chargement...</p>
          ) : filtered.length === 0 ? (
            <div className={`bg-white/60 border rounded-[12px] h-[64px] flex flex-col items-center justify-center mt-2 ${isCottagecore ? "cc-border" : "border-accent/50"}`}>
              <p className="text-[22px] font-bold text-primary leading-tight">
                {search ? 'Aucun résultat' : `Aucun ${categoryLabel}`}
              </p>
              <p className="text-[11px] text-accent">pour le moment</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((item, _idx) => (
                <MangaCard key={item.mal_id} item={{ ...item, _decoIdx: _idx % 4 }} onDelete={handleDelete} onUpdateOwned={handleUpdateOwned} onCreateOwned={handleCreateOwned} isCottagecore={isCottagecore} />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Bouton fixe en bas */}
      <div className="fixed bottom-4 left-4 right-4 z-10" style={{ height: 48 }}>
        <button
          onClick={() => setSheetOpen(true)}
          className={`w-full h-full bg-primary text-white font-semibold text-[14px] rounded-[12px]${isCottagecore ? ' cc-border border-2' : ''}`}
        >
          Ajouter un {categoryLabel}
        </button>
        {isCottagecore && <>
          <LeafSmall width={15} rotate={-40} style={{ position:'absolute', left:-6,    top:-8,    zIndex:11, pointerEvents:'none' }} />
          <Flower    width={15} rotate={25}  style={{ position:'absolute', left:16,    top:-9,    zIndex:11, pointerEvents:'none' }} />
          <LeafBig   width={24} rotate={-20} style={{ position:'absolute', left:'42%', top:-12,   zIndex:11, pointerEvents:'none' }} />
          <Mushroom  width={22} rotate={5}   style={{ position:'absolute', right:-6,   top:-10,   zIndex:11, pointerEvents:'none' }} />
          <Flower    width={15} rotate={35}  style={{ position:'absolute', left:'54%', bottom:-7, zIndex:11, pointerEvents:'none' }} />
          <LeafSmall width={13} rotate={-45} style={{ position:'absolute', right:18,   bottom:-6, zIndex:11, pointerEvents:'none' }} />
        </>}
      </div>

      {sheetOpen && (
        <AddMangaSheet onClose={() => setSheetOpen(false)} onSaved={fetchCollection} category={category} />
      )}
      {shareOpen && (
        <ShareSheet
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  )
}
