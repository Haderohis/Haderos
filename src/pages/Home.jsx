import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Drawer from '../components/Drawer'

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) navigate('/login')
  }, [user, loading])

  return (
    <div className="relative w-full h-dvh overflow-hidden bg-[#f6f4f9]">

      {/* Blobs décoratifs */}
      <div className="absolute -left-16 -top-4 w-72 h-72 rounded-full bg-[#c4b5fd] opacity-30 blur-3xl pointer-events-none" />
      <div className="absolute left-32 top-14 w-64 h-64 rounded-full bg-[#a5f3fc] opacity-25 blur-3xl pointer-events-none" />
      <div className="absolute -left-8 top-52 w-60 h-60 rounded-full bg-[#bbf7d0] opacity-20 blur-3xl pointer-events-none" />
      <div className="absolute left-40 top-[460px] w-64 h-64 rounded-full bg-[#fed7aa] opacity-25 blur-3xl pointer-events-none" />

      {/* TopBar */}
      <header className="absolute top-0 left-0 right-0 h-[76px] bg-white/55 border-b border-white/80 backdrop-blur-md z-20 flex items-center justify-between px-4">
        <button
          onClick={() => setMenuOpen(true)}
          className="flex flex-col gap-[5px] p-2 min-w-[44px] min-h-[44px] justify-center"
          aria-label="Ouvrir le menu"
        >
          <span className="block w-[22px] h-[2.5px] rounded-sm bg-[rgba(33,23,56,0.75)]" />
          <span className="block w-[22px] h-[2.5px] rounded-sm bg-[rgba(33,23,56,0.75)]" />
          <span className="block w-[22px] h-[2.5px] rounded-sm bg-[rgba(33,23,56,0.75)]" />
        </button>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-[17px] font-semibold text-[#211738]">
          Toolbox
        </h1>
      </header>

      {/* Carte centrale */}
      <main className="absolute top-[92px] left-4 right-4 bottom-4 bg-white/55 border border-white/85 backdrop-blur-md rounded-[20px] flex flex-col items-center justify-center gap-2">
        <p className="text-[22px] font-bold text-[rgba(33,23,56,0.9)]">Bonne journée</p>
        <p className="text-[13px] text-[#736694] text-center leading-snug">
          Ouvre le menu pour accéder<br />à tes outils
        </p>
      </main>

      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  )
}
