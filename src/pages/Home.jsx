import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import AppHeader from '../components/AppHeader'

export default function Home() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) navigate('/login')
  }, [user, loading])

  return (
    <div className="relative w-full h-dvh overflow-hidden bg-[#f6f4f9]">

      {/* Blobs décoratifs */}
      <div className="absolute -left-16 -top-4 w-72 h-72 rounded-full bg-[#c4b5fd] opacity-30 blur-3xl pointer-events-none" />
      <div className="absolute left-32 top-14 w-64 h-64 rounded-full bg-[#a5f3fc] opacity-25 blur-3xl pointer-events-none" />
      <div className="absolute -left-8 top-52 w-60 h-60 rounded-full bg-[#bbf7d0] opacity-20 blur-3xl pointer-events-none" />
      <div className="absolute left-40 top-[460px] w-64 h-64 rounded-full bg-[#fed7aa] opacity-25 blur-3xl pointer-events-none" />

      <AppHeader title="Toolbox" />

      <main className="absolute top-[92px] left-4 right-4 bottom-4 bg-white/55 border border-white/85 backdrop-blur-md rounded-[20px] flex flex-col items-center justify-center gap-2">
        <p className="text-[22px] font-bold text-[rgba(33,23,56,0.9)]">Bonne journée</p>
        <p className="text-[13px] text-[#736694] text-center leading-snug">
          Ouvre le menu pour accéder<br />à tes outils
        </p>
      </main>
    </div>
  )
}
