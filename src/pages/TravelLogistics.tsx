import { useState, useMemo } from 'react'
import {
  Plane, PlaneLanding, PlaneTakeoff, X, Edit2, Check,
  AlertTriangle, ChevronDown, Search, Car,
} from 'lucide-react'
import { BaliBorder } from '../components/Botanicals'
import { TourButton } from '../components/GuidedTour'
import { guestDisplayName } from '../lib/helpers'
import type { AppData, Guest, GuestTravel, FlightDetails } from '../types'

// ── helpers ───────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2, 10) }

function fmtDate(iso?: string) {
  if (!iso) return ''
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

function fmtTime(t?: string) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}${ampm}`
}

const INP: React.CSSProperties = {
  width: '100%', padding: '8px 10px', border: '1.5px solid #E8D5A3', borderRadius: 8,
  background: '#FFFDF7', color: '#3B2A22', fontSize: 12,
  fontFamily: 'Inter, sans-serif', outline: 'none',
}
const LBL: React.CSSProperties = {
  display: 'block', fontSize: 10, fontWeight: 700, color: '#7A6657',
  letterSpacing: '0.08em', marginBottom: 3,
}

// ── Flight editor ─────────────────────────────────────────────────────────────
function FlightEditor({ label, icon: Icon, flight, onChange }: {
  label: string
  icon: React.ElementType
  flight: FlightDetails
  onChange: (f: FlightDetails) => void
}) {
  const set = (k: keyof FlightDetails) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ ...flight, [k]: e.target.value || undefined })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        <Icon size={13} style={{ color: '#C8A45D' }}/>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#7A6657', letterSpacing: '0.08em' }}>{label}</p>
      </div>

      {/* Flight number — spans full width */}
      <div>
        <label style={LBL}>FLIGHT NUMBER</label>
        <input style={INP} value={flight.flightNumber ?? ''} onChange={set('flightNumber')} placeholder="e.g. BA017"/>
      </div>

      {/* Takeoff row */}
      <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(200,164,93,0.05)', border: '1px solid rgba(200,164,93,0.2)' }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: '#C8A45D', letterSpacing: '0.08em', marginBottom: 8 }}>🛫 TAKEOFF</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <div>
            <label style={LBL}>DATE</label>
            <input style={INP} type="date" value={flight.departureDate ?? flight.date ?? ''} onChange={set('departureDate')}/>
          </div>
          <div>
            <label style={LBL}>TIME</label>
            <input style={INP} type="time" value={flight.departureTime ?? flight.time ?? ''} onChange={set('departureTime')}/>
          </div>
          <div>
            <label style={LBL}>AIRPORT</label>
            <input style={INP} value={flight.departureAirport ?? flight.airport ?? ''} onChange={set('departureAirport')} placeholder="e.g. LHR"/>
          </div>
        </div>
      </div>

      {/* Landing row */}
      <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(127,154,120,0.05)', border: '1px solid rgba(127,154,120,0.2)' }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: '#7F9A78', letterSpacing: '0.08em', marginBottom: 8 }}>🛬 LANDING</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <div>
            <label style={LBL}>DATE</label>
            <input style={INP} type="date" value={flight.arrivalDate ?? ''} onChange={set('arrivalDate')}/>
          </div>
          <div>
            <label style={LBL}>TIME</label>
            <input style={INP} type="time" value={flight.arrivalTime ?? ''} onChange={set('arrivalTime')}/>
          </div>
          <div>
            <label style={LBL}>AIRPORT</label>
            <input style={INP} value={flight.arrivalAirport ?? ''} onChange={set('arrivalAirport')} placeholder="e.g. DPS"/>
          </div>
        </div>
      </div>

      <div>
        <label style={LBL}>NOTES</label>
        <input style={INP} value={flight.notes ?? ''} onChange={set('notes')} placeholder="e.g. connecting via Singapore, terminal 2"/>
      </div>
    </div>
  )
}

// ── Travel modal ──────────────────────────────────────────────────────────────
function TravelModal({ guest, travel, onSave, onClose }: {
  guest: Guest
  travel: GuestTravel
  onSave: (t: GuestTravel) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<GuestTravel>({ ...travel })

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,30,20,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#FFF8EE', borderRadius: 20, padding: 32, width: '100%', maxWidth: 540,
        maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(42,30,20,0.22)', border: '1.5px solid #E8D5A3' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, fontStyle: 'italic', color: '#3B2A22', margin: 0 }}>
              {guestDisplayName(guest)}
            </h2>
            <p style={{ fontSize: 12, color: '#7A6657', marginTop: 3 }}>Flight & transfer details</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A6657' }}>
            <X size={18}/>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Arrival */}
          <div style={{ padding: '16px', borderRadius: 12, background: 'rgba(127,154,120,0.06)', border: '1.5px solid rgba(127,154,120,0.25)' }}>
            <FlightEditor
              label="ARRIVAL FLIGHT"
              icon={PlaneLanding}
              flight={form.arrival ?? {}}
              onChange={f => setForm(v => ({ ...v, arrival: Object.values(f).some(Boolean) ? f : undefined }))}
            />
          </div>

          {/* Departure */}
          <div style={{ padding: '16px', borderRadius: 12, background: 'rgba(200,164,93,0.06)', border: '1.5px solid rgba(200,164,93,0.25)' }}>
            <FlightEditor
              label="DEPARTURE FLIGHT"
              icon={PlaneTakeoff}
              flight={form.departure ?? {}}
              onChange={f => setForm(v => ({ ...v, departure: Object.values(f).some(Boolean) ? f : undefined }))}
            />
          </div>

          {/* Transfer */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px', borderRadius: 12,
            background: 'rgba(200,164,93,0.05)', border: '1.5px solid #E8D5A3' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => setForm(v => ({ ...v, needsTransfer: !v.needsTransfer }))}
                style={{ width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
                  background: form.needsTransfer ? '#7F9A78' : '#E8D5A3', position: 'relative', transition: 'background 0.2s' }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 3, left: form.needsTransfer ? 21 : 3,
                  transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}/>
              </button>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#3B2A22', lineHeight: 1 }}>Needs airport transfer</p>
                <p style={{ fontSize: 11, color: '#7A6657', marginTop: 2 }}>Requires collection from / drop-off to airport</p>
              </div>
            </div>
            {form.needsTransfer && (
              <div>
                <label style={LBL}>TRANSFER NOTES</label>
                <input style={INP} value={form.transferNotes ?? ''} placeholder="e.g. Arriving Terminal 2, needs pickup both ways"
                  onChange={e => setForm(v => ({ ...v, transferNotes: e.target.value || undefined }))}/>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 10, fontSize: 13,
            border: '1.5px solid #E8D5A3', background: 'transparent', color: '#7A6657', cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => { onSave(form); onClose() }}
            style={{ flex: 2, padding: 10, borderRadius: 10, fontSize: 13, fontWeight: 600,
              border: 'none', background: '#3B2A22', color: '#FFF8EE', cursor: 'pointer' }}>Save</button>
        </div>
      </div>
    </div>
  )
}

// ── Flight chip (compact summary for the list row) ───────────────────────────
function FlightChip({ flight, type }: { flight?: FlightDetails; type: 'arrival' | 'departure' }) {
  const color = type === 'arrival' ? '#7F9A78' : '#C8A45D'
  const Icon  = type === 'arrival' ? PlaneLanding : PlaneTakeoff

  // Use new fields with legacy fallback
  const depDate    = flight?.departureDate ?? flight?.date
  const depTime    = flight?.departureTime ?? flight?.time
  const depAirport = flight?.departureAirport ?? flight?.airport
  const arrDate    = flight?.arrivalDate
  const arrTime    = flight?.arrivalTime
  const arrAirport = flight?.arrivalAirport

  const hasAny = flight?.flightNumber || depDate || arrDate

  if (!hasAny) {
    return (
      <span style={{ fontSize: 10, color: '#C4B49A', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 3 }}>
        <Icon size={10} style={{ color: '#D4C5A4' }}/>
        {type === 'arrival' ? 'No arrival set' : 'No departure set'}
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {flight?.flightNumber && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, color }}>
          ✈ {flight.flightNumber}
        </span>
      )}
      {(depDate || depTime || depAirport) && (
        <span style={{ fontSize: 10, color: '#8B6914', display: 'flex', alignItems: 'center', gap: 3 }}>
          🛫 {depAirport && `${depAirport} `}{depDate && fmtDate(depDate)}{depTime && ` ${fmtTime(depTime)}`}
        </span>
      )}
      {(arrDate || arrTime || arrAirport) && (
        <span style={{ fontSize: 10, color: '#5A7A54', display: 'flex', alignItems: 'center', gap: 3 }}>
          🛬 {arrAirport && `${arrAirport} `}{arrDate && fmtDate(arrDate)}{arrTime && ` ${fmtTime(arrTime)}`}
        </span>
      )}
    </div>
  )
}

// ── Guest travel row ──────────────────────────────────────────────────────────
function GuestTravelRow({ guest, travel, onEdit }: {
  guest: Guest
  travel: GuestTravel
  onEdit: () => void
}) {
  const hasArrival   = !!(travel.arrival?.flightNumber || travel.arrival?.departureDate || travel.arrival?.date)
  const hasDeparture = !!(travel.departure?.flightNumber || travel.departure?.departureDate || travel.departure?.date)
  const missing      = !hasArrival || !hasDeparture

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto',
      alignItems: 'center', gap: 12, padding: '11px 18px',
      borderRadius: 10,
      border: `1.5px solid ${missing ? 'rgba(200,164,93,0.35)' : 'rgba(127,154,120,0.3)'}`,
      background: missing ? 'rgba(200,164,93,0.03)' : 'rgba(127,154,120,0.03)',
    }}>
      {/* Name */}
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#3B2A22' }}>{guestDisplayName(guest)}</p>
        {guest.partyName && <p style={{ fontSize: 10, color: '#A89080', marginTop: 1 }}>{guest.partyName}</p>}
      </div>

      {/* Arrival */}
      <div><FlightChip flight={travel.arrival} type="arrival"/></div>

      {/* Departure */}
      <div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <FlightChip flight={travel.departure} type="departure"/>
          {travel.needsTransfer && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700,
              color: '#7F9A78', background: 'rgba(127,154,120,0.12)', border: '1px solid rgba(127,154,120,0.3)',
              padding: '1px 6px', borderRadius: 20, width: 'fit-content' }}>
              <Car size={8}/> Transfer
            </span>
          )}
        </div>
      </div>

      {/* Edit */}
      <button onClick={onEdit}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A6657', padding: 4 }}>
        <Edit2 size={13} strokeWidth={1.5}/>
      </button>
    </div>
  )
}

// ── Family travel modal ───────────────────────────────────────────────────────
function FamilyTravelModal({ familyName, guests, sharedTravel, onSave, onClose }: {
  familyName: string | null
  guests: Guest[]
  sharedTravel: GuestTravel
  onSave: (t: GuestTravel) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<GuestTravel>({ ...sharedTravel, guestId: guests[0].id })

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,30,20,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#FFF8EE', borderRadius: 20, padding: 32, width: '100%', maxWidth: 560,
        maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(42,30,20,0.22)', border: '1.5px solid #E8D5A3' }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, fontStyle: 'italic', color: '#3B2A22', margin: 0 }}>
              {familyName ?? 'Guest'} — Family Flights
            </h2>
            <p style={{ fontSize: 12, color: '#7A6657', marginTop: 3 }}>
              These details will be applied to all {guests.length} guests in this group
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A6657' }}>
            <X size={18}/>
          </button>
        </div>

        {/* Who this applies to */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20,
          padding: '10px 14px', background: 'rgba(200,164,93,0.06)', border: '1px solid rgba(200,164,93,0.3)', borderRadius: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#8B6914', marginRight: 4 }}>Applies to:</span>
          {guests.map(g => (
            <span key={g.id} style={{ fontSize: 11, color: '#3B2A22', background: 'rgba(200,164,93,0.12)',
              border: '1px solid rgba(200,164,93,0.3)', padding: '2px 8px', borderRadius: 20 }}>
              {guestDisplayName(g)}
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ padding: '16px', borderRadius: 12, background: 'rgba(127,154,120,0.06)', border: '1.5px solid rgba(127,154,120,0.25)' }}>
            <FlightEditor label="ARRIVAL FLIGHT" icon={PlaneLanding}
              flight={form.arrival ?? {}}
              onChange={f => setForm(v => ({ ...v, arrival: Object.values(f).some(Boolean) ? f : undefined }))}/>
          </div>
          <div style={{ padding: '16px', borderRadius: 12, background: 'rgba(200,164,93,0.06)', border: '1.5px solid rgba(200,164,93,0.25)' }}>
            <FlightEditor label="DEPARTURE FLIGHT" icon={PlaneTakeoff}
              flight={form.departure ?? {}}
              onChange={f => setForm(v => ({ ...v, departure: Object.values(f).some(Boolean) ? f : undefined }))}/>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px',
            borderRadius: 12, background: 'rgba(200,164,93,0.05)', border: '1.5px solid #E8D5A3' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => setForm(v => ({ ...v, needsTransfer: !v.needsTransfer }))}
                style={{ width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
                  background: form.needsTransfer ? '#7F9A78' : '#E8D5A3', position: 'relative', transition: 'background 0.2s' }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 3, left: form.needsTransfer ? 21 : 3,
                  transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}/>
              </button>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#3B2A22', lineHeight: 1 }}>Needs airport transfer</p>
                <p style={{ fontSize: 11, color: '#7A6657', marginTop: 2 }}>Applies to all members of this group</p>
              </div>
            </div>
            {form.needsTransfer && (
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#7A6657', letterSpacing: '0.08em', marginBottom: 3 }}>TRANSFER NOTES</label>
                <input style={INP} value={form.transferNotes ?? ''} placeholder="e.g. Arriving Terminal 2, needs pickup both ways"
                  onChange={e => setForm(v => ({ ...v, transferNotes: e.target.value || undefined }))}/>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 10, fontSize: 13,
            border: '1.5px solid #E8D5A3', background: 'transparent', color: '#7A6657', cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => { onSave(form); onClose() }}
            style={{ flex: 2, padding: 10, borderRadius: 10, fontSize: 13, fontWeight: 600,
              border: 'none', background: '#3B2A22', color: '#FFF8EE', cursor: 'pointer' }}>
            Apply to {guests.length} guests
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  data: AppData
  setData: (d: AppData | ((p: AppData) => AppData)) => void
}

export function TravelLogistics({ data, setData }: Props) {
  const [editingId,         setEditingId]         = useState<string | null>(null)
  const [editingFamilyName, setEditingFamilyName] = useState<string | null>(null)
  const [search,            setSearch]            = useState('')
  const [viewMode,          setViewMode]          = useState<'guests' | 'arrivals' | 'departures'>('guests')

  const guests     = data.guests.filter(g => g.attending !== 'no')
  const travelInfo = data.travelInfo ?? []

  const getTravelFor = (guestId: string): GuestTravel =>
    travelInfo.find(t => t.guestId === guestId) ?? { guestId, needsTransfer: false }

  const saveTravel = (updated: GuestTravel) => {
    setData(prev => {
      const existing = (prev.travelInfo ?? []).find(t => t.guestId === updated.guestId)
      return {
        ...prev,
        travelInfo: existing
          ? (prev.travelInfo ?? []).map(t => t.guestId === updated.guestId ? updated : t)
          : [...(prev.travelInfo ?? []), updated],
      }
    })
  }

  // Apply one travel record to all members of a family
  const saveTravelForFamily = (familyGuests: Guest[], template: GuestTravel) => {
    setData(prev => {
      const familyIds = new Set(familyGuests.map(g => g.id))
      const existing  = (prev.travelInfo ?? []).filter(t => !familyIds.has(t.guestId))
      const newRecords = familyGuests.map(g => ({ ...template, guestId: g.id }))
      return { ...prev, travelInfo: [...existing, ...newRecords] }
    })
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return guests
    const q = search.toLowerCase()
    return guests.filter(g =>
      guestDisplayName(g).toLowerCase().includes(q) ||
      (g.partyName ?? '').toLowerCase().includes(q)
    )
  }, [guests, search])

  // Group by party name for the family view
  const groupedByFamily = useMemo(() => {
    const map: Record<string, Guest[]> = {}
    filtered.forEach(g => {
      const key = g.partyName?.trim() || '__solo__'
      if (!map[key]) map[key] = []
      map[key].push(g)
    })
    // Sort: families first (>1 member), then solo, alphabetically within each
    return Object.entries(map).sort(([a, ga], [b, gb]) => {
      const aFamily = ga.length > 1; const bFamily = gb.length > 1
      if (aFamily !== bFamily) return aFamily ? -1 : 1
      return a.localeCompare(b)
    })
  }, [filtered])

  // Representative travel for a family — use first member's data as the template
  const getFamilyTravel = (familyGuests: Guest[]): GuestTravel => {
    for (const g of familyGuests) {
      const t = getTravelFor(g.id)
      if (t.arrival?.departureDate ?? t.arrival?.date ?? t.departure?.departureDate ?? t.departure?.date) return t
    }
    return { guestId: familyGuests[0].id, needsTransfer: false }
  }

  // The currently editing family's guests
  const editingFamilyGuests = editingFamilyName
    ? guests.filter(g => (g.partyName?.trim() || '__solo__') === editingFamilyName)
    : null

  // Stats
  const withArrival    = travelInfo.filter(t => t.arrival?.flightNumber || t.arrival?.departureDate || t.arrival?.date).length
  const withDeparture  = travelInfo.filter(t => t.departure?.flightNumber || t.departure?.departureDate || t.departure?.date).length
  const needsTransfer  = travelInfo.filter(t => t.needsTransfer).length
  const missingInfo    = guests.filter(g => {
    const t = getTravelFor(g.id)
    const hasArr = !!(t.arrival?.departureDate ?? t.arrival?.date ?? t.arrival?.flightNumber)
    const hasDep = !!(t.departure?.departureDate ?? t.departure?.date ?? t.departure?.flightNumber)
    return !hasArr && !hasDep
  }).length

  // Arrivals timeline
  const arrivalsByDate = useMemo(() => {
    const map: Record<string, { guest: Guest; travel: GuestTravel }[]> = {}
    guests.forEach(g => {
      const t = getTravelFor(g.id)
      const _ad = t.arrival?.departureDate ?? t.arrival?.date; if (_ad) {
        if (!map[_ad]) map[_ad] = []
        map[_ad].push({ guest: g, travel: t })
      }
    })
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [guests, travelInfo])

  const departuresByDate = useMemo(() => {
    const map: Record<string, { guest: Guest; travel: GuestTravel }[]> = {}
    guests.forEach(g => {
      const t = getTravelFor(g.id)
      const _dd = t.departure?.departureDate ?? t.departure?.date; if (_dd) {
        if (!map[_dd]) map[_dd] = []
        map[_dd].push({ guest: g, travel: t })
      }
    })
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [guests, travelInfo])

  const editingGuest = editingId ? guests.find(g => g.id === editingId) : null

  return (
    <div className="page-content" style={{ maxWidth: 1000 }}>

      {/* Tour button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <TourButton tourId="travel" label="How it works"/>
      </div>

      {/* ── Summary cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'TOTAL GUESTS', value: guests.length,   sub: 'confirmed',         color: '#3B2A22' },
          { label: 'ARRIVALS SET', value: withArrival,     sub: `of ${guests.length}`, color: '#7F9A78' },
          { label: 'DEPARTURES SET', value: withDeparture, sub: `of ${guests.length}`, color: '#C8A45D' },
          { label: 'NEED TRANSFER', value: needsTransfer,  sub: 'airport pickup/drop', color: needsTransfer > 0 ? '#C47A52' : '#7A6657' },
        ].map(s => (
          <div key={s.label} style={{ background: '#FAF3E6', border: '1.5px solid #E8D5A3', borderRadius: 14,
            padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', bottom: -8, right: -8, opacity: 0.1, pointerEvents: 'none' }}>
              <svg width="50" height="50" viewBox="0 0 50 50" fill="none"><rect x="5" y="5" width="40" height="40" rx="5" transform="rotate(45 25 25)" fill={s.color}/></svg>
            </div>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#7A6657', letterSpacing: '0.12em', marginBottom: 6 }}>{s.label}</p>
            <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, fontWeight: 500, color: s.color, lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontSize: 11, color: '#7A6657', marginTop: 4 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Missing info banner */}
      {missingInfo > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 10,
          background: 'rgba(200,164,93,0.08)', border: '1px solid rgba(200,164,93,0.35)', marginBottom: 16 }}>
          <AlertTriangle size={14} style={{ color: '#C8A45D', flexShrink: 0 }} strokeWidth={1.8}/>
          <p style={{ fontSize: 13, color: '#8B6914' }}>
            <strong>{missingInfo} guest{missingInfo !== 1 ? 's' : ''}</strong> {missingInfo !== 1 ? 'have' : 'has'} no flight information recorded yet.
          </p>
        </div>
      )}

      <div style={{ marginBottom: 24 }}><BaliBorder width={500} opacity={0.5}/></div>

      {/* ── View toggle ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {([
          { key: 'guests',     label: '👤 All Guests' },
          { key: 'arrivals',   label: '🛬 Arrivals' },
          { key: 'departures', label: '🛫 Departures' },
        ] as const).map(v => (
          <button key={v.key} onClick={() => setViewMode(v.key)}
            style={{ padding: '7px 16px', borderRadius: 20, fontSize: 12, fontWeight: viewMode === v.key ? 700 : 500,
              cursor: 'pointer', transition: 'all 0.15s',
              border: `1.5px solid ${viewMode === v.key ? '#C8A45D' : '#E8D5A3'}`,
              background: viewMode === v.key ? 'rgba(200,164,93,0.12)' : 'transparent',
              color: viewMode === v.key ? '#3B2A22' : '#7A6657' }}>
            {v.label}
          </button>
        ))}
      </div>

      {/* ── Guest list view ── */}
      {viewMode === 'guests' && (
        <>
          {/* Search + add all */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#7A6657' }}/>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search guests…"
                style={{ width: '100%', padding: '8px 12px 8px 30px', border: '1.5px solid #E8D5A3',
                  borderRadius: 10, background: '#FAF3E6', color: '#3B2A22', fontSize: 12, outline: 'none',
                  fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}/>
            </div>
          </div>

          {guests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', background: '#FAF3E6', borderRadius: 12, border: '1.5px solid #E8D5A3' }}>
              <Plane size={32} style={{ color: '#E8D5A3', marginBottom: 12 }} strokeWidth={1}/>
              <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, color: '#3B2A22', marginBottom: 6 }}>No guests yet</p>
              <p style={{ fontSize: 12, color: '#7A6657' }}>Add guests on the Guest List tab first.</p>
            </div>
          ) : filtered.length === 0 && search ? (
            <p style={{ fontSize: 12, color: '#7A6657', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
              No guests match "{search}"
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {groupedByFamily.map(([familyKey, familyGuests]) => {
                const isFamily    = familyGuests.length > 1
                const familyName  = familyKey === '__solo__' ? null : familyKey
                const familyHasSomeTravel = familyGuests.some(g => {
                  const t = getTravelFor(g.id)
                  return t.arrival?.departureDate ?? t.arrival?.date ?? t.departure?.departureDate ?? t.departure?.date
                })

                return (
                  <div key={familyKey}>
                    {/* Family group header */}
                    {isFamily && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <div style={{ flex: 1, height: 1, background: '#E8D5A3' }}/>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#7A6657', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                          👨‍👩‍👧 {familyName} · {familyGuests.length} guests
                        </span>
                        <button
                          onClick={() => setEditingFamilyName(familyKey)}
                          title="Enter flight details for the whole family at once"
                          style={{ display: 'flex', alignItems: 'center', gap: 4,
                            fontSize: 11, fontWeight: 600, color: '#C8A45D',
                            background: 'rgba(200,164,93,0.1)', border: '1px solid rgba(200,164,93,0.35)',
                            padding: '3px 10px', borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          {familyHasSomeTravel ? '✦ Edit family flights' : '✦ Add family flights'}
                        </button>
                        <div style={{ flex: 1, height: 1, background: '#E8D5A3' }}/>
                      </div>
                    )}

                    {/* Column headers — only show for first group or solo */}
                    {(!isFamily || familyKey === groupedByFamily[0][0]) && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto',
                        gap: 12, padding: '4px 18px', marginBottom: 4 }}>
                        {['Guest', 'Arrival', 'Departure', ''].map((h, i) => (
                          <span key={i} style={{ fontSize: 10, fontWeight: 700, color: '#7A6657', letterSpacing: '0.1em' }}>{h}</span>
                        ))}
                      </div>
                    )}

                    {/* Guest rows */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5,
                      paddingLeft: isFamily ? 4 : 0,
                      borderLeft: isFamily ? '2px solid rgba(200,164,93,0.25)' : 'none',
                    }}>
                      {familyGuests.map(g => (
                        <GuestTravelRow
                          key={g.id}
                          guest={g}
                          travel={getTravelFor(g.id)}
                          onEdit={() => setEditingId(g.id)}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── Arrivals timeline ── */}
      {viewMode === 'arrivals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {arrivalsByDate.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', background: '#FAF3E6', borderRadius: 12, border: '1.5px solid #E8D5A3' }}>
              <PlaneLanding size={32} style={{ color: '#E8D5A3', marginBottom: 12 }} strokeWidth={1}/>
              <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, color: '#3B2A22', marginBottom: 6 }}>No arrival dates set</p>
              <p style={{ fontSize: 12, color: '#7A6657' }}>Edit guests above to add arrival flight details.</p>
            </div>
          ) : arrivalsByDate.map(([date, entries]) => (
            <div key={date}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ background: '#3B2A22', color: '#FFF8EE', borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>
                  {fmtDate(date)}
                </div>
                <div style={{ flex: 1, height: 1, background: '#E8D5A3' }}/>
                <span style={{ fontSize: 11, color: '#7A6657' }}>{entries.length} guest{entries.length !== 1 ? 's' : ''}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 12, borderLeft: '2px solid rgba(127,154,120,0.3)' }}>
                {entries
                  .sort((a, b) => (a.travel.arrival?.time ?? '').localeCompare(b.travel.arrival?.time ?? ''))
                  .map(({ guest, travel }) => (
                  <div key={guest.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 14px',
                    borderRadius: 10, background: '#FAF3E6', border: '1.5px solid rgba(127,154,120,0.25)' }}>
                    <PlaneLanding size={13} style={{ color: '#7F9A78', flexShrink: 0 }}/>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#3B2A22' }}>{guestDisplayName(guest)}</p>
                      <div style={{ display: 'flex', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
                        {travel.arrival?.flightNumber && <span style={{ fontSize: 11, color: '#7A6657' }}>✈ {travel.arrival.flightNumber}</span>}
                        {(travel.arrival?.departureTime ?? travel.arrival?.time) && <span style={{ fontSize: 11, color: '#8B6914' }}>🛫 {fmtTime(travel.arrival?.departureTime ?? travel.arrival?.time)}{(travel.arrival?.departureAirport ?? travel.arrival?.airport) ? ` ${travel.arrival?.departureAirport ?? travel.arrival?.airport}` : ''}</span>}
                        {travel.arrival?.arrivalTime && <span style={{ fontSize: 11, color: '#5A7A54' }}>🛬 {fmtTime(travel.arrival.arrivalTime)}{travel.arrival?.arrivalAirport ? ` ${travel.arrival.arrivalAirport}` : ''}</span>}
                        {travel.needsTransfer && <span style={{ fontSize: 10, fontWeight: 700, color: '#C47A52' }}>🚗 Transfer needed</span>}
                      </div>
                      {travel.arrival?.notes && <p style={{ fontSize: 10, color: '#A89080', fontStyle: 'italic', marginTop: 2 }}>{travel.arrival.notes}</p>}
                    </div>
                    <button onClick={() => setEditingId(guest.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A6657', padding: 4 }}>
                      <Edit2 size={12} strokeWidth={1.5}/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Departures timeline ── */}
      {viewMode === 'departures' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {departuresByDate.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', background: '#FAF3E6', borderRadius: 12, border: '1.5px solid #E8D5A3' }}>
              <PlaneTakeoff size={32} style={{ color: '#E8D5A3', marginBottom: 12 }} strokeWidth={1}/>
              <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, color: '#3B2A22', marginBottom: 6 }}>No departure dates set</p>
              <p style={{ fontSize: 12, color: '#7A6657' }}>Edit guests above to add departure flight details.</p>
            </div>
          ) : departuresByDate.map(([date, entries]) => (
            <div key={date}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ background: '#3B2A22', color: '#FFF8EE', borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>
                  {fmtDate(date)}
                </div>
                <div style={{ flex: 1, height: 1, background: '#E8D5A3' }}/>
                <span style={{ fontSize: 11, color: '#7A6657' }}>{entries.length} guest{entries.length !== 1 ? 's' : ''}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 12, borderLeft: '2px solid rgba(200,164,93,0.3)' }}>
                {entries
                  .sort((a, b) => (a.travel.departure?.time ?? '').localeCompare(b.travel.departure?.time ?? ''))
                  .map(({ guest, travel }) => (
                  <div key={guest.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 14px',
                    borderRadius: 10, background: '#FAF3E6', border: '1.5px solid rgba(200,164,93,0.25)' }}>
                    <PlaneTakeoff size={13} style={{ color: '#C8A45D', flexShrink: 0 }}/>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#3B2A22' }}>{guestDisplayName(guest)}</p>
                      <div style={{ display: 'flex', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
                        {travel.departure?.flightNumber && <span style={{ fontSize: 11, color: '#7A6657' }}>✈ {travel.departure.flightNumber}</span>}
                        {(travel.departure?.departureTime ?? travel.departure?.time) && <span style={{ fontSize: 11, color: '#8B6914' }}>🛫 {fmtTime(travel.departure?.departureTime ?? travel.departure?.time)}{(travel.departure?.departureAirport ?? travel.departure?.airport) ? ` ${travel.departure?.departureAirport ?? travel.departure?.airport}` : ''}</span>}
                        {travel.departure?.arrivalTime && <span style={{ fontSize: 11, color: '#5A7A54' }}>🛬 {fmtTime(travel.departure.arrivalTime)}{travel.departure?.arrivalAirport ? ` ${travel.departure.arrivalAirport}` : ''}</span>}
                        {travel.needsTransfer && <span style={{ fontSize: 10, fontWeight: 700, color: '#C47A52' }}>🚗 Transfer needed</span>}
                      </div>
                      {travel.departure?.notes && <p style={{ fontSize: 10, color: '#A89080', fontStyle: 'italic', marginTop: 2 }}>{travel.departure.notes}</p>}
                    </div>
                    <button onClick={() => setEditingId(guest.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A6657', padding: 4 }}>
                      <Edit2 size={12} strokeWidth={1.5}/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Individual edit modal ── */}
      {editingGuest && (
        <TravelModal
          guest={editingGuest}
          travel={getTravelFor(editingGuest.id)}
          onSave={saveTravel}
          onClose={() => setEditingId(null)}
        />
      )}

      {/* ── Family edit modal ── */}
      {editingFamilyGuests && editingFamilyGuests.length > 0 && (
        <FamilyTravelModal
          familyName={editingFamilyName === '__solo__' ? null : editingFamilyName}
          guests={editingFamilyGuests}
          sharedTravel={getFamilyTravel(editingFamilyGuests)}
          onSave={t => { saveTravelForFamily(editingFamilyGuests, t); setEditingFamilyName(null) }}
          onClose={() => setEditingFamilyName(null)}
        />
      )}
    </div>
  )
}
