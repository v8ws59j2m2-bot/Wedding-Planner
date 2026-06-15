import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  DragDropContext, Droppable, Draggable, type DropResult,
} from '@hello-pangea/dnd'
import {
  Plus, Edit2, Trash2, X, Search, FileJson, Printer,
  Users, AlertTriangle, GripVertical, BedDouble,
  Home, Building2, ChevronDown,
} from 'lucide-react'
import { SmallLeaf, Frangipani, BaliBorder } from '../components/Botanicals'
import type { AppData, Guest } from '../types'

// ── types ─────────────────────────────────────────────────────────────────────
interface Room {
  id: string
  name: string
  capacity: number
  type: 'Villa' | 'Suite' | 'Family Room' | 'Standard Room' | 'Other'
  notes?: string
  guestIds: string[]
}

interface AccomData { rooms: Room[] }

const STORAGE_KEY = 'jb-accommodation'

function uid() { return Math.random().toString(36).slice(2, 10) }

function exportJSON(data: AppData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url
  a.download = `wedding-data-${new Date().toISOString().split('T')[0]}.json`
  a.click(); URL.revokeObjectURL(url)
}

// ── storage ───────────────────────────────────────────────────────────────────
function useAccom(): [AccomData, (d: AccomData) => void] {
  const [state, setState] = useState<AccomData>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : { rooms: [] }
    } catch { return { rooms: [] } }
  })
  const save = (d: AccomData) => { setState(d); localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) }
  return [state, save]
}

// ── helpers ───────────────────────────────────────────────────────────────────
function guestName(g: Guest) {
  if (g.firstName || g.lastName) return `${g.firstName ?? ''} ${g.lastName ?? ''}`.trim()
  return g.name
}
function guestCount(g: Guest) {
  // New model: use ageCategory; legacy: use adults/children counts
  if (g.ageCategory !== undefined) return 1
  return (g.adults ?? 1) + (g.children ?? 0)
}

const ROOM_TYPE_ICONS: Record<string, React.ElementType> = {
  'Villa':        Home,
  'Suite':        Building2,
  'Family Room':  Users,
  'Standard Room':BedDouble,
  'Other':        BedDouble,
}

const ROOM_TYPES = ['Villa', 'Suite', 'Family Room', 'Standard Room', 'Other'] as const

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
            onSave({ id: initial?.id ?? uid(), guestIds: initial?.guestIds ?? [], ...form })
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
        // Portal the clone to body to avoid transform offset from AnimatedBackground
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
function RoomCard({ room, guests, onEdit, onDelete }: {
  room: Room; guests: Guest[]
  onEdit: (r: Room) => void; onDelete: (id: string) => void
}) {
  const occupied = guests.reduce((s, g) => s + guestCount(g), 0)
  const pct      = room.capacity > 0 ? Math.min((occupied / room.capacity) * 100, 100) : 0
  const full     = occupied >= room.capacity
  const over     = occupied > room.capacity
  const TypeIcon = ROOM_TYPE_ICONS[room.type] ?? BedDouble
  const barColor = over ? '#C47A52' : full ? '#7F9A78' : '#C8A45D'

  return (
    <div style={{
      background: '#FAF3E6',
      border: `1.5px solid ${over ? 'rgba(196,122,82,0.5)' : full ? 'rgba(127,154,120,0.4)' : '#E8D5A3'}`,
      borderRadius: 16, padding: '18px 16px 14px',
      display: 'flex', flexDirection: 'column',
      boxShadow: over ? '0 2px 12px rgba(196,122,82,0.1)' : '0 1px 6px rgba(42,30,20,0.04)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
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
          <span style={{ fontSize: 10, color: over ? '#C47A52' : '#7A6657', fontWeight: over ? 700 : 400 }}>
            {over && <AlertTriangle size={9} style={{ verticalAlign: 'middle', marginRight: 3 }}/>}
            {occupied} / {room.capacity} guests
          </span>
          {over && <span style={{ fontSize: 9, color: '#C47A52', fontWeight: 700 }}>OVER</span>}
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

  const rooms    = accom.rooms
  const guestById = Object.fromEntries(data.guests.map(g => [g.id, g]))
  const confirmed = data.guests.filter(g => g.attending === 'yes')

  const assignedIds  = new Set(rooms.flatMap(r => r.guestIds))
  const unallocated  = confirmed.filter(g => !assignedIds.has(g.id))

  const filteredUnalloc = useMemo(() => {
    if (!search.trim()) return unallocated
    const q = search.toLowerCase()
    return unallocated.filter(g => guestName(g).toLowerCase().includes(q))
  }, [unallocated, search])

  // Stats
  const totalCapacity    = rooms.reduce((s, r) => s + r.capacity, 0)
  const totalAllocated   = confirmed.filter(g => assignedIds.has(g.id)).reduce((s, g) => s + guestCount(g), 0)
  const totalConfirmed   = confirmed.reduce((s, g) => s + guestCount(g), 0)
  const totalUnallocated = unallocated.reduce((s, g) => s + guestCount(g), 0)
  const overRooms        = rooms.filter(r => r.guestIds.reduce((s, id) => s + guestCount(guestById[id] ?? { adults:1,children:0 } as Guest), 0) > r.capacity)

  const saveRoom = (r: Room) => {
    const exists = rooms.find(x => x.id === r.id)
    saveAccom({ rooms: exists ? rooms.map(x => x.id === r.id ? r : x) : [...rooms, r] })
    setRoomModal(null)
  }
  const deleteRoom = (id: string) => { saveAccom({ rooms: rooms.filter(r => r.id !== id) }); setDeleteId(null) }

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    const guestId = draggableId
    const fromId  = source.droppableId
    const toId    = destination.droppableId

    // Work from current accom state directly
    const current  = accom.rooms
    const newRooms = current.map(r => ({ ...r, guestIds: [...r.guestIds] }))

    // Remove from source room (if not coming from unallocated)
    if (fromId !== 'unallocated') {
      const from = newRooms.find(r => r.id === fromId)
      if (from) from.guestIds = from.guestIds.filter(id => id !== guestId)
    }

    // Add to destination room (if not going back to unallocated)
    if (toId !== 'unallocated') {
      const to = newRooms.find(r => r.id === toId)
      if (to) {
        // Remove first in case it was already there (defensive)
        to.guestIds = to.guestIds.filter(id => id !== guestId)
        to.guestIds.splice(destination.index, 0, guestId)
      }
    }

    saveAccom({ rooms: newRooms })
  }

  // Print rooming list
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
            {rooms.length} room{rooms.length !== 1 ? 's' : ''} · {totalAllocated} of {totalConfirmed} guests allocated
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
          { label: 'ROOMS',         value: rooms.length,        sub: 'added',                   color: '#3B2A22' },
          { label: 'TOTAL CAPACITY',value: totalCapacity,       sub: 'available beds',           color: '#C8A45D' },
          { label: 'ALLOCATED',     value: totalAllocated,      sub: `of ${totalConfirmed} confirmed`, color: '#7F9A78' },
          { label: 'UNALLOCATED',   value: totalUnallocated,    sub: totalUnallocated > 0 ? 'need a room' : 'all assigned', color: totalUnallocated > 0 ? '#C47A52' : '#7A6657' },
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

      {/* Over-capacity warning */}
      {overRooms.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 10, marginBottom: 16,
          background: 'rgba(196,122,82,0.08)', border: '1px solid rgba(196,122,82,0.3)' }}>
          <AlertTriangle size={14} style={{ color: '#C47A52', flexShrink: 0 }} strokeWidth={1.8}/>
          <p style={{ fontSize: 12, color: '#C47A52' }}>
            {overRooms.map(r => r.name).join(', ')} {overRooms.length === 1 ? 'is' : 'are'} over capacity.
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 16 }}>
                {rooms.map(room => (
                  <RoomCard key={room.id} room={room}
                    guests={room.guestIds.map(id => guestById[id]).filter(Boolean) as Guest[]}
                    onEdit={setRoomModal} onDelete={setDeleteId}
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

            {/* Search */}
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

            {/* Guide */}
            <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 12,
              background: 'rgba(200,164,93,0.08)', border: '1px solid rgba(200,164,93,0.25)' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#7A6657', letterSpacing: '0.06em', marginBottom: 6 }}>HOW TO USE</p>
              <ul style={{ listStyle: 'none', fontSize: 11, color: '#7A6657', lineHeight: 1.9 }}>
                <li>→ Drag guests onto rooms</li>
                <li>→ Move between rooms freely</li>
                <li>→ Drag back here to unallocate</li>
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
