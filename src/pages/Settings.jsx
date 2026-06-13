import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import AppHeader from '../components/AppHeader'
import { useTheme, THEMES } from '../contexts/ThemeContext'
import { LeafSmall, LeafBig, Flower, Mushroom } from '../components/CottageDecor'

export default function Settings() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const isCottagecore = theme === 'cottagecore'

  useEffect(() => {
    if (!loading && !user) navigate('/login')
  }, [user, loading])

  return (
    <div className="relative w-full h-dvh overflow-hidden bg-base">

      <div className="absolute -left-16 -top-4 w-72 h-72 rounded-full bg-[#c4b5fd] opacity-30 blur-3xl pointer-events-none" />
      <div className="absolute left-32 top-14 w-64 h-64 rounded-full bg-[#a5f3fc] opacity-25 blur-3xl pointer-events-none" />
      <div className="absolute -left-8 top-52 w-60 h-60 rounded-full bg-[#bbf7d0] opacity-20 blur-3xl pointer-events-none" />
      <div className="absolute left-40 top-[460px] w-64 h-64 rounded-full bg-[#fed7aa] opacity-25 blur-3xl pointer-events-none" />

      <AppHeader title="Paramètres" />

      <main className="absolute top-[92px] left-4 right-4 bottom-4 overflow-y-auto">
        <div className={`bg-white/55 border backdrop-blur-md rounded-[20px] p-5 relative ${isCottagecore ? 'cc-border' : 'border-white/85'}`}>
          {isCottagecore && <>
            {/* haut */}
            <LeafBig   width={28} rotate={-30} style={{ position:'absolute', left:-10,  top:-12,    zIndex:10, pointerEvents:'none' }} />
            <Flower    width={18} rotate={20}  style={{ position:'absolute', left:'38%',top:-10,    zIndex:10, pointerEvents:'none' }} />
            <LeafSmall width={14} rotate={-50} style={{ position:'absolute', right:-6,  top:-8,     zIndex:10, pointerEvents:'none' }} />
            {/* côté gauche */}
            <Mushroom  width={24} rotate={15}  style={{ position:'absolute', left:-10,  top:'30%',  zIndex:10, pointerEvents:'none' }} />
            <LeafSmall width={14} rotate={-40} style={{ position:'absolute', left:-6,   top:'60%',  zIndex:10, pointerEvents:'none' }} />
            {/* côté droit */}
            <Flower    width={18} rotate={-25} style={{ position:'absolute', right:-8,  top:'25%',  zIndex:10, pointerEvents:'none' }} />
            <LeafBig   width={22} rotate={35}  style={{ position:'absolute', right:-9,  top:'55%',  zIndex:10, pointerEvents:'none' }} />
            {/* bas */}
            <Mushroom  width={20} rotate={-10} style={{ position:'absolute', left:-8,   bottom:-10, zIndex:10, pointerEvents:'none' }} />
            <LeafSmall width={16} rotate={60}  style={{ position:'absolute', left:'40%',bottom:-8,  zIndex:10, pointerEvents:'none' }} />
            <Flower    width={18} rotate={-40} style={{ position:'absolute', right:-8,  bottom:-9,  zIndex:10, pointerEvents:'none' }} />
          </>}
          <p className="text-[13px] font-semibold text-muted uppercase tracking-wider mb-4">Thème</p>

          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
            {THEMES.map(t => {
              const active = theme === t.id
              return (
                <div
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`relative rounded-[12px] overflow-hidden cursor-pointer transition-all border-2 shrink-0 w-[110px] ${
                    active ? 'border-primary shadow-md' : 'border-transparent'
                  }`}
                >
                  {/* Preview */}
                  <div
                    className="h-[68px] flex flex-col justify-between p-2.5"
                    style={{ backgroundColor: `rgb(${t.preview} / 0.1)` }}
                  >
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: `rgb(${t.preview})` }} />
                      <div className="h-1.5 rounded-full flex-1" style={{ backgroundColor: `rgb(${t.preview} / 0.3)` }} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="h-1.5 rounded-full w-3/4" style={{ backgroundColor: `rgb(${t.preview} / 0.25)` }} />
                      <div className="h-1.5 rounded-full w-1/2" style={{ backgroundColor: `rgb(${t.preview} / 0.15)` }} />
                    </div>
                    <div className="h-4 rounded-[5px] flex items-center justify-center" style={{ backgroundColor: `rgb(${t.preview})` }}>
                      <div className="w-6 h-1 rounded-full bg-white/60" />
                    </div>
                  </div>

                  {/* Label */}
                  <div className="px-2.5 py-1.5 flex items-center justify-between bg-white">
                    <span className="text-[12px] font-semibold" style={{ color: `rgb(${t.preview})` }}>
                      {t.label}
                    </span>
                    {active && (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" fill={`rgb(${t.preview})`} />
                        <path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
