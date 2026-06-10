import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() ?? 'FP'

  const displayName = user?.user_metadata?.full_name ?? user?.email ?? 'Florian Pernes'
  const orgName = user?.user_metadata?.organization ?? 'Haderos'

  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-[#f6f4f9]">

      {/* Blobs décoratifs */}
      <div className="absolute -left-16 -top-4 w-72 h-72 rounded-full bg-[#c4b5fd] opacity-30 blur-3xl pointer-events-none" />
      <div className="absolute left-32 top-14 w-64 h-64 rounded-full bg-[#a5f3fc] opacity-25 blur-3xl pointer-events-none" />
      <div className="absolute -left-8 top-52 w-60 h-60 rounded-full bg-[#bbf7d0] opacity-20 blur-3xl pointer-events-none" />
      <div className="absolute left-40 top-[460px] w-64 h-64 rounded-full bg-[#fed7aa] opacity-25 blur-3xl pointer-events-none" />

      {/* TopBar glassmorphism */}
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
          Toolbox
        </h1>
      </header>

      {/* Carte centrale */}
      <main className="absolute top-[110px] left-4 right-4 bottom-4 bg-white/55 border border-white/85 backdrop-blur-md rounded-[20px] flex flex-col items-center justify-center gap-2">
        <p className="text-[22px] font-bold text-[rgba(33,23,56,0.9)]">Bonne journée</p>
        <p className="text-[13px] text-[#736694] text-center leading-snug">
          Ouvre le menu pour accéder<br />à tes outils
        </p>
      </main>

      {/* Overlay sombre */}
      <div
        onClick={() => setMenuOpen(false)}
        className={`absolute inset-0 bg-[rgba(33,23,56,0.18)] z-30 transition-opacity duration-300 ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer latéral */}
      <nav
        className={`absolute top-0 left-0 h-full w-[280px] z-40 bg-[#f6f4f9] transition-transform duration-300 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Blobs dans le drawer */}
        <div className="absolute -left-16 -top-4 w-72 h-72 rounded-full bg-[#c4b5fd] opacity-30 blur-3xl pointer-events-none" />
        <div className="absolute left-32 top-14 w-64 h-64 rounded-full bg-[#a5f3fc] opacity-20 blur-3xl pointer-events-none" />

        {/* Verre du drawer */}
        <div className="absolute inset-0 bg-white/72 border-r border-white/85 backdrop-blur-md flex flex-col">

          {/* Profil */}
          <div className="flex items-center gap-4 px-6 pt-16 pb-5">
            <div className="w-[52px] h-[52px] rounded-[26px] bg-[#6c63ff] flex items-center justify-center shrink-0">
              <span className="text-white text-[20px] font-bold">{initials}</span>
            </div>
            <div>
              <p className="text-[15px] font-bold text-[#211738] leading-tight">{displayName}</p>
              <p className="text-[12px] text-[#736694] leading-tight">{orgName}</p>
            </div>
          </div>

          {/* Séparateur */}
          <div className="mx-6 h-px bg-[rgba(153,153,166,0.25)]" />

          {/* Navigation */}
          <div className="flex flex-col gap-1 px-4 pt-4">
            {/* Home — actif */}
            <button
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 w-full h-[52px] px-3 bg-[#f2edfa] rounded-[12px]"
            >
              <div className="w-7 h-7 bg-[#6c63ff] rounded-[8px] flex items-center justify-center shrink-0">
                {/* Icône home SVG */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
                  <path d="M9 21V12h6v9" stroke="white" strokeWidth="2" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-[14px] font-semibold text-[#6c63ff] flex-1 text-left">Home</span>
              <span className="w-2 h-2 rounded-full bg-[#6c63ff]" />
            </button>

            {/* Checklist */}
            <Link
              to="/checklist"
              className="flex items-center gap-3 w-full h-[52px] px-3 rounded-[12px]"
            >
              <div className="w-7 h-7 bg-[#f2edfa] rounded-[8px] flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="#736694" strokeWidth="2" />
                  <path d="M7 12l3 3 7-7" stroke="#736694" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-[14px] text-[rgba(115,102,148,0.85)] flex-1 text-left">Checklist</span>
            </Link>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Bouton déconnexion */}
          <div className="px-4 pb-10">
            <button
              onClick={handleSignOut}
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
