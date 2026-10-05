import { useMemo, useState, type CSSProperties } from 'react'
import { Banknote, Plus, Trash2 } from 'lucide-react'
import { Frangipani, SmallLeaf } from '../components/Botanicals'
import { uid, guestDisplayName } from '../lib/helpers'
import {
  STAY_PER_GUEST,
  STAY_SCHEDULE,
  formatStayMoney,
  stayParties,
  type StayInstalmentStatus,
  type StayParty,
} from '../lib/stayPayments'
import type { AppData, GuestStayPayment } from '../types'

interface Props {
  data: AppData
  setData: (d: AppData | ((prev: AppData) => AppData)) => void
}

const STATUS_LABEL: Record<StayInstalmentStatus, string> = {
  paid: 'Paid',
  overdue: 'Overdue',
  partial: 'Part paid',
  upcoming: 'Upcoming',
}

function todayIso(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function statusStyle(status: StayInstalmentStatus): { color: string; background: string; border: string } {
  if (status === 'overdue') return { color: '#8C3A24', background: '#FBE8E0', border: '#E3B5A4' }
  if (status === 'paid') return { color: '#3E5C40', background: '#E7F0E4', border: '#C5D9C0' }
  if (status === 'partial') return { color: '#6B5420', background: '#F8F0DC', border: '#E8D5A3' }
  return { color: '#7A6657', background: 'transparent', border: 'transparent' }
}

export function StayPayments({ data, setData }: Props) {
  const [query, setQuery] = useState('')
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [draft, setDraft] = useState<{ amount: string; date: string; note: string }>({
    amount: '', date: todayIso(), note: '',
  })
  const [formError, setFormError] = useState('')

  const parties = useMemo(
    () => stayParties(data.guests, data.guestStayPayments),
    [data.guests, data.guestStayPayments],
  )

  const visible = parties.filter(p => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    if (p.label.toLowerCase().includes(q)) return true
    return p.guests.some(g => guestDisplayName(g).toLowerCase().includes(q))
  })

  const totals = parties.reduce(
    (acc, p) => {
      acc.due += p.totalDue
      acc.paid += p.totalPaid
      acc.balance += p.balance
      acc.overdue += p.overdueAmount
      acc.guests += p.guestCount
      if (p.overdueAmount > 0) acc.overdueParties += 1
      return acc
    },
    { due: 0, paid: 0, balance: 0, overdue: 0, guests: 0, overdueParties: 0 },
  )

  const savePayments = (next: GuestStayPayment[]) => {
    setData(d => ({ ...d, guestStayPayments: next }))
  }

  const openForm = (partyKey: string) => {
    setOpenKey(partyKey)
    setDraft({ amount: '', date: todayIso(), note: '' })
    setFormError('')
  }

  const logPayment = (party: StayParty) => {
    const amount = Number(draft.amount)
    if (!draft.date) {
      setFormError('Add the date the money arrived.')
      return
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('Enter an amount greater than zero.')
      return
    }
    const payment: GuestStayPayment = {
      id: uid(),
      partyKey: party.partyKey,
      date: draft.date,
      amount: Math.round(amount * 100) / 100,
      note: draft.note.trim() || undefined,
    }
    savePayments([...(data.guestStayPayments ?? []), payment])
    setOpenKey(null)
    setFormError('')
  }

  const removePayment = (id: string) => {
    savePayments((data.guestStayPayments ?? []).filter(p => p.id !== id))
  }

  return (
    <div className="page-content" style={{ maxWidth: 1000 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 30, fontStyle: 'italic', color: '#3B2A22', margin: 0 }}>
            Stay payments
          </h1>
          <SmallLeaf size={22} opacity={0.5} rotate={-15} />
          <Frangipani size={26} opacity={0.5} />
        </div>
        <p style={{ fontSize: 13, color: '#7A6657', maxWidth: 640, lineHeight: 1.55 }}>
          Accommodation and meals. The schedule is per guest, and each party shares one balance.
          Everyone attending counts, including children. Payments are applied to the earliest instalment first,
          so an early payment reduces what is still owed.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 14, marginBottom: 22, flexWrap: 'wrap' }}>
        {[
          { label: 'TOTAL DUE', value: formatStayMoney(totals.due), color: '#3B2A22' },
          { label: 'RECEIVED', value: formatStayMoney(totals.paid), color: '#3E5C40' },
          { label: 'OUTSTANDING', value: formatStayMoney(totals.balance), color: '#6B5420' },
          { label: 'OVERDUE', value: formatStayMoney(totals.overdue), color: totals.overdue > 0 ? '#8C3A24' : '#7A6657' },
        ].map(card => (
          <div key={card.label} style={{
            background: '#FAF3E6', border: '1.5px solid #E8D5A3',
            borderRadius: 16, padding: '16px 22px', minWidth: 140, flex: '1 1 140px',
          }}>
            <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 500, color: card.color, lineHeight: 1, margin: '0 0 4px' }}>{card.value}</p>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#7A6657', letterSpacing: '0.08em', margin: 0 }}>{card.label}</p>
          </div>
        ))}
      </div>

      <div style={{
        background: '#FFF8EE', border: '1.5px solid #E8D5A3', borderRadius: 16,
        padding: '16px 18px', marginBottom: 22,
      }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#7A6657', margin: '0 0 10px' }}>
          SCHEDULE · {formatStayMoney(STAY_PER_GUEST)} PER GUEST · {totals.guests} GUEST{totals.guests === 1 ? '' : 'S'}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
          {STAY_SCHEDULE.map(row => (
            <div key={row.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, color: '#3B2A22' }}>
              <span>{row.label}</span>
              <span style={{ fontWeight: 600 }}>{formatStayMoney(row.perGuest)}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by party or guest"
          aria-label="Search parties"
          style={{
            width: '100%', maxWidth: 360, padding: '9px 12px',
            border: '1.5px solid #E8D5A3', borderRadius: 10,
            background: '#FAF3E6', color: '#3B2A22', fontSize: 13, outline: 'none',
            fontFamily: 'Inter, sans-serif',
          }}
        />
      </div>

      {parties.length === 0 && (
        <p style={{ fontSize: 14, color: '#7A6657' }}>Add attending guests first. Each party then gets a balance of {formatStayMoney(STAY_PER_GUEST)} per person.</p>
      )}

      {parties.length > 0 && visible.length === 0 && (
        <p style={{ fontSize: 14, color: '#7A6657' }}>No parties match that search.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {visible.map(party => (
          <PartyCard
            key={party.partyKey}
            party={party}
            formOpen={openKey === party.partyKey}
            draft={draft}
            formError={formError}
            onDraft={setDraft}
            onOpen={() => openForm(party.partyKey)}
            onCancel={() => { setOpenKey(null); setFormError('') }}
            onSave={() => logPayment(party)}
            onRemove={removePayment}
          />
        ))}
      </div>
    </div>
  )
}

function PartyCard({
  party, formOpen, draft, formError, onDraft, onOpen, onCancel, onSave, onRemove,
}: {
  party: StayParty
  formOpen: boolean
  draft: { amount: string; date: string; note: string }
  formError: string
  onDraft: (next: { amount: string; date: string; note: string }) => void
  onOpen: () => void
  onCancel: () => void
  onSave: () => void
  onRemove: (id: string) => void
}) {
  const overdue = party.overdueAmount > 0
  return (
    <section style={{
      background: '#FFFDF8',
      border: overdue ? '1.5px solid #E3B5A4' : '1.5px solid #E8D5A3',
      borderRadius: 16,
      padding: '18px 18px 14px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, color: '#3B2A22', margin: 0 }}>{party.label}</h2>
            {overdue && (
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                color: '#8C3A24', background: '#FBE8E0', border: '1px solid #E3B5A4',
                borderRadius: 999, padding: '3px 8px',
              }}>OVERDUE {formatStayMoney(party.overdueAmount)}</span>
            )}
          </div>
          <p style={{ fontSize: 12, color: '#7A6657', margin: '4px 0 0' }}>
            {party.guestCount} guest{party.guestCount === 1 ? '' : 's'}
            {' · '}
            {party.guests.map(g => guestDisplayName(g)).join(', ')}
          </p>
        </div>
        <button type="button" onClick={onOpen} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 14px', borderRadius: 10, border: 'none',
          background: '#3B2A22', color: '#FFF8EE', fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}>
          <Plus size={14} /> Log payment
        </button>
      </div>

      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', margin: '14px 0', fontSize: 13, color: '#3B2A22' }}>
        <span>Due <strong>{formatStayMoney(party.totalDue)}</strong></span>
        <span>Paid <strong>{formatStayMoney(party.totalPaid)}</strong></span>
        <span>Balance <strong>{formatStayMoney(party.balance)}</strong></span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ color: '#7A6657', fontSize: 10, letterSpacing: '0.06em' }}>
              <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 700 }}>WHEN</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700 }}>DUE</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700 }}>COVERED</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700 }}>LEFT</th>
              <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 700 }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {party.instalments.map(row => {
              const tone = statusStyle(row.status)
              return (
                <tr key={row.id} style={{ background: tone.background, color: '#3B2A22' }}>
                  <td style={{ padding: '8px', borderTop: '1px solid #F2E3CF' }}>{row.label}</td>
                  <td style={{ padding: '8px', borderTop: '1px solid #F2E3CF', textAlign: 'right' }}>{formatStayMoney(row.dueAmount)}</td>
                  <td style={{ padding: '8px', borderTop: '1px solid #F2E3CF', textAlign: 'right' }}>{formatStayMoney(row.covered)}</td>
                  <td style={{ padding: '8px', borderTop: '1px solid #F2E3CF', textAlign: 'right', fontWeight: row.status === 'overdue' ? 700 : 500, color: tone.color }}>{formatStayMoney(row.remaining)}</td>
                  <td style={{ padding: '8px', borderTop: '1px solid #F2E3CF', color: tone.color, fontWeight: 600 }}>{STATUS_LABEL[row.status]}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {party.payments.length > 0 && (
        <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0 }}>
          {party.payments.map(payment => (
            <li key={payment.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between',
              padding: '8px 0', borderTop: '1px solid #F2E3CF', fontSize: 13, color: '#3B2A22',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <Banknote size={14} color="#C8A45D" />
                <span>{payment.date}</span>
                <strong>{formatStayMoney(payment.amount)}</strong>
                {payment.note && <span style={{ color: '#7A6657' }}>{payment.note}</span>}
              </span>
              <button
                type="button"
                aria-label={`Remove payment of ${formatStayMoney(payment.amount)} on ${payment.date}`}
                onClick={() => onRemove(payment.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C47A52', padding: 4 }}
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {formOpen && (
        <form
          onSubmit={e => { e.preventDefault(); onSave() }}
          style={{
            display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end',
            marginTop: 14, padding: 12, background: '#FAF3E6', borderRadius: 12,
          }}
        >
          <label style={{ fontSize: 11, fontWeight: 700, color: '#7A6657', display: 'flex', flexDirection: 'column', gap: 4 }}>
            AMOUNT (£)
            <input
              inputMode="decimal"
              value={draft.amount}
              onChange={e => onDraft({ ...draft, amount: e.target.value })}
              placeholder="0"
              style={fieldStyle}
            />
          </label>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#7A6657', display: 'flex', flexDirection: 'column', gap: 4 }}>
            DATE RECEIVED
            <input type="date" value={draft.date} onChange={e => onDraft({ ...draft, date: e.target.value })} style={fieldStyle} />
          </label>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#7A6657', display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 160px' }}>
            NOTE
            <input value={draft.note} onChange={e => onDraft({ ...draft, note: e.target.value })} placeholder="Optional" style={fieldStyle} />
          </label>
          <button type="submit" style={{
            padding: '9px 14px', borderRadius: 10, border: 'none',
            background: '#3B2A22', color: '#FFF8EE', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>Save payment</button>
          <button type="button" onClick={onCancel} style={{
            padding: '9px 14px', borderRadius: 10, border: '1.5px solid #E8D5A3',
            background: 'transparent', color: '#7A6657', fontSize: 12, cursor: 'pointer',
          }}>Cancel</button>
          {formError && <p style={{ flexBasis: '100%', margin: 0, fontSize: 12, color: '#8C3A24' }}>{formError}</p>}
        </form>
      )}
    </section>
  )
}

const fieldStyle: CSSProperties = {
  padding: '8px 10px',
  border: '1.5px solid #E8D5A3',
  borderRadius: 10,
  background: '#FFFDF7',
  color: '#3B2A22',
  fontSize: 13,
  fontFamily: 'Inter, sans-serif',
  outline: 'none',
}
