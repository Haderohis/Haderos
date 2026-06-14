import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import BottomSheet from '../components/BottomSheet'
import { FieldLabel, TextField, DateField, SelectField, SegmentedControl, SubmitButton } from '../components/FormFields'
import AppHeader from '../components/AppHeader'
import { useTheme } from '../contexts/ThemeContext'
import { LeafSmall, LeafBig, Flower, Mushroom } from '../components/CottageDecor'

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
  return { label: 'En attente', color: 'rgb(var(--color-primary))', bg: 'rgb(var(--color-soft))' }
}

// ─── Saisie de tags ──────────────────────────────────────────────────────────

function TagInput({ tags, onChange, input, onInputChange, suggestions = [] }) {
  const add = (raw) => {
    const t = raw.trim()
    if (t && !tags.includes(t)) onChange([...tags, t])
    onInputChange('')
  }

  const remove = (t) => onChange(tags.filter(x => x !== t))

  const handleKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(input) }
    else if (e.key === 'Backspace' && !input && tags.length) remove(tags[tags.length - 1])
  }

  const shown = input.trim()
    ? suggestions.filter(s => s.includes(input.toLowerCase()) && !tags.includes(s))
    : []

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[12px] font-medium text-muted">Tags</label>
      <div className="relative bg-soft rounded-[10px] min-h-12 px-3 py-2 flex flex-wrap gap-2 items-center">
        {tags.map(t => (
          <span key={t} className="flex items-center gap-1 bg-primary/20 text-primary text-[12px] font-medium px-2 py-1 rounded-full shrink-0">
            {t}
            <button type="button" onPointerDown={e => { e.preventDefault(); remove(t) }} className="leading-none min-w-0 min-h-0 w-4 h-4">×</button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder={tags.length === 0 ? 'Ajouter un tag...' : ''}
          className="bg-transparent text-[14px] text-dark outline-none placeholder:text-accent min-w-[80px] flex-1"
        />
        {shown.length > 0 && (
          <ul className="absolute left-0 right-0 top-full mt-1 bg-white rounded-[10px] shadow-lg z-10 overflow-hidden border border-soft">
            {shown.map(s => (
              <li key={s}>
                <button type="button" className="w-full text-left px-4 py-3 text-[13px] hover:bg-soft"
                  onPointerDown={e => { e.preventDefault(); add(s) }}>
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-[11px] text-accent">Entrée ou virgule pour valider, Retour arrière pour supprimer</p>
    </div>
  )
}

// ─── Modal nouvelle dépense / édition ───────────────────────────────────────

function NewExpenseModal({ currentUserId, onClose, onSaved, initialExpense, allTags }) {
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
  const [expenseDate, setExpenseDate] = useState(initialExpense?.expense_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10))
  const [payer, setPayer] = useState(initPayer)
  const [otherUserId, setOtherUserId] = useState(initOther)
  const [users, setUsers] = useState([])
  const [tags, setTags] = useState(initialExpense?.tags ?? [])
  const [tagInput, setTagInput] = useState('')
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
      tags: tagInput.trim()
        ? [...new Set([...tags, tagInput.trim()])]
        : tags,
    }
    let expenseId = initialExpense?.id
    if (isEdit) {
      const { error: err } = await supabase.from('expenses').update(payload).eq('id', initialExpense.id)
      setSaving(false)
      if (err) { setError(err.message); return }
    } else {
      const { data, error: err } = await supabase.from('expenses').insert({ ...payload, created_by: currentUserId }).select('id').single()
      setSaving(false)
      if (err) { setError(err.message); return }
      expenseId = data?.id
      const debtorId = payer === 'me' ? otherUserId : currentUserId
      if (debtorId !== currentUserId) {
        await supabase.from('notifications').insert({
          user_id: debtorId,
          type: 'new_expense',
          message: `Nouvelle dépense "${description}" de ${fmt(parseFloat(amount))} — tu as été ajouté comme débiteur.`,
          expense_id: expenseId ?? null,
        })
      }
    }
    onSaved()
    onClose()
  }

  return (
    <BottomSheet onClose={onClose}>
      <p className="text-[17px] font-semibold text-dark">{isEdit ? 'Modifier la dépense' : 'Nouvelle dépense'}</p>
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
      <TagInput tags={tags} onChange={setTags} input={tagInput} onInputChange={setTagInput} suggestions={allTags ?? []} />
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
  const barColor = isDone ? '#22c55e' : pct > 0 ? '#f59e0b' : 'rgb(var(--color-primary))'
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
  const [reimbDate, setReimbDate] = useState(new Date().toISOString().slice(0, 10))
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
      reimbursed_by: expense.debtor_id,
      amount: val,
      reimbursement_date: reimbDate || null,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    if (expense.payer_id !== currentUserId) {
      await supabase.from('notifications').insert({
        user_id: expense.payer_id,
        type: 'reimbursement',
        message: `Remboursement de ${fmt(val)} reçu pour "${expense.description}".`,
        expense_id: expense.id,
      })
    }
    onSaved()
    onClose()
  }

  return (
    <BottomSheet onClose={onClose}>
      {/* En-tête dépense */}
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[17px] font-semibold text-dark leading-tight">{expense.description}</p>
          <p className="text-[12px] text-muted mt-0.5">Payé par {profileName(expense.payer_id)}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[17px] font-bold text-dark">{fmt(expense.amount)}</p>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ color: status.color, background: status.bg }}>{status.label}</span>
        </div>
      </div>

      {/* Barre de progression */}
      <div className="flex flex-col gap-1 -mt-1">
        <div className="flex justify-between items-center">
          <span className="text-[11px] text-muted">{isDone ? 'Remboursé intégralement' : `${fmt(paid)} remboursé`}</span>
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
          <p className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-3">Historique</p>
          {sorted.map((r, i) => (
            <div key={r.id} className="flex gap-3">
              {/* Colonne timeline : dot centré, lignes au-dessus et en-dessous */}
              <div className="self-stretch flex flex-col items-center w-3 shrink-0">
                <div className="flex-1 w-px bg-[#e8e0f5]" style={{ visibility: i > 0 ? 'visible' : 'hidden' }} />
                <div className="w-2 h-2 rounded-full bg-[#22c55e] shrink-0" />
                <div className="flex-1 w-px bg-[#e8e0f5]" style={{ visibility: i < sorted.length - 1 ? 'visible' : 'hidden' }} />
              </div>
              {/* Contenu */}
              <div className="flex items-center gap-2 py-1.5 flex-1 min-w-0">
                <span className="text-[13px] font-medium text-dark flex-1 min-w-0 truncate">{profileName(r.reimbursed_by)}</span>
                {fmtDate(r.reimbursement_date) && (
                  <span className="text-[11px] text-accent shrink-0">{fmtDate(r.reimbursement_date)}</span>
                )}
                <span className="text-[13px] font-semibold text-[#22c55e] shrink-0">+{fmt(r.amount)}</span>
                <button
                  onClick={() => handleDeleteReimb(r.id)}
                  disabled={deletingReimbId === r.id}
                  className="shrink-0 w-6 h-6 flex items-center justify-center opacity-30 active:opacity-100 disabled:opacity-10"
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
          <p className="text-[14px] font-semibold text-dark">
            Ajouter un remboursement
            <span className="text-[12px] font-normal text-muted ml-2">Reste : {fmt(remaining)}</span>
          </p>
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

function ExpenseCard({ expense, profiles, onOpen, onEdit, onDelete, isCottagecore = false, decoIdx = 0 }) {
  const [dotMenuOpen, setDotMenuOpen] = useState(false)
  const status = statusLabel(expense)
  const remaining = remainingAmount(expense)
  const isDone = remaining === 0
  const paid = Number(expense.amount) - remaining
  const pct = expense.amount > 0 ? Math.round((paid / Number(expense.amount)) * 100) : 0
  const barColor = isDone ? '#22c55e' : pct > 0 ? '#f59e0b' : 'rgb(var(--color-primary))'

  const profileName = (id) => {
    const p = profiles[id]
    if (!p) return id
    return p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : p.display_name ?? id
  }

  return (
    <div className={`bg-white/70 border backdrop-blur-sm rounded-[16px] relative transition-all ${isCottagecore ? 'cc-border' : 'border-white/85'} ${isDone ? 'opacity-50 grayscale' : ''}`}>
      {isCottagecore && decoIdx === 0 && <><Mushroom  width={24} rotate={15}  style={{ position:'absolute', left:-10, top:-9,    zIndex:10, pointerEvents:'none' }} /><Flower    width={15} rotate={25}  style={{ position:'absolute', left:'40%',top:-9,    zIndex:10, pointerEvents:'none' }} /><LeafBig   width={20} rotate={-10} style={{ position:'absolute', right:-8,  top:-7,    zIndex:10, pointerEvents:'none' }} /><LeafSmall width={13} rotate={60}  style={{ position:'absolute', right:-6,  bottom:-6, zIndex:10, pointerEvents:'none' }} /><Flower    width={14} rotate={-30} style={{ position:'absolute', left:'35%',bottom:-8, zIndex:10, pointerEvents:'none' }} /></>}
      {isCottagecore && decoIdx === 1 && <><LeafBig   width={24} rotate={-20} style={{ position:'absolute', left:'32%', top:-9,   zIndex:10, pointerEvents:'none' }} /><Mushroom  width={20} rotate={-5}  style={{ position:'absolute', right:-8,  top:-8,   zIndex:10, pointerEvents:'none' }} /><Flower    width={16} rotate={30}  style={{ position:'absolute', left:-7,   top:'25%', zIndex:10, pointerEvents:'none' }} /><LeafSmall width={13} rotate={55}  style={{ position:'absolute', right:-5,  bottom:-6, zIndex:10, pointerEvents:'none' }} /><LeafSmall width={12} rotate={80}  style={{ position:'absolute', left:'48%',bottom:-6, zIndex:10, pointerEvents:'none' }} /></>}
      {isCottagecore && decoIdx === 2 && <><Flower    width={17} rotate={-35} style={{ position:'absolute', left:-8,   top:-9,    zIndex:10, pointerEvents:'none' }} /><LeafSmall width={13} rotate={70}  style={{ position:'absolute', left:'42%', top:-7,    zIndex:10, pointerEvents:'none' }} /><LeafBig   width={20} rotate={15}  style={{ position:'absolute', right:-8,  top:-7,    zIndex:10, pointerEvents:'none' }} /><Mushroom  width={22} rotate={10}  style={{ position:'absolute', right:-9,  bottom:-9, zIndex:10, pointerEvents:'none' }} /><Flower    width={13} rotate={-20} style={{ position:'absolute', left:'30%',bottom:-7, zIndex:10, pointerEvents:'none' }} /></>}
      {isCottagecore && decoIdx === 3 && <><LeafBig   width={24} rotate={-15} style={{ position:'absolute', right:-9,  top:-8,    zIndex:10, pointerEvents:'none' }} /><Mushroom  width={22} rotate={-8}  style={{ position:'absolute', left:-9,   top:-8,    zIndex:10, pointerEvents:'none' }} /><Flower    width={15} rotate={40}  style={{ position:'absolute', left:-7,   top:'22%', zIndex:10, pointerEvents:'none' }} /><LeafSmall width={14} rotate={100} style={{ position:'absolute', left:'44%', bottom:-7, zIndex:10, pointerEvents:'none' }} /><LeafSmall width={12} rotate={-50} style={{ position:'absolute', right:-5,  bottom:-6, zIndex:10, pointerEvents:'none' }} /></>}
      {/* Dropdown 3-dot */}
      {dotMenuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setDotMenuOpen(false)} />
          <div className="absolute top-10 right-3 z-20 bg-white rounded-[12px] shadow-lg border border-[#f0ebfa] overflow-hidden min-w-[140px]">
            <button
              onClick={() => { setDotMenuOpen(false); onEdit(expense) }}
              className="flex items-center px-4 py-3 text-[14px] text-dark w-full text-left active:bg-soft"
            >
              Modifier
            </button>
            {!isDone && (
              <>
                <div className="h-px bg-[#f0ebfa]" />
                <button
                  onClick={() => { setDotMenuOpen(false); onDelete(expense) }}
                  className="flex items-center px-4 py-3 text-[14px] text-red-500 w-full text-left active:bg-red-50"
                >
                  Supprimer
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* Header */}
      <div className="flex items-center gap-2 p-4 pb-3">
        <button onClick={onOpen} className="flex-1 min-w-0 text-left">
          <p className="text-[14px] font-semibold text-dark truncate">{expense.description}</p>
          <p className="text-[12px] text-muted mt-0.5">Payé par {profileName(expense.payer_id)}</p>
        </button>
        {expense.tags?.length > 0 && (
          <div className="flex flex-wrap justify-end gap-1 shrink-0 max-w-[45%]">
            {expense.tags.map(t => (
              <span key={t} className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{t}</span>
            ))}
          </div>
        )}
        <button onClick={() => setDotMenuOpen(o => !o)} className="shrink-0 w-8 h-8 flex items-center justify-center -mr-1">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="rgb(var(--color-muted))">
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>
      </div>

      {/* Barre de progression */}
      <div className="mx-4 mb-3 flex flex-col gap-1">
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-semibold" style={{ color: barColor }}>{fmt(paid)} / {fmt(expense.amount)}</span>
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

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState(null) // null | 'owed' | 'due' | 'done'
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false)
  const [tagFilters, setTagFilters] = useState([])
  const [filterTagInput, setFilterTagInput] = useState('')
  const [expenses, setExpenses] = useState([])
  const [profiles, setProfiles] = useState({})
  const [showNew, setShowNew] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [deletingExpense, setDeletingExpense] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [detailExpense, setDetailExpense] = useState(null)
  const [loading, setLoading] = useState(true)

  const { user, loading: authLoading } = useAuth()
  const { theme } = useTheme()
  const isCottagecore = theme === 'cottagecore'
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
  const allTags = [...new Set(expenses.flatMap(e => e.tags ?? []))].sort()
  const base = filter === 'owed' ? owed.filter(e => remainingAmount(e) > 0)
    : filter === 'due' ? due.filter(e => remainingAmount(e) > 0)
    : (filter === 'done' || search.trim()) ? expenses
    : activeExpenses
  const filtered = base
    .filter(e => !search.trim() || e.description.toLowerCase().includes(search.toLowerCase()))
    .filter(e => tagFilters.length === 0 || tagFilters.every(t => (e.tags ?? []).includes(t)))

  return (
    <div className="relative w-full h-dvh overflow-hidden bg-base">

      {/* Blobs */}
      <div className="absolute -left-16 -top-4 w-72 h-72 rounded-full bg-[#c4b5fd] opacity-30 blur-3xl pointer-events-none" />
      <div className="absolute left-32 top-14 w-64 h-64 rounded-full bg-[#a5f3fc] opacity-25 blur-3xl pointer-events-none" />
      <div className="absolute -left-8 top-52 w-60 h-60 rounded-full bg-[#bbf7d0] opacity-20 blur-3xl pointer-events-none" />
      <div className="absolute left-40 top-[460px] w-64 h-64 rounded-full bg-[#fed7aa] opacity-25 blur-3xl pointer-events-none" />

      <AppHeader title="Dépenses" />

      {/* Barre recherche */}
      <div className="absolute top-[76px] left-0 right-0 h-[66px] bg-white/55 border-b border-white/80 backdrop-blur-md z-10 flex items-center px-[14px] gap-2">
        <div className="flex-1 flex items-center gap-2 bg-white/70 border border-white/85 rounded-[8px] h-[44px] px-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="rgb(var(--color-accent))">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-[14px] font-semibold text-primary placeholder-accent focus:outline-none"
          />
        </div>
        <div className="relative shrink-0">
          <button
            onClick={() => setFilterDropdownOpen(o => !o)}
            className={`w-[34px] h-[34px] rounded-[8px] flex items-center justify-center border transition-all relative ${
              filter === 'done' || tagFilters.length > 0
                ? 'bg-primary/[0.12] border-accent'
                : 'bg-white/75 border-white/85'
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={filter === 'done' || tagFilters.length > 0 ? 'rgb(var(--color-primary))' : 'rgb(var(--color-muted))'}>
              <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
            </svg>
            {tagFilters.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                {tagFilters.length}
              </span>
            )}
          </button>
          {filterDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setFilterDropdownOpen(false)} />
              <div className="absolute top-[38px] right-0 z-20 bg-white rounded-[12px] shadow-lg border border-[#f0ebfa] min-w-[220px]">
                {/* Soldés */}
                <button
                  onClick={() => { setFilter(f => f === 'done' ? null : 'done'); setFilterDropdownOpen(false) }}
                  className="flex items-center gap-3 px-4 py-3 w-full text-left active:bg-soft"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={filter === 'done' ? '#22c55e' : '#a0a0b0'}>
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                  <span className={`text-[13px] font-medium flex-1 ${filter === 'done' ? 'text-[#22c55e]' : 'text-dark'}`}>
                    Soldés {doneExpenses.length > 0 && `(${doneExpenses.length})`}
                  </span>
                  {filter === 'done' && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#22c55e">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  )}
                </button>
                {/* Tags */}
                {allTags.length > 0 && (
                  <>
                    <div className="h-px bg-[#f0ebfa]" />
                    <div className="px-3 pt-2 pb-2">
                      <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-2">Tags</p>
                      <div className="relative">
                        <div className={`flex flex-wrap items-center gap-1.5 bg-soft rounded-[8px] px-3 min-h-9 py-1.5 ${tagFilters.length > 0 ? 'ring-2 ring-primary/40' : ''}`}>
                          {tagFilters.map(t => (
                            <span key={t} className="flex items-center gap-1 bg-primary/20 text-primary text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0">
                              {t}
                              <button onClick={() => setTagFilters(prev => prev.filter(x => x !== t))} style={{ minWidth: 0, minHeight: 0 }} className="leading-none">&times;</button>
                            </span>
                          ))}
                          <input
                            type="text"
                            value={filterTagInput}
                            onChange={e => setFilterTagInput(e.target.value)}
                            placeholder={tagFilters.length === 0 ? 'Filtrer par tag...' : ''}
                            className="bg-transparent text-[13px] text-dark outline-none placeholder:text-accent flex-1 min-w-[80px]"
                          />
                        </div>
                        {filterTagInput && (
                          <ul className="absolute left-0 right-0 top-[38px] bg-white rounded-[8px] shadow-lg z-30 overflow-hidden border border-soft">
                            {allTags
                              .filter(t => t.includes(filterTagInput.toLowerCase()) && !tagFilters.includes(t))
                              .map(tag => (
                                <li key={tag}>
                                  <button
                                    className="w-full text-left px-3 py-2 text-[13px] hover:bg-soft flex items-center gap-2"
                                    style={{ minWidth: 0, minHeight: 0 }}
                                    onClick={() => { setTagFilters(prev => [...prev, tag]); setFilterTagInput('') }}
                                  >
                                    <span className="flex items-center gap-1 bg-primary/20 text-primary text-[11px] px-2 py-0.5 rounded-full">{tag}</span>
                                  </button>
                                </li>
                              ))
                            }
                          </ul>
                        )}
                      </div>
                      {tagFilters.length > 0 && (
                        <button
                          onClick={() => setTagFilters([])}
                          className="flex items-center justify-center gap-1 w-full mt-2 py-1 text-[12px] text-muted"
                        >
                          Effacer les tags
                        </button>
                      )}
                    </div>
                  </>
                )}
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
                ? 'bg-primary/[0.12] border-accent'
                : 'bg-soft/60 border-[rgba(164,159,254,0.2)]'
            }`}
          >
            <span className="text-[12px] text-[#8883aa]">On me doit</span>
            <span className="text-[14px] font-bold text-accent">{fmt(totalOwed)}</span>
          </button>
          <button
            onClick={() => setFilter(f => f === 'due' ? null : 'due')}
            className={`flex-1 flex items-center justify-between rounded-[8px] h-[43px] px-2 border transition-all ${
              filter === 'due'
                ? 'bg-[rgba(245,158,11,0.12)] border-[#f59e0b]'
                : 'bg-soft/60 border-[rgba(245,158,11,0.2)]'
            }`}
          >
            <span className="text-[12px] text-[#8883aa]">Je dois</span>
            <span className="text-[14px] font-bold text-[#f59e0b]">{fmt(totalDue)}</span>
          </button>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto px-[14px] pb-24 flex flex-col gap-3">
          {loading && (
            <p className="text-center text-[13px] text-muted mt-8">Chargement…</p>
          )}
          {!loading && filtered.length === 0 && (
            <div className={`bg-white/60 border rounded-[12px] h-[64px] flex flex-col items-center justify-center mt-2 ${isCottagecore ? "cc-border" : "border-accent/50"}`}>
              <p className="text-[22px] font-bold text-primary leading-tight">Aucune dépense</p>
              <p className="text-[11px] text-accent">pour le moment</p>
            </div>
          )}
          {(() => {
            const todayStr = new Date().toISOString().slice(0, 10)
            const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
            const fmtLabel = (dateKey) => {
              if (dateKey === todayStr) return "Aujourd'hui"
              if (dateKey === yesterdayStr) return 'Hier'
              return new Date(dateKey + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
            }
            const sorted = [...filtered].sort((a, b) => {
              const da = (a.expense_date ?? a.created_at).slice(0, 10)
              const db = (b.expense_date ?? b.created_at).slice(0, 10)
              return db.localeCompare(da)
            })
            const groups = []
            let lastKey = null
            sorted.forEach(e => {
              const key = (e.expense_date ?? e.created_at).slice(0, 10)
              if (key !== lastKey) { groups.push({ key, items: [] }); lastKey = key }
              groups[groups.length - 1].items.push(e)
            })
            return groups.map(({ key, items }) => (
              <div key={key} className="flex flex-col gap-3">
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-semibold text-accent whitespace-nowrap">{fmtLabel(key)}</span>
                  <div className="flex-1 h-px bg-[#e8e0f5]" />
                </div>
                {items.map((e) => (
                  <ExpenseCard
                    key={e.id}
                    expense={e}
                    profiles={profiles}
                    onOpen={() => setDetailExpense(e)}
                    onEdit={setEditingExpense}
                    onDelete={setDeletingExpense}
                    isCottagecore={isCottagecore}
                    decoIdx={parseInt(String(e.id).replace(/-/g,'').slice(-2), 16) % 4}
                  />
                ))}
              </div>
            ))
          })()}
        </div>
      </main>

      {/* Bouton Nouvelle dépense */}
      <div className="fixed bottom-4 left-4 right-4 z-10" style={{ height: 48 }}>
        <button
          onClick={() => setShowNew(true)}
          className={`w-full h-full bg-primary rounded-[12px] text-white text-[14px] font-semibold${isCottagecore ? ' cc-border border-2' : ''}`}
        >
          Nouvelle dépense
        </button>
        {isCottagecore && <>
          <Mushroom  width={26} rotate={-15} style={{ position:'absolute', left:-7,    top:-12,   zIndex:11, pointerEvents:'none' }} />
          <LeafSmall width={12} rotate={40}  style={{ position:'absolute', left:18,    top:-7,    zIndex:11, pointerEvents:'none' }} />
          <Flower    width={17} rotate={-25} style={{ position:'absolute', left:'40%', top:-11,   zIndex:11, pointerEvents:'none' }} />
          <LeafBig   width={22} rotate={15}  style={{ position:'absolute', right:-6,   top:-10,   zIndex:11, pointerEvents:'none' }} />
          <LeafSmall width={13} rotate={50}  style={{ position:'absolute', left:'54%', bottom:-7, zIndex:11, pointerEvents:'none' }} />
          <Flower    width={14} rotate={-40} style={{ position:'absolute', right:16,   bottom:-6, zIndex:11, pointerEvents:'none' }} />
        </>}
      </div>

      {/* Modals */}
      {showNew && (
        <NewExpenseModal
          currentUserId={user.id}
          allTags={allTags}
          onClose={() => setShowNew(false)}
          onSaved={fetchExpenses}
        />
      )}
      {editingExpense && (
        <NewExpenseModal
          currentUserId={user.id}
          initialExpense={editingExpense}
          allTags={allTags}
          onClose={() => setEditingExpense(null)}
          onSaved={fetchExpenses}
        />
      )}
      {deletingExpense && (
        <BottomSheet onClose={() => setDeletingExpense(null)}>
          <p className="text-[17px] font-semibold text-dark">Supprimer la dépense ?</p>
          <p className="text-[13px] text-muted -mt-2">
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
            className="h-12 bg-soft text-muted rounded-[12px] text-[14px] font-semibold"
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
