import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useNotifications } from '../hooks/useNotifications'
import Drawer from './Drawer'
import NotificationBell from './NotificationBell'

export default function AppHeader({ title, titleExtra }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user } = useAuth()
  const { notifications, unreadCount, markAllRead, acceptShare, declineShare, deleteNotification, deleteAll } = useNotifications(user?.id)

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
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
          <h1 className="text-[17px] font-semibold text-[#211738] whitespace-nowrap">{title}</h1>
          {titleExtra}
        </div>
        <div className="ml-auto">
          <NotificationBell notifications={notifications} unreadCount={unreadCount} onOpen={markAllRead} onAcceptShare={acceptShare} onDeclineShare={declineShare} onDelete={deleteNotification} onDeleteAll={deleteAll} />
        </div>
      </header>
      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  )
}
