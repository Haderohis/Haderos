import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import Drawer from '../components/Drawer'
import BottomSheet from '../components/BottomSheet'
import { TextField, DateField, SelectField, SegmentedControl, SubmitButton } from '../components/FormFields'

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
  const [expenseDate, setExpenseDate] = useState('')
  const [payer, setPayer] = useState('me')
  const [otherUserId, setOtherUserId] = useState('')
  const [users, setUsers] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const canSave = description.trim() && amount && otherUserId

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
    if (!canSave) return
    setSaving(true)
    setError(null)
    const payerId = payer === 'me' ? currentUserId : otherUserId
    const debtorId = payer === 'me' ? otherUserId : currentUserId
    const { error: err } = await supabase.from('expenses').insert({
      created_by: currentUserId,
      payer_id: payerId,
      debtor_id: debtorId,
      amount: parseFloat(amount),
      description,
      expense_date: expenseDate || null,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
    onClose()
  }

  return (
    <BottomSheet onClose={onClose}>
      <p className="text-[17px] font-semibold text-[#211738]">Nouvelle dépense</p>
      <TextField label="Description" required autoFocus value={description}
        onChange={e => setDescription(e.target.value)} placeholder="Ex : Resto, courses…" />
      <TextField label="Montant (€)" required type="number" inputMode="decimal" value={amount}
        onChange={e => setAmount(e.target.value)} placeholder="0.00" />
      <DateField label="Date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} />
      <SelectField label="Autre personne" required value={otherUserId} onChange={e => setOtherUserId(e.target.value)}>
        {users.map(u => <option key={u.id} value={u.id}>{profileName(u)}</option>)}
      </SelectField>
      <SegmentedControl
        label="Qui a payé ?"
        value={payer}
        onChange={setPayer}
        options={[{ value: 'me', label: 'Moi' }, { value: 'other', label: "L'autre" }]}
      />
      {error && <p className="text-[12px] text-red-500">{error}</p>}
      <SubmitButton onClick={handleSave} disabled={!canSave || saving}>
        {saving ? 'Enregistrement…' : 'Ajouter'}
      </SubmitButton>
    </BottomSheet>
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

  const canSave = amount && parseFloat(amount) > 0 && parseFloat(amount) <= remaining

  return (
    <BottomSheet onClose={onClose}>
      <p className="text-[17px] font-semibold text-[#211738]">Rembourser</p>
      <p className="text-[13px] text-[#736694] -mt-2">
        Reste à rembourser : <strong className="text-[#211738]">{fmt(remaining)}</strong>
      </p>
      <TextField label="Montant (€)" required type="number" inputMode="decimal" value={amount}
        onChange={e => setAmount(e.target.value)} placeholder="0.00" />
      <TextField label="Note" value={note} onChange={e => setNote(e.target.value)}
        placeholder="Ex : Virement du 10 juin" />
      {error && <p className="text-[12px] text-red-500">{error}</p>}
      <SubmitButton onClick={handleSave} disabled={!canSave || saving}>
        {saving ? 'Enregistrement…' : 'Valider le remboursement'}
      </SubmitButton>
    </BottomSheet>
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
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState(null) // null | 'owed' | 'due'
  const [expenses, setExpenses] = useState([])
  const [profiles, setProfiles] = useState({})
  const [showNew, setShowNew] = useState(false)
  const [reimbursing, setReimbursing] = useState(null)
  const [loading, setLoading] = useState(true)

  const { user } = useAuth()
  const { loading: authLoading } = useAuth()
  const navigate = useNavigate()

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

  useEffect(() => {
    if (authLoading) return
    if (!user) { navigate('/login'); return }
    fetchExpenses()
  }, [user, authLoading, fetchExpenses])

  const owed = expenses.filter(e => e.payer_id === user?.id)
  const due = expenses.filter(e => e.debtor_id === user?.id)
  const totalOwed = owed.reduce((s, e) => s + remainingAmount(e), 0)
  const totalDue = due.reduce((s, e) => s + remainingAmount(e), 0)

  const base = filter === 'owed' ? owed : filter === 'due' ? due : expenses
  const filtered = search.trim()
    ? base.filter(e => e.description.toLowerCase().includes(search.toLowerCase()))
    : base

  return (
    <div className="relative w-full h-dvh overflow-hidden bg-[#f6f4f9]">

      {/* Blobs */}
      <div className="absolute -left-16 -top-4 w-72 h-72 rounded-full bg-[#c4b5fd] opacity-30 blur-3xl pointer-events-none" />
      <div className="absolute left-32 top-14 w-64 h-64 rounded-full bg-[#a5f3fc] opacity-25 blur-3xl pointer-events-none" />
      <div className="absolute -left-8 top-52 w-60 h-60 rounded-full bg-[#bbf7d0] opacity-20 blur-3xl pointer-events-none" />
      <div className="absolute left-40 top-[460px] w-64 h-64 rounded-full bg-[#fed7aa] opacity-25 blur-3xl pointer-events-none" />

      {/* TopBar */}
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
        <h1 className="absolute left-1/2 -translate-x-1/2 text-[17px] font-semibold text-[#211738]">Dépenses</h1>
      </header>

      {/* Barre recherche */}
      <div className="absolute top-[76px] left-0 right-0 h-[66px] bg-white/55 border-b border-white/80 backdrop-blur-md z-10 flex items-center px-[14px] gap-2">
        <div className="flex-1 flex items-center gap-2 bg-white/70 border border-white/85 rounded-[8px] h-[34px] px-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#ada7fd">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-[14px] font-semibold text-[#6c63ff] placeholder-[#ada7fd] focus:outline-none"
          />
        </div>
        <button className="w-[34px] h-[34px] bg-white/75 border border-white/85 rounded-[8px] flex items-center justify-center shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#736694">
            <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
          </svg>
        </button>
      </div>

      {/* Contenu principal */}
      <main className="absolute top-[142px] left-0 right-0 bottom-0 flex flex-col overflow-hidden">

        {/* Stats inline */}
        <div className="flex gap-2 px-[14px] pt-3 pb-3">
          <button
            onClick={() => setFilter(f => f === 'owed' ? null : 'owed')}
            className={`flex-1 flex items-center justify-between rounded-[8px] h-[43px] px-2 border transition-all ${
              filter === 'owed'
                ? 'bg-[rgba(108,99,255,0.12)] border-[#a49ffe]'
                : 'bg-[rgba(247,237,250,0.6)] border-[rgba(164,159,254,0.2)]'
            }`}
          >
            <span className="text-[12px] text-[#8883aa]">On me doit</span>
            <span className="text-[14px] font-bold text-[#a49ffe]">{fmt(totalOwed)}</span>
          </button>
          <button
            onClick={() => setFilter(f => f === 'due' ? null : 'due')}
            className={`flex-1 flex items-center justify-between rounded-[8px] h-[43px] px-2 border transition-all ${
              filter === 'due'
                ? 'bg-[rgba(245,158,11,0.12)] border-[#f59e0b]'
                : 'bg-[rgba(247,237,250,0.6)] border-[rgba(245,158,11,0.2)]'
            }`}
          >
            <span className="text-[12px] text-[#8883aa]">Je dois</span>
            <span className="text-[14px] font-bold text-[#f59e0b]">{fmt(totalDue)}</span>
          </button>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto px-[14px] pb-24 flex flex-col gap-3">
          {loading && (
            <p className="text-center text-[13px] text-[#736694] mt-8">Chargement…</p>
          )}
          {!loading && filtered.length === 0 && (
            <div className="bg-white/60 border border-[#c0befe]/50 rounded-[12px] h-[64px] flex flex-col items-center justify-center mt-2">
              <p className="text-[22px] font-bold text-[#6c63ff] leading-tight">Aucune dépense</p>
              <p className="text-[11px] text-[#a49ffe]">pour le moment</p>
            </div>
          )}
          {filtered.map(e => (
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

      {/* Bouton Nouvelle dépense */}
      <button
        onClick={() => setShowNew(true)}
        className="absolute bottom-4 left-4 right-4 h-[48px] bg-[#6c63ff] rounded-[12px] text-white text-[14px] font-semibold z-10"
      >
        Nouvelle dépense
      </button>

      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} />

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
