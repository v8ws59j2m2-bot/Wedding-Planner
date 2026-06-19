import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  DragDropContext, Droppable, Draggable,
  type DropResult,
} from '@hello-pangea/dnd'
import {
  Plus, Trash2, Edit2, X, FileJson, Printer,
  Users, AlertTriangle, Circle, Square, GripVertical,
  ChevronRight,
} from 'lucide-react'
import { SmallLeaf, Frangipani, BaliBorder } from '../components/Botanicals'
import { TourButton } from '../components/GuidedTour'
import { Tip } from '../components/Tooltip'
import { uid } from '../lib/helpers'
import { loadSeating, saveSeating } from '../lib/supabaseData'
import { supabase } from '../lib/supabase'
import type { AppData, Guest } from '../types'

// ── types ─────────────────────────────────────────────────────────────────────
interface Seat {
  id: string
  number: number
  label?: string          // e.g. "Head of Table", "Seat 1"
  guestId?: string        // specific guest assigned to this seat
}

interface Table {
  id: string
  label: string
  shape: 'round' | 'rectangular'
  capacity: number
  guestIds: string[]      // table-level assignment (backward compat)
  seats?: Seat[]          // seat-level placement (new)
  note?: string
}

interface SeatingData { tables: Table[] }

function exportJSON(data: AppData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url
  a.download = `wedding-data-${new Date().toISOString().split('T')[0]}.json`
  a.click(); URL.revokeObjectURL(url)
}

// ── helpers ───────────────────────────────────────────────────────────────────
function useSeating(): [SeatingData, (d: SeatingData) => void] {
  const [state, setState] = useState<SeatingData>({ tables: [] })
  const [, setSaveError] = useState<string | null>(null)

  // Load from Supabase (no localStorage fallback when Supabase is active)
  useEffect(() => {
    loadSeating()
      .then(d => setState(d as SeatingData))
      .catch(err => {
        console.error('Failed to load seating from Supabase:', err)
        setSaveError('Failed to load seating data')
      })
  }, [])

  // Basic realtime subscription for seating_data
  useEffect(() => {
    const channel = supabase
      .channel('seating-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seating_data' }, (payload) => {
        if (payload.new && (payload.new as any).tables) {
          setState({ tables: (payload.new as any).tables ?? [] })
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const save = async (d: SeatingData) => {
    setState(d)
    setSaveError(null)
    try {
      await saveSeating(d)
    } catch (err: any) {
      console.error('Failed to save seating to Supabase:', err)
      setSaveError('Failed to save changes — will retry on next action')
      // Do not fallback to localStorage for authenticated users
    }
  }

  return [state, save]
}

function guestDisplayName(g: Guest) {
  if (g.firstName || g.lastName) return `${g.firstName ?? ''} ${g.lastName ?? ''}`.trim()
  return g.name.split('&')[0].trim()
}

function guestPeopleCount(_g: Guest) { return 1 }

/** Build or migrate seats array for a table */
function ensureSeats(table: Table): Seat[] {
  if (table.seats && table.seats.length === table.capacity) return table.seats
  // Build fresh seats preserving any existing ones
  const existing = table.seats ?? []
  return Array.from({ length: table.capacity }, (_, i) => {
    return existing[i] ?? { id: uid(), number: i + 1 }
  })
}

/** How many seats are seat-level filled */
function seatsFilled(table: Table): number {
  return (table.seats ?? []).filter(s => s.guestId).length
}

/** Guests assigned to table but not yet placed in a specific seat */
function unseatedGuests(table: Table, guestById: Record<string, Guest>): Guest[] {
  const seatedIds = new Set((table.seats ?? []).map(s => s.guestId).filter(Boolean) as string[])
  return table.guestIds
    .filter(id => !seatedIds.has(id) && guestById[id])
    .map(id => guestById[id])
}

// ── Seat position helpers ─────────────────────────────────────────────────────
function seatPosition(index: number, total: number, shape: 'round' | 'rectangular', w: number, h: number) {
  if (shape === 'round') {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2
    const rx = w / 2 - 26
    const ry = h / 2 - 26
    return {
      x: w / 2 + rx * Math.cos(angle) - 22,
      y: h / 2 + ry * Math.sin(angle) - 22,
    }
  }
  // Rectangular: split evenly along the two long sides (top and bottom).
  // Top row: even-indexed seats (0, 2, 4…) left-to-right
  // Bottom row: odd-indexed seats (1, 3, 5…) left-to-right
  const topCount    = Math.ceil(total / 2)
  const bottomCount = Math.floor(total / 2)
  const pad = 30

  if (index % 2 === 0) {
    // Top row
    const i    = index / 2
    const step = (w - 2 * pad) / Math.max(topCount - 1, 1)
    return { x: pad + i * step - 22, y: -26 }
  } else {
    // Bottom row
    const i    = Math.floor(index / 2)
    const step = (w - 2 * pad) / Math.max(bottomCount - 1, 1)
    return { x: pad + i * step - 22, y: h + 2 }
  }
}

// ── Table visual for modal ────────────────────────────────────────────────────
function TableVisual({ table, seats, guestById, onSeatClick, onSeatDrop, draggingGuestId }: {
  table: Table
  seats: Seat[]
  guestById: Record<string, Guest>
  onSeatClick: (seatId: string) => void
  onSeatDrop: (seatId: string) => void
  draggingGuestId: string | null
}) {
  const isRound = table.shape === 'round'
  const W = isRound ? 260 : 400
  const H = isRound ? 260 : 240
  const [dragOver, setDragOver] = useState<string | null>(null)

  // For rectangular tables, offset the internal coordinate system down so
  // seats at y:-26 (top row) are still within the visible container.
  const offset = isRound ? 0 : 36

  return (
    <div style={{ position: 'relative', width: W, height: H + offset * 2, margin: '0 auto', flexShrink: 0 }}>
      {/* Table surface */}
      <div style={{
        position: 'absolute',
        left: isRound ? 40 : 30, top: isRound ? 40 : 30 + offset,
        width: isRound ? W - 80 : W - 60, height: isRound ? H - 80 : H - 60,
        borderRadius: isRound ? '50%' : 12,
        background: 'linear-gradient(135deg, #FAF3E6, #F2E3CF)',
        border: '2px solid #E8D5A3',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(42,30,20,0.12)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 13, fontStyle: 'italic', color: '#C8A45D', margin: 0 }}>
            {table.label}
          </p>
          <p style={{ fontSize: 10, color: '#A89080', marginTop: 3 }}>
            {seats.filter(s => s.guestId).length} / {seats.length} seated
          </p>
        </div>
      </div>

      {/* Seats */}
      {seats.map((seat, i) => {
        const rawPos   = seatPosition(i, seats.length, table.shape, W, H)
        const pos      = { x: rawPos.x, y: rawPos.y + offset }
        const guest    = seat.guestId ? guestById[seat.guestId] : null
        const isOver   = dragOver === seat.id
        const occupied = !!guest
        const canDrop  = draggingGuestId && (!occupied || seat.guestId === draggingGuestId)

        return (
          <div
            key={seat.id}
            onDragOver={e => { if (canDrop) { e.preventDefault(); setDragOver(seat.id) } }}
            onDragLeave={() => setDragOver(null)}
            onDrop={e => { e.preventDefault(); setDragOver(null); if (canDrop) onSeatDrop(seat.id) }}
            onClick={() => onSeatClick(seat.id)}
            title={seat.label ?? `Seat ${seat.number}`}
            style={{
              position: 'absolute',
              left: pos.x, top: pos.y,
              width: 44, height: 44, borderRadius: '50%',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: occupied ? 'pointer' : draggingGuestId ? 'copy' : 'default',
              background: isOver
                ? 'rgba(200,164,93,0.3)'
                : occupied
                  ? 'linear-gradient(135deg, #7F9A78, #5A7A54)'
                  : '#FAF3E6',
              border: `2px solid ${isOver ? '#C8A45D' : occupied ? '#5A7A54' : '#E8D5A3'}`,
              boxShadow: isOver ? '0 0 0 3px rgba(200,164,93,0.3)' : occupied ? '0 2px 8px rgba(90,122,84,0.25)' : 'none',
              transition: 'all 0.15s',
              zIndex: 2,
              overflow: 'hidden',
            }}>
            {guest ? (
              <div style={{ textAlign: 'center', padding: '0 3px' }}>
                <p style={{ fontSize: 8, fontWeight: 700, color: '#fff', lineHeight: 1.2, wordBreak: 'break-word', textAlign: 'center' }}>
                  {guestDisplayName(guest).split(' ')[0]}
                </p>
                {seat.label && (
                  <p style={{ fontSize: 7, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>{seat.label}</p>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 9, color: isOver ? '#8B6914' : '#C4B49A', fontWeight: 600 }}>
                  {seat.label ? seat.label.slice(0, 4) : seat.number}
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Table detail modal ────────────────────────────────────────────────────────
function TableDetailModal({ table, guestById, onUpdate, onClose }: {
  table: Table
  guestById: Record<string, Guest>
  onUpdate: (t: Table) => void
  onClose: () => void
}) {
  const [seats, setSeats] = useState<Seat[]>(() => ensureSeats(table))
  const [editingLabel, setEditingLabel] = useState<string | null>(null)
  const [labelValue, setLabelValue] = useState('')
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const unseated = unseatedGuests({ ...table, seats }, guestById)
  const seatedCount = seats.filter(s => s.guestId).length

  const assignToSeat = (seatId: string, guestId: string) => {
    setSeats(prev => {
      // Remove from any existing seat first
      const cleared = prev.map(s => s.guestId === guestId ? { ...s, guestId: undefined } : s)
      return cleared.map(s => s.id === seatId ? { ...s, guestId } : s)
    })
  }

  const unassignSeat = (seatId: string) => {
    setSeats(prev => prev.map(s => s.id === seatId ? { ...s, guestId: undefined } : s))
  }

  const handleSeatClick = (seatId: string) => {
    const seat = seats.find(s => s.id === seatId)
    if (seat?.guestId) {
      // Right-click or single click to unassign
      unassignSeat(seatId)
    }
  }

  const save = () => {
    onUpdate({ ...table, seats })
    onClose()
  }

  const startEditLabel = (seatId: string) => {
    const seat = seats.find(s => s.id === seatId)
    setEditingLabel(seatId)
    setLabelValue(seat?.label ?? '')
  }

  const saveLabel = () => {
    if (!editingLabel) return
    setSeats(prev => prev.map(s => s.id === editingLabel ? { ...s, label: labelValue.trim() || undefined } : s))
    setEditingLabel(null)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,30,20,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: '#FFF8EE', borderRadius: 24, width: '100%', maxWidth: 820,
        maxHeight: '92vh', overflowY: 'auto',
        boxShadow: '0 32px 80px rgba(42,30,20,0.3)', border: '1.5px solid #E8D5A3',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Modal header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '24px 28px 20px', borderBottom: '1px solid #F2E3CF' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {table.shape === 'round'
              ? <Circle size={16} style={{ color: '#C8A45D' }} strokeWidth={1.5}/>
              : <Square  size={16} style={{ color: '#C8A45D' }} strokeWidth={1.5}/>}
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, fontStyle: 'italic', color: '#3B2A22', margin: 0 }}>
              {table.label}
            </h2>
            <span style={{ fontSize: 12, color: '#7A6657', background: 'rgba(200,164,93,0.12)',
              border: '1px solid rgba(200,164,93,0.3)', padding: '2px 10px', borderRadius: 20 }}>
              {seatedCount} / {seats.length} seats filled
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A6657', padding: 4 }}>
            <X size={20}/>
          </button>
        </div>

        {/* Body: visual + sidebar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 0, flex: 1, minHeight: 0 }}>

          {/* Visual seating */}
          <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#7A6657', letterSpacing: '0.08em' }}>SEAT LAYOUT</p>
              <span style={{ fontSize: 11, color: '#A89080', fontStyle: 'italic' }}>drag guests onto seats · click a filled seat to unassign</span>
            </div>

            <TableVisual
              table={table}
              seats={seats}
              guestById={guestById}
              onSeatClick={handleSeatClick}
              onSeatDrop={seatId => { if (draggingId) assignToSeat(seatId, draggingId) }}
              draggingGuestId={draggingId}
            />

            {/* Seat labels editor */}
            <div style={{ marginTop: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#7A6657', letterSpacing: '0.08em', marginBottom: 10 }}>SEAT LABELS <span style={{ fontWeight: 400, color: '#A89080', fontStyle: 'italic' }}>(optional)</span></p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 6 }}>
                {seats.map(seat => (
                  <div key={seat.id} style={{ display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 8px', borderRadius: 8, background: '#FAF3E6', border: '1px solid #E8D5A3' }}>
                    <span style={{ fontSize: 10, color: '#C8A45D', fontWeight: 700, minWidth: 18 }}>#{seat.number}</span>
                    {editingLabel === seat.id ? (
                      <input autoFocus value={labelValue} onChange={e => setLabelValue(e.target.value)}
                        onBlur={saveLabel} onKeyDown={e => e.key === 'Enter' && saveLabel()}
                        style={{ flex: 1, fontSize: 10, border: 'none', background: 'transparent',
                          outline: 'none', color: '#3B2A22', fontFamily: 'Inter, sans-serif' }}
                        placeholder="e.g. Head of table"/>
                    ) : (
                      <span onClick={() => startEditLabel(seat.id)}
                        style={{ flex: 1, fontSize: 10, color: seat.label ? '#3B2A22' : '#C4B49A',
                          fontStyle: seat.label ? 'normal' : 'italic', cursor: 'text' }}>
                        {seat.label ?? 'Add label…'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar: unseated guests at this table */}
          <div style={{ borderLeft: '1px solid #F2E3CF', padding: '28px 20px',
            background: 'rgba(255,253,248,0.5)', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Unseated at this table */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 3, height: 16, backgroundColor: '#C8A45D', borderRadius: 2 }}/>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#3B2A22', letterSpacing: '0.04em' }}>
                  AT THIS TABLE
                </p>
                {unseated.length > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#C8A45D',
                    background: 'rgba(200,164,93,0.15)', padding: '1px 7px', borderRadius: 10 }}>
                    {unseated.length} to place
                  </span>
                )}
              </div>

              {unseated.length === 0 && seats.every(s => s.guestId) ? (
                <p style={{ fontSize: 12, color: '#7F9A78', fontWeight: 600, textAlign: 'center', padding: '12px 0' }}>
                  ✓ All seats filled
                </p>
              ) : unseated.length === 0 ? (
                <p style={{ fontSize: 11, color: '#C4B49A', fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>
                  All assigned guests are seated
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {unseated.map(guest => (
                    <div
                      key={guest.id}
                      draggable
                      onDragStart={() => setDraggingId(guest.id)}
                      onDragEnd={() => setDraggingId(null)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        padding: '7px 10px', borderRadius: 8,
                        background: draggingId === guest.id ? '#3B2A22' : '#FFF8EE',
                        border: '1px solid #E8D5A3',
                        cursor: 'grab', userSelect: 'none',
                        color: draggingId === guest.id ? '#E8D5A3' : '#3B2A22',
                        transition: 'all 0.1s',
                        boxShadow: draggingId === guest.id ? '0 4px 16px rgba(42,30,20,0.25)' : 'none',
                      }}>
                      <GripVertical size={10} opacity={0.4} style={{ flexShrink: 0 }}/>
                      <span style={{ fontSize: 12, fontWeight: 500 }}>{guestDisplayName(guest)}</span>
                    </div>
                  ))}
                  <p style={{ fontSize: 10, color: '#A89080', fontStyle: 'italic', marginTop: 4, textAlign: 'center' }}>
                    Drag onto a seat to place
                  </p>
                </div>
              )}
            </div>

            {/* Seated list */}
            {seats.some(s => s.guestId) && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 3, height: 16, backgroundColor: '#7F9A78', borderRadius: 2 }}/>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#3B2A22', letterSpacing: '0.04em' }}>SEATED</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {seats.filter(s => s.guestId).map(seat => {
                    const guest = guestById[seat.guestId!]
                    if (!guest) return null
                    return (
                      <div key={seat.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '5px 10px', borderRadius: 8,
                        background: 'rgba(127,154,120,0.08)', border: '1px solid rgba(127,154,120,0.25)' }}>
                        <div>
                          <p style={{ fontSize: 11, fontWeight: 600, color: '#3B2A22' }}>{guestDisplayName(guest)}</p>
                          <p style={{ fontSize: 9, color: '#A89080' }}>
                            {seat.label ?? `Seat ${seat.number}`}
                          </p>
                        </div>
                        <button onClick={() => unassignSeat(seat.id)}
                          title="Move back to unseated"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C4B49A', padding: 2, lineHeight: 1 }}>
                          <X size={10}/>
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px', borderTop: '1px solid #F2E3CF',
          display: 'flex', justifyContent: 'flex-end', gap: 10, background: 'rgba(255,253,248,0.5)' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: 10, fontSize: 13,
            border: '1.5px solid #E8D5A3', background: 'transparent', color: '#7A6657', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={save} style={{ padding: '9px 24px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            border: 'none', background: '#3B2A22', color: '#FFF8EE', cursor: 'pointer' }}>
            Save seating
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Table edit modal ──────────────────────────────────────────────────────────
function TableModal({ initial, onSave, onClose }: {
  initial?: Table; onSave: (t: Table) => void; onClose: () => void
}) {
  const [form, setForm] = useState({
    label:    initial?.label    ?? `Table ${Math.floor(Math.random() * 20) + 1}`,
    shape:    initial?.shape    ?? 'round' as 'round' | 'rectangular',
    capacity: initial?.capacity ?? 8,
    note:     initial?.note     ?? '',
  })
  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1.5px solid #E8D5A3',
    borderRadius: 10, background: '#FFFDF7', color: '#3B2A22', fontSize: 13,
    fontFamily: 'Inter, sans-serif', outline: 'none',
  }
  const lbl: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 700, color: '#7A6657', letterSpacing: '0.08em', marginBottom: 5 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,30,20,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#FFF8EE', borderRadius: 20, padding: 32, width: '100%', maxWidth: 420,
        boxShadow: '0 24px 80px rgba(42,30,20,0.22)', border: '1.5px solid #E8D5A3' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, fontStyle: 'italic', color: '#3B2A22', margin: 0 }}>
              {initial ? 'Edit table' : 'Add table'}
            </h2>
            <Frangipani size={20} opacity={0.5}/>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A6657' }}><X size={16}/></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={lbl}>TABLE LABEL</label>
            <input style={inp} value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Table 1 – Family"/>
          </div>
          <div>
            <label style={lbl}>SHAPE</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['round', 'rectangular'] as const).map(s => (
                <button key={s} onClick={() => setForm(f => ({ ...f, shape: s }))}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.15s',
                    border: `1.5px solid ${form.shape === s ? '#C8A45D' : '#E8D5A3'}`,
                    background: form.shape === s ? '#C8A45D18' : 'transparent',
                    color: form.shape === s ? '#3B2A22' : '#7A6657',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                  {s === 'round' ? <Circle size={14}/> : <Square size={14}/>}
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={lbl}>SEATS</label>
            <input style={inp} type="number" min={1} max={30} value={form.capacity}
              onChange={e => setForm(f => ({ ...f, capacity: +e.target.value }))}/>
          </div>
          <div>
            <label style={lbl}>NOTE (optional)</label>
            <input style={inp} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="e.g. Near the dance floor"/>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 10, fontSize: 13,
            border: '1.5px solid #E8D5A3', background: 'transparent', color: '#7A6657', cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => {
            if (!form.label.trim()) return
            onSave({ id: initial?.id ?? uid(), guestIds: initial?.guestIds ?? [], seats: initial?.seats, ...form })
          }} style={{ flex: 2, padding: 10, borderRadius: 10, fontSize: 13, fontWeight: 600,
            border: 'none', background: '#3B2A22', color: '#FFF8EE', cursor: 'pointer' }}>
            {initial ? 'Save' : 'Add table'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Guest chip (draggable) ─────────────────────────────────────────────────────
function GuestChip({ guest, index }: { guest: Guest; index: number }) {
  const people = guestPeopleCount(guest)
  const chipStyle = (isDragging: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '5px 10px', borderRadius: 20, marginBottom: 4,
    background: isDragging ? '#3B2A22' : '#FFF8EE',
    border: '1px solid #E8D5A3',
    fontSize: 11, fontWeight: 500,
    color: isDragging ? '#E8D5A3' : '#3B2A22',
    cursor: isDragging ? 'grabbing' : 'grab',
    userSelect: 'none',
    boxShadow: isDragging ? '0 8px 24px rgba(42,30,20,0.35)' : 'none',
  })
  return (
    <Draggable draggableId={guest.id} index={index}>
      {(provided, snapshot) => {
        const child = (
          <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
            style={{ ...provided.draggableProps.style, ...chipStyle(snapshot.isDragging) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <GripVertical size={10} opacity={0.4}/>
              <span>{guestDisplayName(guest)}</span>
              {people > 1 && <span style={{ opacity: 0.5, fontSize: 10 }}>×{people}</span>}
            </div>
          </div>
        )
        return snapshot.isDragging ? createPortal(child, document.body) : child
      }}
    </Draggable>
  )
}

// ── Table card ────────────────────────────────────────────────────────────────
function TableCard({ table, guests, onEdit, onDelete, onOpenDetail }: {
  table: Table
  guests: Guest[]
  onEdit: (t: Table) => void
  onDelete: (id: string) => void
  onOpenDetail: (t: Table) => void
}) {
  const people  = guests.reduce((s, g) => s + guestPeopleCount(g), 0)
  const full    = people >= table.capacity
  const over    = people > table.capacity
  const pct     = Math.min((people / table.capacity) * 100, 100)
  const filled  = seatsFilled(table)
  const hasSeats = (table.seats?.length ?? 0) > 0

  return (
    <div style={{
      background: '#FAF3E6',
      border: `1.5px solid ${over ? 'rgba(196,122,82,0.5)' : full ? 'rgba(127,154,120,0.5)' : '#E8D5A3'}`,
      borderRadius: 16, overflow: 'hidden',
      boxShadow: over ? '0 2px 12px rgba(196,122,82,0.12)' : 'none',
    }}>
      {/* Clickable header area → opens detail modal */}
      <div style={{ padding: '14px 14px 10px', cursor: 'pointer' }}
        onClick={() => onOpenDetail(table)}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(200,164,93,0.04)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {table.shape === 'round'
              ? <Circle size={13} style={{ color: '#C8A45D' }} strokeWidth={1.5}/>
              : <Square  size={13} style={{ color: '#C8A45D' }} strokeWidth={1.5}/>}
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#3B2A22', lineHeight: 1 }}>{table.label}</p>
              {table.note && <p style={{ fontSize: 10, color: '#7A6657', marginTop: 2, fontStyle: 'italic' }}>{table.note}</p>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <button onClick={e => { e.stopPropagation(); onEdit(table) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A6657', padding: 3 }}>
              <Edit2 size={11} strokeWidth={1.5}/>
            </button>
            <button onClick={e => { e.stopPropagation(); onDelete(table.id) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C47A52', padding: 3 }}>
              <Trash2 size={11} strokeWidth={1.5}/>
            </button>
            <ChevronRight size={12} style={{ color: '#C8A45D', marginLeft: 2 }}/>
          </div>
        </div>

        {/* Capacity bar */}
        <div style={{ marginBottom: 6 }}>
          <div style={{ height: 4, borderRadius: 4, background: '#F2E3CF', overflow: 'hidden', marginBottom: 3 }}>
            <div style={{
              height: '100%', borderRadius: 4, width: `${pct}%`,
              background: over ? '#C47A52' : full ? '#7F9A78' : '#C8A45D',
              transition: 'width 0.3s',
            }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: over ? '#C47A52' : '#7A6657', fontWeight: over ? 700 : 400 }}>
              {over ? `⚠ Over (${people}/${table.capacity})` : `${people} / ${table.capacity} guests`}
            </span>
            {hasSeats && (
              <span style={{ fontSize: 9, fontWeight: 600,
                color: filled === table.capacity ? '#7F9A78' : '#C8A45D' }}>
                {filled}/{table.capacity} placed
              </span>
            )}
          </div>
        </div>

        {/* Click to arrange hint */}
        <p style={{ fontSize: 9, color: '#C8A45D', fontStyle: 'italic', textAlign: 'center', marginBottom: 4 }}>
          Click to arrange seats →
        </p>
      </div>

      {/* Drop zone for table-level assignment */}
      <div style={{ padding: '0 12px 12px' }}>
        <Droppable droppableId={table.id} type="guest" ignoreContainerClipping>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              style={{
                minHeight: 36, flex: 1,
                background: snapshot.isDraggingOver ? 'rgba(200,164,93,0.1)' : 'transparent',
                borderRadius: 8,
                border: snapshot.isDraggingOver ? '1px dashed #C8A45D' : '1px dashed transparent',
                padding: snapshot.isDraggingOver ? 4 : 0,
                transition: 'all 0.15s',
              }}
            >
              {guests.length === 0 && !snapshot.isDraggingOver && (
                <p style={{ fontSize: 10, color: '#D4C5A4', fontStyle: 'italic', textAlign: 'center', padding: '6px 0' }}>
                  Drop guests here
                </p>
              )}
              {guests.map((g, i) => <GuestChip key={g.id} guest={g} index={i}/>)}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
interface Props { data: AppData }

export function SeatingChart({ data }: Props) {
  const [seating, saveSeating] = useSeating()
  const [tableModal,  setTableModal]  = useState<'new' | Table | null>(null)
  const [detailTable, setDetailTable] = useState<Table | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  const tables = seating.tables
  const confirmedGuests = data.guests.filter(g => g.attending !== 'no')
  const guestById = Object.fromEntries(confirmedGuests.map(g => [g.id, g]))

  const assignedIds = new Set(tables.flatMap(t => t.guestIds))
  const unassigned  = confirmedGuests.filter(g => !assignedIds.has(g.id))

  const totalPeople    = confirmedGuests.reduce((s, g) => s + guestPeopleCount(g), 0)
  const seatedPeople   = tables.flatMap(t => t.guestIds).reduce((s, id) =>
    s + guestPeopleCount(guestById[id] ?? {} as Guest), 0)
  const specificSeated = useMemo(() =>
    tables.reduce((s, t) => s + seatsFilled(t), 0)
  , [tables])
  const totalCapacity  = tables.reduce((s, t) => s + t.capacity, 0)
  const overCapacity   = tables.filter(t =>
    t.guestIds.reduce((s, id) => s + guestPeopleCount(guestById[id] ?? {} as Guest), 0) > t.capacity
  )

  const saveTable = (t: Table) => {
    const exists = tables.find(x => x.id === t.id)
    saveSeating({ tables: exists ? tables.map(x => x.id === t.id ? t : x) : [...tables, t] })
    setTableModal(null)
  }

  const deleteTable = (id: string) => saveSeating({ tables: tables.filter(x => x.id !== id) })

  const updateTable = (updated: Table) => {
    saveSeating({ tables: tables.map(t => t.id === updated.id ? updated : t) })
    setDetailTable(null)
  }

  const onDragEnd = useCallback((result: DropResult) => {
    const { source, destination, draggableId } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    const guestId = draggableId
    const fromId  = source.droppableId
    const toId    = destination.droppableId

    const newTables = tables.map(t => ({ ...t, guestIds: [...t.guestIds] }))

    if (fromId !== 'unassigned') {
      const fromTable = newTables.find(t => t.id === fromId)!
      fromTable.guestIds = fromTable.guestIds.filter(id => id !== guestId)
    }
    if (toId !== 'unassigned') {
      const toTable = newTables.find(t => t.id === toId)!
      toTable.guestIds.splice(destination.index, 0, guestId)
    }

    saveSeating({ tables: newTables })
  }, [tables, saveSeating])

  return (
    <div className="page-content" style={{ maxWidth: 1200 }} ref={printRef}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 30, fontStyle: 'italic', color: '#3B2A22', margin: 0 }}>
              Seating Chart
            </h1>
            <SmallLeaf size={22} opacity={0.6} rotate={-15}/>
            <Frangipani size={26} opacity={0.5}/>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <p style={{ fontSize: 13, color: '#7A6657' }}>
              {tables.length} table{tables.length !== 1 ? 's' : ''} · {seatedPeople} of {totalPeople} guests assigned
              {specificSeated > 0 && ` · ${specificSeated} in specific seats`}
            </p>
            <TourButton tourId="seating" label="How it works"/>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Tip content="Print a clean seating plan for your venue coordinator" side="bottom">
            <button onClick={() => window.print()}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10,
                border: '1.5px solid #E8D5A3', background: '#FAF3E6', color: '#3B2A22', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <Printer size={13}/> Print
            </button>
          </Tip>
          <Tip content="Add a new table to your seating plan" side="bottom">
            <button onClick={() => setTableModal('new')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10,
                background: '#3B2A22', color: '#FFF8EE', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Plus size={14} strokeWidth={2}/> Add table
            </button>
          </Tip>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
        {[
          { label: 'TABLES',          value: String(tables.length),      sub: 'added',                    color: '#3B2A22' },
          { label: 'TOTAL SEATS',     value: String(totalCapacity),      sub: 'across all tables',         color: '#C8A45D' },
          { label: 'ASSIGNED',        value: String(seatedPeople),       sub: `of ${totalPeople} guests`,  color: '#7F9A78' },
          { label: 'SPECIFIC SEATS',  value: String(specificSeated),     sub: `of ${totalCapacity} placed`,color: specificSeated > 0 ? '#7F9A78' : '#A89080' },
        ].map(s => (
          <div key={s.label} style={{ background: '#FAF3E6', border: '1.5px solid #E8D5A3', borderRadius: 16, padding: '18px 22px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', bottom: -8, right: -8, pointerEvents: 'none', opacity: 0.12 }}>
              <svg width="56" height="56" viewBox="0 0 56 56" fill="none"><rect x="6" y="6" width="44" height="44" rx="5" transform="rotate(45 28 28)" fill={s.color}/></svg>
            </div>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#7A6657', letterSpacing: '0.12em', marginBottom: 8 }}>{s.label}</p>
            <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 500, color: s.color, lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontSize: 11, color: '#7A6657', marginTop: 5 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {overCapacity.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 10, marginBottom: 16,
          background: 'rgba(196,122,82,0.08)', border: '1px solid rgba(196,122,82,0.3)' }}>
          <AlertTriangle size={14} style={{ color: '#C47A52', flexShrink: 0 }} strokeWidth={1.8}/>
          <p style={{ fontSize: 12, color: '#C47A52' }}>
            {overCapacity.map(t => t.label).join(', ')} {overCapacity.length === 1 ? 'is' : 'are'} over capacity.
          </p>
        </div>
      )}

      <div style={{ marginBottom: 28 }}><BaliBorder width={500} opacity={0.5}/></div>

      {/* ── DnD Context ── */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 24, alignItems: 'start' }}>

          <div>
            {tables.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '56px 24px', background: '#FAF3E6', borderRadius: 16, border: '1.5px solid #E8D5A3' }}>
                <Users size={36} style={{ color: '#E8D5A3', marginBottom: 14 }} strokeWidth={1}/>
                <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: '#3B2A22', marginBottom: 8 }}>No tables yet</p>
                <p style={{ fontSize: 13, color: '#7A6657' }}>Click "Add table" to start building your seating plan.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                {tables.map(table => (
                  <TableCard
                    key={table.id} table={table}
                    guests={table.guestIds.map(id => guestById[id]).filter(Boolean) as Guest[]}
                    onEdit={setTableModal}
                    onDelete={deleteTable}
                    onOpenDetail={setDetailTable}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Unassigned sidebar */}
          <div style={{ position: 'sticky', top: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 3, height: 18, backgroundColor: '#C47A52', borderRadius: 2 }}/>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, color: '#3B2A22', margin: 0 }}>Unassigned</h2>
              {unassigned.length > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#C47A52', background: 'rgba(196,122,82,0.15)', padding: '2px 8px', borderRadius: 10 }}>
                  {unassigned.length}
                </span>
              )}
            </div>

            <Droppable droppableId="unassigned" type="guest" ignoreContainerClipping>
              {(provided, snapshot) => (
                <div ref={provided.innerRef} {...provided.droppableProps}
                  style={{
                    background: snapshot.isDraggingOver ? 'rgba(196,122,82,0.07)' : '#FAF3E6',
                    border: `1.5px solid ${snapshot.isDraggingOver ? 'rgba(196,122,82,0.4)' : '#E8D5A3'}`,
                    borderRadius: 16, padding: 12, minHeight: 80, transition: 'all 0.15s',
                  }}>
                  {unassigned.length === 0 && !snapshot.isDraggingOver ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                      <p style={{ fontSize: 12, color: '#7F9A78', fontWeight: 600 }}>✓ All guests assigned</p>
                    </div>
                  ) : (
                    unassigned.map((g, i) => <GuestChip key={g.id} guest={g} index={i}/>)
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>

            {confirmedGuests.length === 0 && (
              <p style={{ fontSize: 12, color: '#7A6657', fontStyle: 'italic', marginTop: 8, textAlign: 'center' }}>
                Add confirmed guests in the Guest List first.
              </p>
            )}

            <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 12,
              background: 'rgba(200,164,93,0.08)', border: '1px solid rgba(200,164,93,0.25)' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#7A6657', letterSpacing: '0.06em', marginBottom: 6 }}>HOW TO USE</p>
              <ul style={{ listStyle: 'none', fontSize: 11, color: '#7A6657', lineHeight: 1.9 }}>
                <li>→ Drag guests onto tables</li>
                <li>→ Click a table to arrange seats</li>
                <li>→ Drag back here to unassign</li>
              </ul>
            </div>
          </div>
        </div>
      </DragDropContext>

      {/* Export */}
      <div style={{ marginTop: 40, display: 'flex', gap: 10 }}>
        <button onClick={() => window.print()}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 12,
            border: '1.5px solid #E8D5A3', background: '#FAF3E6', color: '#3B2A22', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          <Printer size={14}/> Print seating chart
        </button>
        <button onClick={() => exportJSON(data)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 12,
            border: '1.5px solid #E8D5A3', background: '#FAF3E6', color: '#3B2A22', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          <FileJson size={14}/> Export all data JSON
        </button>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #main-scroll, #main-scroll * { visibility: visible; }
          #main-scroll { position: absolute; left: 0; top: 0; width: 100%; }
          button, [role="button"] { display: none !important; }
        }
      `}</style>

      {/* Modals */}
      {tableModal && (
        <TableModal
          initial={tableModal === 'new' ? undefined : tableModal as Table}
          onSave={saveTable} onClose={() => setTableModal(null)}
        />
      )}

      {detailTable && (
        <TableDetailModal
          table={tables.find(t => t.id === detailTable.id) ?? detailTable}
          guestById={guestById}
          onUpdate={updateTable}
          onClose={() => setDetailTable(null)}
        />
      )}
    </div>
  )
}
