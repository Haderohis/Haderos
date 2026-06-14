import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { useTheme } from '../contexts/ThemeContext'
import AppHeader from '../components/AppHeader'
import BottomSheet from '../components/BottomSheet'
import { TextField, DateField, SubmitButton } from '../components/FormFields'
import { LeafSmall, LeafBig, Flower, Mushroom } from '../components/CottageDecor'
import { toDateStr } from '../lib/date'

const DAYS_FR = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

function fmtDateRange(startDate, endDate) {
  const s = new Date(startDate + 'T12:00:00')
  const e = endDate ? new Date(endDate + 'T12:00:00') : null
  if (!e) return s.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()
  const sDay = s.toLocaleDateString('fr-FR', { day: 'numeric', month: sameMonth ? undefined : 'long' })
  const eDay = e.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  return `${sDay} – ${eDay}`
}

// 0=Lun … 6=Dim
function weekday(date) {
  return (date.getDay() + 6) % 7
}

const STATUS_LABEL = { pending: 'En attente', accepted: 'Accepté', declined: 'Refusé' }
const STATUS_COLOR = { pending: 'text-[#f59e0b]', accepted: 'text-primary', declined: 'text-[#ef4444]' }

// Décorations cottagecore pour les EventCards (4 variantes)
const EVENT_DECOS = [
  <>
    <Mushroom width={22} rotate={-15} style={{ position:'absolute', left:-9, top:-7, zIndex:10, pointerEvents:'none' }} />
    <Flower width={16} rotate={20} style={{ position:'absolute', left:'42%', top:-9, zIndex:10, pointerEvents:'none' }} />
    <LeafBig width={20} rotate={15} style={{ position:'absolute', right:-8, top:-7, zIndex:10, pointerEvents:'none' }} />
    <LeafSmall width={13} rotate={-55} style={{ position:'absolute', right:-6, bottom:-5, zIndex:10, pointerEvents:'none' }} />
  </>,
  <>
    <LeafBig width={22} rotate={30} style={{ position:'absolute', left:-9, top:-8, zIndex:10, pointerEvents:'none' }} />
    <Flower width={18} rotate={-20} style={{ position:'absolute', right:-8, top:-9, zIndex:10, pointerEvents:'none' }} />
    <LeafSmall width={12} rotate={50} style={{ position:'absolute', left:'35%', bottom:-6, zIndex:10, pointerEvents:'none' }} />
    <Mushroom width={20} rotate={10} style={{ position:'absolute', right:-7, bottom:-8, zIndex:10, pointerEvents:'none' }} />
  </>,
  <>
    <Flower width={20} rotate={-15} style={{ position:'absolute', left:-10, top:-9, zIndex:10, pointerEvents:'none' }} />
    <LeafSmall width={14} rotate={40} style={{ position:'absolute', left:'55%', top:-7, zIndex:10, pointerEvents:'none' }} />
    <Mushroom width={22} rotate={-20} style={{ position:'absolute', right:-9, top:-8, zIndex:10, pointerEvents:'none' }} />
    <LeafBig width={18} rotate={-30} style={{ position:'absolute', left:-8, bottom:-7, zIndex:10, pointerEvents:'none' }} />
  </>,
  <>
    <LeafSmall width={14} rotate={-30} style={{ position:'absolute', left:-7, top:-6, zIndex:10, pointerEvents:'none' }} />
    <Mushroom width={24} rotate={15} style={{ position:'absolute', left:'38%', top:-10, zIndex:10, pointerEvents:'none' }} />
    <Flower width={17} rotate={25} style={{ position:'absolute', right:-9, top:-8, zIndex:10, pointerEvents:'none' }} />
    <LeafSmall width={12} rotate={60} style={{ position:'absolute', right:-6, bottom:-5, zIndex:10, pointerEvents:'none' }} />
  </>,
]

// ── CalendarShareSheet ────────────────────────────────────────────────────────
function CalendarShareSheet({ onClose, user }) {
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
      .from('calendar_shares')
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
      .channel(`cal_shares_sheet:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_shares' }, fetchShares)
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
    await Promise.all([
      supabase.from('calendar_shares').delete().eq('owner_id', user.id).eq('shared_with_id', otherId),
      supabase.from('calendar_shares').delete().eq('owner_id', otherId).eq('shared_with_id', user.id),
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
        .from('calendar_shares')
        .upsert({ owner_id: user.id, shared_with_id: profile.id, status: 'pending' }, { onConflict: 'owner_id,shared_with_id' })
        .select().single()
      if (share) {
        await supabase.from('notifications').insert({
          user_id: profile.id,
          type: 'calendar_share_request',
          message: `${ownerName} souhaite partager son calendrier avec toi.`,
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

  const uniqueShares = shares.reduce((acc, s) => {
    const otherId = s.owner_id === user.id ? s.shared_with_id : s.owner_id
    if (!acc.find(a => (a.owner_id === user.id ? a.shared_with_id : a.owner_id) === otherId)) acc.push(s)
    return acc
  }, [])

  return (
    <BottomSheet onClose={onClose} innerClassName="overflow-visible overflow-y-auto">
      <h2 className="text-[17px] font-bold text-dark">Partager le calendrier</h2>

      {loadingShares ? (
        <p className="text-[13px] text-muted">Chargement...</p>
      ) : uniqueShares.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-[12px] font-medium text-muted">Partages en cours</p>
          {uniqueShares.map(s => (
            <div key={s.id} className="flex items-center justify-between bg-soft rounded-[10px] px-3 h-11">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0">
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

      <div className="flex flex-col gap-2">
        <label className="text-[12px] font-medium text-muted">Inviter quelqu'un</label>
        <div className="relative bg-soft rounded-[10px] min-h-12 px-3 py-2 flex flex-wrap gap-2 items-center">
          {added.map(p => (
            <span key={p.id} className="flex items-center gap-1 text-[12px] font-medium px-2 py-1 rounded-full shrink-0 bg-white text-primary">
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

// ── Page principale ────────────────────────────────────────────────────────────
export default function Calendar() {
  const { user } = useAuth()
  const profile = useProfile(user)
  const { theme } = useTheme()
  const isCottagecore = theme === 'cottagecore'

  const today = toDateStr(new Date())

  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [selectedDay, setSelectedDay] = useState(today)
  const [events, setEvents] = useState([])
  const [sportDays, setSportDays] = useState({})
  const [partnerProfiles, setPartnerProfiles] = useState([])
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [showShare, setShowShare] = useState(false)

  // Form
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState(today)
  const [newEndDate, setNewEndDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [newShared, setNewShared] = useState(false)
  const [saving, setSaving] = useState(false)
  const [titleError, setTitleError] = useState('')
  const [editingEvent, setEditingEvent] = useState(null)

  const fetchPartners = useCallback(async () => {
    if (!user) return
    const { data: shareData } = await supabase
      .from('calendar_shares')
      .select('owner_id, shared_with_id')
      .or(`owner_id.eq.${user.id},shared_with_id.eq.${user.id}`)
      .eq('status', 'accepted')
    if (!shareData?.length) { setPartnerProfiles([]); return }
    const partnerIds = [...new Set(shareData.map(s => s.owner_id === user.id ? s.shared_with_id : s.owner_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, display_name')
      .in('id', partnerIds)
    setPartnerProfiles(profiles ?? [])
  }, [user])

  const fetchSportDates = useCallback(async () => {
    if (!user) return
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const first = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay = new Date(year, month + 1, 0).getDate()
    const last = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    const { data: sessions } = await supabase
      .from('sport_sessions')
      .select('id, session_date')
      .eq('user_id', user.id)
      .gte('session_date', first)
      .lte('session_date', last)
    if (!sessions?.length) { setSportDays({}); return }
    const sessionIds = sessions.map(s => s.id)
    const { data: exercises } = await supabase
      .from('sport_exercises')
      .select('session_id, type')
      .in('session_id', sessionIds)
    const byDate = {}
    for (const s of sessions) {
      const exos = (exercises ?? []).filter(e => e.session_id === s.id)
      const cardioCount = exos.filter(e => e.type === 'cardio').length
      byDate[s.session_date] = exos.length === 0 ? 'strength' : cardioCount > exos.length / 2 ? 'cardio' : 'strength'
    }
    setSportDays(byDate)
  }, [user, currentMonth])

  const fetchEvents = useCallback(async () => {
    if (!user) return
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const first = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay = new Date(year, month + 1, 0).getDate()
    const last = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const { data } = await supabase
      .from('calendar_events')
      .select('id, user_id, title, event_date, end_date, start_time, is_shared')
      .lte('event_date', last)
      .or(`end_date.gte.${first},and(end_date.is.null,event_date.gte.${first})`)

    if (!data) return

    const theirIds = [...new Set(data.filter(e => e.user_id !== user.id).map(e => e.user_id))]
    let profileMap = {}
    if (theirIds.length) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, display_name')
        .in('id', theirIds)
      profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))
    }

    setEvents(data.map(e => ({
      ...e,
      isMine: e.user_id === user.id,
      partnerName: e.user_id !== user.id
        ? (profileMap[e.user_id]?.first_name || profileMap[e.user_id]?.display_name || 'Partenaire')
        : null,
    })))
  }, [user, currentMonth])

  useEffect(() => {
    fetchPartners()
    fetchEvents()
    fetchSportDates()
  }, [fetchPartners, fetchEvents, fetchSportDates])

  useEffect(() => {
    if (!user) return
    const ch = supabase.channel(`cal:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events' }, fetchEvents)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_shares' }, () => {
        fetchPartners()
        fetchEvents()
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [user, fetchEvents, fetchPartners])

  // Calcul grille
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstWeekday = weekday(new Date(year, month, 1))
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  // Découpage en semaines pour le rendu des barres multi-jours
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1))

  const dayStr = (d) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  const eventCoversDay = (e, ds) =>
    e.event_date <= ds && (e.end_date ? e.end_date >= ds : e.event_date === ds)

  const eventsForDay = (d) => {
    const ds = dayStr(d)
    return events.filter(e => eventCoversDay(e, ds))
  }

  const selectedEvents = selectedDay
    ? events
        .filter(e => eventCoversDay(e, selectedDay))
        .sort((a, b) => (a.start_time ?? '99:99').localeCompare(b.start_time ?? '99:99'))
    : []

  const handleDayTap = (d) => {
    const ds = dayStr(d)
    setSelectedDay(prev => prev === ds ? null : ds)
  }

  const openAddEvent = () => {
    setNewTitle('')
    setNewDate(selectedDay ?? today)
    setNewEndDate('')
    setNewTime('')
    setNewShared(false)
    setTitleError('')
    setShowAddEvent(true)
  }

  const handleAddEvent = async () => {
    if (!newTitle.trim()) { setTitleError('Le titre est requis'); return }
    setSaving(true)
    await supabase.from('calendar_events').insert({
      user_id: user.id,
      title: newTitle.trim(),
      event_date: newDate,
      end_date: (newEndDate && newEndDate > newDate) ? newEndDate : null,
      start_time: newTime || null,
      is_shared: newShared,
    })
    if (newShared) await notifyPartner(newTitle.trim(), newDate)
    await fetchEvents()
    setSaving(false)
    setShowAddEvent(false)
  }

  const openEditEvent = (e) => {
    setEditingEvent(e)
    setNewTitle(e.title)
    setNewDate(e.event_date)
    setNewEndDate(e.end_date ?? '')
    setNewTime(e.start_time ? e.start_time.slice(0, 5) : '')
    setNewShared(e.is_shared)
    setTitleError('')
  }

  const handleSaveEvent = async () => {
    if (!newTitle.trim()) { setTitleError('Le titre est requis'); return }
    setSaving(true)
    await supabase.from('calendar_events').update({
      title: newTitle.trim(),
      event_date: newDate,
      end_date: (newEndDate && newEndDate > newDate) ? newEndDate : null,
      start_time: newTime || null,
      is_shared: newShared,
    }).eq('id', editingEvent.id)
    if (newShared) await notifyPartner(newTitle.trim(), newDate, true)
    await fetchEvents()
    setSaving(false)
    setEditingEvent(null)
  }

  const handleDeleteEvent = async (id) => {
    setEvents(prev => prev.filter(e => e.id !== id))
    await supabase.from('calendar_events').delete().eq('id', id)
  }

  const hasPartner = partnerProfiles.length > 0
  const partnerFirstName = partnerProfiles[0]?.first_name || partnerProfiles[0]?.display_name || ''
  const partnerUserId = partnerProfiles[0]?.id ?? null

  const myName = profile?.first_name || profile?.display_name || 'Quelqu\'un'

  const notifyPartner = useCallback(async (title, eventDate, isEdit = false) => {
    if (!partnerUserId) return
    const dateLabel = new Date(eventDate + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
    const message = isEdit
      ? `${myName} a modifié un événement auquel tu participes : "${title}" le ${dateLabel}`
      : `${myName} t'a invité à participer à "${title}" le ${dateLabel}`
    await supabase.from('notifications').insert({
      user_id: partnerUserId,
      type: 'calendar_event_shared',
      message,
      read: false,
    })
  }, [partnerUserId, myName])

  const shareChip = (
    <div
      onClick={() => setShowShare(true)}
      className="flex items-center gap-1 h-6 px-2 rounded-full bg-soft cursor-pointer"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="rgb(var(--color-primary))">
        <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92 0-1.61-1.31-2.92-2.92-2.92z"/>
      </svg>
      <span className="text-[11px] font-semibold text-primary">Partager</span>
    </div>
  )

  const selectedDayLabel = selectedDay
    ? new Date(selectedDay + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    : null

  return (
    <div className="relative min-h-dvh bg-base overflow-hidden">
      {/* Blobs décoratifs */}
      <div className="absolute -top-10 -left-10 w-72 h-72 rounded-full bg-[#c4b5fd] opacity-20 blur-3xl pointer-events-none" />
      <div className="absolute top-40 -right-16 w-64 h-64 rounded-full bg-[#a5f3fc] opacity-15 blur-3xl pointer-events-none" />

      <AppHeader title="Calendrier" titleExtra={shareChip} />

      <div className="pt-[76px]">
        {/* Navigation mois */}
        <div className="sticky top-[76px] z-20 bg-base/90 backdrop-blur-sm px-4 py-2 flex items-center justify-between border-b border-white/60">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center" style={{ minWidth:0, minHeight:0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="rgb(var(--color-muted))">
              <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/>
            </svg>
          </button>
          <p className="text-[15px] font-semibold text-dark capitalize">
            {MONTHS_FR[month]} {year}
          </p>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center" style={{ minWidth:0, minHeight:0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="rgb(var(--color-muted))">
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/>
            </svg>
          </button>
        </div>

        {/* Grille calendrier */}
        <div className="px-3 pt-3">
          {/* En-têtes jours */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS_FR.map((d, i) => (
              <div key={i} className="text-center text-[11px] font-semibold text-muted py-1">{d}</div>
            ))}
          </div>

          {/* Semaines */}
          {weeks.map((week, weekIdx) => {
            const firstNonNullIdx = week.findIndex(d => d !== null)
            const lastNonNullIdx = 6 - [...week].reverse().findIndex(d => d !== null)
            const weekFirstDs = firstNonNullIdx >= 0 ? dayStr(week[firstNonNullIdx]) : null
            const weekLastDs = lastNonNullIdx <= 6 ? dayStr(week[lastNonNullIdx]) : null

            // Toutes les barres (1 jour ou plusieurs)
            const allBars = events
              .filter(e => {
                const endDs = e.end_date ?? e.event_date
                return weekFirstDs && weekLastDs && e.event_date <= weekLastDs && endDs >= weekFirstDs
              })
              .map(e => {
                const endDs = e.end_date ?? e.event_date
                const startsInWeek = e.event_date >= weekFirstDs
                const endsInWeek = endDs <= weekLastDs
                const startCol = startsInWeek
                  ? week.findIndex(d => d !== null && dayStr(d) === e.event_date)
                  : firstNonNullIdx
                const endCol = endsInWeek
                  ? week.findIndex(d => d !== null && dayStr(d) === endDs)
                  : lastNonNullIdx
                return { ...e, startCol: Math.max(0, startCol), endCol: Math.min(6, endCol), startsInWeek, endsInWeek }
              })

            return (
              <div key={weekIdx}>
                {/* Numéros de jours */}
                <div className="grid grid-cols-7">
                  {week.map((d, di) => {
                    if (!d) return <div key={di} />
                    const ds = dayStr(d)
                    const isSelected = selectedDay === ds
                    const isToday = ds === today
                    const sportType = sportDays[ds]
                    return (
                      <div key={di} className="flex flex-col items-center py-1 cursor-pointer" onClick={() => handleDayTap(d)}>
                        <div className={`relative w-8 h-8 flex items-center justify-center rounded-full transition-colors
                          ${isSelected ? 'bg-primary' : isToday ? 'border border-primary' : 'active:bg-soft'}`}
                        >
                          {sportType && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ opacity: 0.12 }}>
                              {sportType === 'cardio' ? (
                                <svg width="22" height="22" viewBox="0 0 24 24" fill={isCottagecore ? '#a36252' : 'rgb(var(--color-primary))'}>
                                  <path d="M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z"/>
                                </svg>
                              ) : (
                                <svg width="22" height="22" viewBox="0 0 24 24" fill={isCottagecore ? '#a36252' : 'rgb(var(--color-primary))'}>
                                  <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29l-1.43-1.43z"/>
                                </svg>
                              )}
                            </div>
                          )}
                          <span className={`relative text-[13px] font-medium leading-none ${isSelected ? 'text-white' : 'text-dark'}`}>
                            {d}
                          </span>
                        </div>
                        </div>
                    )
                  })}
                </div>

                {/* Barres (tous les events) */}
                {allBars.length > 0 && (
                  <div className="relative mb-1" style={{ height: allBars.length * 20 }}>
                    {allBars.map((e, bi) => {
                      const endDs = e.end_date ?? e.event_date
                      return (
                        <div
                          key={e.id}
                          className="absolute h-5 flex items-center cursor-pointer overflow-hidden"
                          style={{
                            top: bi * 20,
                            left: `calc(${e.startCol} / 7 * 100% + ${e.startsInWeek ? 3 : 0}px)`,
                            right: `calc((6 - ${e.endCol}) / 7 * 100% + ${e.endsInWeek ? 3 : 0}px)`,
                          }}
                          onClick={() => {
                            const d = week.find(d => d !== null && dayStr(d) >= e.event_date && dayStr(d) <= endDs)
                            if (d) handleDayTap(d)
                          }}
                        >
                          <div
                            className="h-[16px] w-full flex items-center justify-center px-1 overflow-hidden"
                            style={{
                              background: e.isMine
                                ? isCottagecore ? 'rgba(163,98,82,0.82)' : 'rgba(108,99,255,0.82)'
                                : 'rgba(251,191,36,0.85)',
                              borderRadius: `${e.startsInWeek ? 4 : 0}px ${e.endsInWeek ? 4 : 0}px ${e.endsInWeek ? 4 : 0}px ${e.startsInWeek ? 4 : 0}px`,
                            }}
                          >
                            <span className="text-[10px] font-semibold truncate leading-none"
                              style={{ color: e.isMine ? 'white' : '#78350f' }}>
                              {e.title}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Panel événements du jour sélectionné */}
        {selectedDay && (
          <div className="px-4 pt-4 pb-32">
            <p className="text-[13px] font-semibold text-dark capitalize mb-3">{selectedDayLabel}</p>

            {selectedEvents.length === 0 && (
              <div className={`bg-white/60 border rounded-[12px] h-[64px] flex flex-col items-center justify-center mt-2 ${isCottagecore ? 'cc-border' : 'border-accent/50'}`}>
                <p className="text-[22px] font-bold text-primary leading-tight">Aucun événement</p>
                <p className="text-[11px] text-accent">pour le moment</p>
              </div>
            )}

            {selectedEvents.length > 0 && (
              <div className="flex flex-col gap-3">
                {selectedEvents.map((e) => {
                  const decoIdx = parseInt(String(e.id).replace(/-/g, '').slice(-2), 16) % 4
                  return (
                    <div
                      key={e.id}
                      className={`relative rounded-[12px] px-4 py-3 ${isCottagecore ? 'cc-border' : ''}`}
                      style={
                        // Events où je participe (les miens ou ceux du partenaire avec is_shared=true) → violet
                        // Events du partenaire sans participation → amber
                        e.isMine || e.is_shared
                          ? { background: 'rgb(var(--color-soft))' }
                          : { background: 'rgba(251,191,36,0.10)' }
                      }
                    >
                      {isCottagecore && EVENT_DECOS[decoIdx]}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-[14px] font-semibold text-dark leading-snug">{e.title}</p>
                            {/* Mon event avec partenaire qui participe */}
                            {e.isMine && e.is_shared && (
                              <span
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 text-[#92400e]"
                                style={{ background: 'rgba(251,191,36,0.3)' }}
                              >
                                {partnerFirstName} participe
                              </span>
                            )}
                            {/* Event du partenaire où je participe */}
                            {!e.isMine && e.is_shared && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                                Je participe
                              </span>
                            )}
                            {/* Event du partenaire sans participation */}
                            {!e.isMine && !e.is_shared && (
                              <span
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 text-[#92400e]"
                                style={{ background: 'rgba(251,191,36,0.3)' }}
                              >
                                {e.partnerName}
                              </span>
                            )}
                          </div>
                          {(e.end_date || e.start_time) && (
                            <p className="text-[12px] text-muted mt-0.5">
                              {e.end_date && fmtDateRange(e.event_date, e.end_date)}
                              {e.end_date && e.start_time && ' · '}
                              {e.start_time && e.start_time.slice(0, 5)}
                            </p>
                          )}
                        </div>
                        {e.isMine && (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => openEditEvent(e)}
                              style={{ minWidth: 0, minHeight: 0 }}
                              className="w-6 h-6 flex items-center justify-center shrink-0"
                            >
                              <svg width="17" height="17" viewBox="0 0 24 24" fill="rgb(var(--color-accent))">
                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(e.id)}
                              style={{ minWidth: 0, minHeight: 0 }}
                              className="w-6 h-6 flex items-center justify-center shrink-0"
                            >
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M18 6L6 18M6 6l12 12" stroke="rgb(var(--color-accent))" strokeWidth="2" strokeLinecap="round"/>
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bouton fixe */}
      <div className="fixed bottom-4 left-4 right-4 z-10" style={{ height: 48 }}>
        <button
          onClick={openAddEvent}
          className={`w-full h-full bg-primary text-white font-semibold text-[15px] rounded-[12px] ${isCottagecore ? 'cc-border border-2' : ''}`}
        >
          + Ajouter un événement
        </button>
        {isCottagecore && <>
          <Mushroom width={26} rotate={-15} style={{ position:'absolute', left:-7, top:-12, zIndex:11, pointerEvents:'none' }} />
          <LeafSmall width={12} rotate={40} style={{ position:'absolute', left:18, top:-7, zIndex:11, pointerEvents:'none' }} />
          <Flower width={17} rotate={-25} style={{ position:'absolute', left:'40%', top:-11, zIndex:11, pointerEvents:'none' }} />
          <LeafBig width={22} rotate={15} style={{ position:'absolute', right:-6, top:-10, zIndex:11, pointerEvents:'none' }} />
          <LeafSmall width={13} rotate={50} style={{ position:'absolute', left:'54%', bottom:-7, zIndex:11, pointerEvents:'none' }} />
          <Flower width={14} rotate={-40} style={{ position:'absolute', right:16, bottom:-6, zIndex:11, pointerEvents:'none' }} />
        </>}
      </div>

      {/* BottomSheet : Ajouter un événement */}
      {showAddEvent && (
        <BottomSheet onClose={() => setShowAddEvent(false)}>
          <h2 className="text-[17px] font-bold text-dark">Nouvel événement</h2>

          <TextField
            label="Titre"
            required
            value={newTitle}
            onChange={e => { setNewTitle(e.target.value); if (titleError) setTitleError('') }}
            placeholder="Ex : Anniversaire, RDV médecin..."
            error={titleError}
          />

          <div className="flex gap-3">
            <div className="flex-1">
              <DateField
                label="Date de début"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <DateField
                label="Date de fin"
                value={newEndDate}
                onChange={e => setNewEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium text-muted">Heure (optionnelle)</label>
            <input
              type="time"
              value={newTime}
              onChange={e => setNewTime(e.target.value)}
              className="h-12 bg-soft rounded-[10px] px-3 text-[14px] text-dark outline-none [color-scheme:light]"
            />
          </div>

          {hasPartner && (
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-dark">{partnerFirstName} participe</p>
                <p className="text-[11px] text-muted mt-0.5">L'événement apparaît différemment pour {partnerFirstName}</p>
              </div>
              <div
                onClick={() => setNewShared(v => !v)}
                className={`relative w-11 h-6 rounded-full cursor-pointer transition-colors shrink-0 ${newShared ? 'bg-primary' : 'bg-[#d5d3dc]'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${newShared ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </div>
          )}

          <SubmitButton onClick={handleAddEvent} disabled={saving || !newTitle.trim()}>
            {saving ? 'Ajout...' : 'Ajouter'}
          </SubmitButton>
        </BottomSheet>
      )}

      {/* BottomSheet : Modifier un événement */}
      {editingEvent && (
        <BottomSheet onClose={() => setEditingEvent(null)}>
          <h2 className="text-[17px] font-bold text-dark">Modifier l'événement</h2>

          <TextField
            label="Titre"
            required
            value={newTitle}
            onChange={e => { setNewTitle(e.target.value); if (titleError) setTitleError('') }}
            placeholder="Ex : Anniversaire, RDV médecin..."
            error={titleError}
          />

          <div className="flex gap-3">
            <div className="flex-1">
              <DateField
                label="Date de début"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <DateField
                label="Date de fin"
                value={newEndDate}
                onChange={e => setNewEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium text-muted">Heure (optionnelle)</label>
            <input
              type="time"
              value={newTime}
              onChange={e => setNewTime(e.target.value)}
              className="h-12 bg-soft rounded-[10px] px-3 text-[14px] text-dark outline-none [color-scheme:light]"
            />
          </div>

          {hasPartner && (
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-dark">{partnerFirstName} participe</p>
                <p className="text-[11px] text-muted mt-0.5">L'événement apparaît différemment pour {partnerFirstName}</p>
              </div>
              <div
                onClick={() => setNewShared(v => !v)}
                className={`relative w-11 h-6 rounded-full cursor-pointer transition-colors shrink-0 ${newShared ? 'bg-primary' : 'bg-[#d5d3dc]'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${newShared ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </div>
          )}

          <SubmitButton onClick={handleSaveEvent} disabled={saving || !newTitle.trim()}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </SubmitButton>
        </BottomSheet>
      )}

      {/* BottomSheet : Partage */}
      {showShare && (
        <CalendarShareSheet onClose={() => setShowShare(false)} user={user} />
      )}
    </div>
  )
}
