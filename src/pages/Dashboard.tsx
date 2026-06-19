import { useState, useEffect } from 'react'
import { loadAccommodation } from '../lib/supabaseData'
import { Users, PiggyBank, CheckSquare, Store, ArrowRight, Calendar, Sparkles } from 'lucide-react'
import { LilySprig, SmallLeaf, Frangipani, TempleGate, PalmFrond, RiceFields, BaliBorder, BatikCorner } from '../components/Botanicals'
import { useIsMobile } from '../hooks/useIsMobile'
import { guestAgeCategory, countOverduePayments } from '../lib/helpers'
import { useWeddingDetails } from '../hooks/useWeddingDetails'
import type { AppData, Page } from '../types'

interface Props {
  data: AppData
  onNavigate: (p: Page) => void
}

// ── Countdown hook ────────────────────────────────────────────────────────────
function useCountdown() {
  const details = useWeddingDetails()
  const calc = () => {
    const weddingDate = new Date(details.date + 'T00:00:00')
    const diff = Math.max(0, weddingDate.getTime() - Date.now())
    return {
      days:    Math.floor(diff / 86400000),
      hours:   Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
    }
  }
  const [t, setT] = useState(calc)
  useEffect(() => {
    setT(calc()) // recalculate immediately when date changes
    const id = setInterval(() => setT(calc()), 1000)
    return () => clearInterval(id)
  }, [details.date]) // eslint-disable-line react-hooks/exhaustive-deps
  return t
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Divider() {
  return (
    <div style={{ margin: '0 auto 24px', display: 'flex', justifyContent: 'center' }}>
      <BaliBorder width={240} opacity={0.7} />
    </div>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
      <div style={{ width: 3, height: 18, backgroundColor: '#C47A52', borderRadius: 2, flexShrink: 0 }} />
      <h2 style={{
        fontFamily: 'Playfair Display, serif',
        fontSize: 18,
        fontWeight: 500,
        color: '#3B2A22',
        margin: 0,
      }}>{children}</h2>
      <SmallLeaf size={20} opacity={0.5} rotate={-30} />
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, color, onClick }: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  color: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: '#FAF3E6',
        border: '1.5px solid #E8D5A3',
        borderRadius: 16,
        padding: 24,
        textAlign: 'left',
        width: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.15s, box-shadow 0.15s',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        if (onClick) {
          ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
          ;(e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(59,42,34,0.08)'
        }
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLElement).style.transform = 'none'
        ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
      }}
    >
      {/* Batik corner accent */}
      <div style={{ position: 'absolute', bottom: 0, right: 0, pointerEvents: 'none' }}>
        <BatikCorner size={52} opacity={0.55} />
      </div>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: color + '22',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={17} style={{ color }} strokeWidth={1.5} />
      </div>
      <div>
        <p style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: 30,
          fontWeight: 500,
          color: '#3B2A22',
          lineHeight: 1,
          marginBottom: 4,
        }}>{value}</p>
        <p style={{ fontSize: 12, color: '#7A6657', fontWeight: 500, letterSpacing: '0.03em' }}>{label}</p>
        {sub && <p style={{ fontSize: 11, color: '#C8A45D', marginTop: 4 }}>{sub}</p>}
      </div>
    </button>
  )
}

function AttentionCard({ icon: Icon, title, description, action, color, onAction }: {
  icon: React.ElementType
  title: string
  description: string
  action: string
  color: string
  onAction: () => void
}) {
  return (
    <div style={{
      background: '#FAF3E6',
      border: '1.5px solid #E8D5A3',
      borderRadius: 16,
      padding: '20px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: color + '18',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={18} style={{ color }} strokeWidth={1.5} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#3B2A22', marginBottom: 2 }}>{title}</p>
        <p style={{ fontSize: 12, color: '#7A6657', lineHeight: 1.5 }}>{description}</p>
      </div>
      <button
        onClick={onAction}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 12, color: '#C8A45D', fontWeight: 500,
          background: 'none', border: 'none', cursor: 'pointer',
          whiteSpace: 'nowrap', padding: '4px 0',
        }}
      >
        {action} <ArrowRight size={13} />
      </button>
    </div>
  )
}

function QuickLink({ icon: Icon, label, color, onClick }: {
  icon: React.ElementType; label: string; color: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        padding: '20px 16px', borderRadius: 16,
        border: '1.5px solid #E8D5A3', backgroundColor: '#FAF3E6',
        cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s', flex: 1,
      }}
      onMouseEnter={e => {
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
        ;(e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(59,42,34,0.07)'
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLElement).style.transform = 'none'
        ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: color + '20',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={18} style={{ color }} strokeWidth={1.5} />
      </div>
      <span style={{ fontSize: 12, color: '#7A6657', fontWeight: 500 }}>{label}</span>
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function Dashboard({ data, onNavigate }: Props) {
  const { days, hours, minutes, seconds } = useCountdown()
  const isMobile = useIsMobile()

  // Stats — all guests are confirmed in the new model
  const allGuests      = data.guests
  const totalGuests    = allGuests.length
  const totalAdults   = allGuests.filter(g => guestAgeCategory(g) === 'adult').length
  const totalChildren = allGuests.filter(g => guestAgeCategory(g) === 'child').length

  // Budget totals — booked items only, using payments[] if present
  const bookedBudget = data.budget.filter(b => (b.status ?? 'booked') === 'booked')
  const totalBudget  = bookedBudget.reduce((s, b) => s + b.estimated, 0)
  const totalSpent   = bookedBudget.reduce((s, b) => {
    if (b.payments && b.payments.length > 0) return s + b.payments.reduce((p, x) => p + x.amount, 0)
    return s + b.actual
  }, 0)
  const budgetPct    = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0

  const completedTasks = data.checklist.filter(c => c.completed).length
  const totalTasks     = data.checklist.length
  const taskPct        = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const bookedVendors  = data.vendors.filter(v => v.status === 'booked').length

  // Attention items
  const overdue = data.checklist.filter(c =>
    !c.completed && c.dueDate && new Date(c.dueDate) < new Date()
  )
  const dueSoon = data.checklist.filter(c => {
    if (c.completed || !c.dueDate) return false
    const d = new Date(c.dueDate)
    const now = new Date()
    return d >= now && d <= new Date(now.getTime() + 7 * 86400000)
  })

  // Check overdue payment stages / final balance deadlines
  const overduePayments = countOverduePayments(data.budget)

  // Check accommodation allocations (from Supabase, no local fallback)
  const [accomData, setAccomData] = useState<{ rooms: { guestIds: string[] }[] }>({ rooms: [] })
  useEffect(() => {
    loadAccommodation().then(d => setAccomData(d as any)).catch(() => setAccomData({ rooms: [] }))
  }, [])
  const allocatedIds = new Set((accomData.rooms as { guestIds: string[] }[]).flatMap(r => r.guestIds))
  const unallocatedGuests = allGuests.filter(g => !allocatedIds.has(g.id)).length

  const attentionItems = [
    totalGuests === 0 && {
      icon: Users, color: '#7F9A78',
      title: 'No guests added yet',
      description: 'Start adding your confirmed guests to the guest list.',
      action: 'Add guests',
      page: 'guests' as Page,
    },
    unallocatedGuests > 0 && totalGuests > 0 && accomData.rooms.length > 0 && {
      icon: Users, color: '#C8A45D',
      title: `${unallocatedGuests} guest${unallocatedGuests > 1 ? 's' : ''} not yet allocated to a room`,
      description: 'Assign them to a room in the Accommodation page.',
      action: 'Accommodation',
      page: 'accommodation' as Page,
    },
    overdue.length > 0 && {
      icon: CheckSquare, color: '#C47A52',
      title: `${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}`,
      description: overdue[0]?.title + (overdue.length > 1 ? ` and ${overdue.length - 1} more.` : '.'),
      action: 'View checklist',
      page: 'planning' as Page,
    },
    dueSoon.length > 0 && {
      icon: Calendar, color: '#C8A45D',
      title: `${dueSoon.length} task${dueSoon.length > 1 ? 's' : ''} due this week`,
      description: dueSoon[0]?.title + (dueSoon.length > 1 ? ` and ${dueSoon.length - 1} more.` : '.'),
      action: 'View checklist',
      page: 'planning' as Page,
    },
    data.vendors.length === 0 && {
      icon: Store, color: '#C8A45D',
      title: 'No vendors added yet',
      description: 'Start adding your villa, caterer and other key vendors.',
      action: 'Add vendors',
      page: 'vendors' as Page,
    },
    overduePayments > 0 && {
      icon: PiggyBank, color: '#C47A52',
      title: `${overduePayments} payment${overduePayments > 1 ? 's' : ''} overdue`,
      description: `${overduePayments > 1 ? `${overduePayments} scheduled payments have` : 'A scheduled payment has'} passed their due date. Review and settle as soon as possible.`,
      action: 'View payments',
      page: 'budget-payments' as Page,
    },
    totalBudget === 0 && {
      icon: PiggyBank, color: '#7F9A78',
      title: 'Budget not set up',
      description: 'Add your estimated costs to start tracking spend.',
      action: 'Set budget',
      page: 'budget-payments' as Page,
    },
  ].filter(Boolean).slice(0, 4) as {
    icon: React.ElementType; color: string; title: string
    description: string; action: string; page: Page
  }[]

  const isAllClear = attentionItems.length === 0

  return (
    <div className="page-content" style={{maxWidth: 960}}>

      {/* ── Hero countdown ── */}
      <div style={{
        background: 'linear-gradient(150deg, #2A1E14 0%, #3B2A22 40%, #4A3020 100%)',
        borderRadius: isMobile ? 16 : 24,
        padding: isMobile ? '28px 20px' : '44px 48px',
        marginBottom: isMobile ? 24 : 48,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(42,30,20,0.35)',
      }}>
        {/* Temple gate — large, centred, prominent */}
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: -16, pointerEvents: 'none', zIndex: 0 }}>
          <TempleGate width={260} opacity={0.55} />
        </div>
        {/* Palm fronds — large, bold */}
        <div style={{ position: 'absolute', right: -8, top: -16, pointerEvents: 'none', zIndex: 1 }}>
          <PalmFrond size={180} opacity={0.65} />
        </div>
        <div style={{ position: 'absolute', left: -8, bottom: -14, pointerEvents: 'none', zIndex: 1 }}>
          <PalmFrond size={150} opacity={0.55} flip />
        </div>
        {/* Lily sprig — right side */}
        <div style={{ position: 'absolute', right: 48, top: -8, pointerEvents: 'none', zIndex: 2 }}>
          <LilySprig size={140} opacity={0.75} />
        </div>
        {/* Frangipani flowers — scattered, visible */}
        <div style={{ position: 'absolute', right: 200, top: 20, pointerEvents: 'none', zIndex: 2 }}>
          <Frangipani size={60} opacity={0.65} />
        </div>
        <div style={{ position: 'absolute', right: 148, bottom: 24, pointerEvents: 'none', zIndex: 2 }}>
          <Frangipani size={44} opacity={0.5} />
        </div>
        <div style={{ position: 'absolute', left: 90, bottom: 20, pointerEvents: 'none', zIndex: 2 }}>
          <Frangipani size={48} opacity={0.45} />
        </div>
        {/* Gold border at very bottom of hero */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, pointerEvents: 'none', zIndex: 3, overflow: 'hidden' }}>
          <BaliBorder width={960} opacity={0.6} />
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Label */}
          <p style={{
            color: '#C8A45D', fontSize: 11, letterSpacing: '0.25em',
            fontWeight: 600, marginBottom: 10,
          }}>S A V E &nbsp; T H E &nbsp; D A T E</p>

          {/* Names */}
          <h1 style={{
            fontFamily: 'Playfair Display, serif',
            fontStyle: 'italic',
            fontSize: 38,
            color: '#FFF8EE',
            fontWeight: 400,
            lineHeight: 1.1,
            marginBottom: 6,
          }}>Jamie & Beth</h1>

          <p style={{ color: 'rgba(255,248,238,0.55)', fontSize: isMobile ? 12 : 14, marginBottom: isMobile ? 20 : 36 }}>
            5th–15th April 2028 &nbsp;·&nbsp; Canggu, Bali
          </p>

          {/* Countdown units */}
          <div style={{ display: 'flex', gap: 0, alignItems: 'flex-end' }}>
            {[
              { value: days,    label: 'days' },
              { value: hours,   label: 'hrs' },
              { value: minutes, label: 'min' },
              { value: seconds, label: 'sec' },
            ].map(({ value, label }, i) => (
              <div key={label} style={{ display: 'flex', alignItems: 'flex-end' }}>
                {i > 0 && (
                  <span style={{
                    color: 'rgba(255,248,238,0.2)',
                    fontSize: isMobile ? 24 : 40, lineHeight: 1,
                    margin: isMobile ? '0 4px 5px' : '0 8px 8px',
                    fontFamily: 'Playfair Display, serif',
                  }}>:</span>
                )}
                <div style={{ textAlign: 'center' }}>
                  <span style={{
                    fontFamily: 'Playfair Display, serif',
                    fontSize: i === 0 ? (isMobile ? 48 : 72) : (isMobile ? 28 : 44),
                    lineHeight: 1,
                    color: i === 0 ? '#E8D5A3' : 'rgba(232,213,163,0.55)',
                    fontWeight: 500,
                    display: 'block',
                    minWidth: i === 0 ? (isMobile ? 80 : 120) : (isMobile ? 44 : 72),
                  }}>
                    {String(value).padStart(2, '0')}
                  </span>
                  <span style={{
                    fontSize: 10, letterSpacing: '0.18em',
                    color: 'rgba(255,248,238,0.35)',
                    fontWeight: 500, display: 'block', marginTop: 4,
                  }}>{label.toUpperCase()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <SectionLabel>At a glance</SectionLabel>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        gap: isMobile ? 12 : 20,
        marginBottom: isMobile ? 24 : 48,
      }}>
        <StatCard
          icon={Users} label="Guests" color="#7F9A78"
          value={totalGuests}
          sub={totalGuests > 0 ? `${totalAdults} adult${totalAdults !== 1 ? 's' : ''} · ${totalChildren} child${totalChildren !== 1 ? 'ren' : ''}` : 'None added yet'}
          onClick={() => onNavigate('guests')}
        />
        <StatCard
          icon={PiggyBank} label="Budget used" color="#C8A45D"
          value={totalBudget > 0 ? `${budgetPct}%` : '—'}
          sub={totalBudget > 0 ? `£${totalSpent.toLocaleString()} of £${totalBudget.toLocaleString()}` : 'Budget not set'}
          onClick={() => onNavigate('budget-payments')}
        />
        <StatCard
          icon={CheckSquare} label="Tasks complete" color="#C47A52"
          value={totalTasks > 0 ? `${taskPct}%` : '—'}
          sub={totalTasks > 0 ? `${completedTasks} of ${totalTasks} done` : 'No tasks yet'}
          onClick={() => onNavigate('planning')}
        />
        <StatCard
          icon={Store} label="Vendors booked" color="#7F9A78"
          value={bookedVendors}
          sub={data.vendors.length > 0 ? `of ${data.vendors.length} added` : 'None added yet'}
          onClick={() => onNavigate('vendors')}
        />
      </div>

      {/* ── Attention ── */}
      <SectionLabel>Needs your attention</SectionLabel>
      <div style={{ marginBottom: 48 }}>
        {isAllClear ? (
          <div style={{
            background: '#FAF3E6',
            border: '1.5px solid #E8D5A3',
            borderRadius: 16,
            padding: '32px 24px',
            textAlign: 'center',
          }}>
            <Sparkles size={28} style={{ color: '#C8A45D', marginBottom: 12 }} strokeWidth={1.2} />
            <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 17, color: '#3B2A22', marginBottom: 6 }}>
              You're all caught up
            </p>
            <p style={{ fontSize: 13, color: '#7A6657' }}>
              Nothing urgent right now — enjoy the calm.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {attentionItems.map((item, i) => (
              <AttentionCard
                key={i}
                icon={item.icon}
                color={item.color}
                title={item.title}
                description={item.description}
                action={item.action}
                onAction={() => onNavigate(item.page)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Quick links ── */}
      <SectionLabel>Jump to</SectionLabel>
      <div style={{ display: 'flex', gap: 16 }}>
        <QuickLink icon={Users}       label="Guests"    color="#7F9A78" onClick={() => onNavigate('guests')} />
        <QuickLink icon={PiggyBank}   label="Budget"    color="#C8A45D" onClick={() => onNavigate('budget-payments')} />
        <QuickLink icon={CheckSquare} label="Checklist" color="#C47A52" onClick={() => onNavigate('planning')} />
        <QuickLink icon={Store}       label="Vendors"   color="#7F9A78" onClick={() => onNavigate('vendors')} />
      </div>

      {/* ── Bottom ornament ── */}
      <div style={{ marginTop: 56, textAlign: 'center' }}>
        {/* Rice fields */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <RiceFields width={480} height={48} opacity={0.7} />
        </div>
        {/* Botanical row — bolder */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 4, marginBottom: 8 }}>
          <PalmFrond size={72} opacity={0.65} flip />
          <Frangipani size={56} opacity={0.7} />
          <LilySprig size={80} opacity={0.65} />
          <Frangipani size={48} opacity={0.6} />
          <PalmFrond size={64} opacity={0.6} />
        </div>
        <Divider />
        <p style={{
          fontFamily: 'Playfair Display, serif',
          fontStyle: 'italic',
          fontSize: 14,
          color: '#C8A45D',
          opacity: 0.7,
          marginTop: 8,
        }}>Canggu, Bali · April 2028</p>
      </div>

    </div>
  )
}
