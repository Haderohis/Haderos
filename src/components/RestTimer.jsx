import { useState, useEffect, useRef } from 'react'

const DEFAULT_SECONDS = 90

export default function RestTimer({ onClose }) {
  const [remaining, setRemaining] = useState(DEFAULT_SECONDS)
  const intervalRef = useRef(null)

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const beep = (freq, start, duration) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = freq
        osc.type = 'sine'
        gain.gain.setValueAtTime(0.3, ctx.currentTime + start)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration)
        osc.start(ctx.currentTime + start)
        osc.stop(ctx.currentTime + start + duration)
      }
      beep(880, 0, 0.15)
      beep(880, 0.2, 0.15)
      beep(1100, 0.4, 0.3)
    } catch {}
  }

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          playBeep()
          setTimeout(onClose, 1200)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [])

  const mins = Math.floor(remaining / 60).toString().padStart(2, '0')
  const secs = (remaining % 60).toString().padStart(2, '0')

  const radius = 28
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - remaining / DEFAULT_SECONDS)

  return (
    <div className="fixed top-6 left-4 right-4 z-50">
      <div className="bg-[#211738]/90 backdrop-blur-md rounded-[16px] px-5 py-4 flex items-center gap-4 shadow-xl">
        <div className="relative w-[68px] h-[68px] shrink-0">
          <svg width="68" height="68" viewBox="0 0 68 68">
            <circle cx="34" cy="34" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
            <circle
              cx="34" cy="34" r={radius}
              fill="none"
              stroke="#6c63ff"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 34 34)"
              style={{ transition: 'stroke-dashoffset 0.8s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white text-[17px] font-bold tabular-nums">{mins}:{secs}</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white text-[14px] font-semibold">Récupération</p>
          <p className="text-white/60 text-[12px]">Série validée ✓</p>
        </div>

        <button
          onClick={onClose}
          className="px-4 h-9 bg-white/15 rounded-[8px] text-white text-[13px] font-semibold shrink-0"
        >
          Passer
        </button>
      </div>
    </div>
  )
}
