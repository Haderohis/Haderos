import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useNotifications } from '../hooks/useNotifications'
import Drawer from './Drawer'
import NotificationBell from './NotificationBell'

export default function AppHeader({ title }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user } = useAuth()
  const { notifications, unreadCount, markAllRead } = useNotifications(user?.id)

  return (
    <>
      <header className="absolute top-0 left-0 right-0 h-[76px] bg-white/55 border-b border-white/80 backdrop-blur-md z-20 flex items-center px-4">
        <button
          onClick={() => setMenuOpen(true)}
          className="flex flex-col gap-[5px] p-2 min-w-[44px] min-h-[44px] justify-center"
          aria-label="Ouvrir le menu"
        >
          <span className="block w-[22px] h-[2.5px] rounded-sm bg-[rgba(33,23,56,0.75)]" />
          <span className="block w-[22px] h-[2.5px] rounded-sm bg-[rgba(33,23,56,0.75)]" />
          <span className="block w-[22px] h-[2.5px] rounded-sm bg-[rgba(33,23,56,0.75)]" />
        </button>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-[17px] font-semibold text-[#211738]">{title}</h1>
        <div className="ml-auto">
          <NotificationBell notifications={notifications} unreadCount={unreadCount} onOpen={markAllRead} />
        </div>
      </header>
      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  )
}
