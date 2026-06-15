import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
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
      {/* Toolbox / briefcase icon */}
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2"/>
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
        <line x1="12" y1="12" x2="12" y2="12"/>
        <path d="M2 12h20"/>
        <path d="M8 12v2"/>
        <path d="M16 12v2"/>
      </svg>
    </div>
  )
}

function passwordStrength(pwd) {
  let score = 0
  if (pwd.length >= 8) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  return score
}

const STRENGTH_COLORS = ['#ef4444', '#f97316', '#22c55e']
const STRENGTH_LABELS = ['Faible', 'Moyen', 'Fort']

export default function Login() {
  const [mode, setMode] = useState('login')

  // login fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)

  // register fields
  const [pseudo, setPseudo] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPwd, setRegPwd] = useState('')
  const [showRegPwd, setShowRegPwd] = useState(false)
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [cgu, setCgu] = useState(false)

  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(false)

  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname ?? '/'

  const strength = passwordStrength(regPwd)

  const switchMode = (m) => {
    setMode(m)
    setError(null)
    setInfo(null)
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) { setError(error.message); setLoading(false); return }
    navigate(from, { replace: true })
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError(null)
    if (regPwd !== confirmPwd) { setError('Les mots de passe ne correspondent pas.'); return }
    if (!cgu) { setError('Tu dois accepter les CGU.'); return }
    setLoading(true)
    const { error } = await signUp(regEmail, regPwd, { pseudo, firstName, lastName })
    if (error) { setError(error.message); setLoading(false); return }
    setInfo('Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse.')
    setLoading(false)
  }

  const handleForgot = async () => {
    if (!email) { setError('Entre ton adresse email d\'abord.'); return }
    setLoading(true)
    const redirectTo = window.location.origin + import.meta.env.BASE_URL + 'reset-password'
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) { setError(error.message) } else { setInfo('Email de réinitialisation envoyé !') }
    setLoading(false)
  }

  const inputCls = 'w-full h-12 px-4 bg-white border border-[#e8e2f5] rounded-[10px] text-[#211738] placeholder-[#a49ffe] text-sm outline-none focus:border-[#6c63ff] transition-colors'
  const labelCls = 'block text-[#6c63ff] text-xs font-medium mb-1'

  return (
    <main className="min-h-dvh relative overflow-hidden bg-[#f6f4f9] flex flex-col items-center justify-center px-4 py-10">
      {/* Blobs */}
      <div className="absolute rounded-full blur-3xl opacity-30 pointer-events-none" style={{ width: 300, height: 300, background: '#c4b5fd', top: -60, left: -60 }} />
      <div className="absolute rounded-full blur-3xl opacity-25 pointer-events-none" style={{ width: 280, height: 280, background: '#fde68a', bottom: 0, right: -40 }} />
      <div className="absolute rounded-full blur-3xl opacity-20 pointer-events-none" style={{ width: 250, height: 250, background: '#6ee7b7', bottom: 80, left: -30 }} />
      <div className="absolute rounded-full blur-3xl opacity-20 pointer-events-none" style={{ width: 200, height: 200, background: '#a5b4fc', top: 100, right: 20 }} />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <LogoIcon />
          <h1 className="mt-3 text-[28px] font-bold text-[#211738]">HadeTools</h1>
          <p className="text-sm text-[#736694] mt-0.5">
            {mode === 'login' ? 'Connexion à ton compte' : 'Création de ton compte'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/75 backdrop-blur-md rounded-[20px] shadow-sm border border-white/60 p-6">
          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              <div>
                <label className={labelCls}>Adresse email</label>
                <input type="email" autoComplete="email" required className={inputCls} placeholder="alex@exemple.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>

              <div>
                <label className={labelCls}>Mot de passe</label>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} autoComplete="current-password" required className={inputCls + ' pr-12'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                  <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a49ffe]">
                    <EyeIcon open={showPwd} />
                  </button>
                </div>
              </div>

              <div className="text-right">
                <button type="button" onClick={handleForgot} className="text-xs text-[#6c63ff] font-medium">Mot de passe oublié ?</button>
              </div>

              {error && <p className="text-xs text-red-600 bg-red-50 rounded-[8px] px-3 py-2">{error}</p>}
              {info && <p className="text-xs text-green-700 bg-green-50 rounded-[8px] px-3 py-2">{info}</p>}

              <button type="submit" disabled={loading} className="w-full h-12 bg-[#6c63ff] text-white font-semibold rounded-[12px] disabled:opacity-60 transition-opacity">
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4" noValidate>
              <div>
                <label className={labelCls}>Pseudo</label>
                <input type="text" autoComplete="username" required className={inputCls} placeholder="Ton pseudo" value={pseudo} onChange={e => setPseudo(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Prénom</label>
                  <input type="text" autoComplete="given-name" required className={inputCls} placeholder="Alex" value={firstName} onChange={e => setFirstName(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Nom</label>
                  <input type="text" autoComplete="family-name" required className={inputCls} placeholder="Martin" value={lastName} onChange={e => setLastName(e.target.value)} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Adresse email</label>
                <input type="email" autoComplete="email" required className={inputCls} placeholder="ton@email.com" value={regEmail} onChange={e => setRegEmail(e.target.value)} />
              </div>

              <div>
                <label className={labelCls}>Mot de passe</label>
                <div className="relative">
                  <input type={showRegPwd ? 'text' : 'password'} autoComplete="new-password" required className={inputCls + ' pr-12'} placeholder="••••••••" value={regPwd} onChange={e => setRegPwd(e.target.value)} />
                  <button type="button" onClick={() => setShowRegPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a49ffe]">
                    <EyeIcon open={showRegPwd} />
                  </button>
                </div>
                {regPwd.length > 0 && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="flex-1 h-1 rounded-full transition-colors" style={{ background: i < strength ? STRENGTH_COLORS[strength - 1] : '#e8e2f5' }} />
                      ))}
                    </div>
                    <p className="text-xs font-medium" style={{ color: strength > 0 ? STRENGTH_COLORS[strength - 1] : '#736694' }}>
                      Mot de passe {STRENGTH_LABELS[strength - 1] ?? 'trop court'} {strength === 3 ? '✓' : ''}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className={labelCls}>Confirmer le mot de passe</label>
                <div className="relative">
                  <input type={showConfirm ? 'text' : 'password'} autoComplete="new-password" required className={inputCls + ' pr-12'} placeholder="••••••••" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} />
                  <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a49ffe]">
                    <EyeIcon open={showConfirm} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div
                  onClick={() => setCgu(v => !v)}
                  style={{
                    width: 20, height: 20, minWidth: 20, borderRadius: 5,
                    background: cgu ? '#6c63ff' : 'white',
                    border: cgu ? '2px solid #6c63ff' : '2px solid #c4b5fd',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s', flexShrink: 0, cursor: 'pointer',
                  }}
                >
                  {cgu && (
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                      <polyline points="1.5,5.5 4.5,8.5 9.5,2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span onClick={() => setCgu(v => !v)} className="text-xs text-[#736694] leading-snug cursor-pointer select-none">
                  J'accepte les CGU et la politique de confidentialité
                </span>
              </div>

              {error && <p className="text-xs text-red-600 bg-red-50 rounded-[8px] px-3 py-2">{error}</p>}
              {info && <p className="text-xs text-green-700 bg-green-50 rounded-[8px] px-3 py-2">{info}</p>}

              <button type="submit" disabled={loading} className="w-full h-12 bg-[#6c63ff] text-white font-semibold rounded-[12px] disabled:opacity-60 transition-opacity">
                {loading ? 'Création...' : 'Créer mon compte'}
              </button>
            </form>
          )}
        </div>

        {/* Switch mode */}
        <div className="mt-5 text-center">
          {mode === 'login' ? (
            <>
              <p className="text-sm text-[#736694] mb-3">Pas encore de compte ?</p>
              <button onClick={() => switchMode('register')} className="w-full h-12 border border-[#6c63ff] text-[#6c63ff] font-semibold rounded-[12px] bg-white/60 backdrop-blur-sm">
                S'inscrire
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-[#736694] mb-3">Déjà un compte HadeTools ?</p>
              <button onClick={() => switchMode('login')} className="w-full h-12 border border-[#6c63ff] text-[#6c63ff] font-semibold rounded-[12px] bg-white/60 backdrop-blur-sm">
                Se connecter
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
