import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import { useAuth } from '../hooks/useAuth'

export default function Checklist() {
  const [tasks, setTasks] = useState([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [newTask, setNewTask] = useState('')
  const navigate = useNavigate()
  const { user } = useAuth()
  const profile = useProfile()

  const firstName = profile?.first_name ?? ''
  const lastName = profile?.last_name ?? ''
  const displayName = profile?.display_name ?? user?.email ?? ''
  const initials = firstName && lastName
    ? `${firstName[0]}${lastName[0]}`.toUpperCase()
    : displayName?.slice(0, 2).toUpperCase() ?? '??'

  const addTask = () => {
    const trimmed = newTask.trim()
    if (!trimmed) return
    setTasks(prev => [...prev, { id: Date.now(), label: trimmed, done: false }])
    setNewTask('')
    setShowModal(false)
  }

  const toggleTask = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  const deleteTask = (id) => {
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div className="relative w-full h-dvh overflow-hidden bg-[#f6f4f9]">

      {/* Blobs décoratifs */}
      <div className="absolute -left-16 -top-4 w-72 h-72 rounded-full bg-[#c4b5fd] opacity-30 blur-3xl pointer-events-none" />
      <div className="absolute left-32 top-14 w-64 h-64 rounded-full bg-[#a5f3fc] opacity-25 blur-3xl pointer-events-none" />
      <div className="absolute -left-8 top-52 w-60 h-60 rounded-full bg-[#bbf7d0] opacity-20 blur-3xl pointer-events-none" />
      <div className="absolute left-40 top-[461px] w-64 h-64 rounded-full bg-[#fed7aa] opacity-25 blur-3xl pointer-events-none" />

      {/* TopBar */}
      <header className="absolute top-0 left-0 right-0 h-[94px] bg-white/55 border-b border-white/80 backdrop-blur-md z-20 flex items-end justify-between px-4 pb-4">
        <button
          onClick={() => setMenuOpen(true)}
          className="flex flex-col gap-[5px] p-2 min-w-[44px] min-h-[44px] justify-center"
          aria-label="Ouvrir le menu"
        >
          <span className="block w-[22px] h-[2.5px] rounded-sm bg-[rgba(33,23,56,0.75)]" />
          <span className="block w-[22px] h-[2.5px] rounded-sm bg-[rgba(33,23,56,0.75)]" />
          <span className="block w-[22px] h-[2.5px] rounded-sm bg-[rgba(33,23,56,0.75)]" />
        </button>
        <h1 className="absolute left-1/2 -translate-x-1/2 bottom-4 text-[17px] font-semibold text-[#211738]">
          Checklist
        </h1>
      </header>

      {/* Contenu */}
      <main className="absolute top-[110px] left-4 right-4 bottom-4 flex flex-col gap-3 overflow-hidden">

        {/* Stat / liste vide */}
        {tasks.length === 0 && (
          <div className="bg-white/60 border border-[#c0befe]/50 rounded-[12px] h-16 flex flex-col items-center justify-center">
            <p className="text-[22px] font-bold text-[#6c63ff] leading-tight">Aucune tâche</p>
            <p className="text-[11px] text-[#a49ffe]">pour le moment</p>
          </div>
        )}

        {/* Liste des tâches */}
        {tasks.length > 0 && (
          <ul className="flex flex-col gap-2 overflow-y-auto flex-1">
            {tasks.map(task => (
              <li
                key={task.id}
                className="bg-white/60 border border-white/85 backdrop-blur-md rounded-[12px] h-[52px] flex items-center gap-3 px-4"
              >
                <button
                  onClick={() => toggleTask(task.id)}
                  className="w-5 h-5 rounded-[4px] border-2 border-[#6c63ff] flex items-center justify-center shrink-0"
                >
                  {task.done && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="#6c63ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                <span className={`flex-1 text-[14px] text-[#211738] ${task.done ? 'line-through text-[#736694]' : ''}`}>
                  {task.label}
                </span>
                <button onClick={() => deleteTask(task.id)} className="p-1 min-w-[44px] min-h-[44px] flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="#a49ffe" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Bouton nouvelle tâche */}
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#6c63ff] rounded-[12px] h-12 flex items-center justify-center"
        >
          <span className="text-[14px] font-semibold text-white">Nouvelle tâche</span>
        </button>
      </main>

      {/* Modal nouvelle tâche */}
      {showModal && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-[rgba(33,23,56,0.3)]" onClick={() => setShowModal(false)}>
          <div
            className="w-full bg-white/90 backdrop-blur-md rounded-t-[20px] p-6 flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-[17px] font-semibold text-[#211738]">Nouvelle tâche</p>
            <input
              autoFocus
              type="text"
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTask()}
              placeholder="Nom de la tâche..."
              className="bg-[#f2edfa] rounded-[10px] h-12 px-4 text-[14px] text-[#211738] outline-none placeholder:text-[#a49ffe]"
            />
            <button
              onClick={addTask}
              className="bg-[#6c63ff] rounded-[12px] h-12 text-[14px] font-semibold text-white"
            >
              Ajouter
            </button>
          </div>
        </div>
      )}

      {/* Overlay menu */}
      <div
        onClick={() => setMenuOpen(false)}
        className={`absolute inset-0 bg-[rgba(33,23,56,0.18)] z-30 transition-opacity duration-300 ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer */}
      <nav
        className={`absolute top-0 left-0 h-full w-[280px] z-40 bg-[#f6f4f9] transition-transform duration-300 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
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
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-3 w-full h-[52px] px-3 rounded-[12px]"
            >
              <div className="w-7 h-7 bg-[#f2edfa] rounded-[8px] flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke="#736694" strokeWidth="2" strokeLinejoin="round" />
                  <path d="M9 21V12h6v9" stroke="#736694" strokeWidth="2" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-[14px] text-[rgba(115,102,148,0.85)] flex-1 text-left">Home</span>
            </button>
            <button
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 w-full h-[52px] px-3 bg-[#f2edfa] rounded-[12px]"
            >
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
            <p className="text-center text-[11px] text-[rgba(115,102,148,0.35)] mt-3">Oparty v0.1</p>
          </div>
        </div>
      </nav>
    </div>
  )
}
