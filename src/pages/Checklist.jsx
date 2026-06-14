import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { toDateStr } from '../lib/date'
import BottomSheet from '../components/BottomSheet'
import { TextField, DateField, SubmitButton } from '../components/FormFields'
import AppHeader from '../components/AppHeader'
import { useTheme } from '../contexts/ThemeContext'
import { LeafSmall, LeafBig, Flower, Mushroom } from '../components/CottageDecor'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const EMPTY_FORM = { label: '', group: '', dueDate: '', tags: [], jiraUrl: '' }
const TAG_TYPES = [
  { value: 'personne', color: 'bg-primary text-white', icon: (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )},
  { value: 'contexte', color: 'bg-primary text-white', icon: (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )},
]
const tagColor = (type) => TAG_TYPES.find(t => t.value === type)?.color ?? TAG_TYPES[1].color
const tagIcon  = (type) => TAG_TYPES.find(t => t.value === type)?.icon  ?? null

const todayStr = () => toDateStr(new Date())

export default function Checklist() {
  const [tasks, setTasks]       = useState([])

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [tagInput, setTagInput] = useState('')
  const [tagType, setTagType]   = useState('contexte')
  const [groupInput, setGroupInput] = useState('')
  const [groupOpen, setGroupOpen]   = useState(false)
  const [error, setError]   = useState('')
  const [saving, setSaving] = useState(false)
  const [figmaModal, setFigmaModal]     = useState(null)
  const [figmaUrl, setFigmaUrl]         = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // Mode Checklist/Worklist
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('ck_viewMode') || 'worklist')
  const [checklistItems, setChecklistItems] = useState([])
  const [showCkModal, setShowCkModal] = useState(false)
  const [ckForm, setCkForm] = useState({ label: '', group: '', isShared: false })
  const [ckGroupInput, setCkGroupInput] = useState('')
  const [ckGroupOpen, setCkGroupOpen] = useState(false)
  const ckGroupRef = useRef(null)
  const [ckQuickAddGroup, setCkQuickAddGroup] = useState(null)
  const [ckQuickAddLabel, setCkQuickAddLabel] = useState('')
  const [ckDeleteGroup, setCkDeleteGroup] = useState(null)
  const [ckResetGroup, setCkResetGroup] = useState(null)
  const [ckGroups, setCkGroups] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ck_groups') || '[]') } catch { return [] }
  })
  const [partnerName, setPartnerName] = useState(null)

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
  const { theme } = useTheme()
  const isCottagecore = theme === 'cottagecore'


  useEffect(() => { if (!loading && !user) navigate('/login') }, [user, loading])

  useEffect(() => {
    if (!user) return
    supabase.from('tasks').select('id, user_id, label, group_name, done, position, tags, due_date, completed_at, jira_url, figma_url').eq('user_id', user.id)
      .order('position', { ascending: true })
      .then(({ data }) => { if (data) setTasks(data) })
  }, [user])

  useEffect(() => {
    localStorage.setItem('ck_viewMode', viewMode)
  }, [viewMode])

  useEffect(() => {
    if (!user || viewMode !== 'checklist') return
    supabase.from('checklist_items').select('*')
      .order('position', { ascending: true })
      .then(({ data }) => {
        if (data) {
          setChecklistItems(data)
          const dbGroups = [...new Set(data.filter(t => t.user_id === user.id && t.group_name).map(t => t.group_name))]
          const stored = JSON.parse(localStorage.getItem('ck_groups') || '[]')
          const merged = [...new Set([...stored, ...dbGroups])]
          setCkGroups(merged)
          localStorage.setItem('ck_groups', JSON.stringify(merged))
        }
      })
  }, [user, viewMode])

  useEffect(() => {
    if (!user) return
    supabase.from('collection_shares')
      .select('owner_id, shared_with_id')
      .or(`owner_id.eq.${user.id},shared_with_id.eq.${user.id}`)
      .eq('status', 'accepted')
      .limit(1)
      .single()
      .then(({ data: share }) => {
        if (!share) return
        const partnerId = share.owner_id === user.id ? share.shared_with_id : share.owner_id
        supabase.from('profiles').select('first_name, display_name').eq('id', partnerId).single()
          .then(({ data: p }) => { if (p) setPartnerName(p.first_name || p.display_name) })
      })
  }, [user])

  useEffect(() => {
    const handler = (e) => {
      if (groupRef.current && !groupRef.current.contains(e.target)) setGroupOpen(false)
      if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilter(false)
      if (ckGroupRef.current && !ckGroupRef.current.contains(e.target)) setCkGroupOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Logique jour ──────────────────────────────────────────────
  const isToday = currentDay === todayStr()

  const visibleTasks = useMemo(() => tasks.filter(task => {
    if (!task.done) return isToday
    const completedDay = task.completed_at ? toDateStr(task.completed_at) : todayStr()
    return completedDay === currentDay
  }), [tasks, isToday, currentDay])

  // Jours avec tâches terminées (pour navigation)
  const daysWithTasks = useMemo(() => [...new Set(
    tasks.filter(t => t.done && t.completed_at).map(t => toDateStr(t.completed_at))
  )].sort(), [tasks])

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
  const allTags = useMemo(() => tasks.flatMap(t => t.tags ?? []).filter((t, i, arr) =>
    arr.findIndex(x => x.label === t.label && x.type === t.type) === i
  ), [tasks])
  const allGroups = useMemo(() => [...new Set(tasks.map(t => t.group_name).filter(Boolean))], [tasks])

  const applyFilters = (list) => list.filter(task => {
    if (search && !task.label.toLowerCase().includes(search.toLowerCase())) return false
    if (filterGroup && task.group_name !== filterGroup) return false
    if (filterTag && !(task.tags ?? []).some(t => t.label === filterTag.label && t.type === filterTag.type)) return false
    return true
  })

  // Quand une recherche est active, chercher dans toutes les tâches (pas seulement le jour courant)
  const regularTasks = useMemo(() => {
    const base = search ? tasks : visibleTasks.filter(t => !overdueIds.has(t.id))
    return applyFilters(base)
  }, [tasks, visibleTasks, overdueIds, search, filterGroup, filterTag]) // eslint-disable-line react-hooks/exhaustive-deps
  const filteredOverdue = useMemo(() => applyFilters(overdueTasks), [overdueTasks, search, filterGroup, filterTag]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const openFigmaModal = (task) => {
    setFigmaModal(task)
    setFigmaUrl(task.figma_url ?? '')
  }
  const saveFigmaUrl = async () => {
    if (!figmaModal) return
    setSaving(true)
    await supabase.from('tasks').update({ figma_url: figmaUrl || null }).eq('id', figmaModal.id)
    setTasks(prev => prev.map(t => t.id === figmaModal.id ? { ...t, figma_url: figmaUrl || null } : t))
    setSaving(false)
    setFigmaModal(null)
  }

  // ── Modal ──────────────────────────────────────────────────
  const openModal = () => {
    setForm(EMPTY_FORM); setTagInput(''); setGroupInput(''); setError(''); setEditingId(null); setShowModal(true)
  }
  const openEdit = (task) => {
    setForm({ label: task.label, group: task.group_name ?? '', dueDate: task.due_date ?? '', tags: task.tags ?? [], jiraUrl: task.jira_url ?? '' })
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
        label: form.label.trim(), group_name: form.group || null, due_date: form.dueDate || null, tags: finalTags, jira_url: form.jiraUrl || null,
      }).eq('id', editingId).select().single()
      setSaving(false)
      if (err) { setError('Erreur lors de la sauvegarde.'); return }
      setTasks(prev => prev.map(t => t.id === editingId ? data : t))
    } else {
      const { data, error: err } = await supabase.from('tasks').insert({
        user_id: user.id, label: form.label.trim(), group_name: form.group || null,
        due_date: form.dueDate || null, tags: finalTags, done: false, jira_url: form.jiraUrl || null,
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

  // ── Checklist CRUD ──────────────────────────────────────────
  const ckAllGroups = [...new Set([...ckGroups, ...checklistItems.map(t => t.group_name).filter(Boolean)])]

  const saveCkGroups = (groups) => {
    setCkGroups(groups)
    localStorage.setItem('ck_groups', JSON.stringify(groups))
  }
  const addCkGroup = (name) => {
    if (name && !ckGroups.includes(name)) saveCkGroups([...ckGroups, name])
  }

  const toggleGroupShare = async (group) => {
    const groupItems = checklistItems.filter(t => t.group_name === group && t.user_id === user.id)
    const newShared = !groupItems.some(t => t.is_shared)
    setChecklistItems(prev => prev.map(t =>
      t.group_name === group && t.user_id === user.id ? { ...t, is_shared: newShared } : t
    ))
    await supabase.from('checklist_items').update({ is_shared: newShared })
      .in('id', groupItems.map(t => t.id))
  }

  const addCkItemInline = async (group) => {
    if (!ckQuickAddLabel.trim()) return
    const ownGroupItems = checklistItems.filter(t => t.group_name === group && t.user_id === user.id)
    const isShared = ownGroupItems.some(t => t.is_shared)
    const { data } = await supabase.from('checklist_items').insert({
      user_id: user.id, label: ckQuickAddLabel.trim(),
      group_name: group || null, done: false, is_shared: isShared, item_date: todayStr(),
    }).select().single()
    if (data) { setChecklistItems(prev => [...prev, data]); addCkGroup(group) }
    setCkQuickAddLabel('')
  }

  const addCkItem = async () => {
    if (!ckForm.label.trim()) return
    const { data } = await supabase.from('checklist_items').insert({
      user_id: user.id, label: ckForm.label.trim(),
      group_name: ckForm.group || null, done: false, is_shared: ckForm.isShared, item_date: todayStr(),
    }).select().single()
    if (data) { setChecklistItems(prev => [...prev, data]); addCkGroup(ckForm.group) }
    setShowCkModal(false)
    setCkForm({ label: '', group: '', isShared: false }); setCkGroupInput('')
  }
  const toggleCkItem = async (id, done) => {
    setChecklistItems(prev => prev.map(t => t.id === id ? { ...t, done: !done } : t))
    await supabase.from('checklist_items').update({ done: !done }).eq('id', id)
  }
  const deleteCkItem = async (id) => {
    setChecklistItems(prev => prev.filter(t => t.id !== id))
    await supabase.from('checklist_items').delete().eq('id', id)
  }

  const renderCkGrouped = (items, isPartner = false) => {
    const seed = isPartner ? {} : Object.fromEntries(ckGroups.map(g => [g, []]))
    const grouped = items.reduce((acc, item) => {
      const key = item.group_name ?? ''
      if (!acc[key]) acc[key] = []
      acc[key].push(item)
      return acc
    }, seed)
    const keys = Object.keys(grouped).sort((a, b) => {
      if (a === '') return -1; if (b === '') return 1; return a.localeCompare(b)
    })
    return keys.map((group, i) => {
      const groupIsShared = grouped[group].some(t => t.is_shared)
      return (
      <div key={`${isPartner ? 'p' : 'o'}-${group}`} className={`flex flex-col gap-2 ${i > 0 ? 'pt-3 border-t border-[rgba(115,102,148,0.15)]' : 'mt-4'}`}>
        {group && (
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 min-w-0">
              <p className="text-[12px] font-semibold text-primary uppercase tracking-wider truncate">{group}</p>
              {isPartner && partnerName && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#fef3c7] text-[#d97706] shrink-0">{partnerName}</span>
              )}
            </div>
            {!isPartner && (
              <div className="flex items-center gap-2 shrink-0">
                {/* Toggle partage */}
                <button onClick={() => toggleGroupShare(group)}
                  style={{ minWidth: 0, minHeight: 0 }}
                  title={groupIsShared ? 'Arrêter le partage' : 'Partager ce groupe'}
                  className={`flex items-center gap-1 text-[11px] font-medium transition-colors ${groupIsShared ? 'text-primary' : 'text-muted/40 hover:text-muted'}`}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="2"/>
                    <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </button>
                {/* Réinitialiser groupe */}
                <button onClick={() => setCkResetGroup(group)}
                  disabled={!grouped[group].some(t => t.done)}
                  style={{ minWidth: 0, minHeight: 0 }}
                  className="flex items-center gap-1 text-[11px] text-muted/40 hover:text-muted transition-colors disabled:opacity-30">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 3v5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {/* Supprimer groupe */}
                <button onClick={() => setCkDeleteGroup(group)}
                  disabled={!grouped[group].every(t => t.done)}
              style={{ minWidth: 0, minHeight: 0 }}
              className="flex items-center gap-1 text-[11px] text-muted/60 hover:text-red-400 transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Supprimer le groupe
            </button>
          </div>
            )}
          </div>
        )}
        <ul className="flex flex-col gap-2">
          {grouped[group].map(item => (
            <li key={item.id} className={`border rounded-[8px] px-2 py-[6px] flex items-center gap-2 ${item.done ? 'bg-[#f0eef5]/80 border-[rgba(115,102,148,0.2)]' : `bg-white/70 ${isCottagecore ? 'cc-border' : 'border-white/85'}`}`}>
              <button onClick={() => toggleCkItem(item.id, item.done)}
                style={{ minWidth: 0, minHeight: 0, width: 24, height: 24 }}
                className={`rounded-[3px] border-2 flex items-center justify-center shrink-0 ${item.done ? 'border-muted bg-muted' : 'border-primary'}`}>
                {item.done && (
                  <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
              <span className={`flex-1 text-[12px] font-bold leading-tight ${item.done ? 'line-through text-[#9992a8]' : 'text-black'}`}>{item.label}</span>
              <button onClick={() => deleteCkItem(item.id)}
                style={{ minWidth: 0, minHeight: 0 }}
                className={`w-6 h-6 flex items-center justify-center shrink-0 ${item.done ? 'opacity-0 pointer-events-none' : ''}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="rgb(var(--color-accent))" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </li>
          ))}
          {/* Ajout à la volée — uniquement pour ses propres groupes */}
          {!isPartner && (ckQuickAddGroup === group ? (
            <li className="border border-dashed border-primary/30 rounded-[8px] px-2 py-[6px] flex items-center gap-2 bg-white/40">
              <div style={{ width: 24, height: 24 }} className="shrink-0 rounded-[3px] border-2 border-primary/30"/>
              <input autoFocus type="text" value={ckQuickAddLabel}
                onChange={e => setCkQuickAddLabel(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { addCkItemInline(group) }
                  if (e.key === 'Escape') { setCkQuickAddGroup(null); setCkQuickAddLabel('') }
                }}
                onBlur={() => { setCkQuickAddGroup(null); setCkQuickAddLabel('') }}
                placeholder="Nouvelle tâche..."
                className="flex-1 bg-transparent text-[12px] font-bold text-dark outline-none placeholder:text-accent"/>
            </li>
          ) : (
            <li>
              <button onClick={() => { setCkQuickAddGroup(group); setCkQuickAddLabel('') }}
                style={{ minWidth: 0, minHeight: 0 }}
                className="flex items-center gap-1 text-[12px] text-primary/50 font-medium py-1 px-1 hover:text-primary transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Ajouter
              </button>
            </li>
          ))}
        </ul>
      </div>
    )})
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
    const d = dateStr.includes('T') ? new Date(dateStr) : new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  // ── Composant tâche ─────────────────────────────────────────
  const TaskItem = ({ task, overdue: overdueProp = false, sortable = false }) => {
    const overdue = overdueProp || (!task.done && task.due_date && new Date(task.due_date + 'T00:00:00') < todayDate)
    const sortableProps = sortable ? useSortable({ id: task.id }) : null
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortableProps ?? {}
    const hasTags = (task.tags ?? []).length > 0
    return (
      <li
        ref={setNodeRef}
        style={sortable ? { transform: CSS.Transform.toString(transform), transition } : {}}
        className={`border rounded-[8px] px-2 py-[6px] flex items-center gap-2 relative
          ${task.done ? 'bg-[#f0eef5]/80 border-[rgba(115,102,148,0.2)]' : `bg-white/70 ${isCottagecore ? 'cc-border' : 'border-white/85'}`}
          ${isDragging ? 'opacity-50 z-50' : ''}`}
      >
        {isCottagecore && (() => {
          const d = (String(task.id).split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 4
          const s = { pointerEvents:'none', position:'absolute', zIndex:10 }
          if (d===0) return <><LeafSmall width={14} rotate={-20} style={{...s, right:2,    top:-7}} /><Flower    width={13} rotate={30}  style={{...s, left:'42%', top:-6}} /><LeafBig   width={14} rotate={15}  style={{...s, left:2,    top:-7}} /></>
          if (d===1) return <><Flower    width={13} rotate={25}  style={{...s, right:2,    top:-6}} /><Mushroom  width={15} rotate={-10} style={{...s, left:'40%', top:-7}} /><LeafSmall width={12} rotate={60}  style={{...s, left:2,    top:-6}} /></>
          if (d===2) return <><Mushroom  width={16} rotate={10}  style={{...s, right:2,    top:-7}} /><LeafSmall width={12} rotate={-50} style={{...s, left:'44%', top:-6}} /><Flower    width={13} rotate={40}  style={{...s, left:2,    top:-7}} /></>
          return              <><LeafBig   width={15} rotate={-35} style={{...s, right:2,    top:-7}} /><Flower    width={13} rotate={20}  style={{...s, left:'38%', top:-6}} /><LeafSmall width={12} rotate={70}  style={{...s, left:2,    top:-6}} /></>
        })()}
        {/* Drag handle */}
        {sortable && (
          <button {...attributes} {...listeners} className="w-4 h-4 flex items-center justify-center shrink-0 touch-none">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="9" cy="5" r="1.5" fill="rgb(var(--color-accent))"/><circle cx="15" cy="5" r="1.5" fill="rgb(var(--color-accent))"/>
              <circle cx="9" cy="12" r="1.5" fill="rgb(var(--color-accent))"/><circle cx="15" cy="12" r="1.5" fill="rgb(var(--color-accent))"/>
              <circle cx="9" cy="19" r="1.5" fill="rgb(var(--color-accent))"/><circle cx="15" cy="19" r="1.5" fill="rgb(var(--color-accent))"/>
            </svg>
          </button>
        )}
        {/* Checkbox — toujours cliquable */}
        <button onClick={() => toggleTask(task.id, task.done)}
          style={{ minWidth: 0, minHeight: 0, width: 24, height: 24 }}
          className={`rounded-[3px] border-2 flex items-center justify-center shrink-0 ${task.done ? 'border-muted bg-muted' : 'border-primary'}`}>
          {task.done && (
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
        {/* Texte + tags (flex-1) — désactivé si terminé */}
        <div className={`flex flex-col gap-[3px] min-w-0 flex-1 cursor-pointer`}
          onClick={() => task.done ? openFigmaModal(task) : openEdit(task)}>
          <span className={`text-[12px] font-bold leading-tight flex items-center gap-1 ${task.done ? 'line-through text-[#9992a8]' : 'text-black'}`}>
            {task.jira_url && (
              <a href={task.jira_url} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="shrink-0" style={{ minWidth: 0, minHeight: 0 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke={task.done ? '#9992a8' : 'rgb(var(--color-primary))'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke={task.done ? '#9992a8' : 'rgb(var(--color-primary))'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            )}
            {task.figma_url && (
              <a href={task.figma_url} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="shrink-0" style={{ minWidth: 0, minHeight: 0 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M5 5.5A3.5 3.5 0 018.5 2H12v7H8.5A3.5 3.5 0 015 5.5z" stroke={task.done ? '#9992a8' : '#a259ff'} strokeWidth="1.5"/>
                  <path d="M12 2h3.5a3.5 3.5 0 010 7H12V2z" stroke={task.done ? '#9992a8' : '#a259ff'} strokeWidth="1.5"/>
                  <path d="M12 12.5a3.5 3.5 0 117 0 3.5 3.5 0 01-7 0z" stroke={task.done ? '#9992a8' : '#a259ff'} strokeWidth="1.5"/>
                  <path d="M5 12.5A3.5 3.5 0 018.5 9H12v7H8.5A3.5 3.5 0 015 12.5z" stroke={task.done ? '#9992a8' : '#a259ff'} strokeWidth="1.5"/>
                  <path d="M5 19.5A3.5 3.5 0 018.5 16H12v3.5a3.5 3.5 0 01-7 0z" stroke={task.done ? '#9992a8' : '#a259ff'} strokeWidth="1.5"/>
                </svg>
              </a>
            )}
            {task.label}
          </span>
          {hasTags && (
            <div className="flex flex-wrap items-center gap-[3px]">
              {(task.tags ?? []).map((tag, i) => (
                <span key={i} className={`flex items-center gap-[4px] text-[8px] px-[4px] py-[1px] rounded-full ${task.done ? 'bg-muted/20 text-muted/70' : tagColor(tag.type)}`}>
                  {tagIcon(tag.type)}{tag.label}
                </span>
              ))}
            </div>
          )}
        </div>
        {/* Date */}
        {(task.due_date || (task.done && task.completed_at && search)) && (
          <div className="flex justify-center shrink-0">
            {task.done && task.completed_at && search ? (
              <div className="flex items-center gap-[6px]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="18" rx="2" stroke="#9992a8" strokeWidth="2"/>
                  <path d="M16 2v4M8 2v4M3 10h18" stroke="#9992a8" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span className="text-[12px] whitespace-nowrap text-[#9992a8]">{formatDueDate(task.completed_at)}</span>
              </div>
            ) : overdue && !task.done ? (
              <div className="bg-[rgba(254,228,229,0.6)] border border-[rgba(153,153,166,0.2)] rounded-full px-2 py-1 flex items-center gap-[6px]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="18" rx="2" stroke="#b91c1c" strokeWidth="2"/>
                  <path d="M16 2v4M8 2v4M3 10h18" stroke="#b91c1c" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span className="text-[12px] text-[#b91c1c]">{formatDueDate(task.due_date)}</span>
              </div>
            ) : task.due_date ? (
              <div className="flex items-center gap-[6px]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="18" rx="2" stroke={task.done ? '#9992a8' : 'rgb(var(--color-muted))'} strokeWidth="2"/>
                  <path d="M16 2v4M8 2v4M3 10h18" stroke={task.done ? '#9992a8' : 'rgb(var(--color-muted))'} strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span className={`text-[12px] whitespace-nowrap ${task.done ? 'text-[#9992a8]' : 'text-black'}`}>{formatDueDate(task.due_date)}</span>
              </div>
            ) : null}
          </div>
        )}
        {/* Supprimer — désactivé si terminé */}
        <button
          onClick={() => !task.done && setDeleteConfirm(task)}
          className={`w-6 h-6 flex items-center justify-center shrink-0 ${task.done ? 'pointer-events-none opacity-0' : ''}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="rgb(var(--color-accent))" strokeWidth="2" strokeLinecap="round"/>
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
    return keys.map((group, i) => {
      const isDoneGroup = grouped[group].every(t => t.done)
      return (
      <div key={group} className={`flex flex-col gap-2 ${i > 0 ? 'border-t border-[rgba(115,102,148,0.15)]' : ''} ${isDoneGroup && i > 0 ? 'pt-6' : i > 0 ? 'pt-4' : 'mt-4'}`}>
        {group && <p className="text-[12px] font-semibold text-primary uppercase tracking-wider px-1">{group}</p>}
        <ul className="flex flex-col gap-2">
          {grouped[group].map(task => <SortableTask key={task.id} task={task} />)}
        </ul>
      </div>
    )})
  }

  const hasTasks = tasks.length > 0

  return (
    <div className="relative w-full h-dvh overflow-hidden bg-base">

      {/* Blobs */}
      <div className="absolute -left-16 -top-4 w-72 h-72 rounded-full bg-[#c4b5fd] opacity-30 blur-3xl pointer-events-none"/>
      <div className="absolute left-32 top-14 w-64 h-64 rounded-full bg-[#a5f3fc] opacity-25 blur-3xl pointer-events-none"/>
      <div className="absolute -left-8 top-52 w-60 h-60 rounded-full bg-[#bbf7d0] opacity-20 blur-3xl pointer-events-none"/>
      <div className="absolute left-40 top-[461px] w-64 h-64 rounded-full bg-[#fed7aa] opacity-25 blur-3xl pointer-events-none"/>

      <AppHeader title="Checklist" />

      {/* Barre recherche + jour */}
      <div className="absolute top-[76px] left-0 right-0 z-10 bg-white/55 backdrop-blur-md border-b border-white/80">

        {/* Switch Checklist / Worklist */}
        <div className="px-4 pt-3">
          <div className="flex bg-soft rounded-[8px] p-[3px] gap-[2px] h-8">
            {[['checklist','Checklist'],['worklist','Worklist']].map(([mode, label]) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                style={{ minWidth: 0, minHeight: 0 }}
                className={`flex-1 text-[12px] font-semibold rounded-[6px] transition-colors ${viewMode === mode ? 'bg-white text-primary shadow-sm' : 'text-muted'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Barre recherche + filtres */}
        <div className="px-4 pt-3 flex gap-2">
          <div className="relative flex-1">
            <div className="bg-white/70 border border-white/85 rounded-[8px] h-[44px] flex items-center px-3 gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
                <circle cx="11" cy="11" r="8" stroke="rgb(var(--color-accent))" strokeWidth="2"/>
                <path d="M21 21l-4.35-4.35" stroke="rgb(var(--color-accent))" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <input type="text" value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') setSearch('') }}
                placeholder="Rechercher"
                className="bg-transparent text-[14px] font-semibold text-dark outline-none placeholder:text-accent flex-1"/>
              {search && <button onClick={() => setSearch('')} style={{ minWidth: 0, minHeight: 0 }} className="text-accent leading-none text-lg">&times;</button>}
            </div>
            {/* Autocomplete suggestions */}
            {search.length > 0 && (() => {
              const q = search.toLowerCase()
              const taskSuggestions = [...new Set(tasks.map(t => t.label).filter(l => l.toLowerCase().includes(q) && l.toLowerCase() !== q))]
              if (!taskSuggestions.length) return null
              return (
                <ul className="absolute left-0 right-0 top-[50px] bg-white/95 backdrop-blur-md rounded-[10px] shadow-lg z-30 overflow-hidden border border-soft">
                  {taskSuggestions.slice(0, 5).map((label, i) => (
                    <li key={i}>
                      <button className="w-full text-left px-4 py-3 text-[13px] text-dark hover:bg-soft flex items-center gap-2"
                        style={{ minWidth: 0, minHeight: 0 }}
                        onClick={() => setSearch(label)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
                          <circle cx="11" cy="11" r="8" stroke="rgb(var(--color-accent))" strokeWidth="2"/>
                          <path d="M21 21l-4.35-4.35" stroke="rgb(var(--color-accent))" strokeWidth="2" strokeLinecap="round"/>
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
              className={`rounded-[8px] border border-white/85 flex items-center justify-center ${showFilter || filterTag || filterGroup ? 'bg-primary text-white' : 'bg-white/75 text-muted'}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            {/* Dropdown filtres */}
            {showFilter && (
              <div className="absolute right-0 top-[50px] z-30 bg-white/95 backdrop-blur-md border border-white/85 rounded-[12px] shadow-lg p-3 flex flex-col gap-3 w-[220px]">

                {/* Filtre groupe */}
                <div className="flex flex-col gap-1">
                  <p className="text-[10px] font-semibold text-muted uppercase tracking-wider">Groupe</p>
                  <div className="relative">
                    <div className={`flex items-center gap-2 bg-soft rounded-[8px] px-3 h-9 ${filterGroup ? 'ring-2 ring-primary/40' : ''}`}>
                      {filterGroup && (
                        <span className="text-[12px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                          {filterGroup}
                          <button onClick={() => { setFilterGroup(null); setFilterGroupInput('') }} style={{ minWidth: 0, minHeight: 0 }} className="text-primary leading-none">&times;</button>
                        </span>
                      )}
                      {!filterGroup && (
                        <input type="text" value={filterGroupInput}
                          onChange={e => setFilterGroupInput(e.target.value)}
                          placeholder="Filtrer par groupe..."
                          className="bg-transparent text-[13px] text-dark outline-none placeholder:text-accent flex-1 w-full"/>
                      )}
                    </div>
                    {!filterGroup && filterGroupInput && (
                      <ul className="absolute left-0 right-0 top-[38px] bg-white rounded-[8px] shadow-lg z-10 overflow-hidden border border-soft">
                        {allGroups.filter(g => g.toLowerCase().includes(filterGroupInput.toLowerCase())).map(g => (
                          <li key={g}>
                            <button className="w-full text-left px-3 py-2 text-[13px] text-dark hover:bg-soft"
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
                  <p className="text-[10px] font-semibold text-muted uppercase tracking-wider">Tag</p>
                  <div className="relative">
                    <div className={`flex items-center gap-2 bg-soft rounded-[8px] px-3 h-9 ${filterTag ? 'ring-2 ring-primary/40' : ''}`}>
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
                          className="bg-transparent text-[13px] text-dark outline-none placeholder:text-accent flex-1 w-full"/>
                      )}
                    </div>
                    {!filterTag && filterTagInput && (
                      <ul className="absolute left-0 right-0 top-[38px] bg-white rounded-[8px] shadow-lg z-10 overflow-hidden border border-soft">
                        {allTags.filter(t => t.label.toLowerCase().includes(filterTagInput.toLowerCase())).map((tag, i) => (
                          <li key={i}>
                            <button className="w-full text-left px-3 py-2 text-[13px] hover:bg-soft flex items-center gap-2"
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

        {/* Navigation jour — worklist uniquement */}
        <div className={`flex items-center justify-between px-4 mt-2 mb-2 h-11 ${viewMode === 'checklist' ? 'hidden' : ''}`}>
          <button onClick={prevDay} disabled={!hasPrev}
            className={`min-w-[44px] min-h-[44px] flex items-center justify-center ${!hasPrev ? 'opacity-20' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="rgb(var(--color-primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="flex items-center gap-1 text-[14px] font-semibold text-dark"
            onPointerDown={e => { e.preventDefault(); dayDateRef.current?.showPicker() }}>
            {formatDay(currentDay)}
            {!isToday && <span className="text-[11px] font-normal text-muted ml-1">← retour</span>}
          </button>
          <input ref={dayDateRef} type="date" value={currentDay}
            onChange={e => e.target.value && setCurrentDay(e.target.value)}
            className="sr-only"/>
          <button onClick={nextDay} disabled={!hasNext}
            className={`min-w-[44px] min-h-[44px] flex items-center justify-center ${!hasNext ? 'opacity-20' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="rgb(var(--color-primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Contenu */}
      <main className={`absolute left-4 right-4 flex flex-col ${viewMode === 'checklist' ? 'top-[188px]' : 'top-[248px]'} ${isToday ? 'bottom-[76px]' : 'bottom-4'}`}>
        <div className="flex flex-col gap-3 overflow-y-auto flex-1">

          {/* ── Mode Checklist ── */}
          {viewMode === 'checklist' && (
            <>
              {checklistItems.length === 0 && (
                <div className={`bg-white/60 border rounded-[12px] h-16 flex flex-col items-center justify-center mt-4 ${isCottagecore ? 'cc-border' : 'border-accent/50'}`}>
                  <p className="text-[22px] font-bold text-primary leading-tight">Aucune tâche</p>
                  <p className="text-[11px] text-accent">pour le moment</p>
                </div>
              )}
              {checklistItems.length > 0 && (() => {
                const ownCkItems = checklistItems.filter(t => t.user_id === user?.id)
                const partnerCkItems = checklistItems.filter(t => t.user_id !== user?.id)
                return <>
                  {renderCkGrouped(ownCkItems)}
                  {partnerCkItems.length > 0 && renderCkGrouped(partnerCkItems, true)}
                </>
              })()}
              <div className="pb-2"/>
            </>
          )}

          {/* ── Mode Worklist ── */}
          {viewMode === 'worklist' && (
            <>
              {!hasTasks && (
                <div className={`bg-white/60 border rounded-[12px] h-16 flex flex-col items-center justify-center mt-4 ${isCottagecore ? "cc-border" : "border-accent/50"}`}>
                  <p className="text-[22px] font-bold text-primary leading-tight">Aucune tâche</p>
                  <p className="text-[11px] text-accent">pour le moment</p>
                </div>
              )}

              {hasTasks && (
                <>
                  {/* Stats */}
                  <div className="flex gap-2 pt-4 shrink-0">
                    <div className={`flex-1 bg-soft/60 border rounded-[8px] flex items-center justify-center gap-2 py-2 ${isCottagecore ? "cc-border" : "border-accent"}`}>
                      <span className="font-bold text-primary text-[22px] leading-none">{visibleTasks.length}</span>
                      <span className="text-accent text-[11px]">Total</span>
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
                          <div className="flex flex-col gap-2 mt-4">
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
                            {regularTasks.length > 0 && <div className="h-px bg-[rgba(115,102,148,0.15)] mt-2"/>}
                          </div>
                        )}

                        {/* Tâches normales groupées */}
                        {regularTasks.length > 0 && renderGrouped(regularTasks)}

                        {/* Rien après filtre */}
                        {filteredOverdue.length === 0 && regularTasks.length === 0 && (
                          <div className={`bg-white/60 border rounded-[12px] h-16 flex items-center justify-center ${isCottagecore ? "cc-border" : "border-accent/50"}`}>
                            <p className="text-[14px] text-accent">Aucun résultat</p>
                          </div>
                        )}
                      </div>
                    </SortableContext>
                  </DndContext>
                </>
              )}
            </>
          )}
        </div>
      </main>

      {/* Bouton Nouvelle tâche (fixe en bas) */}
      {isToday && (
        <div className="fixed bottom-4 left-4 right-4 z-10" style={{ height: 48 }}>
          <button onClick={viewMode === 'checklist' ? () => setShowCkModal(true) : openModal}
            className={`w-full h-full bg-primary rounded-[12px] text-white text-[14px] font-semibold${isCottagecore ? ' cc-border border-2' : ''}`}>
            Nouvelle tâche
          </button>
          {isCottagecore && <>
            <LeafBig   width={22} rotate={20}  style={{ position:'absolute', left:-7,    top:-9,    zIndex:11, pointerEvents:'none' }} />
            <LeafSmall width={12} rotate={-50} style={{ position:'absolute', left:16,    top:-7,    zIndex:11, pointerEvents:'none' }} />
            <Flower    width={16} rotate={-30} style={{ position:'absolute', left:'38%', top:-10,   zIndex:11, pointerEvents:'none' }} />
            <Mushroom  width={24} rotate={-10} style={{ position:'absolute', right:-6,   top:-12,   zIndex:11, pointerEvents:'none' }} />
            <LeafSmall width={13} rotate={60}  style={{ position:'absolute', left:'52%', bottom:-7, zIndex:11, pointerEvents:'none' }} />
            <Flower    width={14} rotate={35}  style={{ position:'absolute', right:18,   bottom:-6, zIndex:11, pointerEvents:'none' }} />
          </>}
        </div>
      )}

      {/* Modal confirmation suppression */}
      {deleteConfirm && (
        <BottomSheet onClose={() => setDeleteConfirm(null)}>
          <p className="text-[17px] font-semibold text-dark">Supprimer la tâche ?</p>
          <p className="text-[13px] text-muted -mt-2">« {deleteConfirm.label} »</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteConfirm(null)}
              className="flex-1 h-12 rounded-[12px] border border-muted/30 text-[14px] font-semibold text-muted">
              Annuler
            </button>
            <button onClick={async () => { await deleteTask(deleteConfirm.id); setDeleteConfirm(null) }}
              className="flex-1 h-12 rounded-[12px] bg-red-500 text-[14px] font-semibold text-white">
              Supprimer
            </button>
          </div>
        </BottomSheet>
      )}

      {/* Modal Figma */}
      {figmaModal && (
        <BottomSheet onClose={() => setFigmaModal(null)}>
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M5 5.5A3.5 3.5 0 018.5 2H12v7H8.5A3.5 3.5 0 015 5.5z" stroke="#a259ff" strokeWidth="1.5"/>
              <path d="M12 2h3.5a3.5 3.5 0 010 7H12V2z" stroke="#a259ff" strokeWidth="1.5"/>
              <path d="M12 12.5a3.5 3.5 0 117 0 3.5 3.5 0 01-7 0z" stroke="#a259ff" strokeWidth="1.5"/>
              <path d="M5 12.5A3.5 3.5 0 018.5 9H12v7H8.5A3.5 3.5 0 015 12.5z" stroke="#a259ff" strokeWidth="1.5"/>
              <path d="M5 19.5A3.5 3.5 0 018.5 16H12v3.5a3.5 3.5 0 01-7 0z" stroke="#a259ff" strokeWidth="1.5"/>
            </svg>
            <p className="text-[17px] font-semibold text-dark">Lien Figma</p>
          </div>
          <p className="text-[13px] text-muted -mt-2">{figmaModal.label}</p>
          <div className="relative bg-soft rounded-[10px] h-12 flex items-center px-4 gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="rgb(var(--color-accent))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="rgb(var(--color-accent))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <input autoFocus type="url" value={figmaUrl}
              onChange={e => setFigmaUrl(e.target.value)}
              placeholder="https://figma.com/..."
              className="flex-1 bg-transparent text-[14px] text-dark outline-none placeholder:text-accent"/>
            {figmaUrl && <button onClick={() => setFigmaUrl('')} style={{ minWidth: 0, minHeight: 0 }} className="text-accent text-lg leading-none">&times;</button>}
          </div>
          <SubmitButton onClick={saveFigmaUrl} disabled={saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </SubmitButton>
        </BottomSheet>
      )}

      {/* Modal suppression groupe checklist */}
      {ckResetGroup !== null && (
        <BottomSheet onClose={() => setCkResetGroup(null)}>
          <p className="text-[17px] font-semibold text-dark">Réinitialiser le groupe ?</p>
          <p className="text-[13px] text-muted -mt-2">Toutes les tâches de « {ckResetGroup} » seront décochées.</p>
          <div className="flex gap-3">
            <button onClick={() => setCkResetGroup(null)}
              className="flex-1 h-12 rounded-[12px] border border-muted/30 text-[14px] font-semibold text-muted">
              Annuler
            </button>
            <button onClick={async () => {
                const ids = checklistItems.filter(t => t.group_name === ckResetGroup && t.user_id === user?.id).map(t => t.id)
                setChecklistItems(prev => prev.filter(t => !ids.includes(t.id)))
                await supabase.from('checklist_items').delete().in('id', ids)
                setCkResetGroup(null)
              }}
              className="flex-1 h-12 rounded-[12px] bg-[#6c63ff] text-[14px] font-semibold text-white">
              Réinitialiser
            </button>
          </div>
        </BottomSheet>
      )}

      {ckDeleteGroup !== null && (
        <BottomSheet onClose={() => setCkDeleteGroup(null)}>
          <p className="text-[17px] font-semibold text-dark">Supprimer le groupe ?</p>
          <p className="text-[13px] text-muted -mt-2">Toutes les tâches de « {ckDeleteGroup} » seront supprimées.</p>
          <div className="flex gap-3">
            <button onClick={() => setCkDeleteGroup(null)}
              className="flex-1 h-12 rounded-[12px] border border-muted/30 text-[14px] font-semibold text-muted">
              Annuler
            </button>
            <button onClick={async () => {
                const ids = checklistItems.filter(t => t.group_name === ckDeleteGroup).map(t => t.id)
                setChecklistItems(prev => prev.filter(t => t.group_name !== ckDeleteGroup))
                saveCkGroups(ckGroups.filter(g => g !== ckDeleteGroup))
                await supabase.from('checklist_items').delete().in('id', ids)
                setCkDeleteGroup(null)
              }}
              className="flex-1 h-12 rounded-[12px] bg-red-500 text-[14px] font-semibold text-white">
              Supprimer
            </button>
          </div>
        </BottomSheet>
      )}

      {/* Modal Checklist */}
      {showCkModal && (
        <BottomSheet onClose={() => { setShowCkModal(false); setCkForm({ label: '', group: '' }); setCkGroupInput('') }}>
          <p className="text-[17px] font-semibold text-dark">Nouvelle tâche</p>
          <TextField label="Nom" required autoFocus value={ckForm.label}
            onChange={e => setCkForm(f => ({ ...f, label: e.target.value }))}
            placeholder="Nom de la tâche..." />
          <div className="flex flex-col gap-1" ref={ckGroupRef}>
            <label className="text-[12px] font-medium text-muted">Groupe</label>
            <div className="relative">
              <input type="text" value={ckGroupInput}
                onChange={e => { setCkGroupInput(e.target.value); setCkForm(f => ({ ...f, group: e.target.value })); setCkGroupOpen(true) }}
                onFocus={() => setCkGroupOpen(true)}
                placeholder="Sélectionne ou crée un groupe..."
                className="bg-soft rounded-[10px] h-12 px-4 text-[14px] text-dark outline-none placeholder:text-accent w-full"/>
              {ckGroupOpen && ckAllGroups.filter(g => g.toLowerCase().includes(ckGroupInput.toLowerCase())).length > 0 && (
                <ul className="absolute left-0 right-0 top-[52px] bg-white rounded-[10px] shadow-lg z-10 overflow-hidden border border-soft">
                  {ckAllGroups.filter(g => g.toLowerCase().includes(ckGroupInput.toLowerCase())).map(g => (
                    <li key={g}>
                      <button className="w-full text-left px-4 py-3 text-[13px] text-dark hover:bg-soft"
                        style={{ minWidth: 0, minHeight: 0 }}
                        onClick={() => {
                          const groupIsShared = checklistItems.filter(t => t.user_id === user?.id && t.group_name === g).some(t => t.is_shared)
                          setCkForm(f => ({ ...f, group: g, isShared: groupIsShared }))
                          setCkGroupInput(g); setCkGroupOpen(false)
                        }}>{g}</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          {partnerName && (
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-dark font-medium">Partager avec {partnerName}</span>
              <button onClick={() => setCkForm(f => ({ ...f, isShared: !f.isShared }))}
                style={{ minWidth: 0, minHeight: 0 }}
                className={`w-10 h-6 rounded-full transition-colors relative ${ckForm.isShared ? 'bg-primary' : 'bg-[#e2dff0]'}`}>
                <span className={`absolute top-[3px] w-[18px] h-[18px] bg-white rounded-full shadow transition-transform ${ckForm.isShared ? 'translate-x-[18px]' : 'translate-x-[3px]'}`}/>
              </button>
            </div>
          )}
          <SubmitButton onClick={addCkItem} disabled={!ckForm.label.trim()}>
            Ajouter
          </SubmitButton>
        </BottomSheet>
      )}

      {/* Modal */}
      {showModal && (
        <BottomSheet onClose={() => setShowModal(false)}>
          <p className="text-[17px] font-semibold text-dark">{editingId ? 'Modifier la tâche' : 'Nouvelle tâche'}</p>

          <TextField label="Nom" required autoFocus value={form.label} error={error}
            onChange={e => { setForm(f => ({ ...f, label: e.target.value })); setError('') }}
            placeholder="Nom de la tâche..." />

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium text-muted">Lien Jira</label>
            <div className="relative bg-soft rounded-[10px] h-12 flex items-center px-4 gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="rgb(var(--color-accent))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="rgb(var(--color-accent))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <input type="url" value={form.jiraUrl}
                onChange={e => setForm(f => ({ ...f, jiraUrl: e.target.value }))}
                placeholder="https://..."
                className="flex-1 bg-transparent text-[14px] text-dark outline-none placeholder:text-accent"/>
            </div>
          </div>

          <div className="flex flex-col gap-1" ref={groupRef}>
            <label className="text-[12px] font-medium text-muted">Groupe</label>
            <div className="relative">
              <input type="text" value={groupInput}
                onChange={e => { setGroupInput(e.target.value); setForm(f => ({ ...f, group: e.target.value })); setGroupOpen(true) }}
                onFocus={() => setGroupOpen(true)}
                placeholder="Sélectionne ou crée un groupe..."
                className="bg-soft rounded-[10px] h-12 px-4 text-[14px] text-dark outline-none placeholder:text-accent w-full"/>
              {groupOpen && (groupSuggestions.length > 0 || (groupInput.trim() && !allGroups.includes(groupInput.trim()))) && (
                <ul className="absolute left-0 right-0 top-[52px] bg-white rounded-[10px] shadow-lg z-10 overflow-hidden border border-soft">
                  {groupSuggestions.map(g => (
                    <li key={g}>
                      <button className="w-full text-left px-4 py-3 text-[13px] text-dark hover:bg-soft"
                        onClick={() => { setForm(f => ({ ...f, group: g })); setGroupInput(g); setGroupOpen(false) }}>{g}</button>
                    </li>
                  ))}
                  {groupInput.trim() && !allGroups.includes(groupInput.trim()) && (
                    <li>
                      <button className="w-full text-left px-4 py-3 text-[13px] text-primary font-medium hover:bg-soft"
                        onClick={() => { setForm(f => ({ ...f, group: groupInput.trim() })); setGroupOpen(false) }}>
                        + Créer "{groupInput.trim()}"
                      </button>
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>

          <DateField label="Date d'échéance" value={form.dueDate}
            onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />

          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-medium text-muted">Tags</label>
            <div className="relative bg-soft rounded-[10px] min-h-12 px-3 py-2 flex flex-wrap gap-2 items-center">
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
                className="bg-transparent text-[14px] text-dark outline-none placeholder:text-accent min-w-[80px] flex-1"/>
              <div className="flex gap-1 shrink-0">
                {TAG_TYPES.map(t => (
                  <button key={t.value} onPointerDown={e => { e.preventDefault(); setTagType(t.value) }}
                    className={`w-7 h-7 rounded-[6px] flex items-center justify-center transition-colors ${tagType === t.value ? t.color : 'bg-soft/60 text-muted'}`}
                    title={t.value}>{t.icon}</button>
                ))}
              </div>
              {tagSuggestions.length > 0 && (
                <ul className="absolute left-0 right-0 top-full mt-1 bg-white rounded-[10px] shadow-lg z-10 overflow-hidden border border-soft">
                  {tagSuggestions.map((s, i) => (
                    <li key={i}>
                      <button className="w-full text-left px-4 py-3 text-[13px] hover:bg-soft flex items-center gap-2"
                        onClick={() => addTag(s.label, s.type)}>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full ${tagColor(s.type)}`}>{s.type}</span>
                        {s.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="text-[11px] text-accent">Entrée ou virgule pour valider, Retour arrière pour supprimer</p>
          </div>

          <SubmitButton onClick={addTask} disabled={saving || !form.label.trim()}>
            {saving ? 'Enregistrement...' : editingId ? 'Modifier' : 'Ajouter'}
          </SubmitButton>
        </BottomSheet>
      )}

    </div>
  )
}
