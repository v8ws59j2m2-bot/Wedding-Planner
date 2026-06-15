import { useState, useMemo } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { FileJson, TrendingUp, ArrowRight, AlertTriangle, CheckCircle, Sparkles } from 'lucide-react'
import { SmallLeaf, Frangipani, BaliBorder } from '../components/Botanicals'
import { CurrencyToggle } from '../components/CurrencyToggle'
import { useCurrencyContext } from '../context/CurrencyContext'
import type { AppData, BudgetItem, Page, Payment } from '../types'

// ── helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return '£' + n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

/** Mirror of Budget.tsx — always use payments[] if present, else fall back to legacy actual */
function itemPaid(b: BudgetItem & { payments?: Payment[] }): number {
  if (b.payments && b.payments.length > 0) return b.payments.reduce((s, p) => s + p.amount, 0)
  return b.actual
}
function fmtPct(n: number) { return `${Math.round(n)}%` }

function exportJSON(data: AppData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url
  a.download = `wedding-financial-${new Date().toISOString().split('T')[0]}.json`
  a.click(); URL.revokeObjectURL(url)
}

// ── colour palette ────────────────────────────────────────────────────────────
const CAT_COLORS: Record<string, string> = {
  'Venue': '#C8A45D', 'Catering': '#7F9A78', 'Photography': '#C47A52',
  'Videography': '#B8864A', 'Flowers & Décor': '#8B9B6B', 'Attire': '#D4956A',
  'Music & Entertainment': '#9BAF78', 'Hair & Beauty': '#E0B87A',
  'Transport': '#A8956B', 'Stationery': '#C4AF7E', 'Honeymoon': '#7A9A82',
  'Gifts & Favours': '#B89060', 'Miscellaneous': '#8A7A6A',
  'Florals': '#8B9B6B', 'Music & DJ': '#9BAF78', 'Officiant': '#8A7A6A',
  'Cake & Desserts': '#D4956A', 'Lighting & AV': '#A8956B', 'Accommodation': '#7A9A82',
}
function catColor(cat: string) { return CAT_COLORS[cat] ?? '#C8A45D' }

// ── types ─────────────────────────────────────────────────────────────────────
type Filter = 'all' | 'budget' | 'vendor'

interface FullVendor {
  id: string; name: string; category: string
  quote?: number; deposit?: number; paid?: number; status?: string
}

// ── sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color, accent = false, highlight = false }: {
  label: string; value: string; sub?: string; color: string; accent?: boolean; highlight?: boolean
}) {
  return (
    <div style={{
      background: accent ? `linear-gradient(135deg, ${color}20, ${color}08)` : '#FAF3E6',
      border: `1.5px solid ${accent ? color + '50' : '#E8D5A3'}`,
      borderRadius: 18, padding: '22px 26px',
      position: 'relative', overflow: 'hidden',
      boxShadow: highlight ? `0 4px 20px ${color}20` : 'none',
    }}>
      <div style={{ position: 'absolute', bottom: -10, right: -10, opacity: 0.1, pointerEvents: 'none' }}>
        <svg width="70" height="70" viewBox="0 0 70 70" fill="none">
          <rect x="7" y="7" width="56" height="56" rx="6" transform="rotate(45 35 35)" fill={color}/>
        </svg>
      </div>
      <p style={{ fontSize: 10, fontWeight: 700, color: '#7A6657', letterSpacing: '0.12em', marginBottom: 10 }}>{label}</p>
      <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 500, color: accent ? color : '#3B2A22', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: '#7A6657', marginTop: 6 }}>{sub}</p>}
    </div>
  )
}

function SectionHead({ title, leaf = false }: { title: string; leaf?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
      <div style={{ width: 3, height: 20, backgroundColor: '#C47A52', borderRadius: 2 }}/>
      <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: '#3B2A22', margin: 0 }}>{title}</h2>
      {leaf && <SmallLeaf size={18} opacity={0.5} rotate={-20}/>}
    </div>
  )
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#FFF8EE', border: '1.5px solid #E8D5A3', borderRadius: 12,
      padding: '10px 16px', boxShadow: '0 8px 24px rgba(42,30,20,0.12)' }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: '#3B2A22', marginBottom: 3 }}>{payload[0].name}</p>
      <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, color: '#C8A45D' }}>{fmt(payload[0].value)}</p>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
interface Props {
  data: AppData
  onNavigate: (p: Page) => void
}

export function FinancialOverview({ data, onNavigate }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const { display: d } = useCurrencyContext()

  const vendors  = data.vendors as FullVendor[]
  const budgetItems = data.budget as (BudgetItem & { vendorId?: string })[]

  // Only booked vendors count as committed spend — quoted are pipeline only
  const bookedVendors = vendors.filter(v => v.status === 'booked')
  const quotedVendors = vendors.filter(v => v.status === 'quoted')

  // ── Vendor aggregates (booked only) ───────────────────────────────────────
  const allVendorDeposits  = bookedVendors.reduce((s, v) => s + (v.deposit ?? 0), 0)
  const allVendorQuotes    = bookedVendors.reduce((s, v) => s + (v.quote ?? 0), 0)
  const allVendorBalance   = bookedVendors.reduce((s, v) => s + Math.max(0, (v.quote ?? 0) - (v.deposit ?? 0)), 0)
  const totalQuotedPipeline = quotedVendors.reduce((s, v) => s + (v.quote ?? 0), 0)

  // Only booked budget items count toward totals — quoted are pipeline only
  const bookedBudgetItems = budgetItems.filter(b => (b.status ?? 'booked') === 'booked')
  const nonVendorItems    = bookedBudgetItems.filter(b => !b.vendorId)
  const vendorBudgetItems = bookedBudgetItems.filter(b => b.vendorId)
  const quotedBudgetItems = budgetItems.filter(b => b.status === 'quoted')
  const totalQuotedBudgetPipeline = quotedBudgetItems.reduce((s, b) => s + b.estimated, 0)

  const totalBudget    = bookedBudgetItems.reduce((s, b) => s + b.estimated, 0)
  const totalActual    = bookedBudgetItems.reduce((s, b) => s + itemPaid(b), 0)
  const totalRemaining = totalBudget - totalActual
  const pctSpent       = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0
  const overBudget     = totalActual > totalBudget && totalBudget > 0

  // Grand total = budget actual (booked vendors auto-sync into budget items)
  const grandTotal = totalActual

  // ── Category breakdown ─────────────────────────────────────────────────────
  const catMap = useMemo(() => {
    const map: Record<string, number> = {}
    const addToMap = (cat: string, amount: number) => {
      map[cat] = (map[cat] ?? 0) + amount
    }
    if (filter !== 'vendor') {
      nonVendorItems.forEach(b => addToMap(b.category, itemPaid(b)))
    }
    if (filter !== 'budget') {
      vendorBudgetItems.forEach(b => addToMap(b.category, itemPaid(b)))
    }
    return map
  }, [budgetItems, bookedVendors, filter])

  const chartData = Object.entries(catMap)
    .map(([name, value]) => ({ name, value }))
    .filter(entry => entry.value > 0)
    .sort((a, b) => b.value - a.value)

  const topCategory = chartData[0]

  // ── Largest expenses list ─────────────────────────────────────────────────
  const allExpenses = useMemo(() => {
    const items: { label: string; category: string; amount: number; type: 'budget' | 'vendor'; id?: string }[] = []
    if (filter !== 'vendor') {
      bookedBudgetItems.forEach(b => items.push({
        label: b.description, category: b.category,
        amount: itemPaid(b), type: 'budget',
      }))
    }
    if (filter !== 'budget') {
      // Booked vendors appear via their auto-synced budget items (vendorBudgetItems above)
    }
    return items.sort((a, b) => b.amount - a.amount).slice(0, 8)
  }, [budgetItems, bookedVendors, filter])

  // ── Outstanding vendor balances (booked only) ─────────────────────────────
  const outstandingVendors = bookedVendors
    .filter(v => Math.max(0, (v.quote ?? 0) - (v.deposit ?? 0)) > 0)
    .sort((a, b) => Math.max(0, (b.quote ?? 0) - (b.deposit ?? b.paid ?? 0)) - Math.max(0, (a.quote ?? 0) - (a.deposit ?? a.paid ?? 0)))

  // ── Insights ──────────────────────────────────────────────────────────────
  const insights = useMemo(() => {
    const list: { icon: React.ElementType; color: string; text: string }[] = []
    if (totalBudget > 0) {
      list.push({ icon: TrendingUp, color: pctSpent > 90 ? '#C47A52' : '#7F9A78',
        text: `You have spent ${fmtPct(pctSpent)} of your total budget.` })
    }
    if (allVendorBalance > 0) {
      list.push({ icon: AlertTriangle, color: '#C8A45D',
        text: `Outstanding vendor balances total ${fmt(allVendorBalance)} across ${outstandingVendors.length} vendor${outstandingVendors.length !== 1 ? 's' : ''}.` })
    }
    if (topCategory) {
      list.push({ icon: Sparkles, color: '#C8A45D',
        text: `Biggest spending area: ${topCategory.name} at ${fmt(topCategory.value)}.` })
    }
    if (allVendorBalance === 0 && bookedVendors.filter(v => v.quote).length > 0) {
      list.push({ icon: CheckCircle, color: '#7F9A78',
        text: 'All vendor balances are fully paid — well done!' })
    }
    if (overBudget) {
      list.push({ icon: AlertTriangle, color: '#C47A52',
        text: `You are ${fmt(totalActual - totalBudget)} over your total budget.` })
    }
    return list.slice(0, 4)
  }, [totalBudget, pctSpent, allVendorBalance, topCategory, overBudget, bookedVendors])

  const hasData = totalBudget > 0 || allVendorDeposits > 0 || budgetItems.length > 0

  return (
    <div className="page-content" style={{ maxWidth: 1100 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 40 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 30, fontStyle: 'italic', color: '#3B2A22', margin: 0 }}>
              Financial Overview
            </h1>
            <SmallLeaf size={22} opacity={0.6} rotate={-15}/>
            <Frangipani size={26} opacity={0.5}/>
          </div>
          <p style={{ fontSize: 13, color: '#7A6657' }}>
            Your complete wedding spending at a glance — Budget items and Vendor payments combined.
          </p>
          <div style={{ marginTop: 10 }}><CurrencyToggle /></div>
        </div>
        <button onClick={() => exportJSON(data)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 12,
            border: '1.5px solid #E8D5A3', background: '#FAF3E6', color: '#3B2A22', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <FileJson size={14}/> Export financial JSON
        </button>
      </div>

      {!hasData ? (
        /* ── Empty state ── */
        <div style={{ textAlign: 'center', padding: '80px 24px', background: '#FAF3E6', borderRadius: 20, border: '1.5px solid #E8D5A3' }}>
          <TrendingUp size={40} style={{ color: '#E8D5A3', marginBottom: 16 }} strokeWidth={1}/>
          <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, color: '#3B2A22', marginBottom: 10 }}>
            No financial data yet
          </p>
          <p style={{ fontSize: 13, color: '#7A6657', marginBottom: 28 }}>
            Add items in the Budget page or enter vendor quotes and deposits to see your full financial picture here.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => onNavigate('budget-payments')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10,
                background: '#3B2A22', color: '#FFF8EE', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Go to Budget <ArrowRight size={14}/>
            </button>
            <button onClick={() => onNavigate('vendors')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10,
                border: '1.5px solid #E8D5A3', background: 'transparent', color: '#3B2A22', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Go to Vendors <ArrowRight size={14}/>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* ── Summary cards ── */}
          <div className="grid-3" style={{ marginBottom: 14 }}>
            <StatCard label="TOTAL BUDGET"   value={totalBudget > 0 ? d(totalBudget) : '—'}
              sub="estimated total"     color="#C8A45D" accent highlight={totalBudget > 0}/>
            <StatCard label="TOTAL SPENT"    value={grandTotal > 0 ? d(grandTotal) : '—'}
              sub={totalBudget > 0 ? `${fmtPct(pctSpent)} of budget` : 'across all items'}
              color={overBudget ? '#C47A52' : '#7F9A78'} accent={overBudget}/>
            <StatCard label="REMAINING"      value={totalBudget > 0 ? d(Math.abs(totalRemaining)) : '—'}
              sub={overBudget ? 'over budget' : totalBudget > 0 ? 'left to spend' : ''}
              color={overBudget ? '#C47A52' : '#7F9A78'}/>
          </div>
          <div className="grid-3" style={{ marginBottom: 8 }}>
            <StatCard label="BOOKED VENDOR TOTAL" value={allVendorQuotes > 0 ? d(allVendorQuotes) : '—'}
              sub={`${bookedVendors.filter(v => v.quote).length} confirmed vendor${bookedVendors.filter(v => v.quote).length !== 1 ? 's' : ''}`} color="#C8A45D"/>
            <StatCard label="DEPOSITS PAID"   value={allVendorDeposits > 0 ? d(allVendorDeposits) : '—'}
              sub="to booked vendors"     color="#7F9A78"/>
            <StatCard label="BALANCE DUE"     value={allVendorBalance > 0 ? d(allVendorBalance) : '—'}
              sub={allVendorBalance > 0 ? `across ${outstandingVendors.length} vendor${outstandingVendors.length !== 1 ? 's' : ''}` : 'all paid'}
              color={allVendorBalance > 0 ? '#C47A52' : '#7A6657'} accent={allVendorBalance > 0}/>
          </div>
          {/* Quoted pipeline notice */}
          {totalQuotedPipeline > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
              borderRadius: 10, background: 'rgba(200,164,93,0.08)', border: '1px solid rgba(200,164,93,0.3)',
              marginBottom: 20, fontSize: 13, color: '#8B6914',
            }}>
              📋 <strong style={{ marginRight: 4 }}>{quotedVendors.length} vendor{quotedVendors.length !== 1 ? 's' : ''} quoted</strong>
              ({d(totalQuotedPipeline)}) — not included until marked as <em style={{ marginLeft: 4, marginRight: 4 }}>Booked</em>
              <button onClick={() => onNavigate('vendors')} style={{
                marginLeft: 'auto', fontSize: 12, color: '#8B6914', background: 'none',
                border: '1px solid rgba(200,164,93,0.5)', borderRadius: 6, padding: '3px 10px', cursor: 'pointer',
              }}>View vendors</button>
            </div>
          )}

          {/* Quoted budget items pipeline notice */}
          {totalQuotedBudgetPipeline > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
              borderRadius: 10, background: 'rgba(200,164,93,0.08)', border: '1px solid rgba(200,164,93,0.3)',
              marginBottom: 14, fontSize: 13, color: '#8B6914',
            }}>
              📋 <strong style={{ marginRight: 4 }}>{quotedBudgetItems.length} quoted expense{quotedBudgetItems.length !== 1 ? 's' : ''}</strong>
              ({d(totalQuotedBudgetPipeline)}) — not included until marked as <em style={{ marginLeft: 4, marginRight: 4 }}>Booked</em>
              <button onClick={() => onNavigate('budget-payments')} style={{
                marginLeft: 'auto', fontSize: 12, color: '#8B6914', background: 'none',
                border: '1px solid rgba(200,164,93,0.5)', borderRadius: 6, padding: '3px 10px', cursor: 'pointer',
              }}>View budget</button>
            </div>
          )}

          {/* Overall progress bar */}
          {totalBudget > 0 && (
            <div style={{ marginBottom: 36 }}>
              <div style={{ height: 10, borderRadius: 8, background: '#F2E3CF', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 8, transition: 'width 0.8s ease',
                  width: `${Math.min(pctSpent, 100)}%`,
                  background: overBudget
                    ? 'linear-gradient(90deg, #C47A52, #E09070)'
                    : 'linear-gradient(90deg, #C8A45D, #E8C87A)',
                }}/>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ fontSize: 12, color: overBudget ? '#C47A52' : '#7A6657', fontWeight: overBudget ? 600 : 400 }}>
                  {fmtPct(pctSpent)} spent
                  {overBudget && ` · ${d(totalActual - totalBudget)} over budget`}
                </span>
                <span style={{ fontSize: 12, color: '#C8A45D', fontWeight: 600 }}>{d(totalBudget)} total budget</span>
              </div>
            </div>
          )}

          <div style={{ marginBottom: 36 }}>
            <BaliBorder width={600} opacity={0.5}/>
          </div>

          {/* ── Insights ── */}
          {insights.length > 0 && (
            <section style={{ marginBottom: 40 }}>
              <SectionHead title="Key insights" leaf/>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {insights.map((ins, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '14px 18px', borderRadius: 14,
                    background: ins.color + '10', border: `1px solid ${ins.color}30`,
                  }}>
                    <ins.icon size={16} style={{ color: ins.color, flexShrink: 0, marginTop: 1 }} strokeWidth={1.8}/>
                    <p style={{ fontSize: 13, color: '#3B2A22', lineHeight: 1.6 }}>{ins.text}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Charts + breakdown ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 28, marginBottom: 40, alignItems: 'start' }}>

            {/* Bar chart */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <SectionHead title="Amounts paid by category"/>
                {/* Filter pills */}
                <div style={{ display: 'flex', gap: 6 }}>
                  {([['all', 'All'], ['budget', 'Budget only'], ['vendor', 'Vendors only']] as const).map(([k, l]) => (
                    <button key={k} onClick={() => setFilter(k)}
                      style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                        cursor: 'pointer', transition: 'all 0.15s',
                        border: `1.5px solid ${filter === k ? '#C8A45D' : '#E8D5A3'}`,
                        background: filter === k ? '#C8A45D18' : 'transparent',
                        color: filter === k ? '#3B2A22' : '#7A6657' }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <p style={{ fontSize: 11, color: '#A89080', fontStyle: 'italic', marginBottom: 16 }}>
                Actual payments made — booked expenses only, unpaid items excluded
              </p>

              {chartData.length > 0 ? (
                <div style={{ background: '#FAF3E6', border: '1.5px solid #E8D5A3', borderRadius: 16, padding: '20px 16px' }}>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F2E3CF" vertical={false}/>
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#7A6657' }}
                        angle={-35} textAnchor="end" interval={0}/>
                      <YAxis tick={{ fontSize: 10, fill: '#7A6657' }}
                        tickFormatter={v => v >= 1000 ? `£${(v/1000).toFixed(0)}k` : `£${v}`}/>
                      <Tooltip content={<CustomTooltip/>}/>
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, i) => (
                          <Cell key={i} fill={catColor(entry.name)}/>
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 32, background: '#FAF3E6', borderRadius: 16, border: '1.5px solid #E8D5A3' }}>
                  <p style={{ fontSize: 13, color: '#7A6657', fontStyle: 'italic' }}>No spending data for this filter yet.</p>
                </div>
              )}
            </section>

            {/* Donut chart */}
            <section>
              <SectionHead title="Share of total paid"/>
              <div style={{ background: '#FAF3E6', border: '1.5px solid #E8D5A3', borderRadius: 16, padding: '20px 16px' }}>
                {chartData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={chartData} cx="50%" cy="50%"
                          innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" strokeWidth={0}>
                          {chartData.map((_, i) => (
                            <Cell key={i} fill={catColor(chartData[i].name)} opacity={0.85}/>
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip/>}/>
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                      {chartData.slice(0, 6).map(cat => (
                        <div key={cat.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: catColor(cat.name), flexShrink: 0 }}/>
                            <span style={{ fontSize: 11, color: '#7A6657' }}>{cat.name}</span>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#3B2A22' }}>{d(cat.value)}</span>
                        </div>
                      ))}
                      {chartData.length > 6 && (
                        <p style={{ fontSize: 10, color: '#7A6657', fontStyle: 'italic', marginTop: 4 }}>
                          +{chartData.length - 6} more categories
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <p style={{ fontSize: 12, color: '#7A6657', fontStyle: 'italic', textAlign: 'center', padding: 24 }}>No data yet</p>
                )}
              </div>

              {/* Budget vs Vendor split */}
              {(totalActual > 0 || allVendorDeposits > 0) && (
                <div style={{ marginTop: 16, background: '#FAF3E6', border: '1.5px solid #E8D5A3', borderRadius: 16, padding: '16px 18px' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#7A6657', letterSpacing: '0.08em', marginBottom: 2 }}>BUDGET ITEMS vs. VENDOR DEPOSITS</p>
                  <p style={{ fontSize: 10, color: '#A89080', fontStyle: 'italic', marginBottom: 12 }}>Breakdown of what you've paid and where it went</p>
                  {[
                    { label: 'Budget item payments', value: nonVendorItems.reduce((s, b) => s + itemPaid(b), 0), color: '#C8A45D' },
                    { label: 'Vendor deposits paid', value: allVendorDeposits, color: '#7F9A78' },
                  ].map(r => {
                    const total = nonVendorItems.reduce((s, b) => s + itemPaid(b), 0) + allVendorDeposits
                    const pct = total > 0 ? (r.value / total) * 100 : 0
                    return (
                      <div key={r.label} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: '#3B2A22', fontWeight: 500 }}>{r.label}</span>
                          <span style={{ fontSize: 12, color: r.color, fontWeight: 600 }}>{d(r.value)}</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 4, background: '#F2E3CF', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 4, width: `${pct}%`, background: r.color, transition: 'width 0.5s' }}/>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </div>

          {/* ── Largest expenses ── */}
          {allExpenses.length > 0 && (
            <section style={{ marginBottom: 40 }}>
              <SectionHead title="Largest expenses"/>
              <div style={{ background: '#FAF3E6', border: '1.5px solid #E8D5A3', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 100px 70px',
                  padding: '8px 20px', background: 'rgba(200,164,93,0.08)', borderBottom: '1px solid #E8D5A3' }}>
                  {['Item', 'Category', 'Amount', 'Type'].map((h, i) => (
                    <span key={h} style={{ fontSize: 10, fontWeight: 700, color: '#7A6657', letterSpacing: '0.08em',
                      textAlign: i > 1 ? 'right' : 'left' }}>{h}</span>
                  ))}
                </div>
                {allExpenses.map((item, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 100px 70px',
                    padding: '11px 20px', borderBottom: i < allExpenses.length - 1 ? '1px solid #F2E3CF' : 'none',
                    alignItems: 'center' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(200,164,93,0.04)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: catColor(item.category), flexShrink: 0 }}/>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#3B2A22' }}>{item.label}</span>
                    </div>
                    <span style={{ fontSize: 11, color: '#7A6657' }}>{item.category}</span>
                    <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 14, fontWeight: 500, color: '#3B2A22', textAlign: 'right' }}>
                      {d(item.amount)}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 600, textAlign: 'right',
                      color: item.type === 'vendor' ? '#7F9A78' : '#C8A45D' }}>
                      {item.type === 'vendor' ? 'Vendor' : 'Budget'}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Outstanding vendor balances ── */}
          {outstandingVendors.length > 0 && (
            <section style={{ marginBottom: 40 }}>
              <SectionHead title="Outstanding vendor balances"/>
              <div style={{ background: '#FAF3E6', border: '1.5px solid rgba(196,122,82,0.35)', borderRadius: 16, overflow: 'hidden' }}>
                {outstandingVendors.map((v, i) => {
                  const dep = v.deposit ?? 0
                  const bal = Math.max(0, (v.quote ?? 0) - dep)
                  const pct = (v.quote ?? 0) > 0 ? (dep / (v.quote ?? 1)) * 100 : 0
                  return (
                    <div key={v.id} style={{
                      padding: '14px 20px', borderBottom: i < outstandingVendors.length - 1 ? '1px solid #F2E3CF' : 'none',
                      display: 'grid', gridTemplateColumns: '1fr 200px 100px',
                      alignItems: 'center', gap: 16,
                      cursor: 'pointer',
                    }}
                      onClick={() => onNavigate('vendors')}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(200,164,93,0.04)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#3B2A22', marginBottom: 2 }}>{v.name}</p>
                        <p style={{ fontSize: 11, color: '#7A6657' }}>{v.category}</p>
                      </div>
                      <div>
                        <div style={{ height: 4, borderRadius: 4, background: '#F2E3CF', overflow: 'hidden', marginBottom: 4 }}>
                          <div style={{ height: '100%', borderRadius: 4, width: `${pct}%`, background: '#C8A45D' }}/>
                        </div>
                        <p style={{ fontSize: 10, color: '#7A6657' }}>
                          {d(dep)} paid of {d(v.quote ?? 0)}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#C47A52' }}>{d(bal)}</p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 2 }}>
                          <p style={{ fontSize: 10, color: '#C47A52' }}>due</p>
                          <ArrowRight size={10} style={{ color: '#C47A52' }}/>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p style={{ fontSize: 11, color: '#7A6657', marginTop: 8, fontStyle: 'italic' }}>
                Click any row to go to the Vendors page.
              </p>
            </section>
          )}

          {/* ── Quick nav ── */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={() => onNavigate('budget-payments')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10,
                border: '1.5px solid #E8D5A3', background: '#FAF3E6', color: '#3B2A22', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Open Budget <ArrowRight size={13}/>
            </button>
            <button onClick={() => onNavigate('vendors')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10,
                border: '1.5px solid #E8D5A3', background: '#FAF3E6', color: '#3B2A22', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Open Vendors <ArrowRight size={13}/>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
