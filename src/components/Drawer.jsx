import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'

const NAV_ITEMS = [
  {
    path: '/',
    label: 'Home',
    icon: (active) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke={active ? 'white' : '#736694'} strokeWidth="2" strokeLinejoin="round" />
        <path d="M9 21V12h6v9" stroke={active ? 'white' : '#736694'} strokeWidth="2" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    path: '/checklist',
    label: 'Worklist',
    icon: (active) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke={active ? 'white' : '#736694'} strokeWidth="2" />
        <path d="M7 12l3 3 7-7" stroke={active ? 'white' : '#736694'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    path: '/expenses',
    label: 'Dépenses',
    icon: (active) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke={active ? 'white' : '#736694'} strokeWidth="2" />
        <path d="M12 7v1m0 8v1M9.5 9.5C9.5 8.67 10.17 8 11 8h2a1.5 1.5 0 010 3h-2a1.5 1.5 0 000 3h2c.83 0 1.5-.67 1.5-1.5" stroke={active ? 'white' : '#736694'} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
]

export default function Drawer({ open, onClose }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut } = useAuth()
  const profile = useProfile(user)

  const firstName = profile?.first_name ?? ''
  const lastName = profile?.last_name ?? ''
  const displayName = profile?.display_name ?? user?.email ?? ''
  const initials = firstName && lastName
    ? `${firstName[0]}${lastName[0]}`.toUpperCase()
    : displayName?.slice(0, 2).toUpperCase() ?? '??'

  const handleNav = (path) => {
    onClose()
    navigate(path)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-[rgba(33,23,56,0.18)] z-30 transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer */}
      <nav
        className={`absolute top-0 left-0 h-full w-[280px] z-40 bg-[#f6f4f9] transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="absolute -left-16 -top-4 w-72 h-72 rounded-full bg-[#c4b5fd] opacity-30 blur-3xl pointer-events-none" />
        <div className="absolute left-32 top-14 w-64 h-64 rounded-full bg-[#a5f3fc] opacity-20 blur-3xl pointer-events-none" />

        <div className="absolute inset-0 bg-white/72 border-r border-white/85 backdrop-blur-md flex flex-col">

          {/* Profil */}
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

          {/* Navigation */}
          <div className="flex flex-col gap-1 px-4 pt-4">
            {NAV_ITEMS.map(({ path, label, icon }) => {
              const active = location.pathname === path
              return (
                <button
                  key={path}
                  onClick={() => handleNav(path)}
                  className={`flex items-center gap-3 w-full h-[52px] px-3 rounded-[12px] ${active ? 'bg-[#f2edfa]' : ''}`}
                >
                  <div className={`w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0 ${active ? 'bg-[#6c63ff]' : 'bg-[#f2edfa]'}`}>
                    {icon(active)}
                  </div>
                  <span className={`text-[14px] flex-1 text-left ${active ? 'font-semibold text-[#6c63ff]' : 'text-[rgba(115,102,148,0.85)]'}`}>
                    {label}
                  </span>
                  {active && <span className="w-2 h-2 rounded-full bg-[#6c63ff]" />}
                </button>
              )
            })}
          </div>

          <div className="flex-1" />

          {/* Déconnexion */}
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
            <p className="text-center text-[11px] text-[rgba(115,102,148,0.35)] mt-3">HadeTools v0.1</p>
          </div>
        </div>
      </nav>
    </>
  )
}
