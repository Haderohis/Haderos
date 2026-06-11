import { useState, useRef, useEffect } from 'react'

const fmtTime = (iso) => {
  const d = new Date(iso)
  const now = new Date()
  const diffMin = Math.floor((now - d) / 60000)
  if (diffMin < 1) return "À l'instant"
  if (diffMin < 60) return `Il y a ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `Il y a ${diffH}h`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `Il y a ${diffD}j`
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export default function NotificationBell({ notifications, unreadCount, onOpen }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleOpen = () => {
    setOpen(o => !o)
    if (!open) onOpen?.()
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={handleOpen}
        className="relative w-[44px] h-[44px] flex items-center justify-center"
        aria-label="Notifications"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 002 2zm6-6V11c0-3.07-1.64-5.64-4.5-6.32V4a1.5 1.5 0 00-3 0v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"
            fill={unreadCount > 0 ? '#6c63ff' : '#736694'} />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-[18px] h-[18px] rounded-full bg-[#6c63ff] text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-[46px] right-0 z-50 w-[300px] bg-white rounded-[14px] shadow-xl border border-[#f0ebfa] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#f0ebfa]">
            <p className="text-[13px] font-semibold text-[#211738]">Notifications</p>
          </div>
          {notifications.length === 0 ? (
            <div className="px-4 py-6 flex flex-col items-center gap-2">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 002 2zm6-6V11c0-3.07-1.64-5.64-4.5-6.32V4a1.5 1.5 0 00-3 0v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"
                  fill="#d0c9e8" />
              </svg>
              <p className="text-[13px] text-[#a49ffe]">Aucune notification pour le moment</p>
            </div>
          ) : (
            <ul className="max-h-[340px] overflow-y-auto divide-y divide-[#f0ebfa]">
              {notifications.map(n => (
                <li key={n.id} className={`flex items-start gap-3 px-4 py-3 transition-colors ${n.read ? '' : 'bg-[#f2edfa]/60'}`}>
                  <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${n.read ? 'bg-transparent' : 'bg-[#6c63ff]'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-[#211738] leading-snug">{n.message}</p>
                    <p className="text-[11px] text-[#a49ffe] mt-0.5">{fmtTime(n.created_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
