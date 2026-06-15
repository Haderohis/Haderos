import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function EyeIcon({ open }) {
  return open ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

function LogoIcon() {
  return (
    <div style={{ width: 56, height: 56, background: '#6c63ff', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2"/>
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
        <path d="M2 12h20"/>
        <path d="M8 12v2"/>
        <path d="M16 12v2"/>
      </svg>
    </div>
  )
}

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const inputCls = 'w-full h-12 px-4 bg-white border border-[#e8e2f5] rounded-[10px] text-[#211738] placeholder-[#a49ffe] text-sm outline-none focus:border-[#6c63ff] transition-colors'
  const labelCls = 'block text-[#6c63ff] text-xs font-medium mb-1'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    if (password.length < 6) { setError('Le mot de passe doit faire au moins 6 caractères.'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    navigate('/login', { replace: true })
  }

  return (
    <main className="min-h-dvh relative overflow-hidden bg-[#f6f4f9] flex flex-col items-center justify-center px-4 py-10">
      {/* Blobs */}
      <div className="absolute rounded-full blur-3xl opacity-30 pointer-events-none" style={{ width: 300, height: 300, background: '#c4b5fd', top: -60, left: -60 }} />
      <div className="absolute rounded-full blur-3xl opacity-25 pointer-events-none" style={{ width: 280, height: 280, background: '#fde68a', bottom: 0, right: -40 }} />
      <div className="absolute rounded-full blur-3xl opacity-20 pointer-events-none" style={{ width: 250, height: 250, background: '#6ee7b7', bottom: 80, left: -30 }} />
      <div className="absolute rounded-full blur-3xl opacity-20 pointer-events-none" style={{ width: 200, height: 200, background: '#a5b4fc', top: 100, right: 20 }} />

      <div className="relative z-10 w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <LogoIcon />
          <h1 className="mt-3 text-[28px] font-bold text-[#211738]">HadeTools</h1>
          <p className="text-sm text-[#736694] mt-0.5">Nouveau mot de passe</p>
        </div>

        <div className="bg-white/75 backdrop-blur-md rounded-[20px] shadow-sm border border-white/60 p-6">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className={labelCls}>Nouveau mot de passe</label>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} autoComplete="new-password" required className={inputCls + ' pr-12'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a49ffe]">
                  <EyeIcon open={showPwd} />
                </button>
              </div>
            </div>

            <div>
              <label className={labelCls}>Confirmer le mot de passe</label>
              <div className="relative">
                <input type={showConfirm ? 'text' : 'password'} autoComplete="new-password" required className={inputCls + ' pr-12'} placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)} />
                <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a49ffe]">
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
            </div>

            {error && <p className="text-xs text-red-600 bg-red-50 rounded-[8px] px-3 py-2">{error}</p>}

            <button type="submit" disabled={loading} className="w-full h-12 bg-[#6c63ff] text-white font-semibold rounded-[12px] disabled:opacity-60 transition-opacity">
              {loading ? 'Enregistrement...' : 'Réinitialiser le mot de passe'}
            </button>
          </form>
        </div>

        <div className="mt-5 text-center">
          <button onClick={() => navigate('/login')} className="text-sm text-[#736694]">
            ← Retour à la connexion
          </button>
        </div>
      </div>
    </main>
  )
}
