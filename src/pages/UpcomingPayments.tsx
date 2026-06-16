import { useMemo } from 'react'
import { AlertTriangle, Clock, Calendar, Flag, ArrowRight, CheckCircle } from 'lucide-react'
import { SmallLeaf, Frangipani, BaliBorder } from '../components/Botanicals'
import { CurrencyToggle } from '../components/CurrencyToggle'
import { useCurrencyContext } from '../context/CurrencyContext'
import { paymentStageAmount } from '../lib/helpers'
import type { AppData, Page } from '../types'

// ── Types for flattened payment items ────────────────────────────────────────
interface PaymentItem {
  key: string
  label: string            // expense description
  vendor: string
  category: string
  expenseId: string
  type: 'stage' | 'final-balance' | 'final-balance-tbc'
  stageDescription?: string
  dueDate?: string         // ISO — undefined only for TBC items
  amount: number           // GBP
  overdue: boolean
  dueSoon: boolean         // within 14 days
}

// ── helpers ───────────────────────────────────────────────────────────────────
function daysDiff(iso: string): number {
  const now = new Date(); now.setHours(0, 0, 0, 0)
  return Math.ceil((new Date(iso + 'T00:00:00').getTime() - now.getTime()) / 86400000)
}

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ── Sub-components ────────────────────────────────────────────────────────────
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
      <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 500,
        color: accent ? color : '#3B2A22', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: '#7A6657', marginTop: 5 }}>{sub}</p>}
    </div>
  )
}

function PaymentRow({ item, d, onEdit }: {
  item: PaymentItem
  d: (n: number) => string
  onEdit?: (id: string) => void
}) {
  const isTBC   = item.type === 'final-balance-tbc'
  const isStage = item.type === 'stage'

  const borderColor = item.overdue ? 'rgba(196,122,82,0.45)' : item.dueSoon ? 'rgba(200,164,93,0.45)' : '#E8D5A3'
  const bgColor     = item.overdue ? 'rgba(196,122,82,0.04)' : item.dueSoon ? 'rgba(200,164,93,0.04)' : '#FAF3E6'
  const accentColor = item.overdue ? '#C47A52' : item.dueSoon ? '#C8A45D' : '#7A6657'

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '28px 1fr 130px 110px 36px',
      alignItems: 'center', gap: 12, padding: '12px 18px',
      background: bgColor, border: `1.5px solid ${borderColor}`, borderRadius: 12,
    }}>
      {/* Icon */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isTBC
          ? <Calendar size={15} style={{ color: '#C8A45D' }}/>
          : isStage
            ? <Flag size={15} style={{ color: accentColor }}/>
            : <Calendar size={15} style={{ color: accentColor }}/>}
      </div>

      {/* Info */}
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#3B2A22', marginBottom: 2 }}>
          {item.label}
          {item.stageDescription && <span style={{ fontWeight: 400, color: '#7A6657' }}> · {item.stageDescription}</span>}
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#7A6657' }}>{item.vendor}</span>
          <span style={{ fontSize: 10, color: '#A89080' }}>·</span>
          <span style={{ fontSize: 11, color: '#7A6657' }}>{item.category}</span>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 20,
            color: isStage ? '#8B6914' : '#5A7A54',
            background: isStage ? 'rgba(200,164,93,0.12)' : 'rgba(127,154,120,0.12)',
            border: `1px solid ${isStage ? 'rgba(200,164,93,0.4)' : 'rgba(127,154,120,0.4)'}`,
          }}>
            {isTBC ? 'Final balance · TBC' : isStage ? 'Stage gate' : 'Final balance'}
          </span>
        </div>
      </div>

      {/* Date */}
      <div style={{ textAlign: 'right' }}>
        {isTBC ? (
          <span style={{ fontSize: 12, fontWeight: 600, color: '#C8A45D', fontStyle: 'italic' }}>Date TBC</span>
        ) : (
          <>
            <p style={{ fontSize: 12, fontWeight: 600, color: accentColor }}>
              {fmtDate(item.dueDate!)}
            </p>
            <p style={{ fontSize: 10, color: accentColor, opacity: 0.8, marginTop: 2 }}>
              {item.overdue
                ? `${Math.abs(daysDiff(item.dueDate!))} days overdue`
                : daysDiff(item.dueDate!) === 0
                  ? 'Due today'
                  : `${daysDiff(item.dueDate!)} days`}
            </p>
          </>
        )}
      </div>

      {/* Amount */}
      <div style={{ textAlign: 'right' }}>
        <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 17, fontWeight: 500,
          color: item.overdue ? '#C47A52' : '#3B2A22' }}>
          {item.amount > 0 ? d(item.amount) : '—'}
        </p>
      </div>

      {/* Edit button — switches to Budget tab and opens this expense */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        {onEdit && (
          <button
            onClick={() => onEdit(item.expenseId)}
            title="Edit this expense"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, borderRadius: 7,
              border: '1.5px solid #E8D5A3', background: 'transparent',
              cursor: 'pointer', color: '#7A6657', transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              ;(e.currentTarget as HTMLElement).style.background = 'rgba(200,164,93,0.12)'
              ;(e.currentTarget as HTMLElement).style.borderColor = '#C8A45D'
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLElement).style.borderColor = '#E8D5A3'
            }}
          >
            <ArrowRight size={12}/>
          </button>
        )}
      </div>
    </div>
  )
}

function SectionHeader({ title, count, color, icon: Icon }: {
  title: string; count: number; color: string; icon: React.ElementType
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <div style={{ width: 3, height: 18, backgroundColor: color, borderRadius: 2 }}/>
      <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, color: '#3B2A22', margin: 0 }}>
        {title}
      </h2>
      <Icon size={14} style={{ color }} strokeWidth={1.8}/>
      <span style={{
        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
        color: color, background: color + '18', border: `1px solid ${color}44`,
      }}>{count}</span>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
interface Props {
  data: AppData
  onNavigate: (p: Page) => void
  onGoToBudget?: () => void       // switch to Budget tab (when rendered inside BudgetPaymentsPage)
  onEditExpense?: (id: string) => void  // open edit modal for a specific expense
}

export function UpcomingPayments({ data, onNavigate, onGoToBudget, onEditExpense }: Props) {
  const { display: d } = useCurrencyContext()

  // Build flattened list of all unpaid upcoming items from Budget only
  const allItems = useMemo<PaymentItem[]>(() => {
    const items: PaymentItem[] = []
    const now = new Date(); now.setHours(0, 0, 0, 0)

    // Only booked budget expenses
    const bookedExpenses = data.budget.filter(b => (b.status ?? 'booked') === 'booked')

    for (const expense of bookedExpenses) {
      const vendor = data.vendors.find(v => v.id === expense.vendorId)
      const vendorName = vendor?.name ?? 'Unknown vendor'
      const paidSoFar = (expense.payments ?? []).reduce((s, p) => s + p.amount, 0)
      const outstanding = Math.max(0, expense.estimated - paidSoFar)
      if (outstanding <= 0) continue  // fully paid — skip

      // Payment stages
      for (const stage of expense.paymentStages ?? []) {
        if (stage.paid) continue
        const amt = paymentStageAmount(stage, expense.estimated)
        const dueDate = stage.dueDate
        const diff = daysDiff(dueDate)
        items.push({
          key: `stage-${stage.id}`,
          label: expense.description,
          vendor: vendorName,
          category: expense.category,
          expenseId: expense.id,
          type: 'stage',
          stageDescription: stage.description,
          dueDate,
          amount: amt,
          overdue: diff < 0,
          dueSoon: diff >= 0 && diff <= 14,
        })
      }

      // Final balance
      if (expense.finalBalanceTBC) {
        items.push({
          key: `tbc-${expense.id}`,
          label: expense.description,
          vendor: vendorName,
          category: expense.category,
          expenseId: expense.id,
          type: 'final-balance-tbc',
          amount: outstanding,
          overdue: false,
          dueSoon: false,
        })
      } else if (expense.finalBalanceDue) {
        const diff = daysDiff(expense.finalBalanceDue)
        items.push({
          key: `final-${expense.id}`,
          label: expense.description,
          vendor: vendorName,
          category: expense.category,
          expenseId: expense.id,
          type: 'final-balance',
          dueDate: expense.finalBalanceDue,
          amount: outstanding,
          overdue: diff < 0,
          dueSoon: diff >= 0 && diff <= 14,
        })
      }
    }

    return items
  }, [data.budget, data.vendors])

  const overdue  = allItems.filter(i => i.overdue).sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
  const dueSoon  = allItems.filter(i => !i.overdue && i.dueSoon).sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
  const upcoming = allItems.filter(i => !i.overdue && !i.dueSoon && i.dueDate).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))
  const tbc      = allItems.filter(i => i.type === 'final-balance-tbc')

  const totalOverdue  = overdue.reduce((s, i) => s + i.amount, 0)
  const totalDueSoon  = dueSoon.reduce((s, i) => s + i.amount, 0)
  const totalAll      = allItems.filter(i => !i.overdue).reduce((s, i) => s + i.amount, 0)

  return (
    <div className="page-content" style={{ maxWidth: 900 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 30, fontStyle: 'italic', color: '#3B2A22', margin: 0 }}>
              Upcoming Payments
            </h1>
            <SmallLeaf size={22} opacity={0.6} rotate={-15}/>
            <Frangipani size={26} opacity={0.5}/>
          </div>
          <p style={{ fontSize: 13, color: '#7A6657' }}>
            All scheduled payment stages and final balance deadlines across your booked expenses.
          </p>
          <div style={{ marginTop: 10 }}><CurrencyToggle/></div>
        </div>
        <button onClick={() => onGoToBudget ? onGoToBudget() : onNavigate('budget-payments')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10,
            border: '1.5px solid #E8D5A3', background: '#FAF3E6', color: '#3B2A22', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          <ArrowRight size={13}/> Go to Budget
        </button>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid-3" style={{ marginBottom: 16 }}>
        <SummaryCard label="OVERDUE"          value={totalOverdue > 0 ? d(totalOverdue) : '—'}
          sub={`${overdue.length} item${overdue.length !== 1 ? 's' : ''} past due`}
          color="#C47A52" accent={totalOverdue > 0}/>
        <SummaryCard label="DUE IN 14 DAYS"   value={totalDueSoon > 0 ? d(totalDueSoon) : '—'}
          sub={`${dueSoon.length} item${dueSoon.length !== 1 ? 's' : ''} coming up`}
          color="#C8A45D" accent={totalDueSoon > 0}/>
        <SummaryCard label="TOTAL OUTSTANDING" value={d(totalOverdue + totalAll)}
          sub={`across ${allItems.length} open item${allItems.length !== 1 ? 's' : ''}`}
          color="#7F9A78"/>
      </div>

      <div style={{ marginBottom: 28 }}><BaliBorder width={500} opacity={0.5}/></div>

      {allItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px',
          background: '#FAF3E6', borderRadius: 16, border: '1.5px solid #E8D5A3' }}>
          <CheckCircle size={36} style={{ color: '#7F9A78', marginBottom: 14 }} strokeWidth={1}/>
          <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: '#3B2A22', marginBottom: 8 }}>
            All clear
          </p>
          <p style={{ fontSize: 13, color: '#7A6657', marginBottom: 20 }}>
            No upcoming payment stages or balance deadlines. Add payment stages to your booked expenses to track them here.
          </p>
          <button onClick={() => onGoToBudget ? onGoToBudget() : onNavigate('budget-payments')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10,
              background: '#3B2A22', color: '#FFF8EE', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Go to Budget <ArrowRight size={13}/>
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>

          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 130px 110px 36px', gap: 12,
            padding: '0 18px', marginBottom: -24 }}>
            {['', 'Expense', 'Due Date', 'Amount', ''].map((h, i) => (
              <span key={i} style={{ fontSize: 10, fontWeight: 700, color: '#7A6657', letterSpacing: '0.1em',
                textAlign: i > 1 ? 'right' : 'left' }}>{h}</span>
            ))}
          </div>

          {/* Overdue */}
          {overdue.length > 0 && (
            <div>
              <SectionHeader title="Overdue" count={overdue.length} color="#C47A52" icon={AlertTriangle}/>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {overdue.map(item => <PaymentRow key={item.key} item={item} d={d} onEdit={onEditExpense}/>)}
              </div>
            </div>
          )}

          {/* Due Soon */}
          {dueSoon.length > 0 && (
            <div>
              <SectionHeader title="Due in the next 14 days" count={dueSoon.length} color="#C8A45D" icon={Clock}/>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {dueSoon.map(item => <PaymentRow key={item.key} item={item} d={d} onEdit={onEditExpense}/>)}
              </div>
            </div>
          )}

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div>
              <SectionHeader title="Upcoming" count={upcoming.length} color="#7F9A78" icon={Calendar}/>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {upcoming.map(item => <PaymentRow key={item.key} item={item} d={d} onEdit={onEditExpense}/>)}
              </div>
            </div>
          )}

          {/* Date TBC */}
          {tbc.length > 0 && (
            <div>
              <SectionHeader title="Date not yet confirmed" count={tbc.length} color="#C8A45D" icon={Calendar}/>
              <p style={{ fontSize: 12, color: '#7A6657', marginBottom: 12, fontStyle: 'italic' }}>
                These expenses are booked but the final payment date hasn't been set yet.
                {onEditExpense && ' Click → to open the expense and set a date.'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tbc.map(item => <PaymentRow key={item.key} item={item} d={d} onEdit={onEditExpense}/>)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
