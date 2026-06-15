import { useState, useMemo, useEffect } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import {
  Plus, Edit2, Trash2, FileJson, AlertTriangle, TrendingUp,
  X, ChevronDown, Link, Store, CheckCircle, Clock, MinusCircle,
  Flag, Calendar,
} from 'lucide-react'
import { SmallLeaf, Frangipani, BaliBorder } from '../components/Botanicals'
import { Tip } from '../components/Tooltip'
import { TourButton } from '../components/GuidedTour'
import { CurrencyToggle } from '../components/CurrencyToggle'
import { useCurrencyContext } from '../context/CurrencyContext'
import { CurrencyAmountInput, localToGbp } from '../components/CurrencyAmountInput'
import { vendorToBudgetCategory, uid, paymentStageAmount } from '../lib/helpers'
import type { BudgetItem, BudgetItemStatus, Payment, PaymentStage, PaymentStageType, AppData, Vendor } from '../types'
import type { Currency } from '../hooks/useCurrency'

// ── helpers ───────────────────────────────────────────────────────────────────
function exportJSON(data: AppData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `wedding-data-${new Date().toISOString().split('T')[0]}.json`
  a.click(); URL.revokeObjectURL(url)
}

function fmt(n: number) {
  return '£' + n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function itemStatus(b: BudgetItem): BudgetItemStatus { return b.status ?? 'booked' }

/** Total paid = sum of payments, or legacy actual field */
function totalPaid(b: BudgetItem): number {
  if (b.payments && b.payments.length > 0) return b.payments.reduce((s, p) => s + p.amount, 0)
  return b.actual
}

function paymentState(b: BudgetItem): 'unpaid' | 'partial' | 'full' {
  const paid = totalPaid(b)
  if (paid <= 0) return 'unpaid'
  if (b.estimated > 0 && paid >= b.estimated) return 'full'
  return 'partial'
}

function todayISO() { return new Date().toISOString().split('T')[0] }

// ── constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
  'Venue', 'Catering', 'Photography', 'Videography',
  'Flowers & Décor', 'Attire', 'Music & Entertainment',
  'Hair & Beauty', 'Transport', 'Stationery',
  'Honeymoon', 'Gifts & Favours', 'Miscellaneous',
]

const CATEGORY_COLORS: Record<string, string> = {
  'Venue': '#C8A45D', 'Catering': '#7F9A78', 'Photography': '#C47A52',
  'Videography': '#B8864A', 'Flowers & Décor': '#8B9B6B', 'Attire': '#D4956A',
  'Music & Entertainment': '#9BAF78', 'Hair & Beauty': '#E0B87A',
  'Transport': '#A8956B', 'Stationery': '#C4AF7E', 'Honeymoon': '#7A9A82',
  'Gifts & Favours': '#B89060', 'Miscellaneous': '#8A7A6A',
}

function catColor(cat: string) { return CATEGORY_COLORS[cat] ?? '#C8A45D' }

const EMPTY_ITEM: Omit<BudgetItem, 'id'> = {
  category: CATEGORIES[0], description: '',
  estimated: 0, actual: 0, paid: false, notes: '', status: 'booked',
  payments: [], paymentStages: [],
}

// ── sub-components ────────────────────────────────────────────────────────────
function SummaryCard({ label, value, sub, color, accent = false }: {
  label: string; value: string; sub?: string; color: string; accent?: boolean
}) {
  return (
    <div style={{
      background: accent ? `linear-gradient(135deg, ${color}22, ${color}0a)` : '#FAF3E6',
      border: `1.5px solid ${accent ? color + '55' : '#E8D5A3'}`,
      borderRadius: 16, padding: '20px 24px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', bottom: 0, right: 0, pointerEvents: 'none' }}>
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" opacity={0.1}>
          <rect x="4" y="4" width="40" height="40" rx="4" transform="rotate(45 24 24)" fill={color}/>
        </svg>
      </div>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#7A6657', letterSpacing: '0.1em', marginBottom: 8 }}>{label}</p>
      <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 500, color: accent ? color : '#3B2A22', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: '#7A6657', marginTop: 5 }}>{sub}</p>}
    </div>
  )
}

function ProgressBar({ pct, color, overBudget }: { pct: number; color: string; overBudget: boolean }) {
  return (
    <div style={{ height: 6, borderRadius: 10, background: '#F2E3CF', overflow: 'hidden' }}>
      <div style={{
        height: '100%', borderRadius: 10, width: `${Math.min(pct, 100)}%`,
        background: overBudget ? 'linear-gradient(90deg, #C47A52, #E09070)' : `linear-gradient(90deg, ${color}, ${color}99)`,
        transition: 'width 0.6s ease',
      }}/>
    </div>
  )
}

function StatusPill({ status, onClick }: { status: BudgetItemStatus; onClick?: () => void }) {
  const booked = status === 'booked'
  return (
    <button onClick={onClick} title={onClick ? `Mark as ${booked ? 'Quoted' : 'Booked'}` : undefined}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700,
        color: booked ? '#5A7A54' : '#8B6914',
        background: booked ? 'rgba(127,154,120,0.15)' : 'rgba(200,164,93,0.15)',
        border: `1px solid ${booked ? 'rgba(127,154,120,0.4)' : 'rgba(200,164,93,0.4)'}`,
        padding: '2px 7px', borderRadius: 20, cursor: onClick ? 'pointer' : 'default', transition: 'all 0.15s',
      }}>
      {booked ? <CheckCircle size={8}/> : <Clock size={8}/>}
      {booked ? 'BOOKED' : 'QUOTED'}
    </button>
  )
}

function PaymentStatusBadge({ item }: { item: BudgetItem }) {
  const state = paymentState(item)
  if (state === 'full') return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:9, fontWeight:700,
      color:'#5A7A54', background:'rgba(127,154,120,0.15)', border:'1px solid rgba(127,154,120,0.4)',
      padding:'2px 7px', borderRadius:20, whiteSpace:'nowrap' }}>
      <CheckCircle size={8}/> Fully paid
    </span>
  )
  if (state === 'partial') return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:9, fontWeight:700,
      color:'#8B6914', background:'rgba(200,164,93,0.15)', border:'1px solid rgba(200,164,93,0.4)',
      padding:'2px 7px', borderRadius:20, whiteSpace:'nowrap' }}>
      <Clock size={8}/> Part paid
    </span>
  )
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:9, fontWeight:700,
      color:'#7A6657', background:'rgba(200,200,200,0.15)', border:'1px solid rgba(150,150,150,0.3)',
      padding:'2px 7px', borderRadius:20, whiteSpace:'nowrap' }}>
      <MinusCircle size={8}/> Unpaid
    </span>
  )
}

// ── Payments editor (inline in modal) ────────────────────────────────────────
function PaymentsEditor({ payments, estimated, currency, rates, onChange }: {
  payments: Payment[]
  estimated: number
  currency: Currency
  rates: ReturnType<typeof useCurrencyContext>['rates']
  onChange: (p: Payment[]) => void
}) {
  const [newDate,   setNewDate]   = useState(todayISO())
  const [newAmount, setNewAmount] = useState<number | ''>('')
  const [newNote,   setNewNote]   = useState('')

  const totalPaidAmt = payments.reduce((s, p) => s + p.amount, 0)
  const outstanding  = Math.max(0, estimated - totalPaidAmt)

  const addPayment = () => {
    if (newAmount === '' || +newAmount <= 0) return
    const gbp = localToGbp(+newAmount, currency, rates)
    onChange([...payments, { id: uid(), date: newDate, amount: gbp, note: newNote.trim() || undefined }])
    setNewAmount('')
    setNewNote('')
    setNewDate(todayISO())
  }

  const inp: React.CSSProperties = {
    padding: '7px 10px', border: '1.5px solid #E8D5A3', borderRadius: 8,
    background: '#FFFDF7', color: '#3B2A22', fontSize: 12,
    fontFamily: 'Inter, sans-serif', outline: 'none',
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#7A6657', letterSpacing: '0.08em' }}>PAYMENTS</p>
        {estimated > 0 && (
          <span style={{ fontSize: 11, color: outstanding > 0 ? '#C47A52' : '#7F9A78', fontWeight: 600 }}>
            {outstanding > 0 ? `${fmt(outstanding)} outstanding` : 'Fully paid ✓'}
          </span>
        )}
      </div>

      {/* Existing payments */}
      {payments.length > 0 && (
        <div style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {payments.map(p => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '6px 10px', borderRadius: 8,
              background: 'rgba(127,154,120,0.07)', border: '1px solid rgba(127,154,120,0.2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: '#7A6657' }}>
                  {new Date(p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                </span>
                {p.note && <span style={{ fontSize: 11, color: '#A89080', fontStyle: 'italic' }}>{p.note}</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#7F9A78' }}>{fmt(p.amount)}</span>
                <button onClick={() => onChange(payments.filter(x => x.id !== p.id))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C47A52', padding: 2, lineHeight: 1 }}>
                  <X size={11}/>
                </button>
              </div>
            </div>
          ))}
          {/* Total row */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: 4, paddingTop: 2 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#3B2A22' }}>
              Total paid: {fmt(totalPaidAmt)}
            </span>
          </div>
        </div>
      )}

      {/* Add new payment row */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
        <div style={{ flex: '0 0 130px' }}>
          <p style={{ fontSize: 10, color: '#7A6657', fontWeight: 600, marginBottom: 3 }}>DATE</p>
          <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
            style={{ ...inp, width: '100%' }}/>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 10, color: '#7A6657', fontWeight: 600, marginBottom: 3 }}>AMOUNT</p>
          <input type="number" min={0} step="any" placeholder="0"
            value={newAmount} onChange={e => setNewAmount(e.target.value === '' ? '' : +e.target.value)}
            style={{ ...inp, width: '100%' }}/>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 10, color: '#7A6657', fontWeight: 600, marginBottom: 3 }}>NOTE (optional)</p>
          <input placeholder="e.g. Deposit" value={newNote} onChange={e => setNewNote(e.target.value)}
            style={{ ...inp, width: '100%' }}/>
        </div>
        <button onClick={addPayment} disabled={newAmount === '' || +newAmount <= 0}
          style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', borderRadius: 8,
            border: 'none', background: (newAmount !== '' && +newAmount > 0) ? '#3B2A22' : '#E8D5A3',
            color: (newAmount !== '' && +newAmount > 0) ? '#FFF8EE' : '#7A6657',
            fontSize: 12, fontWeight: 600, cursor: (newAmount !== '' && +newAmount > 0) ? 'pointer' : 'default',
            flexShrink: 0, height: 34, marginBottom: 1,
          }}>
          <Plus size={12} strokeWidth={2.5}/> Add
        </button>
      </div>
      {payments.length === 0 && (
        <p style={{ fontSize: 11, color: '#C4B49A', fontStyle: 'italic', marginTop: 6 }}>
          No payments recorded yet — add one above.
        </p>
      )}
    </div>
  )
}

// ── Payment stage editor ──────────────────────────────────────────────────────
function PaymentStageEditor({ stages, estimated, onChange }: {
  stages: PaymentStage[]
  estimated: number
  onChange: (s: PaymentStage[]) => void
}) {
  const [desc,    setDesc]    = useState('')
  const [dueDate, setDueDate] = useState('')
  const [type,    setType]    = useState<PaymentStageType>('fixed')
  const [value,   setValue]   = useState<number | ''>('')

  const stageAmount = (s: PaymentStage) => paymentStageAmount(s, estimated)

  const add = () => {
    if (!desc.trim() || !dueDate || value === '' || +value <= 0) return
    onChange([...stages, { id: uid(), description: desc.trim(), dueDate, type, value: +value, paid: false }])
    setDesc(''); setDueDate(''); setValue(''); setType('fixed')
  }

  const toggle = (id: string) =>
    onChange(stages.map(s => s.id === id ? { ...s, paid: !s.paid } : s))

  const remove = (id: string) => onChange(stages.filter(s => s.id !== id))

  const inp: React.CSSProperties = {
    padding: '7px 10px', border: '1.5px solid #E8D5A3', borderRadius: 8,
    background: '#FFFDF7', color: '#3B2A22', fontSize: 12,
    fontFamily: 'Inter, sans-serif', outline: 'none',
  }

  const totalStaged = stages.reduce((s, st) => s + stageAmount(st), 0)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#7A6657', letterSpacing: '0.08em' }}>PAYMENT STAGES</p>
          <Tip content="Plan future payments — deposit, second instalment, final balance. Each gets a due date and shows up in Upcoming Payments." side="right">
            <span style={{ width: 15, height: 15, borderRadius: '50%', background: 'rgba(200,164,93,0.2)', border: '1px solid rgba(200,164,93,0.4)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#C8A45D', fontWeight: 700, cursor: 'help', flexShrink: 0 }}>?</span>
          </Tip>
        </div>
        <span style={{ fontSize: 11, color: '#A89080', fontStyle: 'italic' }}>optional milestones / stage gates</span>
      </div>

      {stages.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
          {stages.map(s => {
            const amt = stageAmount(s)
            const due = new Date(s.dueDate + 'T00:00:00')
            const now = new Date(); now.setHours(0,0,0,0)
            const overdue = !s.paid && due < now
            const dueSoon = !s.paid && !overdue && (due.getTime() - now.getTime()) <= 14 * 86400000
            return (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8,
                border: `1px solid ${overdue ? 'rgba(196,122,82,0.4)' : s.paid ? 'rgba(127,154,120,0.3)' : 'rgba(200,164,93,0.3)'}`,
                background: overdue ? 'rgba(196,122,82,0.05)' : s.paid ? 'rgba(127,154,120,0.05)' : 'rgba(200,164,93,0.04)',
              }}>
                <button onClick={() => toggle(s.id)}
                  style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                    border: `1.5px solid ${s.paid ? '#7F9A78' : '#D4C5A4'}`,
                    background: s.paid ? '#7F9A78' : 'transparent', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {s.paid && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: s.paid ? '#7A6657' : '#3B2A22',
                    textDecoration: s.paid ? 'line-through' : 'none' }}>{s.description}</p>
                  <p style={{ fontSize: 10, color: overdue ? '#C47A52' : dueSoon ? '#C8A45D' : '#7A6657' }}>
                    {overdue ? '⚠ Overdue · ' : dueSoon ? '⏰ Due soon · ' : ''}
                    {due.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                    {s.type === 'percentage' && <span style={{ marginLeft: 4, opacity: 0.7 }}>({s.value}%)</span>}
                  </p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: s.paid ? '#7A6657' : '#3B2A22', flexShrink: 0 }}>
                  {fmt(amt)}
                </span>
                <button onClick={() => remove(s.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C47A52', padding: 2, lineHeight: 1, flexShrink: 0 }}>
                  <X size={11}/>
                </button>
              </div>
            )
          })}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: 4, paddingTop: 2 }}>
            <span style={{ fontSize: 11, color: '#7A6657' }}>
              Staged: {fmt(totalStaged)}
              {estimated > 0 && <span style={{ opacity: 0.7 }}> ({Math.round((totalStaged / estimated) * 100)}% of total)</span>}
            </span>
          </div>
        </div>
      )}

      {/* Add stage row */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '2 1 140px' }}>
          <p style={{ fontSize: 10, color: '#7A6657', fontWeight: 600, marginBottom: 3 }}>STAGE DESCRIPTION</p>
          <input placeholder="e.g. Deposit, 2nd instalment…" value={desc} onChange={e => setDesc(e.target.value)}
            style={{ ...inp, width: '100%' }}/>
        </div>
        <div style={{ flex: '0 0 120px' }}>
          <p style={{ fontSize: 10, color: '#7A6657', fontWeight: 600, marginBottom: 3 }}>DUE DATE</p>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
            style={{ ...inp, width: '100%' }}/>
        </div>
        <div style={{ flex: '0 0 100px' }}>
          <p style={{ fontSize: 10, color: '#7A6657', fontWeight: 600, marginBottom: 3 }}>TYPE</p>
          <div style={{ position: 'relative' }}>
            <select value={type} onChange={e => setType(e.target.value as PaymentStageType)}
              style={{ ...inp, width: '100%', appearance: 'none', paddingRight: 22 }}>
              <option value="fixed">£ Fixed</option>
              <option value="percentage">% of total</option>
            </select>
            <ChevronDown size={10} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', color: '#7A6657', pointerEvents: 'none' }}/>
          </div>
        </div>
        <div style={{ flex: '0 0 80px' }}>
          <p style={{ fontSize: 10, color: '#7A6657', fontWeight: 600, marginBottom: 3 }}>
            {type === 'percentage' ? '% VALUE' : '£ AMOUNT'}
          </p>
          <input type="number" min={0} step="any" placeholder={type === 'percentage' ? '0–100' : '0'}
            value={value} onChange={e => setValue(e.target.value === '' ? '' : +e.target.value)}
            style={{ ...inp, width: '100%' }}/>
        </div>
        <button onClick={add} disabled={!desc.trim() || !dueDate || value === '' || +value <= 0}
          style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', borderRadius: 8, border: 'none',
            background: (desc.trim() && dueDate && value !== '' && +value > 0) ? '#3B2A22' : '#E8D5A3',
            color: (desc.trim() && dueDate && value !== '' && +value > 0) ? '#FFF8EE' : '#7A6657',
            fontSize: 12, fontWeight: 600,
            cursor: (desc.trim() && dueDate && value !== '' && +value > 0) ? 'pointer' : 'default',
            height: 34, flexShrink: 0, marginBottom: 1,
          }}>
          <Plus size={12} strokeWidth={2.5}/> Add
        </button>
      </div>
      {/* Inline validation hint */}
      {(desc.trim() || dueDate || value !== '') && (!desc.trim() || !dueDate || value === '' || +value <= 0) && (
        <p style={{ fontSize: 11, color: '#C47A52', marginTop: 5 }}>
          {!desc.trim() ? 'Enter a description' : !dueDate ? 'Choose a due date' : 'Amount must be greater than 0'}
        </p>
      )}
      {stages.length === 0 && !desc.trim() && !dueDate && value === '' && (
        <p style={{ fontSize: 11, color: '#C4B49A', fontStyle: 'italic', marginTop: 6 }}>
          No stages yet — add milestones such as a deposit, second instalment, or final balance.
        </p>
      )}
    </div>
  )
}

// ── Budget item modal ─────────────────────────────────────────────────────────
function ItemModal({ initial, vendors, onSave, onClose }: {
  initial?: BudgetItem
  vendors: Vendor[]
  onSave: (b: BudgetItem) => void
  onClose: () => void
}) {
  const { rates } = useCurrencyContext()

  const [form, setForm] = useState<Omit<BudgetItem, 'id'>>(
    initial ? { ...initial, payments: initial.payments ?? [], paymentStages: initial.paymentStages ?? [] } : { ...EMPTY_ITEM }
  )
  const [selectedVendorId, setSelectedVendorId] = useState<string>(initial?.vendorId ?? '')
  const [inputCurrency, setInputCurrency] = useState<Currency>(initial?.currency ?? 'GBP')
  const [estimatedLocal, setEstimatedLocal] = useState<number | ''>(
    initial?.estimatedLocal ?? initial?.estimated ?? ''
  )
  // Final balance due — mutually exclusive with TBC
  const [finalBalanceDue, setFinalBalanceDue] = useState(initial?.finalBalanceDue ?? '')
  const [finalBalanceTBC, setFinalBalanceTBC] = useState(initial?.finalBalanceTBC ?? false)

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  const handleVendorChange = (vendorId: string) => {
    setSelectedVendorId(vendorId)
    if (!vendorId) { setForm(f => ({ ...f, vendorId: undefined })); return }
    const vendor = vendors.find(v => v.id === vendorId)
    if (!vendor) return
    const autoCategory = vendorToBudgetCategory(vendor.category)
    setForm(f => ({
      ...f, vendorId,
      description: f.description.trim() || vendor.name,
      category: CATEGORIES.includes(autoCategory) ? autoCategory : f.category,
    }))
  }

  const canSave = form.description.trim() && selectedVendorId
  const selectedVendor = vendors.find(v => v.id === selectedVendorId)
  const payments = form.payments ?? []
  const paidTotal = payments.reduce((s, p) => s + p.amount, 0)

  const save = () => {
    if (!canSave) return
    const estimated = estimatedLocal === '' ? 0 : localToGbp(+estimatedLocal, inputCurrency, rates)
    const actual = paidTotal
    onSave({
      id: initial?.id ?? uid(),
      ...form,
      vendorId:         selectedVendorId || undefined,
      estimated,
      actual,
      paid:             estimated > 0 && actual >= estimated,
      currency:         inputCurrency,
      estimatedLocal:   estimatedLocal === '' ? 0 : +estimatedLocal,
      payments,
      paymentStages:    form.paymentStages ?? [],
      // Only preserve final balance fields on booked items — clear on quoted
      finalBalanceDue:  (form.status ?? 'booked') === 'booked' && !finalBalanceTBC ? (finalBalanceDue || undefined) : undefined,
      finalBalanceTBC:  (form.status ?? 'booked') === 'booked' && finalBalanceTBC ? true : undefined,
    })
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1.5px solid #E8D5A3', borderRadius: 10,
    background: '#FFFDF7', color: '#3B2A22', fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none',
  }
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 700, color: '#7A6657', letterSpacing: '0.08em', marginBottom: 5,
  }

  if (vendors.length === 0) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,30,20,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}
        onClick={e => e.target === e.currentTarget && onClose()}>
        <div style={{ background: '#FFF8EE', borderRadius: 20, padding: 40, width: '100%', maxWidth: 420,
          textAlign: 'center', boxShadow: '0 24px 80px rgba(42,30,20,0.22)', border: '1.5px solid #E8D5A3' }}>
          <Store size={36} style={{ color: '#E8D5A3', marginBottom: 16 }} strokeWidth={1}/>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, fontStyle: 'italic', color: '#3B2A22', marginBottom: 10 }}>
            No vendors yet
          </h2>
          <p style={{ fontSize: 13, color: '#7A6657', lineHeight: 1.6, marginBottom: 28 }}>
            Budget expenses must be linked to a vendor. Add your suppliers on the <strong>Vendors</strong> page first.
          </p>
          <button onClick={onClose} style={{ padding: '10px 28px', borderRadius: 12, fontSize: 13, fontWeight: 600,
            border: 'none', background: '#3B2A22', color: '#FFF8EE', cursor: 'pointer' }}>Got it</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,30,20,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#FFF8EE', borderRadius: 20, padding: 36, width: '100%', maxWidth: 540,
        maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(42,30,20,0.22)', border: '1.5px solid #E8D5A3' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, fontStyle: 'italic', color: '#3B2A22', margin: 0 }}>
              {initial ? 'Edit expense' : 'Add expense'}
            </h2>
            <Frangipani size={22} opacity={0.5}/>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A6657' }}>
            <X size={18}/>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Status */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#7A6657', letterSpacing: '0.08em' }}>STATUS</span>
              <Tip content="Booked = confirmed spend, counts toward totals. Quoted = potential spend, excluded from totals until confirmed." side="right">
                <span style={{ width: 15, height: 15, borderRadius: '50%', background: 'rgba(200,164,93,0.2)', border: '1px solid rgba(200,164,93,0.4)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#C8A45D', fontWeight: 700, cursor: 'help' }}>?</span>
              </Tip>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {(['booked', 'quoted'] as BudgetItemStatus[]).map(s => {
                const active = (form.status ?? 'booked') === s
                const isBooked = s === 'booked'
                return (
                  <button key={s} onClick={() => setForm(f => ({ ...f, status: s }))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                      borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                      border: `1.5px solid ${active ? (isBooked ? 'rgba(127,154,120,0.6)' : 'rgba(200,164,93,0.6)') : '#E8D5A3'}`,
                      background: active ? (isBooked ? 'rgba(127,154,120,0.1)' : 'rgba(200,164,93,0.1)') : 'transparent',
                    }}>
                    {isBooked
                      ? <CheckCircle size={14} style={{ color: active ? '#7F9A78' : '#C4B49A', flexShrink: 0 }}/>
                      : <Clock size={14} style={{ color: active ? '#C8A45D' : '#C4B49A', flexShrink: 0 }}/>}
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: active ? '#3B2A22' : '#7A6657', lineHeight: 1 }}>
                        {isBooked ? 'Booked' : 'Quoted'}
                      </p>
                      <p style={{ fontSize: 10, color: '#7A6657', marginTop: 2 }}>
                        {isBooked ? 'Confirmed — counts toward budget' : 'Potential — excluded from totals'}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Vendor */}
          <div>
            <label style={lbl}>
              VENDOR *
              <span style={{ fontSize: 10, fontWeight: 400, color: '#A89080', marginLeft: 6, letterSpacing: 0 }}>
                required
              </span>
            </label>
            <div style={{ position: 'relative' }}>
              <select style={{ ...inp, appearance: 'none', paddingRight: 32,
                border: `1.5px solid ${!selectedVendorId ? 'rgba(196,122,82,0.6)' : '#E8D5A3'}` }}
                value={selectedVendorId} onChange={e => handleVendorChange(e.target.value)}>
                <option value="">— Select a vendor —</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name} ({v.category})</option>)}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#7A6657', pointerEvents: 'none' }}/>
            </div>
            {selectedVendor && (
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 10px', borderRadius: 8, background: 'rgba(127,154,120,0.08)', border: '1px solid rgba(127,154,120,0.25)' }}>
                <Link size={10} style={{ color: '#7F9A78', flexShrink: 0 }}/>
                <span style={{ fontSize: 11, color: '#5A7A54' }}>
                  Linked to <strong>{selectedVendor.name}</strong> · {selectedVendor.category}
                  <span style={{ marginLeft: 6, fontWeight: 600, color: selectedVendor.status === 'booked' ? '#7F9A78' : '#C8A45D' }}>
                    {selectedVendor.status === 'booked' ? 'Booked' : 'Quoted'}
                  </span>
                </span>
              </div>
            )}
          </div>

          {/* Category */}
          <div>
            <label style={lbl}>
              CATEGORY
              {selectedVendorId && <span style={{ fontSize: 10, fontWeight: 400, color: '#A89080', marginLeft: 6, letterSpacing: 0 }}>auto-filled · changeable</span>}
            </label>
            <div style={{ position: 'relative' }}>
              <select style={{ ...inp, appearance: 'none', paddingRight: 32 }}
                value={form.category} onChange={set('category')}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#7A6657', pointerEvents: 'none' }}/>
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={lbl}>DESCRIPTION *</label>
            <input style={inp} value={form.description} onChange={set('description')}
              placeholder="e.g. Villa venue hire, Wedding cake…"/>
          </div>

          {/* Budget amount */}
          <CurrencyAmountInput
            label="TOTAL AMOUNT (BUDGET)"
            localAmount={estimatedLocal}
            inputCurrency={inputCurrency}
            onAmountChange={setEstimatedLocal}
            onCurrencyChange={c => { setInputCurrency(c); setEstimatedLocal('') }}
          />

          {/* Divider */}
          <div style={{ height: 1, background: '#F2E3CF', margin: '2px 0' }}/>

          {/* Payments editor */}
          <PaymentsEditor
            payments={payments}
            estimated={estimatedLocal === '' ? 0 : localToGbp(+estimatedLocal, inputCurrency, rates)}
            currency={inputCurrency}
            rates={rates}
            onChange={p => setForm(f => ({ ...f, payments: p }))}
          />

          {/* Divider */}
          <div style={{ height: 1, background: '#F2E3CF', margin: '2px 0' }}/>

          {/* Payment stages */}
          <PaymentStageEditor
            stages={form.paymentStages ?? []}
            estimated={estimatedLocal === '' ? 0 : localToGbp(+estimatedLocal, inputCurrency, rates)}
            onChange={s => setForm(f => ({ ...f, paymentStages: s }))}
          />

          {/* Divider */}
          <div style={{ height: 1, background: '#F2E3CF', margin: '2px 0' }}/>

          {/* Final balance due — booked items only */}
          {(form.status ?? 'booked') === 'booked' && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#7A6657', letterSpacing: '0.08em', marginBottom: 10 }}>FINAL BALANCE DUE BY</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Date option */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                  border: `1.5px solid ${!finalBalanceTBC ? 'rgba(127,154,120,0.5)' : '#E8D5A3'}`,
                  background: !finalBalanceTBC ? 'rgba(127,154,120,0.07)' : 'transparent',
                }} onClick={() => setFinalBalanceTBC(false)}>
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${!finalBalanceTBC ? '#7F9A78' : '#D4C5A4'}`,
                    background: !finalBalanceTBC ? '#7F9A78' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {!finalBalanceTBC && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }}/>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#3B2A22', marginBottom: 2 }}>Final Balance Due By</p>
                    {!finalBalanceTBC && (
                      <input type="date" value={finalBalanceDue}
                        onChange={e => setFinalBalanceDue(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        style={{ padding: '5px 10px', border: '1.5px solid #E8D5A3', borderRadius: 8,
                          background: '#FFFDF7', color: '#3B2A22', fontSize: 12, outline: 'none',
                          fontFamily: 'Inter, sans-serif', marginTop: 4 }}/>
                    )}
                  </div>
                </div>

                {/* TBC option */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                  border: `1.5px solid ${finalBalanceTBC ? 'rgba(200,164,93,0.5)' : '#E8D5A3'}`,
                  background: finalBalanceTBC ? 'rgba(200,164,93,0.07)' : 'transparent',
                }} onClick={() => { setFinalBalanceTBC(true); setFinalBalanceDue('') }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${finalBalanceTBC ? '#C8A45D' : '#D4C5A4'}`,
                    background: finalBalanceTBC ? '#C8A45D' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {finalBalanceTBC && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }}/>}
                  </div>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#3B2A22' }}>Final Payment Date TBC</p>
                    <p style={{ fontSize: 11, color: '#7A6657', marginTop: 1 }}>Date not yet confirmed — will appear in Upcoming Payments for attention</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label style={lbl}>NOTES (optional)</label>
            <textarea style={{ ...inp, resize: 'vertical', minHeight: 64 }}
              value={form.notes} onChange={set('notes')} placeholder="Supplier details, payment terms…"/>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 10, fontSize: 13,
            border: '1.5px solid #E8D5A3', background: 'transparent', color: '#7A6657', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={save} disabled={!canSave} style={{ flex: 2, padding: 10, borderRadius: 10, fontSize: 13, fontWeight: 600,
            border: 'none', background: canSave ? '#3B2A22' : '#E8D5A3',
            color: canSave ? '#FFF8EE' : '#7A6657', cursor: canSave ? 'pointer' : 'default' }}>
            {initial ? 'Save changes' : 'Add expense'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Category row ──────────────────────────────────────────────────────────────
function CategoryRow({ name, items, vendors, onEdit, onDelete, onToggleStatus }: {
  name: string; items: BudgetItem[]; vendors: Vendor[]
  onEdit: (b: BudgetItem) => void; onDelete: (id: string) => void; onToggleStatus: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const { display: d } = useCurrencyContext()
  const estimated  = items.reduce((s, b) => s + b.estimated, 0)
  const paid       = items.reduce((s, b) => s + totalPaid(b), 0)
  const outstanding = Math.max(0, estimated - paid)
  const pct        = estimated > 0 ? (paid / estimated) * 100 : 0
  const over       = paid > estimated && estimated > 0
  const color      = catColor(name)

  return (
    <div style={{ background: '#FAF3E6', border: '1.5px solid #E8D5A3', borderRadius: 16, overflow: 'hidden', marginBottom: 12 }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'grid',
          gridTemplateColumns: '24px 1fr 110px 110px 110px 80px',
          alignItems: 'center', gap: 0, padding: '16px 20px',
          background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(200,164,93,0.05)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: color }}/>
        <div style={{ paddingRight: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#3B2A22' }}>{name}</span>
            {over && <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#C47A52', fontWeight: 600 }}>
              <AlertTriangle size={10}/> over budget
            </span>}
            <span style={{ fontSize: 11, color: '#7A6657' }}>{items.length} item{items.length !== 1 ? 's' : ''}</span>
          </div>
          <ProgressBar pct={pct} color={color} overBudget={over}/>
        </div>
        <span style={{ fontSize: 13, color: '#7A6657', textAlign: 'right' }}>{d(estimated)}</span>
        <span style={{ fontSize: 13, color: '#7F9A78', fontWeight: 500, textAlign: 'right' }}>{d(paid)}</span>
        <span style={{ fontSize: 13, fontWeight: 500, textAlign: 'right',
          color: over ? '#C47A52' : outstanding === 0 ? '#7A6657' : '#C47A52' }}>
          {d(outstanding)}
        </span>
        <ChevronDown size={14} style={{ color: '#7A6657', justifySelf: 'end',
          transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}/>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid #F2E3CF' }}>
          {items.map((item, i) => {
            const vendor = vendors.find(v => v.id === item.vendorId)
            const itemPaid = totalPaid(item)
            const itemOutstanding = Math.max(0, item.estimated - itemPaid)
            return (
              <div key={item.id} style={{
                display: 'grid', gridTemplateColumns: '24px 1fr 110px 110px 110px 80px',
                alignItems: 'center', gap: 0, padding: '10px 20px',
                borderBottom: i < items.length - 1 ? '1px solid #F2E3CF' : 'none',
                background: 'rgba(255,253,248,0.6)',
              }}>
                <div/>
                <div>
                  <p style={{ fontSize: 12, color: '#3B2A22', fontWeight: 500 }}>{item.description}</p>
                  <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                    {vendor && (
                      <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:9, fontWeight:700,
                        color:'#7F9A78', background:'rgba(127,154,120,0.12)', border:'1px solid rgba(127,154,120,0.3)',
                        padding:'1px 6px', borderRadius:20 }}>
                        <Link size={8}/> {vendor.name}
                      </span>
                    )}
                    <PaymentStatusBadge item={item}/>
                    <StatusPill status={itemStatus(item)} onClick={() => onToggleStatus(item.id)}/>
                    {itemStatus(item) === 'booked' && item.estimated > 0 && (!item.payments || item.payments.length === 0) && item.actual === 0 && (
                      <span style={{ fontSize: 9, color: '#A89080', fontStyle: 'italic' }}>no payments yet · click edit to add</span>
                    )}
                    {(item.payments?.length ?? 0) > 0 && (
                      <span style={{ fontSize: 9, color: '#7A6657' }}>{item.payments!.length} payment{item.payments!.length !== 1 ? 's' : ''}</span>
                    )}
                    {(item.paymentStages?.length ?? 0) > 0 && (() => {
                      const unpaid = item.paymentStages!.filter(s => !s.paid)
                      const overdue = unpaid.filter(s => new Date(s.dueDate + 'T00:00:00') < new Date())
                      return (
                        <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:9, fontWeight:700,
                          color: overdue.length > 0 ? '#C47A52' : '#C8A45D',
                          background: overdue.length > 0 ? 'rgba(196,122,82,0.1)' : 'rgba(200,164,93,0.1)',
                          border: `1px solid ${overdue.length > 0 ? 'rgba(196,122,82,0.4)' : 'rgba(200,164,93,0.4)'}`,
                          padding:'1px 6px', borderRadius:20 }}>
                          <Flag size={8}/> {unpaid.length} stage{unpaid.length !== 1 ? 's' : ''}{overdue.length > 0 ? ` · ${overdue.length} overdue` : ''}
                        </span>
                      )
                    })()}
                    {item.finalBalanceTBC && (
                      <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:9, fontWeight:700,
                        color:'#C8A45D', background:'rgba(200,164,93,0.1)', border:'1px solid rgba(200,164,93,0.4)',
                        padding:'1px 6px', borderRadius:20 }}>
                        <Calendar size={8}/> Balance date TBC
                      </span>
                    )}
                    {item.finalBalanceDue && !item.finalBalanceTBC && (() => {
                      const due = new Date(item.finalBalanceDue + 'T00:00:00')
                      const now = new Date(); now.setHours(0,0,0,0)
                      const overdue = due < now
                      const soon = !overdue && (due.getTime() - now.getTime()) <= 14 * 86400000
                      return (overdue || soon) ? (
                        <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:9, fontWeight:700,
                          color: overdue ? '#C47A52' : '#C8A45D',
                          background: overdue ? 'rgba(196,122,82,0.1)' : 'rgba(200,164,93,0.1)',
                          border: `1px solid ${overdue ? 'rgba(196,122,82,0.4)' : 'rgba(200,164,93,0.4)'}`,
                          padding:'1px 6px', borderRadius:20 }}>
                          <Calendar size={8}/> {overdue ? 'Final balance overdue' : 'Final balance due soon'}
                        </span>
                      ) : null
                    })()}
                    {item.currency && item.currency !== 'GBP' && item.estimatedLocal && (
                      <span style={{ fontSize: 10, color: '#C8A45D', fontWeight: 600 }}>
                        Rp {item.estimatedLocal.toLocaleString('id-ID')}
                      </span>
                    )}
                    {item.notes && <span style={{ fontSize: 10, color: '#7A6657', fontStyle: 'italic' }}>{item.notes}</span>}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: '#7A6657', textAlign: 'right' }}>{d(item.estimated)}</span>
                <span style={{ fontSize: 12, color: '#7F9A78', fontWeight: 500, textAlign: 'right' }}>{d(itemPaid)}</span>
                <span style={{ fontSize: 12, textAlign: 'right',
                  color: itemOutstanding > 0 ? '#C47A52' : '#7A6657' }}>
                  {d(itemOutstanding)}
                </span>
                <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end', alignItems: 'center' }}>
                  <button onClick={() => onEdit(item)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A6657', padding: 4 }}>
                    <Edit2 size={13} strokeWidth={1.5}/>
                  </button>
                  <button onClick={() => onDelete(item.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C47A52', padding: 4 }}>
                    <Trash2 size={13} strokeWidth={1.5}/>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Quoted row ────────────────────────────────────────────────────────────────
function QuotedRow({ item, vendors, onEdit, onDelete, onToggleStatus }: {
  item: BudgetItem; vendors: Vendor[]
  onEdit: (b: BudgetItem) => void; onDelete: (id: string) => void; onToggleStatus: (id: string) => void
}) {
  const { display: d } = useCurrencyContext()
  const vendor = vendors.find(v => v.id === item.vendorId)
  const itemPaid = totalPaid(item)
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 16px', background: 'rgba(255,253,248,0.6)', borderBottom: '1px solid #F2E3CF' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: '#3B2A22' }}>{item.description}</span>
          <span style={{ fontSize: 10, color: '#7A6657' }}>· {item.category}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap', alignItems: 'center' }}>
          {vendor && (
            <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:9, fontWeight:700,
              color:'#7F9A78', background:'rgba(127,154,120,0.12)', border:'1px solid rgba(127,154,120,0.3)',
              padding:'1px 6px', borderRadius:20 }}>
              <Link size={8}/> {vendor.name}
            </span>
          )}
          {item.notes && <span style={{ fontSize: 10, color: '#7A6657', fontStyle: 'italic' }}>{item.notes}</span>}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 12, color: '#7A6657', minWidth: 70, textAlign: 'right' }}>{d(item.estimated)}</span>
        {itemPaid > 0 && <span style={{ fontSize: 12, color: '#7F9A78', fontWeight: 600 }}>{d(itemPaid)} paid</span>}
        <PaymentStatusBadge item={item}/>
        <StatusPill status="quoted" onClick={() => onToggleStatus(item.id)}/>
        <button onClick={() => onEdit(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A6657', padding: 4 }}>
          <Edit2 size={13} strokeWidth={1.5}/>
        </button>
        <button onClick={() => onDelete(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C47A52', padding: 4 }}>
          <Trash2 size={13} strokeWidth={1.5}/>
        </button>
      </div>
    </div>
  )
}

// ── Pie tooltip ───────────────────────────────────────────────────────────────
function PieTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#FFF8EE', border: '1.5px solid #E8D5A3', borderRadius: 10,
      padding: '10px 14px', boxShadow: '0 8px 24px rgba(42,30,20,0.12)' }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: '#3B2A22', marginBottom: 2 }}>{payload[0].name}</p>
      <p style={{ fontSize: 13, color: '#C8A45D', fontFamily: 'Playfair Display, serif' }}>{fmt(payload[0].value)}</p>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
interface Props {
  data: AppData
  setData: (d: AppData | ((prev: AppData) => AppData)) => void
  openExpenseId?: string   // if set, open edit modal for this item on mount
  onExpenseOpened?: () => void  // called once the modal is open so parent can clear the trigger
}

export function Budget({ data, setData, openExpenseId, onExpenseOpened }: Props) {
  const items   = data.budget
  const vendors = data.vendors as Vendor[]

  const [modal, setModal] = useState<'new' | BudgetItem | null>(null)

  // Open a specific expense's modal when triggered from Upcoming Payments
  useEffect(() => {
    if (openExpenseId) {
      const found = data.budget.find(b => b.id === openExpenseId)
      if (found) { setModal(found); onExpenseOpened?.() }
    }
  }, [openExpenseId])

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { display: d } = useCurrencyContext()

  const update = (budget: BudgetItem[]) => setData(prev => ({ ...prev, budget }))

  const saveItem = (b: BudgetItem) => {
    const exists = items.find(x => x.id === b.id)
    update(exists ? items.map(x => x.id === b.id ? b : x) : [...items, b])
    setModal(null)
  }

  const deleteItem = (id: string) => { update(items.filter(i => i.id !== id)); setDeleteId(null) }

  const toggleStatus = (id: string) => {
    update(items.map(item =>
      item.id === id ? { ...item, status: itemStatus(item) === 'booked' ? 'quoted' : 'booked' } : item
    ))
  }

  const bookedItems = items.filter(b => itemStatus(b) === 'booked')
  const quotedItems = items.filter(b => itemStatus(b) === 'quoted')

  const totalEstimated  = bookedItems.reduce((s, b) => s + b.estimated, 0)
  const totalPaidAmt    = bookedItems.reduce((s, b) => s + totalPaid(b), 0)
  const totalOutstanding = Math.max(0, totalEstimated - totalPaidAmt)
  const pct             = totalEstimated > 0 ? Math.round((totalPaidAmt / totalEstimated) * 100) : 0
  const overBudget      = totalPaidAmt > totalEstimated && totalEstimated > 0
  const totalQuotedPipeline = quotedItems.reduce((s, b) => s + b.estimated, 0)

  const byCategory = useMemo(() => {
    const map: Record<string, BudgetItem[]> = {}
    bookedItems.forEach(b => { if (!map[b.category]) map[b.category] = []; map[b.category].push(b) })
    return map
  }, [bookedItems])

  // Pie shows only what has actually been paid — no budget estimates mixed in
  const pieData = useMemo(() =>
    Object.entries(byCategory)
      .map(([name, its]) => ({ name, value: its.reduce((s, b) => s + totalPaid(b), 0) }))
      .filter(entry => entry.value > 0)
      .sort((a, b) => b.value - a.value)
  , [byCategory])

  const categoriesWithItems = CATEGORIES.filter(c => byCategory[c]?.length)

  return (
    <div className="page-content" style={{ maxWidth: 1100 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 30, fontStyle: 'italic', color: '#3B2A22', margin: 0 }}>Budget</h1>
            <SmallLeaf size={22} opacity={0.6} rotate={-15}/>
            <Frangipani size={26} opacity={0.5}/>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <p style={{ fontSize: 13, color: '#7A6657' }}>Track every penny with calm and clarity.</p>
            <TourButton tourId="budget" label="How it works"/>
          </div>
          <div style={{ marginTop: 10 }}><CurrencyToggle/></div>
        </div>
        <button onClick={() => setModal('new')}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 12,
            background: '#3B2A22', color: '#FFF8EE', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={15} strokeWidth={2}/> Add expense
        </button>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid-4" style={{ marginBottom: 8 }}>
        <SummaryCard label="TOTAL BUDGET"    value={d(totalEstimated)}   sub="estimated (booked)" color="#C8A45D" accent/>
        <SummaryCard label="TOTAL PAID"      value={d(totalPaidAmt)}     sub={`${pct}% of budget`} color={overBudget ? '#C47A52' : '#7F9A78'} accent={overBudget}/>
        <SummaryCard label="OUTSTANDING"     value={d(totalOutstanding)} sub={overBudget ? 'over budget' : 'still to pay'} color={totalOutstanding > 0 ? '#C47A52' : '#7F9A78'}/>
        <SummaryCard label="FULLY PAID"      value={`${bookedItems.filter(b => paymentState(b) === 'full').length} / ${bookedItems.length}`} sub="expenses cleared" color="#C8A45D"/>
      </div>

      {/* Quoted pipeline notice */}
      {totalQuotedPipeline > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
          borderRadius: 10, background: 'rgba(200,164,93,0.08)', border: '1px solid rgba(200,164,93,0.3)',
          marginBottom: 8, fontSize: 13, color: '#8B6914' }}>
          <Clock size={13} style={{ flexShrink: 0 }}/>
          <span>
            <strong>{quotedItems.length} quoted expense{quotedItems.length !== 1 ? 's' : ''}</strong> ({d(totalQuotedPipeline)}) not included in totals
          </span>
        </div>
      )}

      {/* Over-budget warning */}
      {overBudget && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderRadius: 12, marginBottom: 16,
          background: 'rgba(196,122,82,0.08)', border: '1px solid rgba(196,122,82,0.3)' }}>
          <AlertTriangle size={15} style={{ color: '#C47A52', flexShrink: 0 }} strokeWidth={1.8}/>
          <p style={{ fontSize: 13, color: '#C47A52' }}>
            You're <strong>{fmt(totalPaidAmt - totalEstimated)}</strong> over budget.
          </p>
        </div>
      )}

      {/* Progress bar */}
      {totalEstimated > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ height: 8, borderRadius: 10, background: '#F2E3CF', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 10, width: `${Math.min(pct, 100)}%`,
              background: overBudget ? 'linear-gradient(90deg, #C47A52, #E09070)' : 'linear-gradient(90deg, #C8A45D, #E8C87A)',
              transition: 'width 0.8s ease' }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: 11, color: '#7A6657' }}>{pct}% paid</span>
            <span style={{ fontSize: 11, color: '#C8A45D' }}>{fmt(totalEstimated)} budget</span>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
        <BaliBorder width={500} opacity={0.55}/>
      </div>

      {/* ── Main content ── */}
      {bookedItems.length === 0 && quotedItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 24px',
          background: '#FAF3E6', borderRadius: 16, border: '1.5px solid #E8D5A3' }}>
          <TrendingUp size={36} style={{ color: '#E8D5A3', marginBottom: 14 }} strokeWidth={1}/>
          <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: '#3B2A22', marginBottom: 8 }}>No expenses yet</p>
          <p style={{ fontSize: 13, color: '#7A6657' }}>Click "Add expense" to start tracking your budget.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 32, alignItems: 'start' }}>

          <div>
            {/* Booked */}
            {bookedItems.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 3, height: 18, backgroundColor: '#7F9A78', borderRadius: 2 }}/>
                  <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, color: '#3B2A22', margin: 0 }}>Booked Expenses</h2>
                  <span style={{ fontSize: 11, color: '#7F9A78', background: 'rgba(127,154,120,0.12)',
                    border: '1px solid rgba(127,154,120,0.3)', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                    {bookedItems.length} · {d(totalEstimated)}
                  </span>
                </div>

                {/* Column headers */}
                <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 110px 110px 110px 80px',
                  padding: '6px 20px', marginBottom: 4 }}>
                  {['', '', 'Budget', 'Paid', 'Outstanding', ''].map((h, i) => (
                    <span key={i} style={{ fontSize: 10, fontWeight: 700, color: '#7A6657', letterSpacing: '0.1em',
                      textAlign: i > 1 ? 'right' : 'left' }}>{h}</span>
                  ))}
                </div>

                {categoriesWithItems.map(cat => (
                  <CategoryRow key={cat} name={cat}
                    items={byCategory[cat] ?? []}
                    vendors={vendors}
                    onEdit={setModal}
                    onDelete={setDeleteId}
                    onToggleStatus={toggleStatus}
                  />
                ))}
              </div>
            )}

            {/* Quoted */}
            {quotedItems.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 3, height: 18, backgroundColor: '#C8A45D', borderRadius: 2 }}/>
                  <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, color: '#3B2A22', margin: 0 }}>Quoted Expenses</h2>
                  <span style={{ fontSize: 11, color: '#8B6914', background: 'rgba(200,164,93,0.12)',
                    border: '1px solid rgba(200,164,93,0.3)', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                    {quotedItems.length} · {d(totalQuotedPipeline)}
                  </span>
                  <span style={{ fontSize: 11, color: '#A89080', fontStyle: 'italic' }}>not included in totals</span>
                </div>
                <div style={{ background: '#FAF3E6', border: '1.5px solid rgba(200,164,93,0.4)', borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 16px', background: 'rgba(200,164,93,0.06)', borderBottom: '1px solid rgba(200,164,93,0.2)' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#7A6657', letterSpacing: '0.1em' }}>EXPENSE</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#7A6657', letterSpacing: '0.1em' }}>ESTIMATE &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
                  </div>
                  {quotedItems.map(item => (
                    <QuotedRow key={item.id} item={item} vendors={vendors}
                      onEdit={setModal} onDelete={setDeleteId} onToggleStatus={toggleStatus}/>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Pie chart */}
          {pieData.length > 0 && (
            <div style={{ position: 'sticky', top: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{ width: 3, height: 18, backgroundColor: '#C47A52', borderRadius: 2 }}/>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, color: '#3B2A22', margin: 0 }}>Payments by category</h2>
              </div>
              <p style={{ fontSize: 11, color: '#A89080', fontStyle: 'italic', marginBottom: 12 }}>
                Amounts actually paid — unpaid expenses not included
              </p>
              <div style={{ background: '#FAF3E6', border: '1.5px solid #E8D5A3', borderRadius: 16, padding: '20px 16px' }}>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                      paddingAngle={2} dataKey="value" strokeWidth={0}>
                      {pieData.map((entry, i) => <Cell key={i} fill={catColor(entry.name)} opacity={0.85}/>)}
                    </Pie>
                    <Tooltip content={<PieTooltip/>}/>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ textAlign: 'center', marginTop: -8, marginBottom: 16 }}>
                  <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 13, color: '#7A6657', fontStyle: 'italic' }}>
                    {fmt(pieData.reduce((s, e) => s + e.value, 0))} paid so far
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {pieData.slice(0, 8).map(entry => (
                    <div key={entry.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: catColor(entry.name) }}/>
                        <span style={{ fontSize: 11, color: '#7A6657' }}>{entry.name}</span>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#3B2A22' }}>{fmt(entry.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Export */}
      <div style={{ marginTop: 36 }}>
        <button onClick={() => exportJSON(data)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 12,
            border: '1.5px solid #E8D5A3', background: '#FAF3E6', color: '#3B2A22', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          <FileJson size={14} strokeWidth={2}/> Export all data JSON
        </button>
      </div>

      {/* Modals */}
      {modal && (
        <ItemModal
          initial={modal === 'new' ? undefined : modal as BudgetItem}
          vendors={vendors}
          onSave={saveItem} onClose={() => setModal(null)}
        />
      )}

      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,30,20,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <div style={{ background: '#FFF8EE', borderRadius: 20, padding: 36, maxWidth: 360, width: '100%',
            textAlign: 'center', boxShadow: '0 24px 60px rgba(42,30,20,0.2)', border: '1.5px solid #E8D5A3' }}>
            <Trash2 size={28} style={{ color: '#C47A52', marginBottom: 14 }} strokeWidth={1.5}/>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: '#3B2A22', marginBottom: 8 }}>Remove expense?</h3>
            <p style={{ fontSize: 13, color: '#7A6657', marginBottom: 28 }}>
              {items.find(i => i.id === deleteId)?.description} will be removed.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: 10, borderRadius: 10, fontSize: 13,
                border: '1.5px solid #E8D5A3', background: 'transparent', color: '#7A6657', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => deleteItem(deleteId)} style={{ flex: 1, padding: 10, borderRadius: 10, fontSize: 13,
                fontWeight: 600, border: 'none', background: '#C47A52', color: '#fff', cursor: 'pointer' }}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
