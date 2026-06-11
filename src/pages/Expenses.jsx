import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { supabase } from '../lib/supabase'

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(n) {
  return Number(n).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

function remainingAmount(expense) {
  const paid = (expense.reimbursements || []).reduce((s, r) => s + Number(r.amount), 0)
  return Math.max(0, Number(expense.amount) - paid)
}

function statusLabel(expense) {
  const rem = remainingAmount(expense)
  if (rem === 0) return { label: 'Soldé', color: '#22c55e', bg: '#f0fdf4' }
  if (rem < Number(expense.amount)) return { label: 'Partiel', color: '#f59e0b', bg: '#fffbeb' }
  return { label: 'En attente', color: '#6c63ff', bg: '#f2edfa' }
}

// ─── Modal nouvelle dépense ──────────────────────────────────────────────────

function NewExpenseModal({ currentUserId, onClose, onSaved }) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [payerIsMe, setPayerIsMe] = useState(true)
  const [otherUserId, setOtherUserId] = useState('')
  const [users, setUsers] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, first_name, last_name, display_name')
      .neq('id', currentUserId)
      .then(({ data }) => {
        if (data) setUsers(data)
        if (data?.length) setOtherUserId(data[0].id)
      })
  }, [currentUserId])

  const profileName = (p) =>
    p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : p.display_name ?? p.id

  const handleSave = async () => {
    if (!amount || !description || !otherUserId) return
    setSaving(true)
    setError(null)
    const payerId = payerIsMe ? currentUserId : otherUserId
    const debtorId = payerIsMe ? otherUserId : currentUserId
    const { error: err } = await supabase.from('expenses').insert({
      created_by: currentUserId,
      payer_id: payerId,
      debtor_id: debtorId,
      amount: parseFloat(amount),
      description,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-[rgba(33,23,56,0.35)]" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-[24px] p-6 pb-10 flex flex-col gap-5">
        <div className="w-10 h-1 bg-[#e2ddf0] rounded-full mx-auto -mt-1" />
        <h2 className="text-[17px] font-bold text-[#211738]">Nouvelle dépense</h2>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-[12px] font-semibold text-[#736694] uppercase tracking-wide">Montant (€)</label>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="mt-1 w-full h-[46px] px-4 rounded-[12px] border border-[#e2ddf0] text-[15px] text-[#211738] focus:outline-none focus:border-[#6c63ff]"
            />
          </div>

          <div>
            <label className="text-[12px] font-semibold text-[#736694] uppercase tracking-wide">Description</label>
            <input
              type="text"
              placeholder="Ex : Resto, courses…"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="mt-1 w-full h-[46px] px-4 rounded-[12px] border border-[#e2ddf0] text-[15px] text-[#211738] focus:outline-none focus:border-[#6c63ff]"
            />
          </div>

          <div>
            <label className="text-[12px] font-semibold text-[#736694] uppercase tracking-wide">Autre personne</label>
            <select
              value={otherUserId}
              onChange={e => setOtherUserId(e.target.value)}
              className="mt-1 w-full h-[46px] px-4 rounded-[12px] border border-[#e2ddf0] text-[15px] text-[#211738] focus:outline-none focus:border-[#6c63ff] bg-white"
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>{profileName(u)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[12px] font-semibold text-[#736694] uppercase tracking-wide">Qui a payé ?</label>
            <div className="mt-1 flex rounded-[12px] border border-[#e2ddf0] overflow-hidden">
              <button
                onClick={() => setPayerIsMe(true)}
                className={`flex-1 h-[42px] text-[13px] font-semibold transition-colors ${
                  payerIsMe ? 'bg-[#6c63ff] text-white' : 'bg-white text-[#736694]'
                }`}
              >
                Moi
              </button>
              <button
                onClick={() => setPayerIsMe(false)}
                className={`flex-1 h-[42px] text-[13px] font-semibold transition-colors ${
                  !payerIsMe ? 'bg-[#6c63ff] text-white' : 'bg-white text-[#736694]'
                }`}
              >
                L'autre
              </button>
            </div>
          </div>
        </div>

        {error && <p className="text-[12px] text-red-500">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving || !amount || !description || !otherUserId}
          className="w-full h-[50px] bg-[#6c63ff] rounded-[14px] text-white font-bold text-[15px] disabled:opacity-40"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}

// ─── Modal remboursement ─────────────────────────────────────────────────────

function ReimburseModal({ expense, currentUserId, onClose, onSaved }) {
  const remaining = remainingAmount(expense)
  const [amount, setAmount] = useState(remaining.toFixed(2))
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSave = async () => {
    const val = parseFloat(amount)
    if (!val || val <= 0 || val > remaining) return
    setSaving(true)
    setError(null)
    const { error: err } = await supabase.from('reimbursements').insert({
      expense_id: expense.id,
      reimbursed_by: currentUserId,
      amount: val,
      note: note || null,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-[rgba(33,23,56,0.35)]" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-[24px] p-6 pb-10 flex flex-col gap-5">
        <div className="w-10 h-1 bg-[#e2ddf0] rounded-full mx-auto -mt-1" />
        <h2 className="text-[17px] font-bold text-[#211738]">Rembourser</h2>
        <p className="text-[13px] text-[#736694] -mt-3">
          Reste à rembourser : <strong className="text-[#211738]">{fmt(remaining)}</strong>
        </p>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-[12px] font-semibold text-[#736694] uppercase tracking-wide">Montant (€)</label>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="mt-1 w-full h-[46px] px-4 rounded-[12px] border border-[#e2ddf0] text-[15px] text-[#211738] focus:outline-none focus:border-[#6c63ff]"
            />
          </div>
          <div>
            <label className="text-[12px] font-semibold text-[#736694] uppercase tracking-wide">Note (optionnel)</label>
            <input
              type="text"
              placeholder="Ex : Virement du 10 juin"
              value={note}
              onChange={e => setNote(e.target.value)}
              className="mt-1 w-full h-[46px] px-4 rounded-[12px] border border-[#e2ddf0] text-[15px] text-[#211738] focus:outline-none focus:border-[#6c63ff]"
            />
          </div>
        </div>

        {error && <p className="text-[12px] text-red-500">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving || !amount || parseFloat(amount) <= 0}
          className="w-full h-[50px] bg-[#6c63ff] rounded-[14px] text-white font-bold text-[15px] disabled:opacity-40"
        >
          {saving ? 'Enregistrement…' : 'Valider le remboursement'}
        </button>
      </div>
    </div>
  )
}

// ─── Carte dépense ───────────────────────────────────────────────────────────

function ExpenseCard({ expense, currentUserId, profiles, onReimburse }) {
  const [open, setOpen] = useState(false)
  const status = statusLabel(expense)
  const remaining = remainingAmount(expense)

  const profileName = (id) => {
    const p = profiles[id]
    if (!p) return id
    return p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : p.display_name ?? id
  }

  const iAmPayer = expense.payer_id === currentUserId
  const otherLabel = iAmPayer ? profileName(expense.debtor_id) : profileName(expense.payer_id)
  const canReimburse = remaining > 0

  return (
    <div className="bg-white/70 border border-white/85 backdrop-blur-sm rounded-[16px] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-[#211738] truncate">{expense.description}</p>
          <p className="text-[12px] text-[#736694] mt-0.5">{otherLabel}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[15px] font-bold text-[#211738]">{fmt(expense.amount)}</span>
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ color: status.color, background: status.bg }}
          >
            {status.label}
          </span>
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          className={`shrink-0 text-[#736694] transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-3 border-t border-[#f0ebfa]">
          {/* Remboursements */}
          {expense.reimbursements?.length > 0 && (
            <div className="flex flex-col gap-2 pt-3">
              <p className="text-[11px] font-semibold text-[#736694] uppercase tracking-wide">Remboursements</p>
              {expense.reimbursements.map(r => (
                <div key={r.id} className="flex justify-between items-center">
                  <div>
                    <p className="text-[13px] text-[#211738]">{profileName(r.reimbursed_by)}</p>
                    {r.note && <p className="text-[11px] text-[#736694]">{r.note}</p>}
                  </div>
                  <span className="text-[13px] font-semibold text-[#22c55e]">+{fmt(r.amount)}</span>
                </div>
              ))}
            </div>
          )}

          {remaining > 0 && (
            <div className="flex justify-between items-center pt-1">
              <span className="text-[12px] text-[#736694]">Reste</span>
              <span className="text-[13px] font-bold text-[#f59e0b]">{fmt(remaining)}</span>
            </div>
          )}

          {canReimburse && (
            <button
              onClick={() => onReimburse(expense)}
              className="w-full h-[42px] bg-[#6c63ff] rounded-[12px] text-white text-[13px] font-bold mt-1"
            >
              Rembourser
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function Expenses() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [tab, setTab] = useState('owed') // 'owed' = on me doit | 'due' = je dois
  const [expenses, setExpenses] = useState([])
  const [profiles, setProfiles] = useState({})
  const [showNew, setShowNew] = useState(false)
  const [reimbursing, setReimbursing] = useState(null)
  const [loading, setLoading] = useState(true)

  const { user, signOut } = useAuth()
  const profile = useProfile(user)
  const navigate = useNavigate()

  const firstName = profile?.first_name ?? ''
  const lastName = profile?.last_name ?? ''
  const displayName = profile?.display_name ?? user?.email ?? ''
  const initials = firstName && lastName
    ? `${firstName[0]}${lastName[0]}`.toUpperCase()
    : displayName?.slice(0, 2).toUpperCase() ?? '??'

  const fetchExpenses = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('expenses')
      .select('*, reimbursements(*)')
      .or(`payer_id.eq.${user.id},debtor_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
    setExpenses(data ?? [])
    setLoading(false)

    // Collect all user ids to resolve names
    const ids = new Set()
    ;(data ?? []).forEach(e => {
      ids.add(e.payer_id)
      ids.add(e.debtor_id)
      ;(e.reimbursements ?? []).forEach(r => ids.add(r.reimbursed_by))
    })
    if (ids.size) {
      const { data: ps } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, display_name')
        .in('id', [...ids])
      if (ps) {
        const map = {}
        ps.forEach(p => { map[p.id] = p })
        setProfiles(map)
      }
    }
  }, [user])

  const { loading: authLoading } = useAuth()

  useEffect(() => {
    if (authLoading) return
    if (!user) { navigate('/login'); return }
    fetchExpenses()
  }, [user, authLoading, fetchExpenses])

  const handleSignOut = async () => { await signOut(); navigate('/login') }

  const owed = expenses.filter(e => e.payer_id === user?.id)
  const due = expenses.filter(e => e.debtor_id === user?.id)
  const list = tab === 'owed' ? owed : due

  const totalOwed = owed.reduce((s, e) => s + remainingAmount(e), 0)
  const totalDue = due.reduce((s, e) => s + remainingAmount(e), 0)

  return (
    <div className="relative w-full h-dvh overflow-hidden bg-[#f6f4f9]">

      {/* Blobs */}
      <div className="absolute -left-16 -top-4 w-72 h-72 rounded-full bg-[#c4b5fd] opacity-30 blur-3xl pointer-events-none" />
      <div className="absolute left-32 top-14 w-64 h-64 rounded-full bg-[#a5f3fc] opacity-25 blur-3xl pointer-events-none" />
      <div className="absolute -left-8 top-52 w-60 h-60 rounded-full bg-[#bbf7d0] opacity-20 blur-3xl pointer-events-none" />
      <div className="absolute left-40 top-[460px] w-64 h-64 rounded-full bg-[#fed7aa] opacity-25 blur-3xl pointer-events-none" />

      {/* TopBar */}
      <header className="absolute top-0 left-0 right-0 h-[76px] bg-white/55 border-b border-white/80 backdrop-blur-md z-20 flex items-center justify-between px-4">
        <button
          onClick={() => setMenuOpen(true)}
          className="flex flex-col gap-[5px] p-2 min-w-[44px] min-h-[44px] justify-center"
          aria-label="Ouvrir le menu"
        >
          <span className="block w-[22px] h-[2.5px] rounded-sm bg-[rgba(33,23,56,0.75)]" />
          <span className="block w-[22px] h-[2.5px] rounded-sm bg-[rgba(33,23,56,0.75)]" />
          <span className="block w-[22px] h-[2.5px] rounded-sm bg-[rgba(33,23,56,0.75)]" />
        </button>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-[17px] font-semibold text-[#211738]">Dépenses</h1>
      </header>

      {/* Contenu principal */}
      <main className="absolute top-[76px] left-0 right-0 bottom-0 flex flex-col overflow-hidden">

        {/* Résumé soldes */}
        <div className="flex gap-3 px-4 pt-4 pb-3">
          <div className="flex-1 bg-white/60 border border-white/85 backdrop-blur-sm rounded-[16px] p-4">
            <p className="text-[11px] font-semibold text-[#736694] uppercase tracking-wide">On me doit</p>
            <p className="text-[20px] font-bold text-[#6c63ff] mt-1">{fmt(totalOwed)}</p>
          </div>
          <div className="flex-1 bg-white/60 border border-white/85 backdrop-blur-sm rounded-[16px] p-4">
            <p className="text-[11px] font-semibold text-[#736694] uppercase tracking-wide">Je dois</p>
            <p className="text-[20px] font-bold text-[#f59e0b] mt-1">{fmt(totalDue)}</p>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex mx-4 mb-3 bg-white/50 border border-white/80 rounded-[14px] p-1 gap-1">
          <button
            onClick={() => setTab('owed')}
            className={`flex-1 h-[38px] rounded-[10px] text-[13px] font-semibold transition-colors ${
              tab === 'owed' ? 'bg-[#6c63ff] text-white' : 'text-[#736694]'
            }`}
          >
            On me doit ({owed.length})
          </button>
          <button
            onClick={() => setTab('due')}
            className={`flex-1 h-[38px] rounded-[10px] text-[13px] font-semibold transition-colors ${
              tab === 'due' ? 'bg-[#6c63ff] text-white' : 'text-[#736694]'
            }`}
          >
            Je dois ({due.length})
          </button>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto px-4 pb-24 flex flex-col gap-3">
          {loading && (
            <p className="text-center text-[13px] text-[#736694] mt-8">Chargement…</p>
          )}
          {!loading && list.length === 0 && (
            <p className="text-center text-[13px] text-[#736694] mt-8">Aucune dépense pour l'instant</p>
          )}
          {list.map(e => (
            <ExpenseCard
              key={e.id}
              expense={e}
              currentUserId={user.id}
              profiles={profiles}
              onReimburse={setReimbursing}
            />
          ))}
        </div>
      </main>

      {/* FAB */}
      <button
        onClick={() => setShowNew(true)}
        className="absolute bottom-6 right-5 w-[56px] h-[56px] bg-[#6c63ff] rounded-[18px] flex items-center justify-center shadow-lg z-10"
        aria-label="Nouvelle dépense"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* Overlay menu */}
      <div
        onClick={() => setMenuOpen(false)}
        className={`absolute inset-0 bg-[rgba(33,23,56,0.18)] z-30 transition-opacity duration-300 ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer */}
      <nav
        className={`absolute top-0 left-0 h-full w-[280px] z-40 bg-[#f6f4f9] transition-transform duration-300 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="absolute -left-16 -top-4 w-72 h-72 rounded-full bg-[#c4b5fd] opacity-30 blur-3xl pointer-events-none" />
        <div className="absolute left-32 top-14 w-64 h-64 rounded-full bg-[#a5f3fc] opacity-20 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-white/72 border-r border-white/85 backdrop-blur-md flex flex-col">
          <div className="flex items-center gap-4 px-6 pt-16 pb-5">
            <div className="w-[52px] h-[52px] rounded-[26px] bg-[#6c63ff] flex items-center justify-center shrink-0">
              <span className="text-white text-[20px] font-bold">{initials}</span>
            </div>
            <div>
              <p className="text-[15px] font-bold text-[#211738] leading-tight">{firstName} {lastName}</p>
              <p className="text-[12px] text-[#736694] leading-tight">{displayName}</p>
            </div>
          </div>
          <div className="mx-6 h-px bg-[rgba(153,153,166,0.25)]" />
          <div className="flex flex-col gap-1 px-4 pt-4">
            <Link to="/" className="flex items-center gap-3 w-full h-[52px] px-3 rounded-[12px]">
              <div className="w-7 h-7 bg-[#f2edfa] rounded-[8px] flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke="#736694" strokeWidth="2" strokeLinejoin="round" />
                  <path d="M9 21V12h6v9" stroke="#736694" strokeWidth="2" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-[14px] text-[rgba(115,102,148,0.85)] flex-1 text-left">Home</span>
            </Link>
            <Link to="/checklist" className="flex items-center gap-3 w-full h-[52px] px-3 rounded-[12px]">
              <div className="w-7 h-7 bg-[#f2edfa] rounded-[8px] flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="#736694" strokeWidth="2" />
                  <path d="M7 12l3 3 7-7" stroke="#736694" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-[14px] text-[rgba(115,102,148,0.85)] flex-1 text-left">Worklist</span>
            </Link>
            <button
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 w-full h-[52px] px-3 bg-[#f2edfa] rounded-[12px]"
            >
              <div className="w-7 h-7 bg-[#6c63ff] rounded-[8px] flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="white" strokeWidth="2" />
                  <path d="M12 8v4l3 3" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <span className="text-[14px] font-semibold text-[#6c63ff] flex-1 text-left">Dépenses</span>
              <span className="w-2 h-2 rounded-full bg-[#6c63ff]" />
            </button>
          </div>
          <div className="flex-1" />
          <div className="px-4 pb-10">
            <button
              onClick={handleSignOut}
              className="flex items-center justify-center gap-2 w-full h-[46px] border border-[#736694] rounded-[8px]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="#736694" strokeWidth="2" strokeLinecap="round" />
                <polyline points="16 17 21 12 16 7" stroke="#736694" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="21" y1="12" x2="9" y2="12" stroke="#736694" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="text-[12px] font-semibold text-[#736694]">Se déconnecter</span>
            </button>
            <p className="text-center text-[11px] text-[rgba(115,102,148,0.35)] mt-3">HadeTools v0.1</p>
          </div>
        </div>
      </nav>

      {/* Modals */}
      {showNew && (
        <NewExpenseModal
          currentUserId={user.id}
          onClose={() => setShowNew(false)}
          onSaved={fetchExpenses}
        />
      )}
      {reimbursing && (
        <ReimburseModal
          expense={reimbursing}
          currentUserId={user.id}
          onClose={() => setReimbursing(null)}
          onSaved={fetchExpenses}
        />
      )}
    </div>
  )
}
