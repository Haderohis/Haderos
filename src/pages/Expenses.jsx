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

// ─── Modal nouvelle dépense / édition ───────────────────────────────────────

function NewExpenseModal({ currentUserId, onClose, onSaved, initialExpense }) {
  const isEdit = !!initialExpense

  const deriveOtherAndPayer = () => {
    if (!initialExpense) return { otherId: '', payer: 'me' }
    const otherId = initialExpense.payer_id === currentUserId
      ? initialExpense.debtor_id
      : initialExpense.payer_id
    const payer = initialExpense.payer_id === currentUserId ? 'me' : 'other'
    return { otherId, payer }
  }

  const { otherId: initOther, payer: initPayer } = deriveOtherAndPayer()

  const [amount, setAmount] = useState(initialExpense ? String(initialExpense.amount) : '')
  const [description, setDescription] = useState(initialExpense?.description ?? '')
  const [expenseDate, setExpenseDate] = useState(initialExpense?.expense_date ?? '')
  const [payer, setPayer] = useState(initPayer)
  const [otherUserId, setOtherUserId] = useState(initOther)
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
        if (data?.length && !initOther) setOtherUserId(data[0].id)
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
    const payload = {
      payer_id: payerId,
      debtor_id: debtorId,
      amount: parseFloat(amount),
      description,
      expense_date: expenseDate || null,
    }
    const { error: err } = isEdit
      ? await supabase.from('expenses').update(payload).eq('id', initialExpense.id)
      : await supabase.from('expenses').insert({ ...payload, created_by: currentUserId })
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
    onClose()
  }

  return (
    <BottomSheet onClose={onClose}>
      <p className="text-[17px] font-semibold text-[#211738]">{isEdit ? 'Modifier la dépense' : 'Nouvelle dépense'}</p>
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
        {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Ajouter'}
      </SubmitButton>
    </BottomSheet>
  )
}

// ─── Modal détail dépense + remboursement ────────────────────────────────────

function ExpenseDetailModal({ expense, currentUserId, profiles, onClose, onSaved, onRefresh }) {
  const remaining = remainingAmount(expense)
  const otherId = expense.payer_id === currentUserId ? expense.debtor_id : expense.payer_id
  const isDone = remaining === 0
  const paid = Number(expense.amount) - remaining
  const pct = expense.amount > 0 ? Math.round((paid / Number(expense.amount)) * 100) : 0
  const barColor = isDone ? '#22c55e' : pct > 0 ? '#f59e0b' : '#6c63ff'
  const status = statusLabel(expense)

  const profileName = (id) => {
    const p = profiles[id]
    if (!p) return id
    return p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : p.display_name ?? id
  }

  const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  const sorted = [...(expense.reimbursements ?? [])].sort((a, b) => {
    const da = a.reimbursement_date ?? a.created_at
    const db = b.reimbursement_date ?? b.created_at
    return new Date(db) - new Date(da)
  })

  const [amount, setAmount] = useState(remaining > 0 ? remaining.toFixed(2) : '')
  const [reimbDate, setReimbDate] = useState('')
  const [reimbBy, setReimbBy] = useState('me')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [deletingReimbId, setDeletingReimbId] = useState(null)

  const handleDeleteReimb = async (id) => {
    setDeletingReimbId(id)
    await supabase.from('reimbursements').delete().eq('id', id)
    setDeletingReimbId(null)
    onRefresh()
  }

  const canSave = amount && parseFloat(amount) > 0 && parseFloat(amount) <= remaining

  const handleSave = async () => {
    const val = parseFloat(amount)
    if (!val || val <= 0 || val > remaining) return
    setSaving(true)
    setError(null)
    const { error: err } = await supabase.from('reimbursements').insert({
      expense_id: expense.id,
      reimbursed_by: reimbBy === 'me' ? currentUserId : otherId,
      amount: val,
      reimbursement_date: reimbDate || null,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
    onClose()
  }

  return (
    <BottomSheet onClose={onClose}>
      {/* En-tête dépense */}
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[17px] font-semibold text-[#211738] leading-tight">{expense.description}</p>
          <p className="text-[12px] text-[#736694] mt-0.5">Payé par {profileName(expense.payer_id)}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[17px] font-bold text-[#211738]">{fmt(expense.amount)}</p>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ color: status.color, background: status.bg }}>{status.label}</span>
        </div>
      </div>

      {/* Barre de progression */}
      <div className="flex flex-col gap-1 -mt-1">
        <div className="flex justify-between items-center">
          <span className="text-[11px] text-[#736694]">{isDone ? 'Remboursé intégralement' : `${fmt(paid)} remboursé`}</span>
          <span className="text-[11px] font-semibold" style={{ color: barColor }}>{pct}%</span>
        </div>
        <div className="h-[4px] rounded-full bg-[#f0ebfa] overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: barColor }} />
        </div>
      </div>

      {/* Frise chronologique */}
      {sorted.length > 0 && (
        <div className="flex flex-col">
          <p className="text-[11px] font-semibold text-[#736694] uppercase tracking-wide mb-3">Historique</p>
          {sorted.map((r, i) => (
            <div key={r.id} className="flex gap-3">
              <div className="flex flex-col items-center pt-1">
                <div className="w-[8px] h-[8px] rounded-full bg-[#22c55e] shrink-0" />
                {i < sorted.length - 1 && <div className="w-px flex-1 bg-[#e8e0f5] my-1 min-h-[12px]" />}
              </div>
              <div className="flex-1 flex justify-between items-center pb-3 gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-[13px] font-medium text-[#211738] truncate">{profileName(r.reimbursed_by)}</span>
                  {fmtDate(r.reimbursement_date) && (
                    <span className="text-[11px] text-[#a49ffe] shrink-0">{fmtDate(r.reimbursement_date)}</span>
                  )}
                </div>
                <span className="text-[13px] font-semibold text-[#22c55e] shrink-0">+{fmt(r.amount)}</span>
                <button
                  onClick={() => handleDeleteReimb(r.id)}
                  disabled={deletingReimbId === r.id}
                  className="shrink-0 w-6 h-6 flex items-center justify-center opacity-40 active:opacity-100 disabled:opacity-20"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#ef4444">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Formulaire remboursement */}
      {!isDone && (
        <>
          {sorted.length > 0 && <div className="h-px bg-[#f0ebfa] -mt-2" />}
          <p className="text-[14px] font-semibold text-[#211738]">
            Ajouter un remboursement
            <span className="text-[12px] font-normal text-[#736694] ml-2">Reste : {fmt(remaining)}</span>
          </p>
          <SegmentedControl
            label="Qui rembourse ?"
            value={reimbBy}
            onChange={setReimbBy}
            options={[{ value: 'me', label: 'Moi' }, { value: 'other', label: profileName(otherId) }]}
          />
          <TextField label="Montant (€)" required type="number" inputMode="decimal" value={amount}
            onChange={e => setAmount(e.target.value)} placeholder="0.00" />
          <DateField label="Date" value={reimbDate} onChange={e => setReimbDate(e.target.value)} />
          {error && <p className="text-[12px] text-red-500">{error}</p>}
          <SubmitButton onClick={handleSave} disabled={!canSave || saving}>
            {saving ? 'Enregistrement…' : 'Valider le remboursement'}
          </SubmitButton>
        </>
      )}
    </BottomSheet>
  )
}

// ─── Carte dépense ───────────────────────────────────────────────────────────

function ExpenseCard({ expense, profiles, onOpen, onEdit, onDelete }) {
  const [dotMenuOpen, setDotMenuOpen] = useState(false)
  const status = statusLabel(expense)
  const remaining = remainingAmount(expense)
  const isDone = remaining === 0
  const paid = Number(expense.amount) - remaining
  const pct = expense.amount > 0 ? Math.round((paid / Number(expense.amount)) * 100) : 0
  const barColor = isDone ? '#22c55e' : pct > 0 ? '#f59e0b' : '#6c63ff'

  const profileName = (id) => {
    const p = profiles[id]
    if (!p) return id
    return p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : p.display_name ?? id
  }

  return (
    <div className={`bg-white/70 border border-white/85 backdrop-blur-sm rounded-[16px] relative transition-all ${isDone ? 'opacity-50 grayscale' : ''}`}>
      {/* Dropdown 3-dot */}
      {dotMenuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setDotMenuOpen(false)} />
          <div className="absolute top-10 right-3 z-20 bg-white rounded-[12px] shadow-lg border border-[#f0ebfa] overflow-hidden min-w-[140px]">
            <button
              onClick={() => { setDotMenuOpen(false); onEdit(expense) }}
              className="flex items-center px-4 py-3 text-[14px] text-[#211738] w-full text-left active:bg-[#f2edfa]"
            >
              Modifier
            </button>
            <div className="h-px bg-[#f0ebfa]" />
            <button
              onClick={() => { setDotMenuOpen(false); onDelete(expense) }}
              className="flex items-center px-4 py-3 text-[14px] text-red-500 w-full text-left active:bg-red-50"
            >
              Supprimer
            </button>
          </div>
        </>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 p-4 pb-3">
        <button onClick={onOpen} className="flex-1 min-w-0 text-left">
          <p className="text-[14px] font-semibold text-[#211738] truncate">{expense.description}</p>
          <p className="text-[12px] text-[#736694] mt-0.5">Payé par {profileName(expense.payer_id)}</p>
        </button>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[15px] font-bold text-[#211738]">{fmt(expense.amount)}</span>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ color: status.color, background: status.bg }}>
            {status.label}
          </span>
        </div>
        <button onClick={() => setDotMenuOpen(o => !o)} className="shrink-0 w-8 h-8 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#736694">
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>
      </div>

      {/* Barre de progression */}
      <div className="mx-4 mb-3 flex flex-col gap-1">
        <div className="flex justify-between items-center">
          <span className="text-[11px] text-[#736694]">{isDone ? 'Remboursé' : `${fmt(paid)} remboursé`}</span>
          <span className="text-[11px] font-semibold" style={{ color: barColor }}>{pct}%</span>
        </div>
        <div className="h-[4px] rounded-full bg-[#f0ebfa] overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: barColor }} />
        </div>
      </div>
    </div>
  )
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function Expenses() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState(null) // null | 'owed' | 'due' | 'done'
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false)
  const [expenses, setExpenses] = useState([])
  const [profiles, setProfiles] = useState({})
  const [showNew, setShowNew] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [deletingExpense, setDeletingExpense] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [detailExpense, setDetailExpense] = useState(null)
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
    setDetailExpense(prev => prev ? (data ?? []).find(e => e.id === prev.id) ?? prev : null)

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

  const activeExpenses = expenses.filter(e => remainingAmount(e) > 0)
  const doneExpenses = expenses.filter(e => remainingAmount(e) === 0)
  const base = filter === 'owed' ? owed.filter(e => remainingAmount(e) > 0)
    : filter === 'due' ? due.filter(e => remainingAmount(e) > 0)
    : filter === 'done' ? expenses
    : activeExpenses
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
        <div className="relative shrink-0">
          <button
            onClick={() => setFilterDropdownOpen(o => !o)}
            className={`w-[34px] h-[34px] rounded-[8px] flex items-center justify-center border transition-all ${
              filter === 'done'
                ? 'bg-[rgba(34,197,94,0.12)] border-[#22c55e]'
                : 'bg-white/75 border-white/85'
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={filter === 'done' ? '#22c55e' : '#736694'}>
              <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
            </svg>
          </button>
          {filterDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setFilterDropdownOpen(false)} />
              <div className="absolute top-[38px] right-0 z-20 bg-white rounded-[12px] shadow-lg border border-[#f0ebfa] overflow-hidden min-w-[160px]">
                <button
                  onClick={() => { setFilter(f => f === 'done' ? null : 'done'); setFilterDropdownOpen(false) }}
                  className="flex items-center gap-3 px-4 py-3 w-full text-left active:bg-[#f2edfa]"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={filter === 'done' ? '#22c55e' : '#a0a0b0'}>
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                  <span className={`text-[13px] font-medium ${filter === 'done' ? 'text-[#22c55e]' : 'text-[#211738]'}`}>
                    Soldés {doneExpenses.length > 0 && `(${doneExpenses.length})`}
                  </span>
                  {filter === 'done' && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#22c55e" className="ml-auto">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
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
              profiles={profiles}
              onOpen={() => setDetailExpense(e)}
              onEdit={setEditingExpense}
              onDelete={setDeletingExpense}
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
      {editingExpense && (
        <NewExpenseModal
          currentUserId={user.id}
          initialExpense={editingExpense}
          onClose={() => setEditingExpense(null)}
          onSaved={fetchExpenses}
        />
      )}
      {deletingExpense && (
        <BottomSheet onClose={() => setDeletingExpense(null)}>
          <p className="text-[17px] font-semibold text-[#211738]">Supprimer la dépense ?</p>
          <p className="text-[13px] text-[#736694] -mt-2">
            « {deletingExpense.description} » sera définitivement supprimée ainsi que tous ses remboursements.
          </p>
          <button
            disabled={deleting}
            onClick={async () => {
              setDeleting(true)
              await supabase.from('reimbursements').delete().eq('expense_id', deletingExpense.id)
              await supabase.from('expenses').delete().eq('id', deletingExpense.id)
              setDeleting(false)
              setDeletingExpense(null)
              fetchExpenses()
            }}
            className="h-12 bg-red-500 text-white rounded-[12px] text-[14px] font-semibold disabled:opacity-40"
          >
            {deleting ? 'Suppression…' : 'Supprimer'}
          </button>
          <button
            onClick={() => setDeletingExpense(null)}
            className="h-12 bg-[#f2edfa] text-[#736694] rounded-[12px] text-[14px] font-semibold"
          >
            Annuler
          </button>
        </BottomSheet>
      )}
      {detailExpense && (
        <ExpenseDetailModal
          expense={detailExpense}
          currentUserId={user.id}
          profiles={profiles}
          onClose={() => setDetailExpense(null)}
          onSaved={() => { fetchExpenses(); setDetailExpense(null) }}
          onRefresh={fetchExpenses}
        />
      )}
    </div>
  )
}
