import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import AppHeader from '../components/AppHeader'
import { useTheme } from '../contexts/ThemeContext'
import { LeafSmall, LeafBig, Flower, Mushroom } from '../components/CottageDecor'

export default function Home() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isCottagecore = theme === 'cottagecore'

  useEffect(() => {
    if (!loading && !user) navigate('/login')
  }, [user, loading])

  return (
    <div className="relative w-full h-dvh overflow-hidden bg-base">

      {/* Blobs décoratifs */}
      <div className="absolute -left-16 -top-4 w-72 h-72 rounded-full bg-[#c4b5fd] opacity-30 blur-3xl pointer-events-none" />
      <div className="absolute left-32 top-14 w-64 h-64 rounded-full bg-[#a5f3fc] opacity-25 blur-3xl pointer-events-none" />
      <div className="absolute -left-8 top-52 w-60 h-60 rounded-full bg-[#bbf7d0] opacity-20 blur-3xl pointer-events-none" />
      <div className="absolute left-40 top-[460px] w-64 h-64 rounded-full bg-[#fed7aa] opacity-25 blur-3xl pointer-events-none" />

      <AppHeader title="Toolbox" />

      {/* Décos cottagecore — positionnées par rapport au wrapper de page (relative) */}
      {isCottagecore && <>
        {/* bord haut de la card (top≈92px) */}
        <LeafBig   width={30} rotate={-25} style={{ position:'absolute', top:80,  left:4,    zIndex:20, pointerEvents:'none' }} />
        <Flower    width={20} rotate={-15} style={{ position:'absolute', top:80,  left:'40%',zIndex:20, pointerEvents:'none' }} />
        <LeafSmall width={14} rotate={-40} style={{ position:'absolute', top:84,  right:6,   zIndex:20, pointerEvents:'none' }} />
        {/* côté gauche */}
        <Mushroom  width={26} rotate={20}  style={{ position:'absolute', top:'35%', left:4,   zIndex:20, pointerEvents:'none' }} />
        <LeafSmall width={16} rotate={-55} style={{ position:'absolute', top:'50%', left:6,   zIndex:20, pointerEvents:'none' }} />
        <Flower    width={18} rotate={40}  style={{ position:'absolute', top:'65%', left:4,   zIndex:20, pointerEvents:'none' }} />
        {/* côté droit */}
        <LeafBig   width={26} rotate={30}  style={{ position:'absolute', top:'32%', right:4,  zIndex:20, pointerEvents:'none' }} />
        <Flower    width={18} rotate={-20} style={{ position:'absolute', top:'50%', right:6,  zIndex:20, pointerEvents:'none' }} />
        <LeafSmall width={15} rotate={70}  style={{ position:'absolute', top:'66%', right:4,  zIndex:20, pointerEvents:'none' }} />
        {/* bord bas de la card (bottom≈16px) */}
        <LeafSmall width={18} rotate={-60} style={{ position:'absolute', bottom:6,  left:4,    zIndex:20, pointerEvents:'none' }} />
        <LeafBig   width={24} rotate={15}  style={{ position:'absolute', bottom:4,  left:'42%',zIndex:20, pointerEvents:'none' }} />
        <Mushroom  width={20} rotate={-12} style={{ position:'absolute', bottom:6,  right:4,   zIndex:20, pointerEvents:'none' }} />
      </>}

      <main className={`absolute top-[92px] left-4 right-4 bottom-4 bg-white/55 border backdrop-blur-md rounded-[20px] flex flex-col items-center justify-center gap-2 ${isCottagecore ? 'cc-border' : 'border-white/85'}`}>
        <p className="text-[22px] font-bold text-dark/90">Bonne journée</p>
        <p className="text-[13px] text-muted text-center leading-snug">
          Ouvre le menu pour accéder<br />à tes outils
        </p>
      </main>
    </div>
  )
}
