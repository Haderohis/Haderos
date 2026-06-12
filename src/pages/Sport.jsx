import { useState, useEffect } from 'react'
import AppHeader from '../components/AppHeader'
import BottomSheet from '../components/BottomSheet'
import RestTimer from '../components/RestTimer'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { toDateStr } from '../lib/date'

function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function formatDuration(secs) {
  if (secs == null) return '—'
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function getPrecText(lastPerf, setNumber, type) {
  if (!lastPerf?.sets) return '—'
  const prev = lastPerf.sets.find(s => s.set_number === setNumber)
  if (!prev) return '—'
  return type === 'strength'
    ? `${prev.weight_kg ?? '?'}×${prev.reps ?? '?'}`
    : formatDuration(prev.duration_seconds)
}

const TODAY = toDateStr(new Date())
const CURRENT_WEEK_START = toDateStr(getWeekStart(new Date()))
const DAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

const S = { fill: 'none', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }
const MUSCLES = [
  { key: 'pectoraux', label: 'Pectoraux', icon: (color = 'white') => (
    <svg width="18" height="18" viewBox="0 0 24 24" {...S} stroke={color}>
      {/* Pec gauche */}
      <path d="M3 9 Q3 6 6 5 L11 5 Q12 6.5 12 9 Q11 16 7 18 Q4 17 3 14 Z"/>
      {/* Pec droit */}
      <path d="M21 9 Q21 6 18 5 L13 5 Q12 6.5 12 9 Q13 16 17 18 Q20 17 21 14 Z"/>
    </svg>
  )},
  { key: 'biceps', label: 'Biceps', icon: (color = 'white') => (
    <svg width="18" height="18" viewBox="0 0 24 24" {...S} stroke={color}>
      {/* Bras fléchi vu de face, bosse bicep visible */}
      <path d="M9 21 L9 15 Q6 13 6 9 Q6 4 12 4 Q18 4 18 9 Q18 13 15 15 L15 21 Z"/>
    </svg>
  )},
  { key: 'triceps', label: 'Triceps', icon: (color = 'white') => (
    <svg width="18" height="18" viewBox="0 0 24 24" {...S} stroke={color}>
      {/* Bras tendu vu de derrière, tricep marqué en arc */}
      <path d="M8 4 L16 4 Q19 5 19 8 L19 12 Q19 16 15.5 17.5 L15.5 21 L8.5 21 L8.5 17.5 Q5 16 5 12 L5 8 Q5 5 8 4 Z"/>
      <path d="M8 9 Q12 7 16 9"/>
    </svg>
  )},
  { key: 'dos', label: 'Dos', icon: (color = 'white') => (
    <svg width="18" height="18" viewBox="0 0 24 24" {...S} stroke={color}>
      {/* V-taper dos, large en haut, effilé en bas */}
      <path d="M3 4 L21 4 L17 15 Q15.5 20 12 20 Q8.5 20 7 15 Z"/>
      <line x1="12" y1="4" x2="12" y2="20"/>
      <path d="M6 8 Q12 11 18 8"/>
    </svg>
  )},
  { key: 'jambes', label: 'Jambes', icon: (color = 'white') => (
    <svg width="18" height="18" viewBox="0 0 24 24" {...S} stroke={color}>
      {/* Deux cuisses / jambes vues de face */}
      <path d="M4 3 L10 3 L11 13 L10 21 L7 21 L6 13 L5 21 L2 21 L3 13 Z"/>
      <path d="M14 3 L20 3 L21 13 L20 21 L17 21 L16 13 L15 21 L12 21 L13 13 Z"/>
    </svg>
  )},
  { key: 'epaules', label: 'Épaules', icon: (color = 'white') => (
    <svg width="18" height="18" viewBox="0 0 24 24" {...S} stroke={color}>
      {/* Deltoïdes — dômes arrondis sur les épaules */}
      <path d="M12 7 Q8 7 5 10 L3 14 L7 14 L8.5 12 Q10 10 12 10 Q14 10 15.5 12 L17 14 L21 14 L19 10 Q16 7 12 7 Z"/>
      <path d="M7 14 L7 21 L17 21 L17 14"/>
    </svg>
  )},
]

function MuscleIcon({ muscleKey, size = 18, color = 'white' }) {
  const m = MUSCLES.find(m => m.key === muscleKey)
  if (!m) return <DumbbellIcon size={size} color={color} />
  return <>{m.icon(color)}</>
}

function DumbbellIcon({ size = 18, color = 'white' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29l-1.43-1.43z" />
    </svg>
  )
}


function CheckCircleFilled({ onClick }) {
  return (
    <button onClick={onClick} className="shrink-0 min-w-0 min-h-0">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="#6c63ff">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
      </svg>
    </button>
  )
}

function CheckCircleOutline({ onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} className={`shrink-0 min-w-0 min-h-0 transition-opacity ${disabled ? 'opacity-25' : ''}`}>
      <svg width="22" height="22" viewBox="0 0 24 24">
        <path
          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.88-11.71L10 14.17l-1.88-1.88a.996.996 0 10-1.41 1.41l2.59 2.59c.39.39 1.02.39 1.41 0L17.3 9.7a.996.996 0 000-1.41c-.39-.39-1.03-.39-1.42 0z"
          fill="#6c63ff"
        />
      </svg>
    </button>
  )
}

export default function Sport() {
  const { user } = useAuth()
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [selectedDate, setSelectedDate] = useState(TODAY)
  const [weekSessions, setWeekSessions] = useState([])
  const [dayExercises, setDayExercises] = useState([])
  const [daySessionId, setDaySessionId] = useState(null)
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [newExerciseName, setNewExerciseName] = useState('')
  const [newExerciseType, setNewExerciseType] = useState('strength')
  const [newExerciseMuscle, setNewExerciseMuscle] = useState(null)
  const [filterMuscle, setFilterMuscle] = useState(null)
  const [editingExercise, setEditingExercise] = useState(null) // { id, name, muscle }
  const [lastPerfs, setLastPerfs] = useState({})
  const [addingSet, setAddingSet] = useState({}) // { [exoId]: Array<{weight, reps, duration}> }
  const [editingSet, setEditingSet] = useState({}) // { [setId]: {weight, reps, duration} }
  const [restTimer, setRestTimer] = useState(false)
  const [allExercises, setAllExercises] = useState([]) // { name, muscle }
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  const weekStartStr = toDateStr(weekStart)
  const isCurrentWeek = weekStartStr === CURRENT_WEEK_START
  const canGoNext = !isCurrentWeek

  // Fetch sessions for week (calendar dots)
  useEffect(() => {
    if (!user) return
    const weekEnd = addDays(weekStart, 6)
    supabase
      .from('sport_sessions')
      .select('id, session_date, sport_exercises(count)')
      .eq('user_id', user.id)
      .gte('session_date', toDateStr(weekStart))
      .lte('session_date', toDateStr(weekEnd))
      .then(({ data }) => setWeekSessions(data ?? []))
  }, [user, weekStartStr])

  // Fetch exercises for selected day + their last perfs
  useEffect(() => {
    if (!user) return
    setLoading(true)
    setDayExercises([])
    setDaySessionId(null)
    setLastPerfs({})
    setAddingSet({})
    setEditingSet({})

    supabase
      .from('sport_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('session_date', selectedDate)
      .order('created_at')
      .limit(1)
      .then(async ({ data: sessions }) => {
        if (!sessions?.length) { setLoading(false); return }
        const sid = sessions[0].id
        setDaySessionId(sid)

        const { data: exercises } = await supabase
          .from('sport_exercises')
          .select('id, name, type, muscle, position, sport_sets(id, set_number, reps, weight_kg, duration_seconds)')
          .eq('session_id', sid)
          .order('position')

        const list = (exercises ?? []).map(e => ({
          ...e,
          sport_sets: (e.sport_sets ?? []).sort((a, b) => a.set_number - b.set_number),
        }))
        setDayExercises(list)
        setLoading(false)

        // Load last perfs for all exercises (parallel)
        const uniqueNames = [...new Set(list.map(e => e.name))]
        const results = await Promise.all(
          uniqueNames.map(name =>
            supabase
              .from('sport_sessions')
              .select(`id, session_date, sport_exercises!inner(name, type, sport_sets(set_number, reps, weight_kg, duration_seconds))`)
              .eq('user_id', user.id)
              .eq('sport_exercises.name', name)
              .neq('id', sid)
              .order('session_date', { ascending: false })
              .limit(1)
              .then(({ data }) => ({ name, data }))
          )
        )
        const perfs = {}
        for (const { name, data } of results) {
          const exo = list.find(e => e.name === name)
          perfs[name] = data?.length
            ? { date: data[0].session_date, sets: data[0].sport_exercises[0].sport_sets, type: exo?.type }
            : null
        }
        setLastPerfs(perfs)
      })
  }, [user, selectedDate])

  // Autocomplete
  useEffect(() => {
    if (!user) return
    supabase
      .from('sport_exercises')
      .select('name, muscle, sport_sessions!inner(user_id)')
      .eq('sport_sessions.user_id', user.id)
      .then(({ data }) => {
        if (data) {
          const seen = new Map()
          data.forEach(e => { if (!seen.has(e.name)) seen.set(e.name, e.muscle) })
          setAllExercises([...seen.entries()].map(([name, muscle]) => ({ name, muscle })).sort((a, b) => a.name.localeCompare(b.name)))
        }
      })
  }, [user, daySessionId])

  const ensureSession = async () => {
    if (daySessionId) return daySessionId
    const { data } = await supabase
      .from('sport_sessions')
      .insert({ user_id: user.id, session_date: selectedDate })
      .select().single()
    if (data) {
      setDaySessionId(data.id)
      setWeekSessions(prev => [...prev, data])
      return data.id
    }
    return null
  }

  const handleAddExercise = async () => {
    if (!newExerciseName.trim()) return
    setSaving(true)
    const sid = await ensureSession()
    if (!sid) { setSaving(false); return }
    const { data: exo } = await supabase
      .from('sport_exercises')
      .insert({ session_id: sid, name: newExerciseName.trim(), type: newExerciseType, muscle: newExerciseMuscle, position: dayExercises.length })
      .select().single()
    setSaving(false)
    if (exo) {
      const newExo = { ...exo, sport_sets: [] }
      setDayExercises(prev => [...prev, newExo])
      setShowAddExercise(false)
      setNewExerciseName('')
      setNewExerciseType('strength')
      setNewExerciseMuscle(null)
      // Auto-open first set row
      setAddingSet(prev => ({ ...prev, [exo.id]: [{ weight: '', reps: '', duration: '' }] }))
      supabase
        .from('sport_sessions')
        .select(`id, session_date, sport_exercises!inner(name, type, sport_sets(set_number, reps, weight_kg, duration_seconds))`)
        .eq('user_id', user.id)
        .eq('sport_exercises.name', exo.name)
        .neq('id', sid)
        .order('session_date', { ascending: false })
        .limit(1)
        .then(({ data }) => setLastPerfs(prev => ({
          ...prev,
          [exo.name]: data?.length
            ? { date: data[0].session_date, sets: data[0].sport_exercises[0].sport_sets, type: exo.type }
            : null,
        })))
    }
  }

  const handleDeleteSet = async (exo, setId) => {
    await supabase.from('sport_sets').delete().eq('id', setId)
    setDayExercises(prev => prev.map(e =>
      e.id === exo.id ? { ...e, sport_sets: e.sport_sets.filter(s => s.id !== setId) } : e
    ))
  }

  const handleUncheckSet = (exo, set) => {
    const row = exo.type === 'strength'
      ? { weight: set.weight_kg ?? '', reps: set.reps ?? '', duration: '' }
      : { weight: '', reps: '', duration: set.duration_seconds != null ? `${Math.floor(set.duration_seconds / 60).toString().padStart(2, '0')}:${(set.duration_seconds % 60).toString().padStart(2, '0')}` : '' }
    setEditingSet(prev => ({ ...prev, [set.id]: row }))
  }

  const handleUpdateSet = async (exo, set) => {
    const inputs = editingSet[set.id] ?? {}
    const patch = {}
    if (exo.type === 'strength') {
      patch.reps = parseInt(inputs.reps) || null
      patch.weight_kg = parseFloat(inputs.weight) || null
    } else {
      const parts = (inputs.duration ?? '').split(':')
      patch.duration_seconds = parts.length === 2
        ? parseInt(parts[0]) * 60 + parseInt(parts[1])
        : parseInt(inputs.duration) || null
    }
    await supabase.from('sport_sets').update(patch).eq('id', set.id)
    setDayExercises(prev => prev.map(e =>
      e.id === exo.id ? { ...e, sport_sets: e.sport_sets.map(s => s.id === set.id ? { ...s, ...patch } : s) } : e
    ))
    setEditingSet(prev => { const n = { ...prev }; delete n[set.id]; return n })
  }

  const handleSaveExercise = async () => {
    if (!editingExercise || !editingExercise.name.trim()) return
    await supabase.from('sport_exercises').update({ name: editingExercise.name.trim(), muscle: editingExercise.muscle }).eq('id', editingExercise.id)
    setDayExercises(prev => prev.map(e => e.id === editingExercise.id ? { ...e, name: editingExercise.name.trim(), muscle: editingExercise.muscle } : e))
    setEditingExercise(null)
  }

  const handleDeleteExercise = async (exoId) => {
    await supabase.from('sport_exercises').delete().eq('id', exoId)
    setDayExercises(prev => prev.filter(e => e.id !== exoId))
    setAddingSet(prev => { const n = { ...prev }; delete n[exoId]; return n })
  }

  const handleAddSet = async (exo, pendingIndex) => {
    const rows = addingSet[exo.id] ?? []
    const inputs = rows[pendingIndex] ?? {}
    const setNumber = (exo.sport_sets?.length ?? 0) + 1
    const payload = { exercise_id: exo.id, set_number: setNumber }
    if (exo.type === 'strength') {
      payload.reps = parseInt(inputs.reps) || null
      payload.weight_kg = parseFloat(inputs.weight) || null
    } else {
      const parts = (inputs.duration ?? '').split(':')
      payload.duration_seconds = parts.length === 2
        ? parseInt(parts[0]) * 60 + parseInt(parts[1])
        : parseInt(inputs.duration) || null
    }
    setSaving(true)
    const { data: newSet } = await supabase.from('sport_sets').insert(payload).select().single()
    setSaving(false)
    if (newSet) {
      setDayExercises(prev => prev.map(e =>
        e.id === exo.id ? { ...e, sport_sets: [...e.sport_sets, newSet] } : e
      ))
      setAddingSet(prev => {
        const next = [...(prev[exo.id] ?? [])]
        next.splice(pendingIndex, 1)
        return { ...prev, [exo.id]: next }
      })
      setRestTimer(true)
    }
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const weekLabel = isCurrentWeek
    ? 'Cette semaine'
    : `${weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${addDays(weekStart, 6).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`

  return (
    <div className="relative min-h-dvh bg-[#f6f4f9] overflow-hidden">
      {/* Blobs décoratifs */}
      <div className="absolute top-[-80px] left-[-60px] w-[320px] h-[320px] rounded-full bg-[#c4b5fd] opacity-20 blur-3xl pointer-events-none" />
      <div className="absolute top-[200px] right-[-80px] w-[260px] h-[260px] rounded-full bg-[#a5f3fc] opacity-15 blur-3xl pointer-events-none" />
      <div className="absolute top-[460px] left-[40px] w-[240px] h-[240px] rounded-full bg-[#fde68a] opacity-15 blur-3xl pointer-events-none" />

      <AppHeader title="Sport" />

      {/* Calendar sub-header */}
      <div className="pt-[76px]">
      <div className="sticky top-[76px] z-20 bg-[rgba(255,255,255,0.55)] border-b border-[rgba(255,255,255,0.8)] backdrop-blur-md px-[14px] pt-[14px] pb-[12px] flex flex-col gap-[12px]">
        <div className="flex items-center justify-between">
          <button onClick={() => setWeekStart(prev => addDays(prev, -7))} className="w-8 h-8 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#211738"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>
          </button>
          <span className="text-[14px] font-semibold text-[#211738]">{weekLabel}</span>
          <button
            onClick={() => canGoNext && setWeekStart(prev => addDays(prev, 7))}
            disabled={!canGoNext}
            className={`w-8 h-8 flex items-center justify-center ${!canGoNext ? 'opacity-20' : ''}`}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#211738"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /></svg>
          </button>
        </div>

        <div className="flex gap-[8px] items-center">
          {weekDays.map((day, i) => {
            const dateStr = toDateStr(day)
            const isSelected = dateStr === selectedDate
            const isToday = dateStr === TODAY
            const hasSession = weekSessions.some(s => s.session_date === dateStr && (s.sport_exercises?.[0]?.count ?? 0) > 0)
            const isFuture = dateStr > TODAY
            return (
              <button
                key={dateStr}
                onClick={() => !isFuture && setSelectedDate(dateStr)}
                disabled={isFuture}
                className={`flex flex-1 flex-col h-[40px] items-center justify-start pt-[7px] gap-[4px] overflow-hidden px-[8px] rounded-[4px] transition-colors ${
                  isSelected ? 'bg-[#6c63ff]' : isToday ? 'border border-[#6c63ff]' : ''
                } ${isFuture ? 'cursor-default' : ''}`}
              >
                <span className={`text-[10px] font-semibold leading-none ${isSelected ? 'text-white' : isFuture ? 'text-[#c0befe]' : 'text-[#8883aa]'}`}>
                  {DAY_LABELS[i]}
                </span>
                <div className="h-[14px] flex items-center justify-center">
                  {hasSession && <DumbbellIcon size={12} color={isSelected ? 'white' : '#6c63ff'} />}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="pb-28 px-[14px] flex flex-col gap-3 mt-3">

        {loading && (
          <p className="text-center text-[13px] text-[#736694] mt-8">Chargement…</p>
        )}

        {!loading && dayExercises.length === 0 && (
          <div className="bg-white/60 border border-[#c0befe]/50 rounded-[12px] h-[64px] flex flex-col items-center justify-center mt-2">
            <p className="text-[22px] font-bold text-[#6c63ff] leading-tight">Aucun exercice</p>
            <p className="text-[11px] text-[#a49ffe]">pour le moment</p>
          </div>
        )}

        {!loading && dayExercises.map(exo => {
          const perf = lastPerfs[exo.name]
          const pendingRows = addingSet[exo.id] ?? []
          const hasSets = exo.sport_sets.length > 0
          const showHeaders = hasSets || pendingRows.length > 0
          const col2Label = exo.type === 'strength' ? 'KG' : 'Kcal'
          const col3Label = exo.type === 'strength' ? 'REPS' : 'Durée'

          return (
            <div key={exo.id} className="bg-white/60 border border-[#c0befe]/50 rounded-[12px] overflow-hidden">

              {/* Exercise header */}
              <div className="flex items-center justify-between px-3 py-[13px]">
                <div className="flex items-center gap-4">
                  <div className="relative w-[37px] h-[36px] shrink-0">
                    <div className="absolute inset-0 bg-[#6c63ff] rounded-[4px]" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <MuscleIcon muscleKey={exo.muscle} size={18} color="white" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-[3px]">
                    <p className="text-[14px] font-semibold text-black leading-tight">{exo.name}</p>
                    <p className="text-[10px] text-[#8883aa]">{exo.muscle ? MUSCLES.find(m => m.key === exo.muscle)?.label : (exo.type === 'strength' ? 'Musculation' : 'Cardio')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setEditingExercise({ id: exo.id, name: exo.name, muscle: exo.muscle ?? null })} className="shrink-0 w-6 h-6 flex items-center justify-center min-w-0 min-h-0">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="#a49ffe">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                  </button>
                  <button onClick={() => handleDeleteExercise(exo.id)} className="shrink-0 w-6 h-6 flex items-center justify-center min-w-0 min-h-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#c0befe">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Column headers */}
              {showHeaders && (
                <div className="flex items-center px-4 pb-1">
                  <span className="w-6 shrink-0" />
                  <span className="flex-1 text-center text-[10px] text-[#8883aa] font-normal">PREC</span>
                  <span className="flex-1 text-center text-[10px] text-[#8883aa] font-normal">{col2Label}</span>
                  <span className="flex-1 text-center text-[10px] text-[#8883aa] font-normal">{col3Label}</span>
                  <span className="w-[22px] shrink-0" />
                </div>
              )}

              {/* Saved set rows */}
              {exo.sport_sets.map((set, idx) => {
                const precText = getPrecText(perf, set.set_number, exo.type)
                const editing = editingSet[set.id]
                return (
                  <div key={set.id} className="flex items-center gap-1 px-4 py-[5px] bg-[rgba(108,99,255,0.08)]">
                    <span className="w-6 text-[14px] font-semibold text-black shrink-0">{set.set_number}</span>
                    <div className="flex-1 flex justify-center">
                      <div className="bg-white/60 border border-[#c0befe] rounded-[4px] px-1 py-[5px] w-[51px] flex items-center justify-center">
                        <span className="text-[10px] text-[#8883aa]">{precText}</span>
                      </div>
                    </div>
                    <div className="flex-1 flex justify-center">
                      {editing ? (
                        <input
                          type="number" inputMode="decimal" min="0" placeholder="—"
                          value={editing.weight ?? ''}
                          onChange={e => setEditingSet(prev => ({ ...prev, [set.id]: { ...prev[set.id], weight: e.target.value } }))}
                          className="w-[51px] bg-white/60 border border-[#6c63ff] rounded-[4px] text-[10px] text-black text-center outline-none py-[5px]"
                        />
                      ) : (
                        <div className="bg-white/60 border border-[#c0befe] rounded-[4px] px-1 py-[5px] w-[51px] flex items-center justify-center">
                          <span className="text-[10px] text-black">
                            {exo.type === 'strength' ? (set.weight_kg ?? '—') : '—'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 flex justify-center">
                      {editing ? (
                        exo.type === 'strength' ? (
                          <input
                            type="number" inputMode="numeric" min="0" placeholder="—"
                            value={editing.reps ?? ''}
                            onChange={e => setEditingSet(prev => ({ ...prev, [set.id]: { ...prev[set.id], reps: e.target.value } }))}
                            className="w-[51px] bg-white/60 border border-[#6c63ff] rounded-[4px] text-[10px] text-black text-center outline-none py-[5px]"
                          />
                        ) : (
                          <input
                            type="text" placeholder="mm:ss"
                            value={editing.duration ?? ''}
                            onChange={e => setEditingSet(prev => ({ ...prev, [set.id]: { ...prev[set.id], duration: e.target.value } }))}
                            className="w-[51px] bg-white/60 border border-[#6c63ff] rounded-[4px] text-[10px] text-black text-center outline-none py-[5px]"
                          />
                        )
                      ) : (
                        <div className="bg-white/60 border border-[#c0befe] rounded-[4px] px-1 py-[5px] w-[51px] flex items-center justify-center">
                          <span className="text-[10px] text-black">
                            {exo.type === 'strength' ? (set.reps ?? '—') : formatDuration(set.duration_seconds)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="w-[22px] shrink-0 flex justify-center">
                      {editing
                        ? <CheckCircleOutline onClick={() => handleUpdateSet(exo, set)} disabled={false} />
                        : <CheckCircleFilled onClick={() => handleUncheckSet(exo, set)} />
                      }
                    </div>
                  </div>
                )
              })}

              {/* Lignes en attente */}
              {pendingRows.map((pending, pi) => {
                const displayNum = exo.sport_sets.length + pi + 1
                return (
                  <div key={pi} className="flex items-center gap-1 px-4 py-[5px]">
                    <span className="w-6 text-[14px] font-semibold text-black shrink-0">{displayNum}</span>
                    <div className="flex-1 flex justify-center">
                      <div className="bg-white/60 border border-[#c0befe] rounded-[4px] px-1 py-[5px] w-[51px] flex items-center justify-center">
                        <span className="text-[10px] text-[#8883aa]">
                          {getPrecText(perf, displayNum, exo.type)}
                        </span>
                      </div>
                    </div>
                    {exo.type === 'strength' ? (
                      <>
                        <div className="flex-1 flex justify-center">
                          <input
                            type="number" inputMode="decimal" min="0" placeholder="—"
                            value={pending.weight ?? ''}
                            onChange={e => setAddingSet(prev => {
                              const rows = [...(prev[exo.id] ?? [])]
                              if (pi === 0) {
                                return { ...prev, [exo.id]: rows.map(r => ({ ...r, weight: e.target.value })) }
                              }
                              rows[pi] = { ...rows[pi], weight: e.target.value }
                              return { ...prev, [exo.id]: rows }
                            })}
                            className="w-[51px] bg-white/60 border border-[#6c63ff] rounded-[4px] text-[10px] text-black text-center outline-none py-[5px]"
                          />
                        </div>
                        <div className="flex-1 flex justify-center">
                          <input
                            type="number" inputMode="numeric" min="0" placeholder="—"
                            value={pending.reps ?? ''}
                            onChange={e => setAddingSet(prev => {
                              const rows = [...(prev[exo.id] ?? [])]
                              rows[pi] = { ...rows[pi], reps: e.target.value }
                              return { ...prev, [exo.id]: rows }
                            })}
                            className="w-[51px] bg-white/60 border border-[#6c63ff] rounded-[4px] text-[10px] text-black text-center outline-none py-[5px]"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 flex justify-center">
                          <div className="w-[51px] h-[27px]" />
                        </div>
                        <div className="flex-1 flex justify-center">
                          <input
                            type="text" placeholder="mm:ss"
                            value={pending.duration ?? ''}
                            onChange={e => setAddingSet(prev => {
                              const rows = [...(prev[exo.id] ?? [])]
                              rows[pi] = { ...rows[pi], duration: e.target.value }
                              return { ...prev, [exo.id]: rows }
                            })}
                            className="w-[51px] bg-white/60 border border-[#6c63ff] rounded-[4px] text-[10px] text-black text-center outline-none py-[5px]"
                          />
                        </div>
                      </>
                    )}
                    <div className="w-[22px] shrink-0 flex items-center justify-center">
                      <CheckCircleOutline
                        onClick={() => handleAddSet(exo, pi)}
                        disabled={exo.type === 'strength'
                          ? !pending.weight || !pending.reps
                          : !pending.duration}
                      />
                    </div>
                  </div>
                )
              })}

              {/* Ajouter une serie — toujours visible */}
              <button
                onClick={() => setAddingSet(prev => ({
                  ...prev,
                  [exo.id]: [...(prev[exo.id] ?? []), { weight: '', reps: '', duration: '' }]
                }))}
                className="w-full flex items-center justify-center gap-2 py-[8px] border-t border-[#6c63ff]/20 text-[#6c63ff] text-[14px] font-semibold"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#6c63ff"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
                Ajouter une serie
              </button>
            </div>
          )
        })}
      </div>
      </div>{/* fin pt-[76px] */}

      {/* Bouton ajouter exercice */}
      <button
        onClick={() => setShowAddExercise(true)}
        className="fixed bottom-4 left-4 right-4 h-[48px] bg-[#6c63ff] rounded-[12px] text-white text-[14px] font-semibold z-10"
      >
        Ajouter un exercice
      </button>

      {/* BottomSheet — Nouvel exercice */}
      {showAddExercise && (
        <BottomSheet onClose={() => { setShowAddExercise(false); setNewExerciseName(''); setNewExerciseType('strength'); setNewExerciseMuscle(null); setFilterMuscle(null) }}>
          <h2 className="text-[17px] font-bold text-[#211738]">Nouvel exercice</h2>

          {/* Nom autocomplete */}
          <div className="relative flex flex-col">
            <input
              type="text"
              placeholder="Nom de l'exercice"
              value={newExerciseName}
              onChange={e => { setNewExerciseName(e.target.value); setShowSuggestions(true) }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              autoFocus
              className="h-12 w-full px-4 bg-[#f2edfa] rounded-[10px] text-[14px] text-[#211738] placeholder-[#a49ffe] outline-none"
            />
            {showSuggestions && (() => {
              const suggestions = allExercises
                .filter(e => {
                  const matchName = e.name.toLowerCase().includes(newExerciseName.toLowerCase()) && e.name !== newExerciseName
                  const matchMuscle = !filterMuscle || e.muscle === filterMuscle
                  return matchName && matchMuscle
                })
                .slice(0, 6)
              return suggestions.length > 0 ? (
                <ul className="absolute left-0 right-0 top-full mt-1 bg-white rounded-[10px] shadow-lg z-10 overflow-hidden border border-[#f2edfa]">
                  {suggestions.map(({ name, muscle }) => (
                    <li key={name}>
                      <button
                        type="button"
                        onPointerDown={e => {
                          e.preventDefault()
                          setNewExerciseName(name)
                          if (muscle) { setNewExerciseMuscle(muscle); setFilterMuscle(muscle) }
                          setShowSuggestions(false)
                        }}
                        className="w-full text-left px-4 py-3 text-[13px] text-[#211738] hover:bg-[#f2edfa] flex items-center gap-2"
                      >
                        <span className="text-[#6c63ff]">{muscle ? MUSCLES.find(m => m.key === muscle)?.icon('#6c63ff') : <DumbbellIcon size={14} color="#a49ffe" />}</span>
                        <span className="flex-1">{name}</span>
                        {muscle && <span className="text-[11px] text-[#a49ffe]">{MUSCLES.find(m => m.key === muscle)?.label}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null
            })()}
          </div>

          {/* Filtre muscle */}
          <div className="flex flex-wrap gap-2">
            {MUSCLES.map(m => {
              const active = filterMuscle === m.key
              return (
                <button
                  key={m.key}
                  onPointerDown={e => { e.preventDefault(); setFilterMuscle(active ? null : m.key); if (!active) setNewExerciseMuscle(m.key); else setNewExerciseMuscle(null) }}
                  className={`flex items-center gap-1.5 px-3 h-9 rounded-[20px] text-[12px] font-semibold transition-colors ${active ? 'bg-[#6c63ff] text-white' : 'bg-[#f2edfa] text-[#736694]'}`}
                >
                  <span>{m.icon(active ? 'white' : '#6c63ff')}</span>
                  {m.label}
                </button>
              )
            })}
          </div>

          {/* Toggle muscu / cardio */}
          <div className="flex bg-[#f2edfa] rounded-[10px] p-1 gap-1">
            {[
              ['strength', 'Musculation', <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29l-1.43-1.43z"/></svg>],
              ['cardio', 'Cardio', <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z"/></svg>],
            ].map(([val, label, icon]) => (
              <button key={val} onClick={() => setNewExerciseType(val)}
                className={`flex-1 h-10 rounded-[8px] text-[13px] font-semibold transition-colors flex items-center justify-center gap-1.5 ${newExerciseType === val ? 'bg-[#6c63ff] text-white' : 'text-[#736694]'}`}>
                {icon}
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={handleAddExercise}
            disabled={!newExerciseName.trim() || saving}
            className="h-12 w-full bg-[#6c63ff] disabled:opacity-50 text-white font-semibold rounded-[12px]">
            {saving ? 'Ajout…' : 'Ajouter'}
          </button>
        </BottomSheet>
      )}

      {/* BottomSheet — Édition exercice */}
      {editingExercise && (
        <BottomSheet onClose={() => setEditingExercise(null)}>
          <h2 className="text-[17px] font-bold text-[#211738]">Modifier l'exercice</h2>
          <input
            type="text"
            placeholder="Nom de l'exercice"
            value={editingExercise.name}
            onChange={e => setEditingExercise(prev => ({ ...prev, name: e.target.value }))}
            autoFocus
            className="h-12 w-full px-4 bg-[#f2edfa] rounded-[10px] text-[14px] text-[#211738] placeholder-[#a49ffe] outline-none"
          />
          <div className="flex flex-wrap gap-2">
            {MUSCLES.map(m => {
              const active = editingExercise.muscle === m.key
              return (
                <button
                  key={m.key}
                  onPointerDown={e => { e.preventDefault(); setEditingExercise(prev => ({ ...prev, muscle: active ? null : m.key })) }}
                  className={`flex items-center gap-1.5 px-3 h-9 rounded-[20px] text-[12px] font-semibold transition-colors ${active ? 'bg-[#6c63ff] text-white' : 'bg-[#f2edfa] text-[#736694]'}`}
                >
                  <span>{m.icon(active ? 'white' : '#6c63ff')}</span>
                  {m.label}
                </button>
              )
            })}
          </div>
          <button
            onClick={handleSaveExercise}
            disabled={!editingExercise.name.trim()}
            className="h-12 w-full bg-[#6c63ff] disabled:opacity-50 text-white font-semibold rounded-[12px]">
            Enregistrer
          </button>
        </BottomSheet>
      )}

      {restTimer && <RestTimer onClose={() => setRestTimer(false)} />}
    </div>
  )
}
