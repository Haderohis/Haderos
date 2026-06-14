import { useState, useRef, useEffect } from 'react'

const fmtTime = (iso) => {
  const normalized = iso && !iso.endsWith('Z') && !iso.includes('+') ? iso + 'Z' : iso
  const d = new Date(normalized)
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

function ShareRequestItem({ n, onAccept, onDecline }) {
  const status = n.data?.status
  const done = status === 'accepted' || status === 'declined'

  return (
    <li className={`px-4 py-3 transition-colors ${n.read ? '' : 'bg-soft/60'}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${n.read ? 'bg-transparent' : 'bg-primary'}`} />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-dark leading-snug">{n.message}</p>
          <p className="text-[11px] text-accent mt-0.5">{fmtTime(n.created_at)}</p>
          {!done && (
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => onAccept(n)}
                className="flex-1 h-8 bg-primary text-white text-[12px] font-semibold rounded-[8px]"
              >
                Accepter
              </button>
              <button
                onClick={() => onDecline(n)}
                className="flex-1 h-8 bg-soft text-muted text-[12px] font-semibold rounded-[8px]"
              >
                Refuser
              </button>
            </div>
          )}
          {done && (
            <p className={`text-[11px] font-medium mt-1.5 ${status === 'accepted' ? 'text-primary' : 'text-muted'}`}>
              {status === 'accepted' ? '✓ Accepté' : '✗ Refusé'}
            </p>
          )}
        </div>
      </div>
    </li>
  )
}

export default function NotificationBell({ notifications, unreadCount, onOpen, onAcceptShare, onDeclineShare, onDelete, onDeleteAll }) {
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
            fill={unreadCount > 0 ? 'rgb(var(--color-primary))' : 'rgb(var(--color-muted))'} />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-[18px] h-[18px] rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-[46px] right-0 z-50 w-[300px] bg-white rounded-[14px] shadow-xl border border-[#f0ebfa] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#f0ebfa] flex items-center justify-between">
            <p className="text-[13px] font-semibold text-dark">Notifications</p>
            {notifications.length > 0 && (
              <button onClick={onDeleteAll} className="text-[11px] text-accent hover:text-[#ef4444] transition-colors">
                Tout supprimer
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <div className="px-4 py-6 flex flex-col items-center gap-2">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 002 2zm6-6V11c0-3.07-1.64-5.64-4.5-6.32V4a1.5 1.5 0 00-3 0v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"
                  fill="#d0c9e8" />
              </svg>
              <p className="text-[13px] text-accent">Aucune notification pour le moment</p>
            </div>
          ) : (
            <ul className="max-h-[400px] overflow-y-auto divide-y divide-[#f0ebfa]">
              {notifications.map(n =>
                (n.type === 'collection_share_request' || n.type === 'calendar_share_request') ? (
                  <ShareRequestItem
                    key={n.id}
                    n={n}
                    onAccept={onAcceptShare}
                    onDecline={onDeclineShare}
                  />
                ) : (
                  <li key={n.id} className={`flex items-start gap-3 px-4 py-3 transition-colors ${n.read ? '' : 'bg-soft/60'}`}>
                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${n.read ? 'bg-transparent' : 'bg-primary'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-dark leading-snug">{n.message}</p>
                      <p className="text-[11px] text-accent mt-0.5">{fmtTime(n.created_at)}</p>
                    </div>
                    <button onClick={() => onDelete(n.id)} className="shrink-0 w-6 h-6 flex items-center justify-center opacity-30 hover:opacity-100 transition-opacity mt-0.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#ef4444">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                    </button>
                  </li>
                )
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
