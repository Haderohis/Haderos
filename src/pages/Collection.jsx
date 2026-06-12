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
function MangaCard({ item, onDelete, onUpdateOwned, onCreateOwned }) {
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
    if (mine && theirs) return 'bg-[#6c63ff] text-white'
    if (mine) return 'bg-[#ada7fd] text-black'
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
    <div className="bg-white/70 border border-white/85 rounded-[8px] p-2 flex flex-col gap-2">
      {/* Row 1 — title + ownership chips + "En cours" */}
      <div className="flex items-center gap-1.5 min-w-0">
        <p className="text-[14px] font-bold text-[#211738] leading-snug truncate flex-1 min-w-0">{item.title}</p>
        {item.myItemId && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#e9ebfd] text-[#6c63ff] shrink-0 whitespace-nowrap">Moi</span>
        )}
        {item.theirName && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#fef3c7] text-[#d97706] shrink-0 whitespace-nowrap">{item.theirName}</span>
        )}
        {item.ongoing && (
          <span className="text-[10px] text-[#f59e0b] font-normal shrink-0">En cours</span>
        )}
      </div>

      {/* Row 2 — cover + volumes + menu */}
      <div className="flex items-center gap-2">
        {item.cover_url
          ? <img src={item.cover_url} alt={item.title} className="w-[34px] h-[48px] object-cover rounded-[4px] shrink-0" />
          : <div className="w-[34px] h-[48px] bg-[#f2edfa] rounded-[4px] shrink-0" />
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
              className="h-[32px] w-[32px] flex items-center justify-center rounded-[2px] text-[18px] font-semibold text-[#6c63ff] bg-[#f2edfa]"
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#736694">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-[10px] shadow-lg border border-[#f0ebfa] overflow-hidden min-w-[140px]">
              <button
                onClick={() => { setMenuOpen(false); changeDisplayMax(Math.max(displayMax - 1, myOwned.length > 0 ? Math.max(...myOwned) : 0)) }}
                className="w-full px-4 py-3 text-left text-[13px] text-[#211738] font-medium hover:bg-[#f2edfa] border-b border-[#f0ebfa]"
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
function AddMangaSheet({ onClose, onSaved, category }) {
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
        category: category ?? 'Mangas',
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
const STATUS_LABEL = { pending: 'En attente', accepted: 'Accepté', declined: 'Refusé' }
const STATUS_COLOR = { pending: 'text-[#f59e0b]', accepted: 'text-[#6c63ff]', declined: 'text-[#ef4444]' }

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

  useEffect(() => {
    if (!user) return
    setLoadingShares(true)
    supabase
      .from('collection_shares')
      .select('id, status, shared_with_id, owner_id')
      .or(`owner_id.eq.${user.id},shared_with_id.eq.${user.id}`)
      .then(async ({ data }) => {
        if (!data?.length) { setShares([]); setLoadingShares(false); return }
        const otherIds = [...new Set(data.map(s => s.owner_id === user.id ? s.shared_with_id : s.owner_id))]
        const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name, display_name').in('id', otherIds)
        setShares(data.map(s => ({
          ...s,
          isMine: s.owner_id === user.id,
          profile: profiles?.find(p => p.id === (s.owner_id === user.id ? s.shared_with_id : s.owner_id)),
        })))
        setLoadingShares(false)
      })
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
      <h2 className="text-[17px] font-bold text-[#211738]">Partager la collection</h2>

      {/* Partages en cours */}
      {loadingShares ? (
        <p className="text-[13px] text-[#736694]">Chargement...</p>
      ) : uniqueShares.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-[12px] font-medium text-[#736694]">Partages en cours</p>
          {uniqueShares.map(s => (
            <div key={s.id} className="flex items-center justify-between bg-[#f2edfa] rounded-[10px] px-3 h-11">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#e0d9ff] flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold text-[#6c63ff]">
                    {((s.profile?.first_name?.[0] ?? '') + (s.profile?.last_name?.[0] ?? '')).toUpperCase() || '?'}
                  </span>
                </div>
                <p className="text-[13px] font-medium text-[#211738]">{displayName(s.profile)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-medium ${STATUS_COLOR[s.status] ?? 'text-[#736694]'}`}>
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
        <label className="text-[12px] font-medium text-[#736694]">Inviter quelqu'un</label>
        <div className="relative bg-[#f2edfa] rounded-[10px] min-h-12 px-3 py-2 flex flex-wrap gap-2 items-center">
          {added.map(p => (
            <span key={p.id} className="flex items-center gap-1 text-[12px] font-medium px-2 py-1 rounded-full shrink-0 bg-[#e0d9ff] text-[#6c63ff]">
              {displayName(p)}
              <button onPointerDown={e => { e.preventDefault(); toggle(p) }} className="leading-none min-w-0 min-h-0 w-4 h-4">&times;</button>
            </span>
          ))}
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={added.length === 0 ? 'Prénom, nom ou pseudo...' : ''}
            className="bg-transparent text-[14px] text-[#211738] outline-none placeholder:text-[#a49ffe] min-w-[80px] flex-1"
          />
          {searching && <span className="text-[11px] text-[#a49ffe] shrink-0">Recherche...</span>}
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

      {added.length > 0 && (
        <button
          onClick={handleConfirm}
          disabled={saving}
          className="h-12 w-full bg-[#6c63ff] text-white font-semibold text-[15px] rounded-[12px] disabled:opacity-60"
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

  useEffect(() => { fetchCollection() }, [fetchCollection])

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
            <div className="flex flex-col gap-2">
              {filtered.map(item => (
                <MangaCard key={item.mal_id} item={item} onDelete={handleDelete} onUpdateOwned={handleUpdateOwned} onCreateOwned={handleCreateOwned} />
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
