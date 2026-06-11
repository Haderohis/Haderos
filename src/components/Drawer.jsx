import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'

const NAV_ITEMS = [
  {
    path: '/',
    label: 'Home',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? 'white' : '#736694'}>
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
      </svg>
    ),
  },
  {
    path: '/checklist',
    label: 'Worklist',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? 'white' : '#736694'}>
        <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
      </svg>
    ),
  },
  {
    path: '/expenses',
    label: 'Dépenses',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? 'white' : '#736694'}>
        <path d="M15 18.5c-2.51 0-4.68-1.42-5.76-3.5H15v-2H8.58c-.05-.33-.08-.66-.08-1s.03-.67.08-1H15V9H9.24C10.32 6.92 12.5 5.5 15 5.5c1.61 0 3.09.59 4.23 1.57L21 5.3C19.41 3.87 17.3 3 15 3c-3.92 0-7.24 2.51-8.48 6H3v2h3.06c-.04.33-.06.66-.06 1s.02.67.06 1H3v2h3.52C7.76 18.49 11.08 21 15 21c2.31 0 4.41-.87 6-2.3l-1.78-1.77A6.5 6.5 0 0115 18.5z" />
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
          <div className="flex items-center gap-4 px-4 pt-16 pb-5">
            <div className="w-[52px] h-[52px] rounded-[26px] bg-[#6c63ff] flex items-center justify-center shrink-0">
              <span className="text-white text-[20px] font-bold">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold text-[#211738] leading-tight truncate">{firstName} {lastName}</p>
              <p className="text-[12px] text-[#736694] leading-tight truncate">{displayName}</p>
            </div>
            <button onClick={() => { onClose(); navigate('/settings') }} className="shrink-0 w-6 h-6 flex items-center justify-center opacity-50">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#736694">
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96a7.02 7.02 0 00-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.477.477 0 00-.59.22L2.74 8.87a.47.47 0 00.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.47.47 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.47.47 0 00-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
              </svg>
            </button>
          </div>

          <div className="mx-6 h-px bg-[rgba(153,153,166,0.25)]" />

          {/* Navigation */}
          <div className="flex flex-col gap-2 px-4 pt-4">
            {NAV_ITEMS.map(({ path, label, icon }) => {
              const active = location.pathname === path
              return (
                <button
                  key={path}
                  onClick={() => handleNav(path)}
                  className={`flex items-center gap-3 w-full h-[52px] px-3 rounded-[12px] ${active ? 'bg-[#f2edfa]' : ''}`}
                >
                  <div className={`w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0 overflow-hidden ${active ? 'bg-[#6c63ff]' : 'bg-[#f2edfa]'}`}>
                    {icon(active)}
                  </div>
                  <span className={`text-[14px] flex-1 text-left ${active ? 'font-semibold text-[#6c63ff]' : 'font-normal text-[rgba(115,102,148,0.85)]'}`}>
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#736694">
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
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
