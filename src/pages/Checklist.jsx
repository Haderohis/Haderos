import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const EMPTY_FORM = { label: '', group: '', dueDate: '', tags: [] }

export default function Checklist() {
  const [tasks, setTasks] = useState([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [tagInput, setTagInput] = useState('')
  const [groupInput, setGroupInput] = useState('')
  const [groupOpen, setGroupOpen] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const groupRef = useRef(null)
  const dateRef = useRef(null)
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const profile = useProfile(user)

  useEffect(() => {
    if (!loading && !user) navigate('/login')
  }, [user, loading])

  useEffect(() => {
    if (!user) return
    supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true })
      .then(({ data }) => { if (data) setTasks(data) })
  }, [user])

  useEffect(() => {
    const handler = (e) => {
      if (groupRef.current && !groupRef.current.contains(e.target)) setGroupOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const firstName = profile?.first_name ?? ''
  const lastName = profile?.last_name ?? ''
  const displayName = profile?.display_name ?? user?.email ?? ''
  const initials = firstName && lastName
    ? `${firstName[0]}${lastName[0]}`.toUpperCase()
    : displayName?.slice(0, 2).toUpperCase() ?? '??'

  const allTags = [...new Set(tasks.flatMap(t => t.tags ?? []))]
  const allGroups = [...new Set(tasks.map(t => t.group_name).filter(Boolean))]
  const tagSuggestions = tagInput.length > 0
    ? allTags.filter(t => t.toLowerCase().startsWith(tagInput.toLowerCase()) && !form.tags.includes(t))
    : []
  const groupSuggestions = allGroups.filter(g =>
    g.toLowerCase().includes(groupInput.toLowerCase())
  )

  const addTag = (tag) => {
    const trimmed = tag.trim()
    if (!trimmed || form.tags.includes(trimmed)) return
    setForm(f => ({ ...f, tags: [...f.tags, trimmed] }))
    setTagInput('')
  }

  const removeTag = (tag) => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))

  const openModal = () => {
    setForm(EMPTY_FORM)
    setTagInput('')
    setGroupInput('')
    setError('')
    setEditingId(null)
    setShowModal(true)
  }

  const openEdit = (task) => {
    setForm({ label: task.label, group: task.group_name ?? '', dueDate: task.due_date ?? '', tags: task.tags ?? [] })
    setGroupInput(task.group_name ?? '')
    setTagInput('')
    setError('')
    setEditingId(task.id)
    setShowModal(true)
  }

  const addTask = async () => {
    if (!form.label.trim()) {
      setError('Le nom de la tâche est obligatoire.')
      return
    }
    const finalTags = tagInput.trim() && !form.tags.includes(tagInput.trim())
      ? [...form.tags, tagInput.trim()]
      : form.tags
    setSaving(true)

    if (editingId) {
      const { data, error: err } = await supabase.from('tasks').update({
        label: form.label.trim(),
        group_name: form.group || null,
        due_date: form.dueDate || null,
        tags: finalTags,
      }).eq('id', editingId).select().single()
      setSaving(false)
      if (err) { setError('Erreur lors de la sauvegarde.'); return }
      setTasks(prev => prev.map(t => t.id === editingId ? data : t))
    } else {
      const { data, error: err } = await supabase.from('tasks').insert({
        user_id: user.id,
        label: form.label.trim(),
        group_name: form.group || null,
        due_date: form.dueDate || null,
        tags: finalTags,
        done: false,
      }).select().single()
      setSaving(false)
      if (err) { setError('Erreur lors de la sauvegarde.'); return }
      setTasks(prev => [data, ...prev])
    }

    setShowModal(false)
  }

  const toggleTask = async (id, done) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !done } : t))
    await supabase.from('tasks').update({ done: !done }).eq('id', id)
  }

  const deleteTask = async (id) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    await supabase.from('tasks').delete().eq('id', id)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  const handleDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return
    const oldIndex = tasks.findIndex(t => t.id === active.id)
    const newIndex = tasks.findIndex(t => t.id === over.id)
    const reordered = arrayMove(tasks, oldIndex, newIndex)
    setTasks(reordered)
    await Promise.all(
      reordered.map((task, i) =>
        supabase.from('tasks').update({ position: i }).eq('id', task.id)
      )
    )
  }

  const SortableTask = ({ task }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
    return (
      <li
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        className={`bg-white/60 border border-white/85 backdrop-blur-md rounded-[12px] px-4 py-3 flex items-start gap-3 ${isDragging ? 'opacity-50 z-50' : ''}`}
      >
        <button {...attributes} {...listeners} className="min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 touch-none">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="9" cy="6" r="1.5" fill="#a49ffe" /><circle cx="15" cy="6" r="1.5" fill="#a49ffe" />
            <circle cx="9" cy="12" r="1.5" fill="#a49ffe" /><circle cx="15" cy="12" r="1.5" fill="#a49ffe" />
            <circle cx="9" cy="18" r="1.5" fill="#a49ffe" /><circle cx="15" cy="18" r="1.5" fill="#a49ffe" />
          </svg>
        </button>
        <button onClick={() => toggleTask(task.id, task.done)} className="w-5 h-5 rounded-[4px] border-2 border-[#6c63ff] flex items-center justify-center shrink-0 mt-0.5">
          {task.done && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="#6c63ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        <div className="flex-1 min-w-0" onClick={() => openEdit(task)}>
          <span className={`text-[14px] text-[#211738] ${task.done ? 'line-through text-[#736694]' : ''}`}>{task.label}</span>
          <div className="flex flex-wrap items-center gap-1 mt-1">
            {task.due_date && <span className="text-[11px] text-[#736694]">📅 {new Date(task.due_date).toLocaleDateString('fr-FR')}</span>}
            {(task.tags ?? []).map(tag => <span key={tag} className="text-[11px] text-[#6c63ff] bg-[#6c63ff]/10 px-2 py-0.5 rounded-full">{tag}</span>)}
          </div>
        </div>
        <button onClick={() => deleteTask(task.id)} className="min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="#a49ffe" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </li>
    )
  }

  return (
    <div className="relative w-full h-dvh overflow-hidden bg-[#f6f4f9]">

      {/* Blobs */}
      <div className="absolute -left-16 -top-4 w-72 h-72 rounded-full bg-[#c4b5fd] opacity-30 blur-3xl pointer-events-none" />
      <div className="absolute left-32 top-14 w-64 h-64 rounded-full bg-[#a5f3fc] opacity-25 blur-3xl pointer-events-none" />
      <div className="absolute -left-8 top-52 w-60 h-60 rounded-full bg-[#bbf7d0] opacity-20 blur-3xl pointer-events-none" />
      <div className="absolute left-40 top-[461px] w-64 h-64 rounded-full bg-[#fed7aa] opacity-25 blur-3xl pointer-events-none" />

      {/* TopBar */}
      <header className="absolute top-0 left-0 right-0 h-[94px] bg-white/55 border-b border-white/80 backdrop-blur-md z-20 flex items-end justify-between px-4 pb-4">
        <button onClick={() => setMenuOpen(true)} className="flex flex-col gap-[5px] p-2 min-w-[44px] min-h-[44px] justify-center" aria-label="Ouvrir le menu">
          <span className="block w-[22px] h-[2.5px] rounded-sm bg-[rgba(33,23,56,0.75)]" />
          <span className="block w-[22px] h-[2.5px] rounded-sm bg-[rgba(33,23,56,0.75)]" />
          <span className="block w-[22px] h-[2.5px] rounded-sm bg-[rgba(33,23,56,0.75)]" />
        </button>
        <h1 className="absolute left-1/2 -translate-x-1/2 bottom-4 text-[17px] font-semibold text-[#211738]">Checklist</h1>
      </header>

      {/* Contenu */}
      <main className="absolute top-[110px] left-4 right-4 bottom-4 flex flex-col gap-3 overflow-hidden">
        {tasks.length === 0 && (
          <div className="bg-white/60 border border-[#c0befe]/50 rounded-[12px] h-16 flex flex-col items-center justify-center">
            <p className="text-[22px] font-bold text-[#6c63ff] leading-tight">Aucune tâche</p>
            <p className="text-[11px] text-[#a49ffe]">pour le moment</p>
          </div>
        )}
        {tasks.length > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-4 overflow-y-auto flex-1">
                {(() => {
                  const grouped = tasks.reduce((acc, task) => {
                    const key = task.group_name ?? ''
                    if (!acc[key]) acc[key] = []
                    acc[key].push(task)
                    return acc
                  }, {})
                  const keys = Object.keys(grouped).sort((a, b) => {
                    if (a === '') return 1
                    if (b === '') return -1
                    return a.localeCompare(b)
                  })
                  return keys.map((group, i) => (
                    <div key={group} className={`flex flex-col gap-2 ${i > 0 ? 'pt-2 border-t border-[rgba(115,102,148,0.15)]' : ''}`}>
                      {group && <p className="text-[12px] font-semibold text-[#6c63ff] uppercase tracking-wider px-1 mt-1">{group}</p>}
                      <ul className="flex flex-col gap-2">
                        {grouped[group].map(task => <SortableTask key={task.id} task={task} />)}
                      </ul>
                    </div>
                  ))
                })()}
              </div>
            </SortableContext>
          </DndContext>
        )}
        <button onClick={openModal} className="bg-[#6c63ff] rounded-[12px] h-12 flex items-center justify-center shrink-0">
          <span className="text-[14px] font-semibold text-white">Nouvelle tâche</span>
        </button>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-[rgba(33,23,56,0.3)]" onClick={() => setShowModal(false)}>
          <div className="w-full bg-white/95 backdrop-blur-md rounded-t-[20px] p-6 flex flex-col gap-4 max-h-[85dvh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <p className="text-[17px] font-semibold text-[#211738]">{editingId ? 'Modifier la tâche' : 'Nouvelle tâche'}</p>

            {/* Nom */}
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-medium text-[#736694]">Nom <span className="text-[#6c63ff]">*</span></label>
              <input
                autoFocus
                type="text"
                value={form.label}
                onChange={e => { setForm(f => ({ ...f, label: e.target.value })); setError('') }}
                placeholder="Nom de la tâche..."
                className={`bg-[#f2edfa] rounded-[10px] h-12 px-4 text-[14px] text-[#211738] outline-none placeholder:text-[#a49ffe] ${error ? 'ring-2 ring-red-400' : ''}`}
              />
              {error && <p className="text-[12px] text-red-500">{error}</p>}
            </div>

            {/* Groupe (combobox) */}
            <div className="flex flex-col gap-1" ref={groupRef}>
              <label className="text-[12px] font-medium text-[#736694]">Groupe</label>
              <div className="relative">
                <input
                  type="text"
                  value={groupInput}
                  onChange={e => { setGroupInput(e.target.value); setForm(f => ({ ...f, group: e.target.value })); setGroupOpen(true) }}
                  onFocus={() => setGroupOpen(true)}
                  placeholder="Sélectionne ou crée un groupe..."
                  className="bg-[#f2edfa] rounded-[10px] h-12 px-4 text-[14px] text-[#211738] outline-none placeholder:text-[#a49ffe] w-full"
                />
                {groupOpen && (groupSuggestions.length > 0 || (groupInput.trim() && !allGroups.includes(groupInput.trim()))) && (
                  <ul className="absolute left-0 right-0 top-[52px] bg-white rounded-[10px] shadow-lg z-10 overflow-hidden border border-[#f2edfa]">
                    {groupSuggestions.map(g => (
                      <li key={g}>
                        <button className="w-full text-left px-4 py-3 text-[13px] text-[#211738] hover:bg-[#f2edfa]"
                          onClick={() => { setForm(f => ({ ...f, group: g })); setGroupInput(g); setGroupOpen(false) }}>
                          {g}
                        </button>
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

            {/* Date d'échéance */}
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-medium text-[#736694]">Date d'échéance</label>
              <div className="relative bg-[#f2edfa] rounded-[10px] h-12 flex items-center px-4">
                <input
                  ref={dateRef}
                  type="date"
                  value={form.dueDate}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                  className="flex-1 bg-transparent text-[14px] text-[#211738] outline-none cursor-pointer [color-scheme:light]"
                />
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 cursor-pointer pointer-events-auto" onPointerDown={e => { e.preventDefault(); dateRef.current?.showPicker() }}>
                  <rect x="3" y="4" width="18" height="18" rx="2" stroke="#736694" strokeWidth="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" stroke="#736694" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-medium text-[#736694]">Tags</label>
              <div className="relative bg-[#f2edfa] rounded-[10px] min-h-12 px-3 py-2 flex flex-wrap gap-2 items-center">
                {form.tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 bg-[#6c63ff]/15 text-[#6c63ff] text-[12px] font-medium px-2 py-1 rounded-full shrink-0">
                    {tag}
                    <button onPointerDown={e => { e.preventDefault(); removeTag(tag) }} className="leading-none text-[#6c63ff] min-w-0 min-h-0 w-4 h-4">&times;</button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => {
                    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                      e.preventDefault()
                      addTag(tagInput)
                    }
                    if (e.key === 'Backspace' && !tagInput && form.tags.length > 0) {
                      removeTag(form.tags[form.tags.length - 1])
                    }
                  }}
                  placeholder={form.tags.length === 0 ? 'Ajouter un tag...' : ''}
                  className="bg-transparent text-[14px] text-[#211738] outline-none placeholder:text-[#a49ffe] min-w-[120px] flex-1"
                />
                {tagSuggestions.length > 0 && (
                  <ul className="absolute left-0 right-0 top-full mt-1 bg-white rounded-[10px] shadow-lg z-10 overflow-hidden border border-[#f2edfa]">
                    {tagSuggestions.map(s => (
                      <li key={s}>
                        <button className="w-full text-left px-4 py-3 text-[13px] text-[#211738] hover:bg-[#f2edfa]" onClick={() => addTag(s)}>
                          {s}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <p className="text-[11px] text-[#a49ffe]">Entrée ou virgule pour valider, Retour arrière pour supprimer</p>
            </div>

            <button
              onClick={addTask}
              disabled={saving}
              className="bg-[#6c63ff] rounded-[12px] h-12 text-[14px] font-semibold text-white disabled:opacity-60"
            >
              {saving ? 'Enregistrement...' : editingId ? 'Modifier' : 'Ajouter'}
            </button>
          </div>
        </div>
      )}

      {/* Overlay menu */}
      <div onClick={() => setMenuOpen(false)} className={`absolute inset-0 bg-[rgba(33,23,56,0.18)] z-30 transition-opacity duration-300 ${menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} />

      {/* Drawer */}
      <nav className={`absolute top-0 left-0 h-full w-[280px] z-40 bg-[#f6f4f9] transition-transform duration-300 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="absolute -left-16 -top-4 w-72 h-72 rounded-full bg-[#c4b5fd] opacity-30 blur-3xl pointer-events-none" />
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
          <div className="mx-6 h-px bg-[rgba(153,153,166,0.25)]" />
          <div className="flex flex-col gap-1 px-4 pt-4">
            <button onClick={() => navigate('/')} className="flex items-center gap-3 w-full h-[52px] px-3 rounded-[12px]">
              <div className="w-7 h-7 bg-[#f2edfa] rounded-[8px] flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke="#736694" strokeWidth="2" strokeLinejoin="round" />
                  <path d="M9 21V12h6v9" stroke="#736694" strokeWidth="2" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-[14px] text-[rgba(115,102,148,0.85)] flex-1 text-left">Home</span>
            </button>
            <button onClick={() => setMenuOpen(false)} className="flex items-center gap-3 w-full h-[52px] px-3 bg-[#f2edfa] rounded-[12px]">
              <div className="w-7 h-7 bg-[#6c63ff] rounded-[8px] flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="white" strokeWidth="2" />
                  <path d="M7 12l3 3 7-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-[14px] font-semibold text-[#6c63ff] flex-1 text-left">Checklist</span>
              <span className="w-2 h-2 rounded-full bg-[#6c63ff]" />
            </button>
          </div>
          <div className="flex-1" />
          <div className="px-4 pb-10">
            <button
              onClick={async () => { await supabase.auth.signOut(); navigate('/login') }}
              className="flex items-center justify-center gap-2 w-full h-[46px] border border-[#736694] rounded-[8px]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="#736694" strokeWidth="2" strokeLinecap="round" />
                <polyline points="16 17 21 12 16 7" stroke="#736694" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="21" y1="12" x2="9" y2="12" stroke="#736694" strokeWidth="2" strokeLinecap="round" />
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
