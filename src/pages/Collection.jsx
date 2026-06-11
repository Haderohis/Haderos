import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { useMangaSearch } from '../hooks/useMangaSearch'
import AppHeader from '../components/AppHeader'
import BottomSheet from '../components/BottomSheet'
import { TextField, FieldLabel } from '../components/FormFields'

function MangaCard({ item, onDelete }) {
  const volumeLabel = item.total_volumes
    ? `${item.owned_volumes} / ${item.total_volumes} tomes`
    : `${item.owned_volumes} tome${item.owned_volumes > 1 ? 's' : ''}`

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
            {volumeLabel}
          </span>
          {item.ongoing && (
            <span className="text-[10px] text-[#f59e0b] font-semibold bg-[#fef3c7] px-2 py-0.5 rounded-full whitespace-nowrap">
              en cours
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

function VolumeStepper({ value, max, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <FieldLabel>Tomes possédés</FieldLabel>
      <div className="flex items-center gap-3 h-12">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-10 h-10 rounded-full bg-[#f2edfa] flex items-center justify-center text-[#6c63ff] text-[22px] font-bold leading-none"
        >−</button>
        <input
          type="number"
          min="0"
          max={max ?? undefined}
          value={value}
          onChange={e => {
            const v = parseInt(e.target.value, 10)
            if (!isNaN(v) && v >= 0) onChange(max ? Math.min(v, max) : v)
          }}
          className="w-16 h-12 text-center bg-[#f2edfa] rounded-[10px] text-[#211738] text-[16px] font-semibold outline-none"
        />
        <button
          onClick={() => onChange(max ? Math.min(max, value + 1) : value + 1)}
          className="w-10 h-10 rounded-full bg-[#6c63ff] flex items-center justify-center text-white text-[22px] font-bold leading-none"
        >+</button>
        {max && <span className="text-[13px] text-[#736694]">/ {max}</span>}
      </div>
    </div>
  )
}

function AddMangaSheet({ onClose, onSaved }) {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [owned, setOwned] = useState(1)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const { results, loading: searching, error: searchError } = useMangaSearch(query)

  const handleSelect = async (manga) => {
    setSelected(manga)
    setOwned(1)
    setQuery('')

    // Si volumes inconnu, on récupère le détail pour avoir le compte actuel
    if (manga.volumes == null) {
      setLoadingDetail(true)
      try {
        const res = await fetch(`https://api.jikan.moe/v4/manga/${manga.mal_id}`)
        if (res.ok) {
          const json = await res.json()
          const detail = json.data
          setSelected({
            ...manga,
            volumes: detail.volumes ?? null,
            ongoing: detail.publishing ?? manga.ongoing,
          })
        }
      } catch {}
      setLoadingDetail(false)
    }
  }

  const handleSave = async () => {
    if (!selected || !user) return
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

          {searching && (
            <p className="text-[13px] text-[#736694] text-center py-2">Recherche...</p>
          )}
          {searchError && (
            <p className="text-[12px] text-red-500">{searchError}</p>
          )}
          {!searching && results.length > 0 && (
            <ul className="flex flex-col divide-y divide-[#f2edfa]">
              {results.map(m => (
                <li key={m.mal_id}>
                  <button
                    onClick={() => handleSelect(m)}
                    className="flex items-center gap-3 w-full py-3 text-left"
                  >
                    {m.cover_url
                      ? <img src={m.cover_url} alt={m.title} className="w-10 h-14 object-cover rounded-[6px] shrink-0" />
                      : <div className="w-10 h-14 bg-[#f2edfa] rounded-[6px] shrink-0" />
                    }
                    <div>
                      <p className="text-[14px] font-medium text-[#211738]">{m.title}</p>
                      <p className="text-[12px] text-[#736694]">
                        {m.volumes
                          ? `${m.volumes} tome${m.volumes > 1 ? 's' : ''}${m.ongoing ? ' parus' : ''}`
                          : m.ongoing ? 'En cours' : 'Terminé'
                        }
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
                {loadingDetail
                  ? 'Récupération...'
                  : selected.volumes
                    ? `${selected.volumes} tome${selected.volumes > 1 ? 's' : ''} ${selected.ongoing ? 'parus' : 'au total'}`
                    : selected.ongoing ? 'Nombre de tomes inconnu' : 'Terminé'
                }
              </p>
            </div>
            <button onClick={() => setSelected(null)} className="text-[#736694] text-[12px] underline shrink-0">
              Changer
            </button>
          </div>

          <VolumeStepper value={owned} max={selected.volumes} onChange={setOwned} />

          {saveError && <p className="text-[12px] text-red-500">{saveError}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="h-12 w-full bg-[#6c63ff] text-white font-semibold text-[15px] rounded-[12px] disabled:opacity-60"
          >
            {saving ? 'Enregistrement...' : 'Ajouter à ma collection'}
          </button>
        </>
      )}
    </BottomSheet>
  )
}

export default function Collection() {
  const { user } = useAuth()
  const [mangas, setMangas] = useState([])
  const [loading, setLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)

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

  return (
    <div className="relative min-h-dvh bg-[#f6f4f9] overflow-hidden">
      <div className="absolute -top-10 -left-10 w-64 h-64 rounded-full bg-[#c4b5fd] opacity-20 blur-3xl pointer-events-none" />
      <div className="absolute top-32 right-0 w-56 h-56 rounded-full bg-[#a5f3fc] opacity-10 blur-3xl pointer-events-none" />

      <AppHeader title="Collection" />

      <main className="pt-[76px] px-4 pb-8">
        <div className="flex items-center justify-between mt-6 mb-4">
          <h2 className="text-[20px] font-bold text-[#211738]">Mangas</h2>
          <button
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-2 h-9 px-4 bg-[#6c63ff] text-white text-[13px] font-semibold rounded-[10px]"
          >
            <span className="text-[18px] leading-none">+</span> Ajouter
          </button>
        </div>

        {loading ? (
          <p className="text-[14px] text-[#736694] text-center mt-12">Chargement...</p>
        ) : mangas.length === 0 ? (
          <div className="flex flex-col items-center gap-3 mt-16 text-center">
            <p className="text-[15px] font-medium text-[#736694]">Ta collection est vide</p>
            <p className="text-[13px] text-[#a49ffe]">Ajoute ton premier manga !</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {mangas.map(item => (
              <MangaCard key={item.id} item={item} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </main>

      {sheetOpen && (
        <AddMangaSheet
          onClose={() => setSheetOpen(false)}
          onSaved={fetchCollection}
        />
      )}
    </div>
  )
}
