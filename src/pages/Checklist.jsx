import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const EMPTY_FORM = { label: '', group: '', dueDate: '', tags: [] }
const TAG_TYPES = [
  { value: 'personne', color: 'bg-[#e0f2fe] text-[#1c78ab]', icon: (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )},
  { value: 'contexte', color: 'bg-[#e9ebfd] text-[#7168ff]', icon: (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )},
]
const tagColor = (type) => TAG_TYPES.find(t => t.value === type)?.color ?? TAG_TYPES[1].color
const tagIcon  = (type) => TAG_TYPES.find(t => t.value === type)?.icon  ?? null

const toDateStr = (d) => {
  const date = new Date(d)
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}
const todayStr = () => toDateStr(new Date())

export default function Checklist() {
  const [tasks, setTasks]       = useState([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [tagInput, setTagInput] = useState('')
  const [tagType, setTagType]   = useState('contexte')
  const [groupInput, setGroupInput] = useState('')
  const [groupOpen, setGroupOpen]   = useState(false)
  const [error, setError]   = useState('')
  const [saving, setSaving] = useState(false)

  // Jour courant
  const [currentDay, setCurrentDay] = useState(todayStr())
  const dayDateRef = useRef(null)

  // Filtres
  const [search, setSearch]               = useState('')
  const [filterTag, setFilterTag]         = useState(null)
  const [filterGroup, setFilterGroup]     = useState(null)
  const [showFilter, setShowFilter]       = useState(false)
  const [filterGroupInput, setFilterGroupInput] = useState('')
  const [filterTagInput, setFilterTagInput]     = useState('')

  const groupRef  = useRef(null)
  const filterRef = useRef(null)
  const dateRef   = useRef(null)
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const profile = useProfile(user)

  useEffect(() => { if (!loading && !user) navigate('/login') }, [user, loading])

  useEffect(() => {
    if (!user) return
    supabase.from('tasks').select('*').eq('user_id', user.id)
      .order('position', { ascending: true })
      .then(({ data }) => { if (data) setTasks(data) })
  }, [user])

  useEffect(() => {
    const handler = (e) => {
      if (groupRef.current && !groupRef.current.contains(e.target)) setGroupOpen(false)
      if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilter(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const firstName   = profile?.first_name ?? ''
  const lastName    = profile?.last_name  ?? ''
  const displayName = profile?.display_name ?? user?.email ?? ''
  const initials    = firstName && lastName
    ? `${firstName[0]}${lastName[0]}`.toUpperCase()
    : displayName?.slice(0,2).toUpperCase() ?? '??'

  // ── Logique jour ──────────────────────────────────────────────
  const isToday = currentDay === todayStr()

  const visibleTasks = tasks.filter(task => {
    if (!task.done) return isToday
    const completedDay = task.completed_at ? toDateStr(task.completed_at) : todayStr()
    return completedDay === currentDay
  })

  // Jours avec tâches terminées (pour navigation)
  const daysWithTasks = [...new Set(
    tasks.filter(t => t.done && t.completed_at).map(t => toDateStr(t.completed_at))
  )].sort()

  const prevDay = () => {
    const d = new Date(currentDay + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    setCurrentDay(toDateStr(d))
  }
  const nextDay = () => {
    if (isToday) return
    const d = new Date(currentDay + 'T12:00:00')
    d.setDate(d.getDate() + 1)
    const next = toDateStr(d)
    setCurrentDay(next > todayStr() ? todayStr() : next)
  }
  const hasPrev = true
  const hasNext = !isToday

  const formatDay = (str) => {
    const d = new Date(str + 'T12:00:00')
    if (str === todayStr()) return "Aujourd'hui"
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1)
    if (str === toDateStr(yesterday)) return 'Hier'
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  // ── Retard ──────────────────────────────────────────────────
  const todayDate = new Date(todayStr() + 'T00:00:00')
  const overdueTasks = isToday
    ? visibleTasks.filter(t => !t.done && t.due_date && new Date(t.due_date + 'T00:00:00') < todayDate)
    : []
  const overdueIds = new Set(overdueTasks.map(t => t.id))

  // ── Filtres/recherche ──────────────────────────────────────
  const allTags   = tasks.flatMap(t => t.tags ?? []).filter((t, i, arr) =>
    arr.findIndex(x => x.label === t.label && x.type === t.type) === i
  )
  const allGroups = [...new Set(tasks.map(t => t.group_name).filter(Boolean))]

  const applyFilters = (list) => list.filter(task => {
    if (search && !task.label.toLowerCase().includes(search.toLowerCase())) return false
    if (filterGroup && task.group_name !== filterGroup) return false
    if (filterTag && !(task.tags ?? []).some(t => t.label === filterTag.label && t.type === filterTag.type)) return false
    return true
  })

  // Quand une recherche est active, chercher dans toutes les tâches (pas seulement le jour courant)
  const searchBase = search ? tasks : visibleTasks.filter(t => !overdueIds.has(t.id))
  const regularTasks    = applyFilters(searchBase)
  const filteredOverdue = applyFilters(overdueTasks)

  // ── Tags form ───────────────────────────────────────────────
  const tagSuggestions = tagInput.length > 0
    ? allTags.filter(t =>
        t.label.toLowerCase().startsWith(tagInput.toLowerCase()) &&
        !form.tags.some(ft => ft.label === t.label && ft.type === t.type)
      )
    : []
  const groupSuggestions = allGroups.filter(g => g.toLowerCase().includes(groupInput.toLowerCase()))

  const addTag = (label, type = tagType) => {
    const trimmed = label.trim()
    if (!trimmed || form.tags.some(t => t.label === trimmed && t.type === type)) return
    setForm(f => ({ ...f, tags: [...f.tags, { label: trimmed, type }] }))
    setTagInput('')
  }
  const removeTag = (index) => setForm(f => ({ ...f, tags: f.tags.filter((_, i) => i !== index) }))

  // ── Modal ──────────────────────────────────────────────────
  const openModal = () => {
    setForm(EMPTY_FORM); setTagInput(''); setGroupInput(''); setError(''); setEditingId(null); setShowModal(true)
  }
  const openEdit = (task) => {
    setForm({ label: task.label, group: task.group_name ?? '', dueDate: task.due_date ?? '', tags: task.tags ?? [] })
    setGroupInput(task.group_name ?? ''); setTagInput(''); setError(''); setEditingId(task.id); setShowModal(true)
  }

  const addTask = async () => {
    if (!form.label.trim()) { setError('Le nom de la tâche est obligatoire.'); return }
    const finalTags = tagInput.trim() && !form.tags.some(t => t.label === tagInput.trim() && t.type === tagType)
      ? [...form.tags, { label: tagInput.trim(), type: tagType }]
      : form.tags
    setSaving(true)
    if (editingId) {
      const { data, error: err } = await supabase.from('tasks').update({
        label: form.label.trim(), group_name: form.group || null, due_date: form.dueDate || null, tags: finalTags,
      }).eq('id', editingId).select().single()
      setSaving(false)
      if (err) { setError('Erreur lors de la sauvegarde.'); return }
      setTasks(prev => prev.map(t => t.id === editingId ? data : t))
    } else {
      const { data, error: err } = await supabase.from('tasks').insert({
        user_id: user.id, label: form.label.trim(), group_name: form.group || null,
        due_date: form.dueDate || null, tags: finalTags, done: false,
      }).select().single()
      setSaving(false)
      if (err) { setError('Erreur lors de la sauvegarde.'); return }
      setTasks(prev => [data, ...prev])
    }
    setShowModal(false)
  }

  const toggleTask = async (id, done) => {
    const completed_at = !done ? new Date().toISOString() : null
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !done, completed_at } : t))
    await supabase.from('tasks').update({ done: !done, completed_at }).eq('id', id)
  }

  const deleteTask = async (id) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    await supabase.from('tasks').delete().eq('id', id)
  }

  // ── DnD ────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 5 } }),
  )
  const handleDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return
    const oldIndex = tasks.findIndex(t => t.id === active.id)
    const newIndex = tasks.findIndex(t => t.id === over.id)
    const reordered = arrayMove(tasks, oldIndex, newIndex)
    setTasks(reordered)
    await Promise.all(reordered.map((task, i) => supabase.from('tasks').update({ position: i }).eq('id', task.id)))
  }

  const formatDueDate = (dateStr) => {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  // ── Composant tâche ─────────────────────────────────────────
  const TaskItem = ({ task, overdue = false, sortable = false }) => {
    const sortableProps = sortable ? useSortable({ id: task.id }) : null
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortableProps ?? {}
    const hasTags = (task.tags ?? []).length > 0
    return (
      <li
        ref={setNodeRef}
        style={sortable ? { transform: CSS.Transform.toString(transform), transition } : {}}
        className={`border rounded-[8px] px-2 py-[6px] flex items-center gap-2
          ${task.done ? 'bg-[#f0eef5]/80 border-[rgba(115,102,148,0.2)]' : 'bg-white/70 border-white/85'}
          ${isDragging ? 'opacity-50 z-50' : ''}`}
      >
        {/* Drag handle */}
        {sortable && (
          <button {...attributes} {...listeners} className="w-4 h-4 flex items-center justify-center shrink-0 touch-none">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="9" cy="5" r="1.5" fill="#c0befe"/><circle cx="15" cy="5" r="1.5" fill="#c0befe"/>
              <circle cx="9" cy="12" r="1.5" fill="#c0befe"/><circle cx="15" cy="12" r="1.5" fill="#c0befe"/>
              <circle cx="9" cy="19" r="1.5" fill="#c0befe"/><circle cx="15" cy="19" r="1.5" fill="#c0befe"/>
            </svg>
          </button>
        )}
        {/* Checkbox — toujours cliquable */}
        <button onClick={() => toggleTask(task.id, task.done)}
          style={{ minWidth: 0, minHeight: 0, width: 24, height: 24 }}
          className={`rounded-[3px] border-2 flex items-center justify-center shrink-0 ${task.done ? 'border-[#736694] bg-[#736694]' : 'border-[#6c63ff]'}`}>
          {task.done && (
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
        {/* Texte + tags (flex-1) — désactivé si terminé */}
        <div className={`flex flex-col gap-[3px] min-w-0 flex-1 ${task.done ? 'pointer-events-none' : 'cursor-pointer'}`}
          onClick={() => !task.done && openEdit(task)}>
          <span className={`text-[12px] font-bold leading-tight ${task.done ? 'line-through text-[#9992a8]' : 'text-black'}`}>{task.label}</span>
          {hasTags && (
            <div className="flex flex-wrap items-center gap-[3px]">
              {(task.tags ?? []).map((tag, i) => (
                <span key={i} className={`flex items-center gap-[4px] text-[8px] px-[4px] py-[1px] rounded-full ${task.done ? 'bg-[#e8e5f0] text-[#9992a8]' : tagColor(tag.type)}`}>
                  {tagIcon(tag.type)}{tag.label}
                </span>
              ))}
            </div>
          )}
        </div>
        {/* Date */}
        {task.due_date && (
          <div className="flex justify-center shrink-0">
            {overdue && !task.done ? (
              <div className="bg-[rgba(254,228,229,0.6)] border border-[rgba(153,153,166,0.2)] rounded-full px-2 py-1 flex items-center gap-[6px]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="18" rx="2" stroke="#b91c1c" strokeWidth="2"/>
                  <path d="M16 2v4M8 2v4M3 10h18" stroke="#b91c1c" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span className="text-[12px] text-[#b91c1c]">{formatDueDate(task.due_date)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-[6px]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="18" rx="2" stroke={task.done ? '#9992a8' : '#736694'} strokeWidth="2"/>
                  <path d="M16 2v4M8 2v4M3 10h18" stroke={task.done ? '#9992a8' : '#736694'} strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span className={`text-[12px] whitespace-nowrap ${task.done ? 'text-[#9992a8]' : 'text-black'}`}>{formatDueDate(task.due_date)}</span>
              </div>
            )}
          </div>
        )}
        {/* Supprimer — désactivé si terminé */}
        <button
          onClick={() => !task.done && deleteTask(task.id)}
          className={`w-6 h-6 flex items-center justify-center shrink-0 ${task.done ? 'pointer-events-none opacity-0' : ''}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="#a49ffe" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </li>
    )
  }

  const SortableTask = ({ task }) => <TaskItem task={task} sortable />

  // ── Rendu groupé ────────────────────────────────────────────
  const renderGrouped = (list) => {
    const grouped = list.reduce((acc, task) => {
      const key = task.group_name ?? ''
      if (!acc[key]) acc[key] = []
      acc[key].push(task)
      return acc
    }, {})
    const keys = Object.keys(grouped).sort((a, b) => {
      if (a === '') return 1; if (b === '') return -1; return a.localeCompare(b)
    })
    return keys.map((group, i) => (
      <div key={group} className={`flex flex-col gap-2 ${i > 0 ? 'pt-2 border-t border-[rgba(115,102,148,0.15)]' : ''}`}>
        {group && <p className="text-[12px] font-semibold text-[#6c63ff] uppercase tracking-wider px-1 mt-1">{group}</p>}
        <ul className="flex flex-col gap-2">
          {grouped[group].map(task => <SortableTask key={task.id} task={task} />)}
        </ul>
      </div>
    ))
  }

  const hasTasks = tasks.length > 0

  return (
    <div className="relative w-full h-dvh overflow-hidden bg-[#f6f4f9]">

      {/* Blobs */}
      <div className="absolute -left-16 -top-4 w-72 h-72 rounded-full bg-[#c4b5fd] opacity-30 blur-3xl pointer-events-none"/>
      <div className="absolute left-32 top-14 w-64 h-64 rounded-full bg-[#a5f3fc] opacity-25 blur-3xl pointer-events-none"/>
      <div className="absolute -left-8 top-52 w-60 h-60 rounded-full bg-[#bbf7d0] opacity-20 blur-3xl pointer-events-none"/>
      <div className="absolute left-40 top-[461px] w-64 h-64 rounded-full bg-[#fed7aa] opacity-25 blur-3xl pointer-events-none"/>

      {/* TopBar */}
      <header className="absolute top-0 left-0 right-0 h-[94px] bg-white/55 border-b border-white/80 backdrop-blur-md z-20 flex items-end justify-between px-4 pb-4">
        <button onClick={() => setMenuOpen(true)} className="flex flex-col gap-[5px] p-2 min-w-[44px] min-h-[44px] justify-center">
          <span className="block w-[22px] h-[2.5px] rounded-sm bg-[rgba(33,23,56,0.75)]"/>
          <span className="block w-[22px] h-[2.5px] rounded-sm bg-[rgba(33,23,56,0.75)]"/>
          <span className="block w-[22px] h-[2.5px] rounded-sm bg-[rgba(33,23,56,0.75)]"/>
        </button>
        <h1 className="absolute left-1/2 -translate-x-1/2 bottom-4 text-[17px] font-semibold text-[#211738]">Worklist</h1>
      </header>

      {/* Barre recherche + jour */}
      <div className="absolute top-[94px] left-0 right-0 z-10 bg-white/55 backdrop-blur-md border-b border-white/80">

        {/* Barre recherche + filtres */}
        <div className="px-4 pt-4 flex gap-2">
          <div className="relative flex-1">
            <div className="bg-white/70 border border-white/85 rounded-[8px] h-[44px] flex items-center px-3 gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
                <circle cx="11" cy="11" r="8" stroke="#ada7fd" strokeWidth="2"/>
                <path d="M21 21l-4.35-4.35" stroke="#ada7fd" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <input type="text" value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') setSearch('') }}
                placeholder="Rechercher"
                className="bg-transparent text-[14px] font-semibold text-[#211738] outline-none placeholder:text-[#ada7fd] flex-1"/>
              {search && <button onClick={() => setSearch('')} style={{ minWidth: 0, minHeight: 0 }} className="text-[#a49ffe] leading-none text-lg">&times;</button>}
            </div>
            {/* Autocomplete suggestions */}
            {search.length > 0 && (() => {
              const q = search.toLowerCase()
              const taskSuggestions = [...new Set(tasks.map(t => t.label).filter(l => l.toLowerCase().includes(q) && l.toLowerCase() !== q))]
              if (!taskSuggestions.length) return null
              return (
                <ul className="absolute left-0 right-0 top-[50px] bg-white/95 backdrop-blur-md rounded-[10px] shadow-lg z-30 overflow-hidden border border-[#f2edfa]">
                  {taskSuggestions.slice(0, 5).map((label, i) => (
                    <li key={i}>
                      <button className="w-full text-left px-4 py-3 text-[13px] text-[#211738] hover:bg-[#f2edfa] flex items-center gap-2"
                        style={{ minWidth: 0, minHeight: 0 }}
                        onClick={() => setSearch(label)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
                          <circle cx="11" cy="11" r="8" stroke="#a49ffe" strokeWidth="2"/>
                          <path d="M21 21l-4.35-4.35" stroke="#a49ffe" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        {label}
                      </button>
                    </li>
                  ))}
                </ul>
              )
            })()}
          </div>
          {/* Bouton filtre + dropdown */}
          <div className="relative shrink-0" ref={filterRef}>
            <button onClick={() => setShowFilter(f => !f)}
              style={{ minWidth: 0, minHeight: 0, width: 44, height: 44 }}
              className={`rounded-[8px] border border-white/85 flex items-center justify-center ${showFilter || filterTag || filterGroup ? 'bg-[#6c63ff] text-white' : 'bg-white/75 text-[#736694]'}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            {/* Dropdown filtres */}
            {showFilter && (
              <div className="absolute right-0 top-[50px] z-30 bg-white/95 backdrop-blur-md border border-white/85 rounded-[12px] shadow-lg p-3 flex flex-col gap-3 w-[220px]">

                {/* Filtre groupe */}
                <div className="flex flex-col gap-1">
                  <p className="text-[10px] font-semibold text-[#736694] uppercase tracking-wider">Groupe</p>
                  <div className="relative">
                    <div className={`flex items-center gap-2 bg-[#f2edfa] rounded-[8px] px-3 h-9 ${filterGroup ? 'ring-2 ring-[#6c63ff]/40' : ''}`}>
                      {filterGroup && (
                        <span className="text-[12px] font-medium text-[#6c63ff] bg-[#6c63ff]/10 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                          {filterGroup}
                          <button onClick={() => { setFilterGroup(null); setFilterGroupInput('') }} style={{ minWidth: 0, minHeight: 0 }} className="text-[#6c63ff] leading-none">&times;</button>
                        </span>
                      )}
                      {!filterGroup && (
                        <input type="text" value={filterGroupInput}
                          onChange={e => setFilterGroupInput(e.target.value)}
                          placeholder="Filtrer par groupe..."
                          className="bg-transparent text-[13px] text-[#211738] outline-none placeholder:text-[#a49ffe] flex-1 w-full"/>
                      )}
                    </div>
                    {!filterGroup && filterGroupInput && (
                      <ul className="absolute left-0 right-0 top-[38px] bg-white rounded-[8px] shadow-lg z-10 overflow-hidden border border-[#f2edfa]">
                        {allGroups.filter(g => g.toLowerCase().includes(filterGroupInput.toLowerCase())).map(g => (
                          <li key={g}>
                            <button className="w-full text-left px-3 py-2 text-[13px] text-[#211738] hover:bg-[#f2edfa]"
                              style={{ minWidth: 0, minHeight: 0 }}
                              onClick={() => { setFilterGroup(g); setFilterGroupInput('') }}>
                              {g}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Filtre tag */}
                <div className="flex flex-col gap-1">
                  <p className="text-[10px] font-semibold text-[#736694] uppercase tracking-wider">Tag</p>
                  <div className="relative">
                    <div className={`flex items-center gap-2 bg-[#f2edfa] rounded-[8px] px-3 h-9 ${filterTag ? 'ring-2 ring-[#6c63ff]/40' : ''}`}>
                      {filterTag && (
                        <span className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full shrink-0 ${tagColor(filterTag.type)}`}>
                          {tagIcon(filterTag.type)}{filterTag.label}
                          <button onClick={() => { setFilterTag(null); setFilterTagInput('') }} style={{ minWidth: 0, minHeight: 0 }} className="leading-none">&times;</button>
                        </span>
                      )}
                      {!filterTag && (
                        <input type="text" value={filterTagInput}
                          onChange={e => setFilterTagInput(e.target.value)}
                          placeholder="Filtrer par tag..."
                          className="bg-transparent text-[13px] text-[#211738] outline-none placeholder:text-[#a49ffe] flex-1 w-full"/>
                      )}
                    </div>
                    {!filterTag && filterTagInput && (
                      <ul className="absolute left-0 right-0 top-[38px] bg-white rounded-[8px] shadow-lg z-10 overflow-hidden border border-[#f2edfa]">
                        {allTags.filter(t => t.label.toLowerCase().includes(filterTagInput.toLowerCase())).map((tag, i) => (
                          <li key={i}>
                            <button className="w-full text-left px-3 py-2 text-[13px] hover:bg-[#f2edfa] flex items-center gap-2"
                              style={{ minWidth: 0, minHeight: 0 }}
                              onClick={() => { setFilterTag(tag); setFilterTagInput('') }}>
                              <span className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${tagColor(tag.type)}`}>
                                {tagIcon(tag.type)}{tag.label}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

        {/* Navigation jour */}
        <div className="flex items-center justify-between px-4 mt-2 mb-2 h-11">
          <button onClick={prevDay} disabled={!hasPrev}
            className={`min-w-[44px] min-h-[44px] flex items-center justify-center ${!hasPrev ? 'opacity-20' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="#6c63ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="flex items-center gap-1 text-[14px] font-semibold text-[#211738]"
            onPointerDown={e => { e.preventDefault(); dayDateRef.current?.showPicker() }}>
            {formatDay(currentDay)}
            {!isToday && <span className="text-[11px] font-normal text-[#736694] ml-1">← retour</span>}
          </button>
          <input ref={dayDateRef} type="date" value={currentDay}
            onChange={e => e.target.value && setCurrentDay(e.target.value)}
            className="sr-only"/>
          <button onClick={nextDay} disabled={!hasNext}
            className={`min-w-[44px] min-h-[44px] flex items-center justify-center ${!hasNext ? 'opacity-20' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="#6c63ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Contenu */}
      <main className={`absolute left-4 right-4 overflow-hidden flex flex-col top-[214px] ${isToday ? 'bottom-[76px]' : 'bottom-4'}`}>
        <div className="flex flex-col gap-3 overflow-y-auto flex-1">

          {!hasTasks && (
            <div className="bg-white/60 border border-[#c0befe]/50 rounded-[12px] h-16 flex flex-col items-center justify-center mt-2">
              <p className="text-[22px] font-bold text-[#6c63ff] leading-tight">Aucune tâche</p>
              <p className="text-[11px] text-[#a49ffe]">pour le moment</p>
            </div>
          )}

          {hasTasks && (
            <>
              {/* Stats */}
              <div className="flex gap-2 pt-2 shrink-0">
                <div className="flex-1 bg-[rgba(247,237,250,0.6)] border border-[#c0befe] rounded-[8px] flex items-center justify-center gap-2 py-2">
                  <span className="font-bold text-[#6c63ff] text-[22px] leading-none">{visibleTasks.length}</span>
                  <span className="text-[#a49ffe] text-[11px]">Total</span>
                </div>
                <div className="flex-1 bg-[rgba(220,252,231,0.6)] border border-[rgba(153,153,166,0.2)] rounded-[8px] flex items-center justify-center gap-2 py-2">
                  <span className="font-bold text-[#16a34a] text-[22px] leading-none">{visibleTasks.filter(t => t.done).length}</span>
                  <span className="text-[#16a34a] text-[11px]">Faites</span>
                </div>
                <div className="flex-1 bg-[rgba(254,228,229,0.6)] border border-[rgba(153,153,166,0.2)] rounded-[8px] flex items-center justify-center gap-2 py-2">
                  <span className="font-bold text-[#b91c1c] text-[22px] leading-none">{overdueTasks.length}</span>
                  <span className="text-[#b91c1c] text-[11px]">En retard</span>
                </div>
              </div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-col gap-4 pb-2">

                    {/* En retard */}
                    {filteredOverdue.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <p className="text-[12px] font-semibold text-red-500 uppercase tracking-wider px-1 flex items-center gap-1">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                            <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                          En retard
                        </p>
                        <ul className="flex flex-col gap-2">
                          {filteredOverdue.map(task => <TaskItem key={task.id} task={task} overdue />)}
                        </ul>
                        {regularTasks.length > 0 && <div className="h-px bg-[rgba(115,102,148,0.15)] mt-1"/>}
                      </div>
                    )}

                    {/* Tâches normales groupées */}
                    {regularTasks.length > 0 && renderGrouped(regularTasks)}

                    {/* Rien après filtre */}
                    {filteredOverdue.length === 0 && regularTasks.length === 0 && (
                      <div className="bg-white/60 border border-[#c0befe]/50 rounded-[12px] h-16 flex items-center justify-center">
                        <p className="text-[14px] text-[#a49ffe]">Aucun résultat</p>
                      </div>
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            </>
          )}
        </div>
      </main>

      {/* Bouton Nouvelle tâche (fixe en bas) */}
      {isToday && (
        <button onClick={openModal}
          className="absolute bottom-4 left-4 right-4 bg-[#6c63ff] rounded-[12px] h-12 flex items-center justify-center z-10">
          <span className="text-[14px] font-semibold text-white">Nouvelle tâche</span>
        </button>
      )}

      {/* Modal */}
      {showModal && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-[rgba(33,23,56,0.3)]" onClick={() => setShowModal(false)}>
          <div className="w-full bg-white/95 backdrop-blur-md rounded-t-[20px] p-6 flex flex-col gap-4 max-h-[85dvh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <p className="text-[17px] font-semibold text-[#211738]">{editingId ? 'Modifier la tâche' : 'Nouvelle tâche'}</p>

            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-medium text-[#736694]">Nom <span className="text-[#6c63ff]">*</span></label>
              <input autoFocus type="text" value={form.label}
                onChange={e => { setForm(f => ({ ...f, label: e.target.value })); setError('') }}
                placeholder="Nom de la tâche..."
                className={`bg-[#f2edfa] rounded-[10px] h-12 px-4 text-[14px] text-[#211738] outline-none placeholder:text-[#a49ffe] ${error ? 'ring-2 ring-red-400' : ''}`}/>
              {error && <p className="text-[12px] text-red-500">{error}</p>}
            </div>

            <div className="flex flex-col gap-1" ref={groupRef}>
              <label className="text-[12px] font-medium text-[#736694]">Groupe</label>
              <div className="relative">
                <input type="text" value={groupInput}
                  onChange={e => { setGroupInput(e.target.value); setForm(f => ({ ...f, group: e.target.value })); setGroupOpen(true) }}
                  onFocus={() => setGroupOpen(true)}
                  placeholder="Sélectionne ou crée un groupe..."
                  className="bg-[#f2edfa] rounded-[10px] h-12 px-4 text-[14px] text-[#211738] outline-none placeholder:text-[#a49ffe] w-full"/>
                {groupOpen && (groupSuggestions.length > 0 || (groupInput.trim() && !allGroups.includes(groupInput.trim()))) && (
                  <ul className="absolute left-0 right-0 top-[52px] bg-white rounded-[10px] shadow-lg z-10 overflow-hidden border border-[#f2edfa]">
                    {groupSuggestions.map(g => (
                      <li key={g}>
                        <button className="w-full text-left px-4 py-3 text-[13px] text-[#211738] hover:bg-[#f2edfa]"
                          onClick={() => { setForm(f => ({ ...f, group: g })); setGroupInput(g); setGroupOpen(false) }}>{g}</button>
                      </li>
                    ))}
                    {groupInput.trim() && !allGroups.includes(groupInput.trim()) && (
                      <li>
                        <button className="w-full text-left px-4 py-3 text-[13px] text-[#6c63ff] font-medium hover:bg-[#f2edfa]"
                          onClick={() => { setForm(f => ({ ...f, group: groupInput.trim() })); setGroupOpen(false) }}>
                          + Créer "{groupInput.trim()}"
                        </button>
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-medium text-[#736694]">Date d'échéance</label>
              <div className="relative bg-[#f2edfa] rounded-[10px] h-12 flex items-center px-4">
                <input ref={dateRef} type="date" value={form.dueDate}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                  className="flex-1 bg-transparent text-[14px] text-[#211738] outline-none cursor-pointer [color-scheme:light]"/>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 cursor-pointer pointer-events-auto"
                  onPointerDown={e => { e.preventDefault(); dateRef.current?.showPicker() }}>
                  <rect x="3" y="4" width="18" height="18" rx="2" stroke="#736694" strokeWidth="2"/>
                  <path d="M16 2v4M8 2v4M3 10h18" stroke="#736694" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-medium text-[#736694]">Tags</label>
              <div className="relative bg-[#f2edfa] rounded-[10px] min-h-12 px-3 py-2 flex flex-wrap gap-2 items-center">
                {form.tags.map((tag, i) => (
                  <span key={i} className={`flex items-center gap-1 text-[12px] font-medium px-2 py-1 rounded-full shrink-0 ${tagColor(tag.type)}`}>
                    {tagIcon(tag.type)}{tag.label}
                    <button onPointerDown={e => { e.preventDefault(); removeTag(i) }} className="leading-none min-w-0 min-h-0 w-4 h-4">&times;</button>
                  </span>
                ))}
                <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => {
                    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) { e.preventDefault(); addTag(tagInput) }
                    if (e.key === 'Backspace' && !tagInput && form.tags.length > 0) removeTag(form.tags.length - 1)
                  }}
                  placeholder={form.tags.length === 0 ? 'Ajouter un tag...' : ''}
                  className="bg-transparent text-[14px] text-[#211738] outline-none placeholder:text-[#a49ffe] min-w-[80px] flex-1"/>
                <div className="flex gap-1 shrink-0">
                  {TAG_TYPES.map(t => (
                    <button key={t.value} onPointerDown={e => { e.preventDefault(); setTagType(t.value) }}
                      className={`w-7 h-7 rounded-[6px] flex items-center justify-center transition-colors ${tagType === t.value ? t.color : 'text-[#a49ffe]'}`}
                      title={t.value}>{t.icon}</button>
                  ))}
                </div>
                {tagSuggestions.length > 0 && (
                  <ul className="absolute left-0 right-0 top-full mt-1 bg-white rounded-[10px] shadow-lg z-10 overflow-hidden border border-[#f2edfa]">
                    {tagSuggestions.map((s, i) => (
                      <li key={i}>
                        <button className="w-full text-left px-4 py-3 text-[13px] hover:bg-[#f2edfa] flex items-center gap-2"
                          onClick={() => addTag(s.label, s.type)}>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full ${tagColor(s.type)}`}>{s.type}</span>
                          {s.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <p className="text-[11px] text-[#a49ffe]">Entrée ou virgule pour valider, Retour arrière pour supprimer</p>
            </div>

            <button onClick={addTask} disabled={saving}
              className="bg-[#6c63ff] rounded-[12px] h-12 text-[14px] font-semibold text-white disabled:opacity-60">
              {saving ? 'Enregistrement...' : editingId ? 'Modifier' : 'Ajouter'}
            </button>
          </div>
        </div>
      )}

      {/* Overlay menu */}
      <div onClick={() => setMenuOpen(false)} className={`absolute inset-0 bg-[rgba(33,23,56,0.18)] z-30 transition-opacity duration-300 ${menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}/>

      {/* Drawer */}
      <nav className={`absolute top-0 left-0 h-full w-[280px] z-40 bg-[#f6f4f9] transition-transform duration-300 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="absolute -left-16 -top-4 w-72 h-72 rounded-full bg-[#c4b5fd] opacity-30 blur-3xl pointer-events-none"/>
        <div className="absolute inset-0 bg-white/72 border-r border-white/85 backdrop-blur-md flex flex-col">
          <div className="flex items-center gap-4 px-6 pt-16 pb-5">
            <div className="w-[52px] h-[52px] rounded-[26px] bg-[#6c63ff] flex items-center justify-center shrink-0">
              <span className="text-white text-[20px] font-bold">{initials}</span>
            </div>
            <div>
              <p className="text-[15px] font-bold text-[#211738] leading-tight">{firstName} {lastName}</p>
              <p className="text-[12px] text-[#736694] leading-tight">{displayName}</p>
            </div>
          </div>
          <div className="mx-6 h-px bg-[rgba(153,153,166,0.25)]"/>
          <div className="flex flex-col gap-1 px-4 pt-4">
            <button onClick={() => navigate('/')} className="flex items-center gap-3 w-full h-[52px] px-3 rounded-[12px]">
              <div className="w-7 h-7 bg-[#f2edfa] rounded-[8px] flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke="#736694" strokeWidth="2" strokeLinejoin="round"/>
                  <path d="M9 21V12h6v9" stroke="#736694" strokeWidth="2" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-[14px] text-[rgba(115,102,148,0.85)] flex-1 text-left">Home</span>
            </button>
            <button onClick={() => setMenuOpen(false)} className="flex items-center gap-3 w-full h-[52px] px-3 bg-[#f2edfa] rounded-[12px]">
              <div className="w-7 h-7 bg-[#6c63ff] rounded-[8px] flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="white" strokeWidth="2"/>
                  <path d="M7 12l3 3 7-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-[14px] font-semibold text-[#6c63ff] flex-1 text-left">Worklist</span>
              <span className="w-2 h-2 rounded-full bg-[#6c63ff]"/>
            </button>
          </div>
          <div className="flex-1"/>
          <div className="px-4 pb-10">
            <button onClick={async () => { await supabase.auth.signOut(); navigate('/login') }}
              className="flex items-center justify-center gap-2 w-full h-[46px] border border-[#736694] rounded-[8px]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="#736694" strokeWidth="2" strokeLinecap="round"/>
                <polyline points="16 17 21 12 16 7" stroke="#736694" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="21" y1="12" x2="9" y2="12" stroke="#736694" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span className="text-[12px] font-semibold text-[#736694]">Se déconnecter</span>
            </button>
            <p className="text-center text-[11px] text-[rgba(115,102,148,0.35)] mt-3">Oparty v0.1</p>
          </div>
        </div>
      </nav>
    </div>
  )
}
