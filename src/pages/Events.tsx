import { useState, useMemo } from 'react'
import {
  Plus, Edit2, Trash2, X, ChevronDown, Users, CheckCircle,
  Clock, MapPin, AlertTriangle, CalendarDays, Banknote, Search,
} from 'lucide-react'
import { SmallLeaf, Frangipani, BaliBorder } from '../components/Botanicals'
import { uid, fmt, guestDisplayName as guestName } from '../lib/helpers'
import type { AppData, Event, EventType, ActivitySignup, PaymentMethod, Guest } from '../types'

// ── helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}
function todayISO() { return new Date().toISOString().split('T')[0] }

const STORAGE_KEY = 'jb-events'

function useEvents(appEvents: Event[], onSave: (evts: Event[]) => void): [Event[], (evts: Event[]) => void] {
  const save = (evts: Event[]) => {
    onSave(evts)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(evts)) } catch(e) { if (e instanceof DOMException) window.dispatchEvent(new CustomEvent("storage-quota-exceeded")) }
  }
  return [appEvents, save]
}

// ── Empty defaults ────────────────────────────────────────────────────────────
const EMPTY_WEDDING: Omit<Event, 'id'> = {
  type: 'wedding', title: '', date: todayISO(), time: '', endTime: '',
  location: '', description: '', dressCode: '', transport: '', includeInItinerary: true,
}
const EMPTY_ACTIVITY: Omit<Event, 'id'> = {
  type: 'activity', title: '', date: todayISO(), time: '', endTime: '',
  location: '', description: '', includeInItinerary: true,
  isFree: false, costPerPerson: 0, paymentMethod: 'couple', signups: [],
}

// ── Shared input styles ───────────────────────────────────────────────────────
const INP: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1.5px solid #E8D5A3', borderRadius: 10,
  background: '#FFFDF7', color: '#3B2A22', fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none',
}
const LBL: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, color: '#7A6657', letterSpacing: '0.08em', marginBottom: 5,
}

// ── Event modal ───────────────────────────────────────────────────────────────
function EventModal({ initial, guests: _guests, onSave, onClose }: {
  initial?: Event; guests: Guest[]
  onSave: (e: Event) => void; onClose: () => void
}) {
  const startType: EventType = initial?.type ?? 'wedding'
  const defaultForm = initial
    ? { ...initial }
    : startType === 'activity' ? { ...EMPTY_ACTIVITY } : { ...EMPTY_WEDDING }

  const [form, setForm] = useState<Omit<Event, 'id'>>(defaultForm as Omit<Event, 'id'>)
  const [eventType, setEventType] = useState<EventType>(startType)

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  const handleTypeChange = (t: EventType) => {
    setEventType(t)
    setForm(t === 'wedding'
      ? { ...EMPTY_WEDDING, title: form.title, date: form.date, time: form.time ?? '', location: form.location ?? '' }
      : { ...EMPTY_ACTIVITY, title: form.title, date: form.date, time: form.time ?? '', location: form.location ?? '' }
    )
  }

  const canSave = form.title.trim() && form.date

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,30,20,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#FFF8EE', borderRadius: 20, padding: 36, width: '100%', maxWidth: 540,
        maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(42,30,20,0.22)', border: '1.5px solid #E8D5A3' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, fontStyle: 'italic', color: '#3B2A22', margin: 0 }}>
              {initial ? 'Edit event' : 'Add event'}
            </h2>
            <Frangipani size={22} opacity={0.5}/>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A6657' }}>
            <X size={18}/>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Type selector */}
          <div>
            <label style={LBL}>TYPE</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {([['wedding', '💍', 'Wedding Event', 'Ceremony, dinner, brunch…'],
                 ['activity', '🌴', 'Optional Activity', 'Tours, spa, boat trips…']] as const).map(([t, emoji, label, sub]) => {
                const active = eventType === t
                return (
                  <button key={t} onClick={() => handleTypeChange(t)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                      borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                      border: `1.5px solid ${active ? (t === 'wedding' ? 'rgba(127,154,120,0.6)' : 'rgba(200,164,93,0.6)') : '#E8D5A3'}`,
                      background: active ? (t === 'wedding' ? 'rgba(127,154,120,0.1)' : 'rgba(200,164,93,0.1)') : 'transparent',
                    }}>
                    <span style={{ fontSize: 18 }}>{emoji}</span>
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: active ? '#3B2A22' : '#7A6657', lineHeight: 1 }}>{label}</p>
                      <p style={{ fontSize: 10, color: '#7A6657', marginTop: 2 }}>{sub}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label style={LBL}>TITLE *</label>
            <input style={INP} value={form.title} onChange={set('title')} placeholder={eventType === 'wedding' ? 'e.g. Welcome Dinner' : 'e.g. Tanah Lot Sunset Tour'}/>
          </div>

          {/* Date + Time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={LBL}>DATE *</label>
              <input style={INP} type="date" value={form.date} onChange={set('date')}/>
            </div>
            <div>
              <label style={LBL}>START TIME</label>
              <input style={INP} type="time" value={form.time ?? ''} onChange={set('time')}/>
            </div>
            <div>
              <label style={LBL}>END TIME</label>
              <input style={INP} type="time" value={form.endTime ?? ''} onChange={set('endTime')}/>
            </div>
          </div>

          {/* Location */}
          <div>
            <label style={LBL}>LOCATION</label>
            <input style={INP} value={form.location ?? ''} onChange={set('location')} placeholder="e.g. Villa Canggu, Tanah Lot"/>
          </div>

          {/* Description */}
          <div>
            <label style={LBL}>DESCRIPTION / NOTES</label>
            <textarea style={{ ...INP, resize: 'vertical', minHeight: 72 }}
              value={form.description ?? ''} onChange={set('description')} placeholder="Details, meeting point, what to bring…"/>
          </div>

          {/* Wedding-only fields */}
          {eventType === 'wedding' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={LBL}>DRESS CODE</label>
                  <input style={INP} value={(form as Event).dressCode ?? ''} onChange={set('dressCode' as keyof typeof form)} placeholder="e.g. Smart casual, White tie"/>
                </div>
                <div>
                  <label style={LBL}>TRANSPORT / TRANSFERS</label>
                  <input style={INP} value={(form as Event).transport ?? ''} onChange={set('transport' as keyof typeof form)} placeholder="e.g. Shuttle from villa at 6pm"/>
                </div>
              </div>
            </>
          )}

          {/* Activity-only fields */}
          {eventType === 'activity' && (
            <>
              <div style={{ height: 1, background: '#F2E3CF', margin: '2px 0' }}/>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#7A6657', letterSpacing: '0.08em' }}>COST & PAYMENT</p>

              {/* Free / Paid toggle */}
              <div style={{ display: 'flex', gap: 8 }}>
                {[['free', '🎁', 'Free'], ['paid', '💳', 'Paid']] .map(([val, emoji, label]) => {
                  const active = val === 'free' ? (form as Event).isFree : !(form as Event).isFree
                  return (
                    <button key={val} onClick={() => setForm(f => ({ ...f, isFree: val === 'free' }))}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '8px 12px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                        border: `1.5px solid ${active ? 'rgba(200,164,93,0.6)' : '#E8D5A3'}`,
                        background: active ? 'rgba(200,164,93,0.1)' : 'transparent',
                        fontSize: 13, fontWeight: active ? 700 : 400, color: active ? '#3B2A22' : '#7A6657' }}>
                      {emoji} {label}
                    </button>
                  )
                })}
              </div>

              {!(form as Event).isFree && (
                <>
                  <div>
                    <label style={LBL}>COST PER PERSON (£)</label>
                    <input style={INP} type="number" min={0} step="any" placeholder="0"
                      value={(form as Event).costPerPerson ?? ''}
                      onChange={e => setForm(f => ({ ...f, costPerPerson: e.target.value === '' ? 0 : +e.target.value }))}/>
                  </div>

                  <div>
                    <label style={LBL}>PAYMENT METHOD</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {([['couple', '👫', 'Paid to Couple', 'Guests pay you, you pay vendor'],
                         ['self',   '🏪', 'Self Pay',       'Guests pay vendor directly']] as const).map(([val, emoji, label, sub]) => {
                        const active = (form as Event).paymentMethod === val
                        return (
                          <button key={val} onClick={() => setForm(f => ({ ...f, paymentMethod: val as PaymentMethod }))}
                            style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px',
                              borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                              border: `1.5px solid ${active ? 'rgba(127,154,120,0.6)' : '#E8D5A3'}`,
                              background: active ? 'rgba(127,154,120,0.1)' : 'transparent' }}>
                            <span style={{ fontSize: 16, flexShrink: 0 }}>{emoji}</span>
                            <div style={{ textAlign: 'left' }}>
                              <p style={{ fontSize: 12, fontWeight: 700, color: active ? '#3B2A22' : '#7A6657', lineHeight: 1 }}>{label}</p>
                              <p style={{ fontSize: 10, color: '#7A6657', marginTop: 2 }}>{sub}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* Include in itinerary */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
            borderRadius: 10, background: 'rgba(200,164,93,0.06)', border: '1px solid rgba(200,164,93,0.3)' }}>
            <button onClick={() => setForm(f => ({ ...f, includeInItinerary: !f.includeInItinerary }))}
              style={{ width: 40, height: 22, borderRadius: 11, flexShrink: 0,
                background: form.includeInItinerary ? '#7F9A78' : '#E8D5A3',
                border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 3, left: form.includeInItinerary ? 21 : 3,
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}/>
            </button>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#3B2A22', lineHeight: 1 }}>Include in Guest Itinerary</p>
              <p style={{ fontSize: 11, color: '#7A6657', marginTop: 2 }}>Show in the printable welcome book</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 10, fontSize: 13,
            border: '1.5px solid #E8D5A3', background: 'transparent', color: '#7A6657', cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => {
            if (!canSave) return
            onSave({ id: initial?.id ?? uid(), ...form, type: eventType, signups: (form as Event).signups ?? [] })
          }} disabled={!canSave} style={{ flex: 2, padding: 10, borderRadius: 10, fontSize: 13, fontWeight: 600,
            border: 'none', background: canSave ? '#3B2A22' : '#E8D5A3',
            color: canSave ? '#FFF8EE' : '#7A6657', cursor: canSave ? 'pointer' : 'default' }}>
            {initial ? 'Save changes' : 'Add event'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Signup modal ──────────────────────────────────────────────────────────────
function SignupModal({ event, guests, onSave, onClose }: {
  event: Event; guests: Guest[]
  onSave: (signups: ActivitySignup[]) => void; onClose: () => void
}) {
  const [signups, setSignups] = useState<ActivitySignup[]>(event.signups ?? [])
  const [search,  setSearch]  = useState('')

  const isActivity      = event.type === 'activity'
  const showPayments    = isActivity && !event.isFree
  const cost            = event.costPerPerson ?? 0
  const confirmedGuests = guests.filter(g => g.attending !== 'no')
  const filtered        = search.trim()
    ? confirmedGuests.filter(g => guestName(g).toLowerCase().includes(search.toLowerCase()))
    : confirmedGuests

  const allAttending  = confirmedGuests.length > 0 && confirmedGuests.every(g => signups.some(s => s.guestId === g.id))
  const someAttending = confirmedGuests.some(g => signups.some(s => s.guestId === g.id))

  // Derived counts — live as state changes
  const attending   = signups.length
  const paidCount   = signups.filter(s => s.paid).length
  const collected   = paidCount * cost
  const outstanding = (attending - paidCount) * cost

  // Save immediately on every change so the event cards update live
  const commit = (next: ActivitySignup[]) => {
    setSignups(next)
    onSave(next)
  }

  const toggleAll = () => {
    const next = allAttending
      ? []
      : confirmedGuests.map(g => signups.find(s => s.guestId === g.id) ?? { guestId: g.id, paid: false })
    commit(next)
  }

  const toggleAttending = (guestId: string) => {
    const next = signups.some(s => s.guestId === guestId)
      ? signups.filter(s => s.guestId !== guestId)
      : [...signups, { guestId, paid: false }]
    commit(next)
  }

  const togglePaid = (guestId: string) => {
    const next = signups.map(s =>
      s.guestId === guestId ? { ...s, paid: !s.paid } : s
    )
    commit(next)
  }

  const Checkbox = ({ checked, indeterminate = false }: { checked: boolean; indeterminate?: boolean }) => (
    <div style={{
      width: 20, height: 20, borderRadius: 5, flexShrink: 0,
      border: `1.5px solid ${checked ? '#7F9A78' : indeterminate ? '#C8A45D' : '#D4C5A4'}`,
      background: checked ? '#7F9A78' : indeterminate ? 'rgba(200,164,93,0.15)' : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {checked && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3 5.5L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
      {indeterminate && !checked && <div style={{ width: 8, height: 2, background: '#C8A45D', borderRadius: 1 }}/>}
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,30,20,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#FFF8EE', borderRadius: 20, padding: 28, width: '100%', maxWidth: 520,
        maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(42,30,20,0.22)', border: '1.5px solid #E8D5A3' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, fontStyle: 'italic', color: '#3B2A22', margin: 0 }}>
              {event.title}
            </h2>
            <p style={{ fontSize: 12, color: '#7A6657', marginTop: 3 }}>
              {isActivity ? 'Who is attending and who has paid?' : 'Who is attending this event?'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A6657' }}>
            <X size={18}/>
          </button>
        </div>

        {/* Payment summary — paid activities only */}
        {showPayments && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
            {[
              { label: 'ATTENDING',    value: `${attending}`,   color: '#3B2A22' },
              { label: 'PAID',         value: `${paidCount}`,   color: '#7F9A78' },
              { label: 'COLLECTED',    value: fmt(collected),   color: '#7F9A78' },
              { label: 'OUTSTANDING',  value: fmt(outstanding), color: outstanding > 0 ? '#C47A52' : '#7A6657' },
            ].map(s => (
              <div key={s.label} style={{ background: '#FAF3E6', border: '1.5px solid #E8D5A3', borderRadius: 10, padding: '10px 12px' }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: '#7A6657', letterSpacing: '0.1em', marginBottom: 4 }}>{s.label}</p>
                <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, color: s.color, fontWeight: 500, lineHeight: 1 }}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Attendance summary — wedding / free activities */}
        {!showPayments && attending > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10,
            background: 'rgba(127,154,120,0.08)', border: '1px solid rgba(127,154,120,0.3)', marginBottom: 16 }}>
            <CheckCircle size={13} style={{ color: '#7F9A78' }}/>
            <span style={{ fontSize: 13, color: '#5A7A54', fontWeight: 600 }}>
              {attending} of {confirmedGuests.length} guests attending
            </span>
          </div>
        )}

        {confirmedGuests.length === 0 ? (
          <p style={{ fontSize: 13, color: '#7A6657', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
            No confirmed guests yet — add guests on the Guest List first.
          </p>
        ) : (
          <>
            {/* Controls row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <button onClick={toggleAll}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                  border: `1.5px solid ${allAttending ? '#7F9A78' : someAttending ? '#C8A45D' : '#E8D5A3'}`,
                  background: allAttending ? 'rgba(127,154,120,0.1)' : someAttending ? 'rgba(200,164,93,0.06)' : 'transparent',
                  fontSize: 12, fontWeight: 600, color: '#3B2A22', flexShrink: 0 }}>
                <Checkbox checked={allAttending} indeterminate={someAttending && !allAttending}/>
                {allAttending ? 'Deselect all' : 'Select all'}
              </button>
              {confirmedGuests.length > 6 && (
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#7A6657' }}/>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search guests…"
                    style={{ width: '100%', padding: '6px 10px 6px 28px', border: '1.5px solid #E8D5A3',
                      borderRadius: 8, background: '#FAF3E6', color: '#3B2A22', fontSize: 12, outline: 'none',
                      fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}/>
                </div>
              )}
            </div>

            {/* Column headers — only when payments shown */}
            {showPayments && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 80px', gap: 0,
                padding: '4px 14px 4px 46px', marginBottom: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#7A6657', letterSpacing: '0.08em' }}>GUEST</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#7A6657', letterSpacing: '0.08em', textAlign: 'center' }}>ATTENDING</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#7A6657', letterSpacing: '0.08em', textAlign: 'center' }}>PAID</span>
              </div>
            )}

            {/* Guest rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {filtered.map(g => {
                const signup    = signups.find(s => s.guestId === g.id)
                const isIn      = !!signup
                const hasPaid   = !!signup?.paid

                return showPayments ? (
                  // Two-column row: Attending | Paid
                  <div key={g.id} style={{
                    display: 'grid', gridTemplateColumns: '1fr 90px 80px',
                    alignItems: 'center', gap: 0, padding: '9px 14px',
                    borderRadius: 10,
                    border: `1.5px solid ${hasPaid ? 'rgba(127,154,120,0.4)' : isIn ? 'rgba(200,164,93,0.35)' : '#E8D5A3'}`,
                    background: hasPaid ? 'rgba(127,154,120,0.05)' : isIn ? 'rgba(200,164,93,0.04)' : '#FAF3E6',
                  }}>
                    <span style={{ fontSize: 13, fontWeight: isIn ? 600 : 400, color: isIn ? '#3B2A22' : '#7A6657' }}>
                      {guestName(g)}
                    </span>
                    {/* Attending checkbox */}
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <button onClick={() => toggleAttending(g.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                        <Checkbox checked={isIn}/>
                      </button>
                    </div>
                    {/* Paid checkbox — only enabled if attending */}
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <button onClick={() => isIn && togglePaid(g.id)}
                        style={{ background: 'none', border: 'none', cursor: isIn ? 'pointer' : 'default',
                          padding: 2, opacity: isIn ? 1 : 0.3 }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: 5,
                          border: `1.5px solid ${hasPaid ? '#7F9A78' : '#D4C5A4'}`,
                          background: hasPaid ? '#7F9A78' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {hasPaid && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3 5.5L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                        </div>
                      </button>
                    </div>
                  </div>
                ) : (
                  // Single checkbox row: Attending only
                  <div key={g.id} onClick={() => toggleAttending(g.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px',
                      borderRadius: 10, cursor: 'pointer',
                      border: `1.5px solid ${isIn ? 'rgba(127,154,120,0.4)' : '#E8D5A3'}`,
                      background: isIn ? 'rgba(127,154,120,0.05)' : '#FAF3E6' }}>
                    <Checkbox checked={isIn}/>
                    <span style={{ fontSize: 13, fontWeight: isIn ? 600 : 400, color: isIn ? '#3B2A22' : '#7A6657' }}>
                      {guestName(g)}
                    </span>
                    {isIn && (
                      <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: '#7F9A78',
                        background: 'rgba(127,154,120,0.12)', padding: '1px 7px', borderRadius: 20,
                        border: '1px solid rgba(127,154,120,0.3)' }}>
                        Attending
                      </span>
                    )}
                  </div>
                )
              })}
              {filtered.length === 0 && (
                <p style={{ fontSize: 12, color: '#7A6657', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>
                  No guests match "{search}"
                </p>
              )}
            </div>

            {/* Cost reminder */}
            {showPayments && (
              <p style={{ fontSize: 11, color: '#7A6657', marginTop: 12, fontStyle: 'italic' }}>
                Cost per person: <strong style={{ color: '#3B2A22' }}>{fmt(cost)}</strong> ·
                Tick Paid once a guest has handed over their money.
              </p>
            )}
          </>
        )}

        <button onClick={onClose}
          style={{ width: '100%', marginTop: 20, padding: 10, borderRadius: 10, fontSize: 13, fontWeight: 600,
            border: 'none', background: '#3B2A22', color: '#FFF8EE', cursor: 'pointer' }}>
          Done
        </button>
      </div>
    </div>
  )
}

// ── Event card ────────────────────────────────────────────────────────────────
function EventCard({ event, guests: _guests, onEdit, onDelete, onSignups }: {
  event: Event; guests: Guest[]
  onEdit: (e: Event) => void; onDelete: (id: string) => void; onSignups: (e: Event) => void
}) {
  const isWedding     = event.type === 'wedding'
  const signups       = event.signups ?? []
  const signedUpCount = signups.length
  const cost          = event.costPerPerson ?? 0
  const paidCount     = signups.filter(s => s.paid).length
  const outstanding   = (signedUpCount - paidCount) * cost

  return (
    <div style={{
      background: '#FAF3E6',
      border: `1.5px solid ${isWedding ? 'rgba(127,154,120,0.4)' : 'rgba(200,164,93,0.4)'}`,
      borderRadius: 14, padding: '16px 18px',
      borderLeft: `4px solid ${isWedding ? '#7F9A78' : '#C8A45D'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <span style={{ fontSize: 16 }}>{isWedding ? '💍' : '🌴'}</span>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#3B2A22' }}>{event.title}</p>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
              color: isWedding ? '#5A7A54' : '#8B6914',
              background: isWedding ? 'rgba(127,154,120,0.15)' : 'rgba(200,164,93,0.15)',
              border: `1px solid ${isWedding ? 'rgba(127,154,120,0.4)' : 'rgba(200,164,93,0.4)'}`,
            }}>
              {isWedding ? 'WEDDING' : 'ACTIVITY'}
            </span>
            {!event.includeInItinerary && (
              <span style={{ fontSize: 9, fontWeight: 700, color: '#A89080', padding: '2px 6px',
                borderRadius: 20, background: 'rgba(168,144,128,0.1)', border: '1px solid rgba(168,144,128,0.3)' }}>
                HIDDEN FROM ITINERARY
              </span>
            )}
          </div>

          {/* Meta row */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#7A6657' }}>
              <CalendarDays size={11} style={{ color: '#C8A45D' }}/> {fmtDate(event.date)}
            </span>
            {event.time && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#7A6657' }}>
                <Clock size={11} style={{ color: '#C8A45D' }}/>
                {event.time}{event.endTime ? ` – ${event.endTime}` : ''}
              </span>
            )}
            {event.location && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#7A6657' }}>
                <MapPin size={11} style={{ color: '#C8A45D' }}/> {event.location}
              </span>
            )}
          </div>

          {/* Wedding extras */}
          {isWedding && (event.dressCode || event.transport) && (
            <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
              {event.dressCode && <span style={{ fontSize: 11, color: '#7A6657' }}>👗 {event.dressCode}</span>}
              {event.transport && <span style={{ fontSize: 11, color: '#7A6657' }}>🚌 {event.transport}</span>}
            </div>
          )}

          {/* Activity cost + signups */}
          {!isWedding && (
            <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {event.isFree ? (
                <span style={{ fontSize: 11, fontWeight: 600, color: '#7F9A78' }}>🎁 Free</span>
              ) : (
                <>
                  <span style={{ fontSize: 11, color: '#7A6657' }}>
                    <Banknote size={11} style={{ verticalAlign: 'middle', marginRight: 3 }}/>{fmt(cost)}/person
                    {event.paymentMethod === 'self' ? ' · Self pay' : ' · Paid to couple'}
                  </span>
                  {signedUpCount > 0 && (
                    <span style={{ fontSize: 11, color: '#3B2A22', fontWeight: 600 }}>
                      <Users size={11} style={{ verticalAlign: 'middle', marginRight: 3 }}/>{signedUpCount} signed up
                    </span>
                  )}
                  {outstanding > 0 && event.paymentMethod === 'couple' && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#C47A52' }}>
                      <AlertTriangle size={11} style={{ verticalAlign: 'middle', marginRight: 3 }}/>{fmt(outstanding)} outstanding
                    </span>
                  )}
                  {outstanding === 0 && signedUpCount > 0 && event.paymentMethod === 'couple' && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#7F9A78' }}>✓ All paid</span>
                  )}
                </>
              )}
            </div>
          )}

          {event.description && (
            <p style={{ fontSize: 11, color: '#7A6657', fontStyle: 'italic', marginTop: 6, lineHeight: 1.5 }}>
              {event.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
          <button onClick={() => onSignups(event)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7,
              border: `1.5px solid ${signedUpCount > 0 ? 'rgba(127,154,120,0.4)' : '#E8D5A3'}`,
              background: signedUpCount > 0 ? 'rgba(127,154,120,0.08)' : 'transparent',
              color: signedUpCount > 0 ? '#5A7A54' : '#7A6657', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
            <Users size={11}/>
            {signedUpCount > 0 ? `${signedUpCount} guest${signedUpCount !== 1 ? 's' : ''}` : 'Guests'}
          </button>
          <button onClick={() => onEdit(event)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7,
              border: '1.5px solid #E8D5A3', background: 'transparent', color: '#7A6657', fontSize: 11, cursor: 'pointer' }}>
            <Edit2 size={11}/> Edit
          </button>
          <button onClick={() => onDelete(event.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7,
              border: '1.5px solid rgba(196,122,82,0.4)', background: 'transparent', color: '#C47A52', fontSize: 11, cursor: 'pointer' }}>
            <Trash2 size={11}/>
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
interface Props { data: AppData; setData: (d: AppData | ((p: AppData) => AppData)) => void }

export function Events({ data, setData }: Props) {
  // Include all guests — legacy 'attending' field treated as confirmed (new model has no pending)
  const guests = data.guests.filter(g => g.attending !== 'no')
  const [events, saveEvents] = useEvents(data.events ?? [], evts => setData(prev => ({ ...prev, events: evts })))

  const [modal,     setModal]     = useState<'new' | Event | null>(null)
  const [signupEvt, setSignupEvt] = useState<Event | null>(null)
  const [deleteId,  setDeleteId]  = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<'all' | EventType>('all')
  const [newType, setNewType] = useState<EventType>('wedding')

  const saveEvent = (e: Event) => {
    const exists = events.find(x => x.id === e.id)
    saveEvents(exists ? events.map(x => x.id === e.id ? e : x) : [...events, e])
    setModal(null)
  }

  const deleteEvent = (id: string) => { saveEvents(events.filter(e => e.id !== id)); setDeleteId(null) }

  const saveSignups = (eventId: string, signups: ActivitySignup[]) => {
    saveEvents(events.map(e => e.id === eventId ? { ...e, signups } : e))
  }

  // Group by date
  const sorted = useMemo(() => {
    let list = [...events]
    if (typeFilter !== 'all') list = list.filter(e => e.type === typeFilter)
    return list.sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))
  }, [events, typeFilter])

  const byDate = useMemo(() => {
    const map: Record<string, Event[]> = {}
    sorted.forEach(e => { if (!map[e.date]) map[e.date] = []; map[e.date].push(e) })
    return map
  }, [sorted])

  const dates = Object.keys(byDate).sort()

  // Summary stats
  const weddingCount    = events.filter(e => e.type === 'wedding').length
  const activityCount   = events.filter(e => e.type === 'activity').length
  const totalCostPerPerson = events.filter(e => e.type === 'activity' && !e.isFree)
    .reduce((s, e) => s + (e.costPerPerson ?? 0), 0)
  const totalCollected  = events.reduce((sum, e) => {
    const cost = e.costPerPerson ?? 0
    return sum + (e.signups ?? []).filter(s => s.paid).length * cost
  }, 0)

  return (
    <div className="page-content" style={{ maxWidth: 900 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 30, fontStyle: 'italic', color: '#3B2A22', margin: 0 }}>
              Events & Activities
            </h1>
            <SmallLeaf size={22} opacity={0.6} rotate={-15}/>
            <Frangipani size={26} opacity={0.5}/>
          </div>
          <p style={{ fontSize: 13, color: '#7A6657' }}>
            {weddingCount} wedding event{weddingCount !== 1 ? 's' : ''} · {activityCount} optional activit{activityCount !== 1 ? 'ies' : 'y'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <select value={newType} onChange={e => setNewType(e.target.value as EventType)}
              style={{ padding: '10px 32px 10px 14px', borderRadius: 10, border: '1.5px solid #E8D5A3',
                background: '#FAF3E6', color: '#3B2A22', fontSize: 12, appearance: 'none', cursor: 'pointer', outline: 'none' }}>
              <option value="wedding">💍 Wedding Event</option>
              <option value="activity">🌴 Optional Activity</option>
            </select>
            <ChevronDown size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#7A6657', pointerEvents: 'none' }}/>
          </div>
          <button onClick={() => { setModal({ type: newType } as Event) }}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 12,
              background: '#3B2A22', color: '#FFF8EE', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={15} strokeWidth={2}/> Add
          </button>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid-4" style={{ marginBottom: 16 }}>
        {[
          { label: 'WEDDING EVENTS',   value: `${weddingCount}`,          sub: 'on the schedule',          color: '#7F9A78' },
          { label: 'ACTIVITIES',       value: `${activityCount}`,         sub: 'optional extras',          color: '#C8A45D' },
          { label: 'ACTIVITY COST',    value: totalCostPerPerson > 0 ? fmt(totalCostPerPerson) : '—', sub: 'total per person (paid)', color: '#C47A52' },
          { label: 'COLLECTED',        value: totalCollected > 0 ? fmt(totalCollected) : '—', sub: 'from guest payments',  color: '#7F9A78' },
        ].map(s => (
          <div key={s.label} style={{ background: '#FAF3E6', border: '1.5px solid #E8D5A3', borderRadius: 16,
            padding: '18px 22px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', bottom: -8, right: -8, opacity: 0.1, pointerEvents: 'none' }}>
              <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                <rect x="6" y="6" width="44" height="44" rx="5" transform="rotate(45 28 28)" fill={s.color}/>
              </svg>
            </div>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#7A6657', letterSpacing: '0.12em', marginBottom: 8 }}>{s.label}</p>
            <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 500, color: s.color, lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontSize: 11, color: '#7A6657', marginTop: 5 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 28 }}><BaliBorder width={500} opacity={0.5}/></div>

      {/* ── Filter pills ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {([
          { key: 'all',      label: `All events`,              count: events.length,   emoji: null    },
          { key: 'wedding',  label: `Wedding events`,          count: weddingCount,    emoji: '💍'   },
          { key: 'activity', label: `Optional activities`,     count: activityCount,   emoji: '🌴'   },
        ] as const).map(f => (
          <button key={f.key} onClick={() => setTypeFilter(f.key)}
            style={{ display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 16px', borderRadius: 20, fontSize: 12, fontWeight: typeFilter === f.key ? 700 : 500,
              cursor: 'pointer', transition: 'all 0.15s',
              border: `1.5px solid ${typeFilter === f.key ? '#C8A45D' : '#E8D5A3'}`,
              background: typeFilter === f.key ? 'rgba(200,164,93,0.12)' : 'transparent',
              color: typeFilter === f.key ? '#3B2A22' : '#7A6657' }}>
            {f.emoji && <span>{f.emoji}</span>}
            {f.label}
            <span style={{ fontSize: 11, fontWeight: 400, color: typeFilter === f.key ? '#8B6914' : '#A89080' }}>
              ({f.count})
            </span>
          </button>
        ))}
      </div>

      {/* ── Timeline ── */}
      {dates.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', background: '#FAF3E6', borderRadius: 16, border: '1.5px solid #E8D5A3' }}>
          <CalendarDays size={36} style={{ color: '#E8D5A3', marginBottom: 14 }} strokeWidth={1}/>
          <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: '#3B2A22', marginBottom: 8 }}>No events yet</p>
          <p style={{ fontSize: 13, color: '#7A6657' }}>Add your first wedding event or optional activity above.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {dates.map(date => (
            <div key={date}>
              {/* Date header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ background: '#3B2A22', color: '#FFF8EE', borderRadius: 10,
                  padding: '6px 14px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {fmtDate(date)}
                </div>
                <div style={{ flex: 1, height: 1, background: '#E8D5A3' }}/>
                <span style={{ fontSize: 11, color: '#7A6657', whiteSpace: 'nowrap' }}>
                  {byDate[date].length} event{byDate[date].length !== 1 ? 's' : ''}
                </span>
              </div>
              {/* Events for this date */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 16,
                borderLeft: '2px solid rgba(200,164,93,0.3)' }}>
                {byDate[date].map(evt => (
                  <EventCard key={evt.id} event={evt} guests={guests}
                    onEdit={e => setModal(e)}
                    onDelete={setDeleteId}
                    onSignups={setSignupEvt}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      {modal && (
        <EventModal
          initial={typeof modal === 'object' && 'id' in modal ? modal as Event : undefined}
          guests={guests}
          onSave={saveEvent}
          onClose={() => setModal(null)}
        />
      )}

      {signupEvt && (
        <SignupModal
          event={signupEvt}
          guests={guests}
          onSave={signups => saveSignups(signupEvt.id, signups)}
          onClose={() => setSignupEvt(null)}
        />
      )}

      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,30,20,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <div style={{ background: '#FFF8EE', borderRadius: 20, padding: 36, maxWidth: 360, width: '100%',
            textAlign: 'center', boxShadow: '0 24px 60px rgba(42,30,20,0.2)', border: '1.5px solid #E8D5A3' }}>
            <Trash2 size={28} style={{ color: '#C47A52', marginBottom: 14 }} strokeWidth={1.5}/>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: '#3B2A22', marginBottom: 8 }}>Remove event?</h3>
            <p style={{ fontSize: 13, color: '#7A6657', marginBottom: 28 }}>
              <strong>{events.find(e => e.id === deleteId)?.title}</strong> will be permanently removed.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: 10, borderRadius: 10, fontSize: 13,
                border: '1.5px solid #E8D5A3', background: 'transparent', color: '#7A6657', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => deleteEvent(deleteId)} style={{ flex: 1, padding: 10, borderRadius: 10, fontSize: 13,
                fontWeight: 600, border: 'none', background: '#C47A52', color: '#fff', cursor: 'pointer' }}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
