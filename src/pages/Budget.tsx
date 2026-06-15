import { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Plus, Edit2, Trash2, FileJson, AlertTriangle, TrendingUp, X, ChevronDown, Link } from 'lucide-react'
import { SmallLeaf, Frangipani, BaliBorder } from '../components/Botanicals'
import { CurrencyToggle } from '../components/CurrencyToggle'
import { useCurrencyContext } from '../context/CurrencyContext'
import { CurrencyAmountInput, localToGbp } from '../components/CurrencyAmountInput'
import type { BudgetItem, AppData } from '../types'
import type { Currency } from '../hooks/useCurrency'

// ── helpers ───────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2, 10) }

function exportJSON(data: AppData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `wedding-data-${new Date().toISOString().split('T')[0]}.json`
  a.click(); URL.revokeObjectURL(url)
}

function fmt(n: number) {
  return '£' + n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

// ── constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
  'Venue', 'Catering', 'Photography', 'Videography',
  'Flowers & Décor', 'Attire', 'Music & Entertainment',
  'Hair & Beauty', 'Transport', 'Stationery',
  'Honeymoon', 'Gifts & Favours', 'Miscellaneous',
]

const CATEGORY_COLORS: Record<string, string> = {
  'Venue':               '#C8A45D',
  'Catering':            '#7F9A78',
  'Photography':         '#C47A52',
  'Videography':         '#B8864A',
  'Flowers & Décor':     '#8B9B6B',
  'Attire':              '#D4956A',
  'Music & Entertainment':'#9BAF78',
  'Hair & Beauty':       '#E0B87A',
  'Transport':           '#A8956B',
  'Stationery':          '#C4AF7E',
  'Honeymoon':           '#7A9A82',
  'Gifts & Favours':     '#B89060',
  'Miscellaneous':       '#8A7A6A',
}

function catColor(cat: string) { return CATEGORY_COLORS[cat] ?? '#C8A45D' }

// ── types ─────────────────────────────────────────────────────────────────────
const EMPTY_ITEM: Omit<BudgetItem, 'id'> = {
  category: CATEGORIES[0],
  description: '',
  estimated: 0,
  actual: 0,
  paid: false,
  notes: '',
}

// ── sub-components ────────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, color, accent = false }: {
  label: string; value: string; sub?: string; color: string; accent?: boolean
}) {
  return (
    <div style={{
      background: accent
        ? `linear-gradient(135deg, ${color}22, ${color}0a)`
        : '#FAF3E6',
      border: `1.5px solid ${accent ? color + '55' : '#E8D5A3'}`,
      borderRadius: 16, padding: '20px 24px',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', bottom: 0, right: 0, pointerEvents: 'none' }}>
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" opacity={0.1}>
          <rect x="4" y="4" width="40" height="40" rx="4" transform="rotate(45 24 24)"
            fill={color}/>
        </svg>
      </div>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#7A6657', letterSpacing: '0.1em', marginBottom: 8 }}>
        {label}
      </p>
      <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 500, color: accent ? color : '#3B2A22', lineHeight: 1 }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: 11, color: '#7A6657', marginTop: 5 }}>{sub}</p>}
    </div>
  )
}

function ProgressBar({ pct, color, overBudget }: { pct: number; color: string; overBudget: boolean }) {
  const clamped = Math.min(pct, 100)
  return (
    <div style={{ height: 6, borderRadius: 10, background: '#F2E3CF', overflow: 'hidden', position: 'relative' }}>
      <div style={{
        height: '100%', borderRadius: 10,
        width: `${clamped}%`,
        background: overBudget
          ? 'linear-gradient(90deg, #C47A52, #E09070)'
          : `linear-gradient(90deg, ${color}, ${color}99)`,
        transition: 'width 0.6s ease',
      }}/>
    </div>
  )
}

// ── Budget item modal ──────────────────────────────────────────────────────────
function ItemModal({
  initial, onSave, onClose,
}: {
  initial?: BudgetItem; onSave: (b: BudgetItem) => void; onClose: () => void
}) {
  const { rates } = useCurrencyContext()
  const [form, setForm] = useState<Omit<BudgetItem, 'id'>>(
    initial ? { ...initial } : { ...EMPTY_ITEM }
  )
  // Local (input-currency) amounts — separate from the GBP-stored values
  const [inputCurrency, setInputCurrency] = useState<Currency>(initial?.currency ?? 'GBP')
  const [estimatedLocal, setEstimatedLocal] = useState<number | ''>(
    initial?.estimatedLocal ?? initial?.estimated ?? ''
  )
  const [actualLocal, setActualLocal] = useState<number | ''>(
    initial?.actualLocal ?? initial?.actual ?? ''
  )

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  const save = () => {
    if (!form.description.trim()) return
    const estimated = estimatedLocal === '' ? 0 : localToGbp(+estimatedLocal, inputCurrency, rates)
    const actual    = actualLocal    === '' ? 0 : localToGbp(+actualLocal,    inputCurrency, rates)
    onSave({
      id: initial?.id ?? uid(),
      ...form,
      estimated,
      actual,
      currency:       inputCurrency,
      estimatedLocal: estimatedLocal === '' ? 0 : +estimatedLocal,
      actualLocal:    actualLocal    === '' ? 0 : +actualLocal,
    })
  }

  const input: React.CSSProperties = {
    width: '100%', padding: '9px 12px',
    border: '1.5px solid #E8D5A3', borderRadius: 10,
    background: '#FFFDF7', color: '#3B2A22', fontSize: 13,
    fontFamily: 'Inter, sans-serif', outline: 'none',
  }
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 700,
    color: '#7A6657', letterSpacing: '0.08em', marginBottom: 5,
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(42,30,20,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, padding: 16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: '#FFF8EE', borderRadius: 20, padding: 36,
        width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 24px 80px rgba(42,30,20,0.22)',
        border: '1.5px solid #E8D5A3',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, fontStyle: 'italic', color: '#3B2A22', margin: 0 }}>
              {initial ? 'Edit expense' : 'Add expense'}
            </h2>
            <Frangipani size={22} opacity={0.5} />
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A6657' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Category */}
          <div>
            <label style={lbl}>CATEGORY</label>
            <div style={{ position: 'relative' }}>
              <select style={{ ...input, appearance: 'none', paddingRight: 32 }}
                value={form.category} onChange={set('category')}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#7A6657', pointerEvents: 'none' }}/>
            </div>
          </div>
          {/* Description */}
          <div>
            <label style={lbl}>DESCRIPTION *</label>
            <input style={input} value={form.description} onChange={set('description')}
              placeholder="e.g. Villa venue hire, Wedding cake…"/>
          </div>
          {/* Amounts with currency selector */}
          <CurrencyAmountInput
            label="BUDGETED AMOUNT"
            localAmount={estimatedLocal}
            inputCurrency={inputCurrency}
            onAmountChange={setEstimatedLocal}
            onCurrencyChange={c => { setInputCurrency(c); setEstimatedLocal(''); setActualLocal('') }}
          />
          <CurrencyAmountInput
            label="ACTUAL SPENT"
            localAmount={actualLocal}
            inputCurrency={inputCurrency}
            onAmountChange={setActualLocal}
            onCurrencyChange={c => { setInputCurrency(c); setEstimatedLocal(''); setActualLocal('') }}
          />
          {/* Paid toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setForm(f => ({ ...f, paid: !f.paid }))}
              style={{
                width: 40, height: 22, borderRadius: 11,
                background: form.paid ? '#7F9A78' : '#E8D5A3',
                border: 'none', cursor: 'pointer', position: 'relative',
                transition: 'background 0.2s',
              }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 3,
                left: form.paid ? 21 : 3,
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}/>
            </button>
            <span style={{ fontSize: 13, color: '#3B2A22', fontWeight: 500 }}>
              {form.paid ? 'Paid ✓' : 'Not yet paid'}
            </span>
          </div>
          {/* Notes */}
          <div>
            <label style={lbl}>NOTES (optional)</label>
            <textarea style={{ ...input, resize: 'vertical', minHeight: 64 }}
              value={form.notes} onChange={set('notes')} placeholder="Supplier details, deposit info…"/>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: 10, borderRadius: 10, fontSize: 13,
            border: '1.5px solid #E8D5A3', background: 'transparent', color: '#7A6657', cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={save} disabled={!form.description.trim()} style={{
            flex: 2, padding: 10, borderRadius: 10, fontSize: 13, fontWeight: 600,
            border: 'none',
            background: form.description.trim() ? '#3B2A22' : '#E8D5A3',
            color: form.description.trim() ? '#FFF8EE' : '#7A6657',
            cursor: form.description.trim() ? 'pointer' : 'default',
          }}>
            {initial ? 'Save changes' : 'Add expense'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Category row ───────────────────────────────────────────────────────────────
function CategoryRow({ name, items, onEdit, onDelete }: {
  name: string
  items: BudgetItem[]
  onEdit: (b: BudgetItem) => void
  onDelete: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const { display: d } = useCurrencyContext()
  const estimated = items.reduce((s, b) => s + b.estimated, 0)
  const actual    = items.reduce((s, b) => s + b.actual,    0)
  const remaining = estimated - actual
  const pct       = estimated > 0 ? (actual / estimated) * 100 : 0
  const over      = actual > estimated && estimated > 0
  const color     = catColor(name)

  return (
    <div style={{
      background: '#FAF3E6', border: '1.5px solid #E8D5A3',
      borderRadius: 16, overflow: 'hidden', marginBottom: 12,
    }}>
      {/* Header row */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'grid',
          gridTemplateColumns: '24px 1fr 100px 100px 100px 80px',
          alignItems: 'center', gap: 0,
          padding: '16px 20px', background: 'transparent',
          border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(200,164,93,0.05)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
      >
        {/* Colour dot */}
        <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }}/>

        {/* Category name + bar */}
        <div style={{ paddingRight: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#3B2A22' }}>{name}</span>
            {over && (
              <span style={{
                display: 'flex', alignItems: 'center', gap: 3,
                fontSize: 10, color: '#C47A52', fontWeight: 600,
              }}>
                <AlertTriangle size={10}/> over budget
              </span>
            )}
            <span style={{ fontSize: 11, color: '#7A6657' }}>{items.length} item{items.length !== 1 ? 's' : ''}</span>
          </div>
          <ProgressBar pct={pct} color={color} overBudget={over} />
        </div>

        <span style={{ fontSize: 13, color: '#7A6657', textAlign: 'right' }}>{d(estimated)}</span>
        <span style={{ fontSize: 13, color: '#3B2A22', fontWeight: 500, textAlign: 'right' }}>{d(actual)}</span>
        <span style={{
          fontSize: 13, fontWeight: 500, textAlign: 'right',
          color: over ? '#C47A52' : remaining === 0 ? '#7A6657' : '#7F9A78',
        }}>{over ? '-' : ''}{d(Math.abs(remaining))}</span>

        <ChevronDown size={14} style={{
          color: '#7A6657', justifySelf: 'end',
          transform: open ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s',
        }}/>
      </button>

      {/* Expanded items */}
      {open && (
        <div style={{ borderTop: '1px solid #F2E3CF' }}>
          {items.map((item, i) => (
            <div key={item.id} style={{
              display: 'grid',
              gridTemplateColumns: '24px 1fr 100px 100px 100px 80px',
              alignItems: 'center', gap: 0,
              padding: '10px 20px',
              borderBottom: i < items.length - 1 ? '1px solid #F2E3CF' : 'none',
              background: 'rgba(255,253,248,0.6)',
            }}>
              <div/>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <p style={{ fontSize: 12, color: '#3B2A22', fontWeight: 500 }}>{item.description}</p>
                  {item.vendorId && (
                    <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:9, fontWeight:700,
                      color:'#7F9A78', background:'rgba(127,154,120,0.12)', border:'1px solid rgba(127,154,120,0.3)',
                      padding:'1px 6px', borderRadius:20 }}>
                      <Link size={8}/> Vendor
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                  {item.paid && <span style={{ fontSize: 10, color: '#7F9A78', fontWeight: 600 }}>PAID</span>}
                  {item.currency && item.currency !== 'GBP' && item.estimatedLocal && (
                    <span style={{ fontSize: 10, color: '#C8A45D', fontWeight: 600 }}>
                      {item.currency === 'IDR' ? 'Rp' : '$'} {item.estimatedLocal.toLocaleString(item.currency === 'IDR' ? 'id-ID' : 'en-US')}
                    </span>
                  )}
                  {item.notes && <span style={{ fontSize: 10, color: '#7A6657', fontStyle: 'italic' }}>{item.notes}</span>}
                </div>
              </div>
              <span style={{ fontSize: 12, color: '#7A6657', textAlign: 'right' }}>{d(item.estimated)}</span>
              <span style={{ fontSize: 12, color: '#3B2A22', textAlign: 'right' }}>{d(item.actual)}</span>
              <span style={{
                fontSize: 12, textAlign: 'right',
                color: item.actual > item.estimated && item.estimated > 0 ? '#C47A52' : '#7A6657',
              }}>
                {d(item.estimated - item.actual)}
              </span>
              <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
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
          ))}
        </div>
      )}
    </div>
  )
}

// ── Custom pie tooltip ─────────────────────────────────────────────────────────
function PieTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#FFF8EE', border: '1.5px solid #E8D5A3',
      borderRadius: 10, padding: '10px 14px',
      boxShadow: '0 8px 24px rgba(42,30,20,0.12)',
    }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: '#3B2A22', marginBottom: 2 }}>{payload[0].name}</p>
      <p style={{ fontSize: 13, color: '#C8A45D', fontFamily: 'Playfair Display, serif' }}>
        {fmt(payload[0].value)}
      </p>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
interface Props {
  data: AppData
  setData: (d: AppData | ((prev: AppData) => AppData)) => void
}

export function Budget({ data, setData }: Props) {
  const items = data.budget
  const [modal, setModal] = useState<'new' | BudgetItem | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { display: fmtCurrency } = useCurrencyContext()

  // Use currency-aware formatting for all money values
  const d = fmtCurrency

  const update = (budget: BudgetItem[]) => setData(d => ({ ...d, budget }))

  const saveItem = (b: BudgetItem) => {
    const exists = items.find(x => x.id === b.id)
    update(exists ? items.map(x => x.id === b.id ? b : x) : [...items, b])
    setModal(null)
  }
  const deleteItem = (id: string) => { update(items.filter(i => i.id !== id)); setDeleteId(null) }

  // Aggregates
  const totalEstimated = items.reduce((s, b) => s + b.estimated, 0)
  const totalActual    = items.reduce((s, b) => s + b.actual,    0)
  const totalPaid      = items.filter(b => b.paid).reduce((s, b) => s + b.actual, 0)
  const remaining      = totalEstimated - totalActual
  const pct            = totalEstimated > 0 ? Math.round((totalActual / totalEstimated) * 100) : 0
  const overBudget     = totalActual > totalEstimated && totalEstimated > 0

  // Group by category
  const byCategory = useMemo(() => {
    const map: Record<string, BudgetItem[]> = {}
    items.forEach(b => { if (!map[b.category]) map[b.category] = []; map[b.category].push(b) })
    return map
  }, [items])

  // Pie chart data — actual spend by category
  const pieData = useMemo(() =>
    Object.entries(byCategory)
      .map(([name, its]) => ({ name, value: its.reduce((s, b) => s + (b.actual || b.estimated), 0) }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value)
  , [byCategory])

  const categoriesWithItems = CATEGORIES.filter(c => byCategory[c]?.length)
  const categoriesEmpty = items.length === 0

  return (
    <div className="page-content" style={{maxWidth: 1000}}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 30, fontStyle: 'italic', color: '#3B2A22', margin: 0 }}>
              Budget
            </h1>
            <SmallLeaf size={22} opacity={0.6} rotate={-15} />
            <Frangipani size={26} opacity={0.5} />
          </div>
          <p style={{ fontSize: 13, color: '#7A6657' }}>Track every penny with calm and clarity.</p>
          <div style={{ marginTop: 10 }}><CurrencyToggle /></div>
        </div>
        <button
          onClick={() => setModal('new')}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '10px 20px', borderRadius: 12,
            background: '#3B2A22', color: '#FFF8EE',
            border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Plus size={15} strokeWidth={2}/> Add expense
        </button>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid-4" style={{ marginBottom: 14 }}>
        <SummaryCard label="TOTAL BUDGET"  value={d(totalEstimated)} sub="estimated total" color="#C8A45D" accent />
        <SummaryCard label="TOTAL SPENT"   value={d(totalActual)}    sub={`${pct}% of budget`} color={overBudget ? '#C47A52' : '#7F9A78'} accent={overBudget} />
        <SummaryCard label="REMAINING"     value={d(Math.abs(remaining))}
          sub={overBudget ? 'over budget' : 'left to spend'} color={overBudget ? '#C47A52' : '#7F9A78'} />
        <SummaryCard label="PAID"          value={d(totalPaid)}     sub={`of ${d(totalActual)} spent`} color="#C8A45D" />
      </div>

      {/* Over-budget gentle warning */}
      {overBudget && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 18px', borderRadius: 12, marginBottom: 16,
          background: 'rgba(196,122,82,0.08)', border: '1px solid rgba(196,122,82,0.3)',
        }}>
          <AlertTriangle size={15} style={{ color: '#C47A52', flexShrink: 0 }} strokeWidth={1.8}/>
          <p style={{ fontSize: 13, color: '#C47A52' }}>
            You're <strong>{fmt(totalActual - totalEstimated)}</strong> over budget.
            Consider reviewing your largest categories.
          </p>
        </div>
      )}

      {/* Overall progress bar */}
      {totalEstimated > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ height: 8, borderRadius: 10, background: '#F2E3CF', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 10,
              width: `${Math.min(pct, 100)}%`,
              background: overBudget
                ? 'linear-gradient(90deg, #C47A52, #E09070)'
                : 'linear-gradient(90deg, #C8A45D, #E8C87A)',
              transition: 'width 0.8s ease',
            }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: 11, color: '#7A6657' }}>{pct}% used</span>
            <span style={{ fontSize: 11, color: '#C8A45D' }}>{fmt(totalEstimated)} total</span>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
        <BaliBorder width={500} opacity={0.55} />
      </div>

      {/* ── Main content: chart + categories ── */}
      {categoriesEmpty ? (
        <div style={{
          textAlign: 'center', padding: '56px 24px',
          background: '#FAF3E6', borderRadius: 16, border: '1.5px solid #E8D5A3',
        }}>
          <TrendingUp size={36} style={{ color: '#E8D5A3', marginBottom: 14 }} strokeWidth={1}/>
          <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: '#3B2A22', marginBottom: 8 }}>
            No expenses yet
          </p>
          <p style={{ fontSize: 13, color: '#7A6657' }}>Click "Add expense" to start tracking your budget.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 32, alignItems: 'start' }}>

          {/* ── Categories list ── */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 3, height: 18, backgroundColor: '#C47A52', borderRadius: 2 }}/>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, color: '#3B2A22', margin: 0 }}>
                By category
              </h2>
            </div>

            {/* Column headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '24px 1fr 100px 100px 100px 80px',
              padding: '6px 20px', marginBottom: 4,
            }}>
              {['', '', 'Budgeted', 'Actual', 'Remaining', ''].map((h, i) => (
                <span key={i} style={{ fontSize: 10, fontWeight: 700, color: '#7A6657', letterSpacing: '0.1em', textAlign: i > 1 ? 'right' : 'left' }}>
                  {h}
                </span>
              ))}
            </div>

            {categoriesWithItems.map(cat => (
              <CategoryRow
                key={cat} name={cat}
                items={byCategory[cat] ?? []}
                onEdit={setModal}
                onDelete={setDeleteId}
              />
            ))}
          </div>

          {/* ── Pie chart ── */}
          <div style={{ position: 'sticky', top: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 3, height: 18, backgroundColor: '#C47A52', borderRadius: 2 }}/>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, color: '#3B2A22', margin: 0 }}>
                Breakdown
              </h2>
            </div>

            <div style={{
              background: '#FAF3E6', border: '1.5px solid #E8D5A3',
              borderRadius: 16, padding: '20px 16px',
            }}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={catColor(entry.name)} opacity={0.85}/>
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Centre label */}
              <div style={{ textAlign: 'center', marginTop: -8, marginBottom: 16 }}>
                <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 13, color: '#7A6657', fontStyle: 'italic' }}>
                  total spend
                </p>
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {pieData.slice(0, 8).map(d => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: catColor(d.name), flexShrink: 0 }}/>
                      <span style={{ fontSize: 11, color: '#7A6657' }}>{d.name}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#3B2A22' }}>{fmt(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Vendor payments summary ── */}
      {(() => {
        const vendorItems   = items.filter(b => b.vendorId)
        const vendorPaid    = vendorItems.reduce((s, b) => s + b.actual, 0)
        const vendorQuoted  = vendorItems.reduce((s, b) => s + b.estimated, 0)
        const vendorBalance = vendorQuoted - vendorPaid
        const vendors       = data.vendors as { id: string; name: string; quote?: number; deposit?: number; paid?: number; syncToBudget?: boolean }[]
        const syncedVendors = vendors.filter(v => v.syncToBudget)

        if (syncedVendors.length === 0) return null

        return (
          <div style={{ marginTop: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 3, height: 18, backgroundColor: '#7F9A78', borderRadius: 2 }}/>
              <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, color: '#3B2A22', margin: 0 }}>
                Vendor Payments
              </h3>
              <span style={{ fontSize: 11, color: '#7F9A78', background: 'rgba(127,154,120,0.12)',
                border: '1px solid rgba(127,154,120,0.3)', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                {syncedVendors.length} synced
              </span>
            </div>

            {/* Summary strip */}
            <div className="grid-3" style={{ marginBottom: 16 }}>
              {[
                { label: 'VENDOR QUOTES',   value: vendorQuoted,  color: '#C8A45D' },
                { label: 'DEPOSITS PAID',   value: vendorPaid,    color: '#7F9A78' },
                { label: 'BALANCE DUE',     value: vendorBalance, color: vendorBalance > 0 ? '#C47A52' : '#7A6657' },
              ].map(s => (
                <div key={s.label} style={{ background: '#FAF3E6', border: '1.5px solid #E8D5A3', borderRadius: 14, padding: '14px 18px' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#7A6657', letterSpacing: '0.1em', marginBottom: 6 }}>{s.label}</p>
                  <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, fontWeight: 500, color: s.color, lineHeight: 1 }}>
                    {s.value > 0 ? fmt(s.value) : '—'}
                  </p>
                </div>
              ))}
            </div>

            {/* Per-vendor rows */}
            <div style={{ background: '#FAF3E6', border: '1.5px solid #E8D5A3', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 100px', padding: '8px 20px',
                background: 'rgba(200,164,93,0.08)', borderBottom: '1px solid #E8D5A3' }}>
                {['Vendor', 'Quote', 'Paid', 'Balance'].map((h, i) => (
                  <span key={h} style={{ fontSize: 10, fontWeight: 700, color: '#7A6657', letterSpacing: '0.08em',
                    textAlign: i > 0 ? 'right' : 'left' }}>{h}</span>
                ))}
              </div>
              {syncedVendors.map((v, i) => {
                const dep = v.deposit ?? v.paid ?? 0
                const bal = Math.max(0, (v.quote ?? 0) - dep)
                return (
                  <div key={v.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 100px',
                    padding: '11px 20px', borderBottom: i < syncedVendors.length - 1 ? '1px solid #F2E3CF' : 'none',
                    alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <Link size={11} style={{ color: '#7F9A78', flexShrink: 0 }}/>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#3B2A22' }}>{v.name}</span>
                    </div>
                    <span style={{ fontSize: 12, color: '#7A6657', textAlign: 'right' }}>{v.quote ? fmt(v.quote) : '—'}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#7F9A78', textAlign: 'right' }}>{dep > 0 ? fmt(dep) : '—'}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, textAlign: 'right',
                      color: bal > 0 ? '#C47A52' : '#7A6657' }}>{bal > 0 ? fmt(bal) : '✓'}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* ── Export ── */}
      <div style={{ marginTop: 36 }}>
        <button onClick={() => exportJSON(data)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '10px 20px', borderRadius: 12,
            border: '1.5px solid #E8D5A3', background: '#FAF3E6',
            color: '#3B2A22', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>
          <FileJson size={14} strokeWidth={2}/> Export all data JSON
        </button>
      </div>

      {/* ── Modals ── */}
      {modal && (
        <ItemModal
          initial={modal === 'new' ? undefined : modal as BudgetItem}
          onSave={saveItem} onClose={() => setModal(null)}
        />
      )}

      {deleteId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(42,30,20,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, padding: 16,
        }}>
          <div style={{
            background: '#FFF8EE', borderRadius: 20, padding: 36,
            maxWidth: 360, width: '100%', textAlign: 'center',
            boxShadow: '0 24px 60px rgba(42,30,20,0.2)',
            border: '1.5px solid #E8D5A3',
          }}>
            <Trash2 size={28} style={{ color: '#C47A52', marginBottom: 14 }} strokeWidth={1.5}/>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: '#3B2A22', marginBottom: 8 }}>
              Remove expense?
            </h3>
            <p style={{ fontSize: 13, color: '#7A6657', marginBottom: 28 }}>
              {items.find(i => i.id === deleteId)?.description} will be removed.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteId(null)} style={{
                flex: 1, padding: 10, borderRadius: 10, fontSize: 13,
                border: '1.5px solid #E8D5A3', background: 'transparent', color: '#7A6657', cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={() => deleteItem(deleteId)} style={{
                flex: 1, padding: 10, borderRadius: 10, fontSize: 13, fontWeight: 600,
                border: 'none', background: '#C47A52', color: '#fff', cursor: 'pointer',
              }}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
