import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  DragDropContext, Droppable, Draggable, type DropResult,
} from '@hello-pangea/dnd'
import {
  Plus, Edit2, Trash2, X, Search, FileJson, Printer,
  Users, AlertTriangle, GripVertical, BedDouble,
  Home, Building2, ChevronDown, ChevronUp,
} from 'lucide-react'
import { SmallLeaf, Frangipani, BaliBorder } from '../components/Botanicals'
import { TourButton } from '../components/GuidedTour'
import { uid } from '../lib/helpers'
import type { AppData, Guest } from '../types'

// ── types ─────────────────────────────────────────────────────────────────────
export type ExtraBeddingType = 'Extra Bed' | 'Cot' | 'Rollaway' | 'Sofa Bed' | 'Futon' | 'Airbed'

export interface ExtraBedding {
  id: string
  type: ExtraBeddingType
  quantity: number
}

interface Room {
  id: string
  name: string
  capacity: number
  type: 'Villa' | 'Suite' | 'Family Room' | 'Standard Room' | 'Other'
  notes?: string
  guestIds: string[]
  extraBedding?: ExtraBedding[]
}

interface AccomData { rooms: Room[] }

const STORAGE_KEY = 'jb-accommodation'

function exportJSON(data: AppData, accomData: AccomData) {
  const bundle = { ...data, accommodation: accomData, exportedAt: new Date().toISOString() }
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url
  a.download = `wedding-accommodation-${new Date().toISOString().split('T')[0]}.json`
  a.click(); URL.revokeObjectURL(url)
}

// ── extra bedding constants ───────────────────────────────────────────────────
const EXTRA_BED_TYPES: ExtraBeddingType[] = ['Cot', 'Extra Bed', 'Rollaway', 'Sofa Bed', 'Futon', 'Airbed']
const EXTRA_BED_EMOJI: Record<ExtraBeddingType, string> = {
  'Cot':       '🍼',
  'Extra Bed': '🛏',
  'Rollaway':  '🛏',
  'Sofa Bed':  '🛋',
  'Futon':     '🛏',
  'Airbed':    '💨',
}

// ── storage ───────────────────────────────────────────────────────────────────
function useAccom(): [AccomData, (d: AccomData) => void] {
  const [state, setState] = useState<AccomData>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : { rooms: [] }
    } catch { return { rooms: [] } }
  })
  const save = (d: AccomData) => { setState(d); try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch(e) { if (e instanceof DOMException) window.dispatchEvent(new CustomEvent("storage-quota-exceeded")) } }
  return [state, save]
}

// ── helpers ───────────────────────────────────────────────────────────────────
function guestName(g: Guest) {
  if (g.firstName || g.lastName) return `${g.firstName ?? ''} ${g.lastName ?? ''}`.trim()
  return g.name
}
function guestCount(_g: Guest) { return 1 }

const ROOM_TYPE_ICONS: Record<string, React.ElementType> = {
  'Villa':        Home,
  'Suite':        Building2,
  'Family Room':  Users,
  'Standard Room':BedDouble,
  'Other':        BedDouble,
}

const ROOM_TYPES = ['Villa', 'Suite', 'Family Room', 'Standard Room', 'Other'] as const

// ── Extra bedding section (inline on room card) ───────────────────────────────
function ExtraBeddingSection({ bedding, onChange }: {
  bedding: ExtraBedding[]
  onChange: (b: ExtraBedding[]) => void
}) {
  const [expanded, setExpanded] = useState(bedding.length > 0)
  const [addType, setAddType] = useState<ExtraBeddingType>('Cot')

  const hasBedding = bedding.length > 0

  const addItem = () => {
    const existing = bedding.find(b => b.type === addType)
    if (existing) {
      onChange(bedding.map(b => b.type === addType ? { ...b, quantity: b.quantity + 1 } : b))
    } else {
      onChange([...bedding, { id: uid(), type: addType, quantity: 1 }])
    }
  }

  const removeItem = (id: string) => {
    const updated = bedding.filter(b => b.id !== id)
    onChange(updated)
    if (updated.length === 0) setExpanded(false)
  }

  const changeQty = (id: string, delta: number) => {
    onChange(bedding.map(b => b.id === id ? { ...b, quantity: Math.max(1, b.quantity + delta) } : b))
  }

  const inp: React.CSSProperties = {
    padding: '5px 8px', border: '1.5px solid #E8D5A3', borderRadius: 8,
    background: '#FFFDF7', color: '#3B2A22', fontSize: 12,
    fontFamily: 'Inter, sans-serif', outline: 'none',
  }

  return (
    <div style={{ marginTop: 10, borderTop: '1px solid #F2E3CF', paddingTop: 8 }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none',
          cursor: 'pointer', padding: '2px 0', width: '100%',
        }}>
        {hasBedding ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#7F9A78', letterSpacing: '0.06em' }}>
              EXTRA BEDDING
            </span>
            <span style={{
              fontSize: 9, fontWeight: 700, color: '#7F9A78',
              background: 'rgba(127,154,120,0.15)', border: '1px solid rgba(127,154,120,0.3)',
              padding: '1px 6px', borderRadius: 10,
            }}>
              {bedding.reduce((s, b) => s + b.quantity, 0)} item{bedding.reduce((s, b) => s + b.quantity, 0) !== 1 ? 's' : ''}
            </span>
          </span>
        ) : (
          <span style={{ fontSize: 11, color: '#C8A45D', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Plus size={10} strokeWidth={2.5}/> Request extra bedding
          </span>
        )}
        {hasBedding && (
          expanded
            ? <ChevronUp size={10} style={{ color: '#7A6657', flexShrink: 0 }}/>
            : <ChevronDown size={10} style={{ color: '#7A6657', flexShrink: 0 }}/>
        )}
      </button>

      {expanded && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {/* Existing items */}
          {bedding.map(b => (
            <div key={b.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '4px 8px', borderRadius: 8,
              background: 'rgba(127,154,120,0.07)', border: '1px solid rgba(127,154,120,0.25)',
            }}>
              <span style={{ fontSize: 11, color: '#3B2A22', display: 'flex', alignItems: 'center', gap: 4 }}>
                {EXTRA_BED_EMOJI[b.type]} {b.type}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <button onClick={() => changeQty(b.id, -1)}
                  style={{ width: 18, height: 18, borderRadius: 4, border: '1px solid #E8D5A3',
                    background: '#FFF8EE', cursor: 'pointer', fontSize: 12, lineHeight: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B2A22' }}>
                  −
                </button>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#3B2A22', minWidth: 16, textAlign: 'center' }}>
                  {b.quantity}
                </span>
                <button onClick={() => changeQty(b.id, 1)}
                  style={{ width: 18, height: 18, borderRadius: 4, border: '1px solid #E8D5A3',
                    background: '#FFF8EE', cursor: 'pointer', fontSize: 12, lineHeight: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B2A22' }}>
                  +
                </button>
                <button onClick={() => removeItem(b.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer',
                    color: '#C47A52', padding: '0 2px', lineHeight: 1 }}>
                  <X size={10}/>
                </button>
              </div>
            </div>
          ))}

          {/* Add row */}
          <div style={{ display: 'flex', gap: 5, marginTop: 2 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <select value={addType} onChange={e => setAddType(e.target.value as ExtraBeddingType)}
                style={{ ...inp, width: '100%', appearance: 'none', paddingRight: 20 }}>
                {EXTRA_BED_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <ChevronDown size={10} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', color: '#7A6657', pointerEvents: 'none' }}/>
            </div>
            <button onClick={addItem} style={{
              display: 'flex', alignItems: 'center', gap: 3, padding: '5px 10px',
              borderRadius: 8, border: 'none', background: '#3B2A22',
              color: '#FFF8EE', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              <Plus size={10} strokeWidth={2.5}/> Add
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Room modal ────────────────────────────────────────────────────────────────
const EMPTY_ROOM: Omit<Room, 'id' | 'guestIds'> = {
  name: '', capacity: 4, type: 'Villa', notes: '',
}

function RoomModal({ initial, roomCount, onSave, onClose }: {
  initial?: Room; roomCount: number
  onSave: (r: Room) => void; onClose: () => void
}) {
  const [form, setForm] = useState<Omit<Room, 'id' | 'guestIds'>>(
    initial ? { name: initial.name, capacity: initial.capacity, type: initial.type, notes: initial.notes ?? '' }
            : { ...EMPTY_ROOM, name: `Villa ${roomCount + 1}` }
  )
  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px',
    border: '1.5px solid #E8D5A3', borderRadius: 10,
    background: '#FFFDF7', color: '#3B2A22', fontSize: 13,
    fontFamily: 'Inter, sans-serif', outline: 'none',
  }
  const lbl: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 700, color: '#7A6657', letterSpacing: '0.08em', marginBottom: 5 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,30,20,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#FFF8EE', borderRadius: 20, padding: 36, width: '100%', maxWidth: 460,
        boxShadow: '0 24px 80px rgba(42,30,20,0.22)', border: '1.5px solid #E8D5A3' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, fontStyle: 'italic', color: '#3B2A22', margin: 0 }}>
              {initial ? 'Edit room' : 'Add room'}
            </h2>
            <Frangipani size={22} opacity={0.5}/>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A6657' }}>
            <X size={18}/>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={lbl}>ROOM / VILLA NAME *</label>
            <input style={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Villa 3, Honeymoon Suite"/>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>TYPE</label>
              <div style={{ position: 'relative' }}>
                <select style={{ ...inp, appearance: 'none', paddingRight: 28 }}
                  value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as Room['type'] }))}>
                  {ROOM_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
                <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#7A6657', pointerEvents: 'none' }}/>
              </div>
            </div>
            <div>
              <label style={lbl}>CAPACITY (guests)</label>
              <input style={inp} type="number" min={1} max={20} value={form.capacity}
                onChange={e => setForm(f => ({ ...f, capacity: Math.max(1, +e.target.value) }))}/>
            </div>
          </div>
          <div>
            <label style={lbl}>NOTES (optional)</label>
            <textarea style={{ ...inp, resize: 'vertical', minHeight: 64 }}
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. Garden view, ground floor, adjoining rooms…"/>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 10, fontSize: 13,
            border: '1.5px solid #E8D5A3', background: 'transparent', color: '#7A6657', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={() => {
            if (!form.name.trim()) return
            onSave({ id: initial?.id ?? uid(), guestIds: initial?.guestIds ?? [], extraBedding: initial?.extraBedding ?? [], ...form })
          }} disabled={!form.name.trim()} style={{ flex: 2, padding: 10, borderRadius: 10, fontSize: 13, fontWeight: 600,
            border: 'none',
            background: form.name.trim() ? '#3B2A22' : '#E8D5A3',
            color: form.name.trim() ? '#FFF8EE' : '#7A6657',
            cursor: form.name.trim() ? 'pointer' : 'default' }}>
            {initial ? 'Save changes' : 'Add room'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Guest chip ────────────────────────────────────────────────────────────────
function GuestChip({ guest, index, onRemove }: {
  guest: Guest; index: number; droppableId?: string; onRemove?: () => void
}) {
  const count = guestCount(guest)
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
  const inner = (isDragging: boolean) => (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <GripVertical size={10} opacity={0.4}/>
        <span>{guestName(guest)}</span>
        {count > 1 && <span style={{ opacity: 0.5, fontSize: 10 }}>×{count}</span>}
      </div>
      {onRemove && !isDragging && (
        <button onClick={e => { e.stopPropagation(); onRemove() }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A6657', padding: 0, lineHeight: 1 }}>
          <X size={10}/>
        </button>
      )}
    </>
  )
  return (
    <Draggable draggableId={guest.id} index={index}>
      {(provided, snapshot) => {
        const child = (
          <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
            style={{ ...provided.draggableProps.style, ...chipStyle(snapshot.isDragging) }}>
            {inner(snapshot.isDragging)}
          </div>
        )
        return snapshot.isDragging
          ? createPortal(child, document.body)
          : child
      }}
    </Draggable>
  )
}

// ── Room card ─────────────────────────────────────────────────────────────────
function RoomCard({ room, guests, onEdit, onDelete, onBeddingChange }: {
  room: Room; guests: Guest[]
  onEdit: (r: Room) => void
  onDelete: (id: string) => void
  onBeddingChange: (roomId: string, bedding: ExtraBedding[]) => void
}) {
  const occupied    = guests.reduce((s, g) => s + guestCount(g), 0)
  const pct         = room.capacity > 0 ? Math.min((occupied / room.capacity) * 100, 100) : 0
  const full        = occupied >= room.capacity
  const over        = occupied > room.capacity
  const TypeIcon    = ROOM_TYPE_ICONS[room.type] ?? BedDouble
  const bedding     = room.extraBedding ?? []
  const hasBedding  = bedding.length > 0
  const extraBeds   = bedding.reduce((s, b) => s + b.quantity, 0)
  const shortfall   = Math.max(0, occupied - room.capacity)
  const covered     = over && extraBeds >= shortfall   // extra beds fully cover the overage
  const partial     = over && extraBeds > 0 && !covered // extra beds exist but don't fully cover
  const barColor    = covered ? '#C8A45D' : over ? '#C47A52' : full ? '#7F9A78' : '#C8A45D'

  return (
    <div style={{
      background: '#FAF3E6',
      border: `1.5px solid ${covered ? 'rgba(200,164,93,0.5)' : over ? 'rgba(196,122,82,0.5)' : full ? 'rgba(127,154,120,0.4)' : '#E8D5A3'}`,
      borderRadius: 16, padding: '18px 16px 14px',
      display: 'flex', flexDirection: 'column',
      boxShadow: covered ? '0 2px 12px rgba(200,164,93,0.1)' : over ? '0 2px 12px rgba(196,122,82,0.1)' : '0 1px 6px rgba(42,30,20,0.04)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(200,164,93,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <TypeIcon size={15} style={{ color: '#C8A45D' }} strokeWidth={1.5}/>
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#3B2A22', lineHeight: 1.2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.name}</p>
            <p style={{ fontSize: 10, color: '#7A6657', marginTop: 1 }}>{room.type}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <button onClick={() => onEdit(room)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A6657', padding: 3 }}>
            <Edit2 size={11} strokeWidth={1.5}/>
          </button>
          <button onClick={() => onDelete(room.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C47A52', padding: 3 }}>
            <Trash2 size={11} strokeWidth={1.5}/>
          </button>
        </div>
      </div>

      {/* Extra bedding badge */}
      {hasBedding && (
        <div style={{ marginBottom: 6 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 10, fontWeight: 600, color: '#7F9A78',
            background: 'rgba(127,154,120,0.12)', border: '1px solid rgba(127,154,120,0.3)',
            padding: '2px 8px', borderRadius: 10,
          }}>
            🛏 {bedding.map(b => `${b.quantity} ${b.type}`).join(', ')}
          </span>
        </div>
      )}

      {/* Notes */}
      {room.notes && (
        <p style={{ fontSize: 10, color: '#7A6657', fontStyle: 'italic', marginBottom: 8, lineHeight: 1.4 }}>{room.notes}</p>
      )}

      {/* Capacity bar */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ height: 4, borderRadius: 4, background: '#F2E3CF', overflow: 'hidden', marginBottom: 3 }}>
          <div style={{ height: '100%', borderRadius: 4, width: `${pct}%`, backgroundColor: barColor, transition: 'width 0.3s' }}/>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: covered ? '#8B6914' : over ? '#C47A52' : '#7A6657', fontWeight: over ? 700 : 400 }}>
            {over && !covered && <AlertTriangle size={9} style={{ verticalAlign: 'middle', marginRight: 3 }}/>}
            {occupied} / {room.capacity} guests
          </span>
          {covered && (
            <span style={{ fontSize: 9, color: '#8B6914', fontWeight: 700 }}>COVERED BY EXTRA BEDS</span>
          )}
          {partial && (
            <span style={{ fontSize: 9, color: '#C47A52', fontWeight: 700 }}>{shortfall - extraBeds} STILL OVER</span>
          )}
          {over && !covered && !partial && (
            <span style={{ fontSize: 9, color: '#C47A52', fontWeight: 700 }}>OVER CAPACITY</span>
          )}
        </div>
      </div>

      {/* Drop zone */}
      <Droppable droppableId={room.id} type="guest" ignoreContainerClipping>
        {(provided, snapshot) => (
          <div ref={provided.innerRef} {...provided.droppableProps}
            style={{
              flex: 1, minHeight: 44, borderRadius: 8,
              background: snapshot.isDraggingOver ? 'rgba(200,164,93,0.1)' : 'transparent',
              border: snapshot.isDraggingOver ? '1px dashed #C8A45D' : '1px dashed transparent',
              padding: snapshot.isDraggingOver ? 4 : 0,
              transition: 'all 0.15s',
            }}>
            {guests.length === 0 && !snapshot.isDraggingOver && (
              <p style={{ fontSize: 10, color: '#D4C5A4', fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>
                Drop guests here
              </p>
            )}
            {guests.map((g, i) => (
              <GuestChip key={g.id} guest={g} index={i} droppableId={room.id}/>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {/* Extra bedding inline editor */}
      <ExtraBeddingSection
        bedding={bedding}
        onChange={b => onBeddingChange(room.id, b)}
      />
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
interface Props { data: AppData }

export function Accommodation({ data }: Props) {
  const [accom, saveAccom] = useAccom()
  const [roomModal, setRoomModal] = useState<'new' | Room | null>(null)
  const [deleteId,  setDeleteId]  = useState<string | null>(null)
  const [search,    setSearch]    = useState('')

  const rooms     = accom.rooms
  const guestById = Object.fromEntries(data.guests.map(g => [g.id, g]))
  const confirmed = data.guests.filter(g => g.attending !== 'no')

  const assignedIds  = new Set(rooms.flatMap(r => r.guestIds))
  const unallocated  = confirmed.filter(g => !assignedIds.has(g.id))

  const filteredUnalloc = useMemo(() => {
    if (!search.trim()) return unallocated
    const q = search.toLowerCase()
    return unallocated.filter(g => guestName(g).toLowerCase().includes(q))
  }, [unallocated, search])

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalCapacity    = rooms.reduce((s, r) => s + r.capacity, 0)
  const totalAllocated   = confirmed.filter(g => assignedIds.has(g.id)).reduce((s, g) => s + guestCount(g), 0)
  const totalConfirmed   = confirmed.reduce((s, g) => s + guestCount(g), 0)
  const totalUnallocated = unallocated.reduce((s, g) => s + guestCount(g), 0)
  const overRooms = rooms.filter(r => {
    const occ      = r.guestIds.reduce((s, id) => s + guestCount(guestById[id] ?? {} as Guest), 0)
    const extra    = (r.extraBedding ?? []).reduce((s, b) => s + b.quantity, 0)
    const shortfall = Math.max(0, occ - r.capacity)
    return shortfall > 0 && extra < shortfall  // only flag if not fully covered
  })
  const coveredRooms = rooms.filter(r => {
    const occ      = r.guestIds.reduce((s, id) => s + guestCount(guestById[id] ?? {} as Guest), 0)
    const extra    = (r.extraBedding ?? []).reduce((s, b) => s + b.quantity, 0)
    const shortfall = Math.max(0, occ - r.capacity)
    return shortfall > 0 && extra >= shortfall
  })

  // ── Extra bedding stats ────────────────────────────────────────────────────
  const allBedding       = rooms.flatMap(r => r.extraBedding ?? [])
  const totalBeddingItems = allBedding.reduce((s, b) => s + b.quantity, 0)
  const roomsWithBedding = rooms.filter(r => (r.extraBedding?.length ?? 0) > 0).length
  const beddingByType    = allBedding.reduce<Record<string, number>>((acc, b) => {
    acc[b.type] = (acc[b.type] ?? 0) + b.quantity
    return acc
  }, {})

  // ── Actions ────────────────────────────────────────────────────────────────
  const saveRoom = (r: Room) => {
    const exists = rooms.find(x => x.id === r.id)
    saveAccom({ rooms: exists ? rooms.map(x => x.id === r.id ? r : x) : [...rooms, r] })
    setRoomModal(null)
  }

  const deleteRoom = (id: string) => {
    saveAccom({ rooms: rooms.filter(r => r.id !== id) })
    setDeleteId(null)
  }

  const handleBeddingChange = (roomId: string, bedding: ExtraBedding[]) => {
    saveAccom({ rooms: rooms.map(r => r.id === roomId ? { ...r, extraBedding: bedding } : r) })
  }

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    const guestId = draggableId
    const fromId  = source.droppableId
    const toId    = destination.droppableId

    const current  = accom.rooms
    const newRooms = current.map(r => ({ ...r, guestIds: [...r.guestIds] }))

    if (fromId !== 'unallocated') {
      const from = newRooms.find(r => r.id === fromId)
      if (from) from.guestIds = from.guestIds.filter(id => id !== guestId)
    }
    if (toId !== 'unallocated') {
      const to = newRooms.find(r => r.id === toId)
      if (to) {
        to.guestIds = to.guestIds.filter(id => id !== guestId)
        to.guestIds.splice(destination.index, 0, guestId)
      }
    }

    saveAccom({ rooms: newRooms })
  }

  const handlePrint = () => window.print()

  return (
    <div className="page-content" style={{maxWidth: 1200}}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 30, fontStyle: 'italic', color: '#3B2A22', margin: 0 }}>
              Accommodation
            </h1>
            <SmallLeaf size={22} opacity={0.6} rotate={-15}/>
            <Frangipani size={26} opacity={0.5}/>
          </div>
          <p style={{ fontSize: 13, color: '#7A6657' }}>
            <span>{rooms.length} room{rooms.length !== 1 ? 's' : ''} · {totalAllocated} of {totalConfirmed} guests allocated</span>
            <TourButton tourId="accommodation" label="How it works"/>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handlePrint}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10,
              border: '1.5px solid #E8D5A3', background: '#FAF3E6', color: '#3B2A22', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <Printer size={13}/> Print list
          </button>
          <button onClick={() => setRoomModal('new')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 12,
              background: '#3B2A22', color: '#FFF8EE', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={14} strokeWidth={2}/> Add room
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
        {[
          { label: 'ROOMS',          value: rooms.length,     sub: 'added',                        color: '#3B2A22' },
          { label: 'TOTAL CAPACITY', value: totalCapacity,    sub: 'available beds',                color: '#C8A45D' },
          { label: 'ALLOCATED',      value: totalAllocated,   sub: `of ${totalConfirmed} confirmed`, color: '#7F9A78' },
          { label: 'UNALLOCATED',    value: totalUnallocated, sub: totalUnallocated > 0 ? 'need a room' : 'all assigned', color: totalUnallocated > 0 ? '#C47A52' : '#7A6657' },
        ].map(s => (
          <div key={s.label} style={{ background: '#FAF3E6', border: '1.5px solid #E8D5A3', borderRadius: 16, padding: '18px 22px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', bottom: -8, right: -8, pointerEvents: 'none', opacity: 0.1 }}>
              <svg width="56" height="56" viewBox="0 0 56 56" fill="none"><rect x="6" y="6" width="44" height="44" rx="5" transform="rotate(45 28 28)" fill={s.color}/></svg>
            </div>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#7A6657', letterSpacing: '0.12em', marginBottom: 8 }}>{s.label}</p>
            <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 500, color: s.color, lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontSize: 11, color: '#7A6657', marginTop: 5 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Extra bedding summary ── */}
      {totalBeddingItems > 0 && (
        <div style={{
          background: '#FAF3E6', border: '1.5px solid rgba(127,154,120,0.4)',
          borderRadius: 14, padding: '14px 20px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🛏</span>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#7A6657', letterSpacing: '0.08em', marginBottom: 2 }}>EXTRA BEDDING REQUESTED</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#3B2A22' }}>
                {totalBeddingItems} item{totalBeddingItems !== 1 ? 's' : ''} across {roomsWithBedding} room{roomsWithBedding !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div style={{ width: 1, height: 36, background: '#E8D5A3' }}/>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(beddingByType).map(([type, qty]) => (
              <span key={type} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 12, fontWeight: 600, color: '#5A7A54',
                background: 'rgba(127,154,120,0.12)', border: '1px solid rgba(127,154,120,0.3)',
                padding: '4px 12px', borderRadius: 20,
              }}>
                {EXTRA_BED_EMOJI[type as ExtraBeddingType]} {qty}× {type}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Over-capacity warning — rooms not covered by extra beds */}
      {overRooms.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 10, marginBottom: 8,
          background: 'rgba(196,122,82,0.08)', border: '1px solid rgba(196,122,82,0.3)' }}>
          <AlertTriangle size={14} style={{ color: '#C47A52', flexShrink: 0 }} strokeWidth={1.8}/>
          <p style={{ fontSize: 12, color: '#C47A52' }}>
            {overRooms.map(r => r.name).join(', ')} {overRooms.length === 1 ? 'is' : 'are'} over capacity — add extra bedding to resolve.
          </p>
        </div>
      )}
      {/* Covered notice — over capacity but extra beds account for the shortfall */}
      {coveredRooms.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 10, marginBottom: 8,
          background: 'rgba(200,164,93,0.08)', border: '1px solid rgba(200,164,93,0.35)' }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>🛏</span>
          <p style={{ fontSize: 12, color: '#8B6914' }}>
            {coveredRooms.map(r => r.name).join(', ')} {coveredRooms.length === 1 ? 'is' : 'are'} over base capacity but covered by requested extra beds.
          </p>
        </div>
      )}

      <div style={{ marginBottom: 28 }}>
        <BaliBorder width={500} opacity={0.5}/>
      </div>

      {/* ── DnD layout ── */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 28, alignItems: 'start' }}>

          {/* ── Rooms grid ── */}
          <div>
            {rooms.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 24px', background: '#FAF3E6', borderRadius: 16, border: '1.5px solid #E8D5A3' }}>
                <Home size={36} style={{ color: '#E8D5A3', marginBottom: 14 }} strokeWidth={1}/>
                <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: '#3B2A22', marginBottom: 8 }}>No rooms yet</p>
                <p style={{ fontSize: 13, color: '#7A6657', marginBottom: 20 }}>
                  Add your villa and room details to start allocating guests.
                </p>
                <button onClick={() => setRoomModal('new')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10,
                    background: '#3B2A22', color: '#FFF8EE', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  <Plus size={14}/> Add first room
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                {rooms.map(room => (
                  <RoomCard key={room.id} room={room}
                    guests={room.guestIds.map(id => guestById[id]).filter(Boolean) as Guest[]}
                    onEdit={setRoomModal}
                    onDelete={setDeleteId}
                    onBeddingChange={handleBeddingChange}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Unallocated sidebar ── */}
          <div style={{ position: 'sticky', top: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 3, height: 18, backgroundColor: '#C47A52', borderRadius: 2 }}/>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, color: '#3B2A22', margin: 0 }}>Unallocated</h2>
              {unallocated.length > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#C47A52', background: 'rgba(196,122,82,0.15)', padding: '2px 8px', borderRadius: 10 }}>
                  {unallocated.length}
                </span>
              )}
            </div>

            {unallocated.length > 3 && (
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#7A6657' }}/>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter guests…"
                  style={{ width: '100%', padding: '7px 10px 7px 28px', border: '1.5px solid #E8D5A3',
                    borderRadius: 10, background: '#FAF3E6', color: '#3B2A22', fontSize: 12, outline: 'none',
                    fontFamily: 'Inter, sans-serif' }}/>
              </div>
            )}

            <Droppable droppableId="unallocated" type="guest" ignoreContainerClipping>
              {(provided, snapshot) => (
                <div ref={provided.innerRef} {...provided.droppableProps}
                  style={{
                    background: snapshot.isDraggingOver ? 'rgba(196,122,82,0.06)' : '#FAF3E6',
                    border: `1.5px solid ${snapshot.isDraggingOver ? 'rgba(196,122,82,0.4)' : '#E8D5A3'}`,
                    borderRadius: 16, padding: 12, minHeight: 80, transition: 'all 0.15s',
                  }}>
                  {filteredUnalloc.length === 0 && !snapshot.isDraggingOver ? (
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                      {unallocated.length === 0
                        ? <p style={{ fontSize: 12, color: '#7F9A78', fontWeight: 600 }}>✓ All guests allocated</p>
                        : <p style={{ fontSize: 11, color: '#7A6657', fontStyle: 'italic' }}>No matches</p>
                      }
                    </div>
                  ) : (
                    filteredUnalloc.map((g, i) => (
                      <GuestChip key={g.id} guest={g} index={i} droppableId="unallocated"/>
                    ))
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>

            {confirmed.length === 0 && (
              <p style={{ fontSize: 12, color: '#7A6657', fontStyle: 'italic', marginTop: 8, textAlign: 'center', lineHeight: 1.5 }}>
                Confirm guests in the Guest List first to allocate them here.
              </p>
            )}

            <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 12,
              background: 'rgba(200,164,93,0.08)', border: '1px solid rgba(200,164,93,0.25)' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#7A6657', letterSpacing: '0.06em', marginBottom: 6 }}>HOW TO USE</p>
              <ul style={{ listStyle: 'none', fontSize: 11, color: '#7A6657', lineHeight: 1.9 }}>
                <li>→ Drag guests onto rooms</li>
                <li>→ Move between rooms freely</li>
                <li>→ Drag back here to unallocate</li>
                <li>→ Use cards to request extra bedding</li>
              </ul>
            </div>
          </div>
        </div>
      </DragDropContext>

      {/* ── Export ── */}
      <div style={{ marginTop: 40, display: 'flex', gap: 10 }}>
        <button onClick={handlePrint}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 12,
            border: '1.5px solid #E8D5A3', background: '#FAF3E6', color: '#3B2A22', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          <Printer size={14}/> Print rooming list
        </button>
        <button onClick={() => exportJSON(data, accom)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 12,
            border: '1.5px solid #E8D5A3', background: '#FAF3E6', color: '#3B2A22', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          <FileJson size={14}/> Export rooming list JSON
        </button>
      </div>

      {/* ── Hidden print layout ── */}
      <div id="print-rooming-list" style={{ display: 'none' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 22, marginBottom: 4 }}>Jamie & Beth — Rooming List</h1>
        {totalBeddingItems > 0 && (
          <p style={{ fontSize: 13, marginBottom: 16, color: '#555' }}>
            Extra bedding requested: {Object.entries(beddingByType).map(([t, q]) => `${q}× ${t}`).join(', ')}
          </p>
        )}
        {rooms.map(room => {
          const roomGuests = room.guestIds.map(id => guestById[id]).filter(Boolean) as Guest[]
          const occupied   = roomGuests.reduce((s, g) => s + guestCount(g), 0)
          const bedding    = room.extraBedding ?? []
          return (
            <div key={room.id} style={{ marginBottom: 20, pageBreakInside: 'avoid' }}>
              <p style={{ fontWeight: 700, fontSize: 14, borderBottom: '1px solid #ccc', paddingBottom: 4, marginBottom: 6 }}>
                {room.name} <span style={{ fontWeight: 400, fontSize: 12, color: '#666' }}>({room.type} · {occupied}/{room.capacity} guests)</span>
                {occupied > room.capacity && <span style={{ color: 'red', fontSize: 11, marginLeft: 8 }}>⚠ Over capacity</span>}
              </p>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: 12 }}>
                {roomGuests.map(g => <li key={g.id}>• {guestName(g)}</li>)}
                {roomGuests.length === 0 && <li style={{ color: '#999', fontStyle: 'italic' }}>No guests assigned</li>}
              </ul>
              {bedding.length > 0 && (
                <p style={{ fontSize: 11, color: '#555', marginTop: 4 }}>
                  Extra bedding: {bedding.map(b => `${b.quantity}× ${b.type}`).join(', ')}
                </p>
              )}
              {room.notes && <p style={{ fontSize: 11, color: '#777', fontStyle: 'italic', marginTop: 2 }}>Note: {room.notes}</p>}
            </div>
          )
        })}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-rooming-list, #print-rooming-list * { visibility: visible; display: block !important; }
          #print-rooming-list { position: absolute; left: 0; top: 0; width: 100%; padding: 32px; }
          button { display: none !important; }
        }
      `}</style>

      {/* ── Delete confirmation ── */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,30,20,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <div style={{ background: '#FFF8EE', borderRadius: 20, padding: 36, maxWidth: 360, width: '100%',
            textAlign: 'center', boxShadow: '0 24px 60px rgba(42,30,20,0.2)', border: '1.5px solid #E8D5A3' }}>
            <Trash2 size={28} style={{ color: '#C47A52', marginBottom: 14 }} strokeWidth={1.5}/>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: '#3B2A22', marginBottom: 8 }}>Remove room?</h3>
            <p style={{ fontSize: 13, color: '#7A6657', marginBottom: 28 }}>
              <strong>{rooms.find(r => r.id === deleteId)?.name}</strong> and its guest allocations will be removed.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: 10, borderRadius: 10, fontSize: 13,
                border: '1.5px solid #E8D5A3', background: 'transparent', color: '#7A6657', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => deleteRoom(deleteId)} style={{ flex: 1, padding: 10, borderRadius: 10, fontSize: 13,
                fontWeight: 600, border: 'none', background: '#C47A52', color: '#fff', cursor: 'pointer' }}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Room modal ── */}
      {roomModal && (
        <RoomModal
          initial={roomModal === 'new' ? undefined : roomModal as Room}
          roomCount={rooms.length}
          onSave={saveRoom} onClose={() => setRoomModal(null)}
        />
      )}
    </div>
  )
}
