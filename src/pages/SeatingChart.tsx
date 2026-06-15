import { useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  DragDropContext, Droppable, Draggable,
  type DropResult,
} from '@hello-pangea/dnd'
import {
  Plus, Trash2, Edit2, X, FileJson, Printer,
  Users, AlertTriangle, Circle, Square, GripVertical,
} from 'lucide-react'
import { SmallLeaf, Frangipani, BaliBorder } from '../components/Botanicals'
import type { AppData, Guest } from '../types'

// ── types ─────────────────────────────────────────────────────────────────────
interface Table {
  id: string
  label: string
  shape: 'round' | 'rectangular'
  capacity: number
  guestIds: string[]
  note?: string
}

interface SeatingData {
  tables: Table[]
}

const STORAGE_KEY = 'jb-seating'

function uid() { return Math.random().toString(36).slice(2, 10) }

function exportJSON(data: AppData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url
  a.download = `wedding-data-${new Date().toISOString().split('T')[0]}.json`
  a.click(); URL.revokeObjectURL(url)
}

// ── storage ───────────────────────────────────────────────────────────────────
function useSeating(): [SeatingData, (d: SeatingData) => void] {
  const [state, setState] = useState<SeatingData>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : { tables: [] }
    } catch { return { tables: [] } }
  })
  const save = (d: SeatingData) => { setState(d); localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) }
  return [state, save]
}

// ── helpers ───────────────────────────────────────────────────────────────────
function guestDisplayName(g: Guest) {
  if (g.firstName || g.lastName) return `${g.firstName ?? ''} ${g.lastName ?? ''}`.trim()
  return g.name.split('&')[0].trim()
}

function guestPeopleCount(g: Guest) { return (g.adults ?? 1) + (g.children ?? 0) }

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
            onSave({ id: initial?.id ?? uid(), guestIds: initial?.guestIds ?? [], ...form })
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
function GuestChip({ guest, index, onRemove }: {
  guest: Guest; index: number; tableId?: string; onRemove?: () => void
}) {
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
            {onRemove && !snapshot.isDragging && (
              <button onClick={e => { e.stopPropagation(); onRemove() }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A6657', padding: 0, lineHeight: 1 }}>
                <X size={10}/>
              </button>
            )}
          </div>
        )
        return snapshot.isDragging ? createPortal(child, document.body) : child
      }}
    </Draggable>
  )
}

// ── Table card ────────────────────────────────────────────────────────────────
function TableCard({ table, guests, onEdit, onDelete }: {
  table: Table
  guests: Guest[]
  onEdit: (t: Table) => void
  onDelete: (id: string) => void
}) {
  const people  = guests.reduce((s, g) => s + guestPeopleCount(g), 0)
  const full    = people >= table.capacity
  const over    = people > table.capacity
  const pct     = Math.min((people / table.capacity) * 100, 100)

  return (
    <div style={{
      background: '#FAF3E6',
      border: `1.5px solid ${over ? 'rgba(196,122,82,0.5)' : full ? 'rgba(127,154,120,0.5)' : '#E8D5A3'}`,
      borderRadius: 16, padding: '16px 16px 12px',
      boxShadow: over ? '0 2px 12px rgba(196,122,82,0.12)' : 'none',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {table.shape === 'round'
            ? <Circle size={14} style={{ color: '#C8A45D' }} strokeWidth={1.5}/>
            : <Square  size={14} style={{ color: '#C8A45D' }} strokeWidth={1.5}/>}
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#3B2A22', lineHeight: 1 }}>{table.label}</p>
            {table.note && <p style={{ fontSize: 10, color: '#7A6657', marginTop: 2, fontStyle: 'italic' }}>{table.note}</p>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          <button onClick={() => onEdit(table)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A6657', padding: 3 }}>
            <Edit2 size={11} strokeWidth={1.5}/>
          </button>
          <button onClick={() => onDelete(table.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C47A52', padding: 3 }}>
            <Trash2 size={11} strokeWidth={1.5}/>
          </button>
        </div>
      </div>

      {/* Capacity bar */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ height: 4, borderRadius: 4, background: '#F2E3CF', overflow: 'hidden', marginBottom: 4 }}>
          <div style={{
            height: '100%', borderRadius: 4,
            width: `${pct}%`,
            background: over ? '#C47A52' : full ? '#7F9A78' : '#C8A45D',
            transition: 'width 0.3s',
          }}/>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: over ? '#C47A52' : '#7A6657', fontWeight: over ? 700 : 400 }}>
            {over ? `⚠ Over capacity (${people}/${table.capacity})` : `${people} / ${table.capacity} seats`}
          </span>
          {over && <AlertTriangle size={10} style={{ color: '#C47A52' }}/>}
        </div>
      </div>

      {/* Drop zone */}
      <Droppable droppableId={table.id} type="guest" ignoreContainerClipping>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            style={{
              minHeight: 40, flex: 1,
              background: snapshot.isDraggingOver ? 'rgba(200,164,93,0.1)' : 'transparent',
              borderRadius: 8,
              border: snapshot.isDraggingOver ? '1px dashed #C8A45D' : '1px dashed transparent',
              padding: snapshot.isDraggingOver ? 4 : 0,
              transition: 'all 0.15s',
            }}
          >
            {guests.length === 0 && !snapshot.isDraggingOver && (
              <p style={{ fontSize: 10, color: '#D4C5A4', fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>
                Drop guests here
              </p>
            )}
            {/* Placeholder text when dragging over empty table */}
            {guests.map((g, i) => (
              <GuestChip
                key={g.id} guest={g} index={i} tableId={table.id}
                onRemove={() => {}} // removal handled via drag to unassigned
              />
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

export function SeatingChart({ data }: Props) {
  const [seating, saveSeating] = useSeating()
  const [tableModal, setTableModal] = useState<'new' | Table | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  const tables = seating.tables
  const confirmedGuests = data.guests.filter(g => g.attending === 'yes')

  // Build guest lookup
  const guestById = Object.fromEntries(confirmedGuests.map(g => [g.id, g]))

  // All assigned guest IDs (flat)
  const assignedIds = new Set(tables.flatMap(t => t.guestIds))
  const unassigned  = confirmedGuests.filter(g => !assignedIds.has(g.id))

  // Stats
  const totalPeople   = confirmedGuests.reduce((s, g) => s + guestPeopleCount(g), 0)
  const seatedPeople  = tables.flatMap(t => t.guestIds).reduce((s, id) => s + guestPeopleCount(guestById[id] ?? { adults: 1, children: 0 } as Guest), 0)
  const totalCapacity = tables.reduce((s, t) => s + t.capacity, 0)
  const overCapacity  = tables.filter(t => t.guestIds.reduce((s, id) => s + guestPeopleCount(guestById[id] ?? { adults: 1, children: 0 } as Guest), 0) > t.capacity)

  const saveTable = (t: Table) => {
    const exists = tables.find(x => x.id === t.id)
    saveSeating({ tables: exists ? tables.map(x => x.id === t.id ? t : x) : [...tables, t] })
    setTableModal(null)
  }
  const deleteTable = (id: string) => {
    saveSeating({ tables: tables.filter(x => x.id !== id) })
  }

  const onDragEnd = useCallback((result: DropResult) => {
    const { source, destination, draggableId } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    // draggableId is the guest.id directly
    const guestId = draggableId
    const fromId  = source.droppableId
    const toId    = destination.droppableId

    const newTables = tables.map(t => ({ ...t, guestIds: [...t.guestIds] }))

    // Remove from source
    if (fromId !== 'unassigned') {
      const fromTable = newTables.find(t => t.id === fromId)!
      fromTable.guestIds = fromTable.guestIds.filter(id => id !== guestId)
    }

    // Add to destination
    if (toId !== 'unassigned') {
      const toTable = newTables.find(t => t.id === toId)!
      toTable.guestIds.splice(destination.index, 0, guestId)
    }

    saveSeating({ tables: newTables })
  }, [tables, saveSeating])

  const handlePrint = () => window.print()

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
          <p style={{ fontSize: 13, color: '#7A6657' }}>
            {tables.length} table{tables.length !== 1 ? 's' : ''} · {seatedPeople} of {totalPeople} guests seated
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handlePrint}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10,
              border: '1.5px solid #E8D5A3', background: '#FAF3E6', color: '#3B2A22', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <Printer size={13}/> Print
          </button>
          <button onClick={() => setTableModal('new')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10,
              background: '#3B2A22', color: '#FFF8EE', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={14} strokeWidth={2}/> Add table
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
        {[
          { label: 'TABLES',       value: String(tables.length),     sub: 'added',               color: '#3B2A22' },
          { label: 'TOTAL SEATS',  value: String(totalCapacity),     sub: 'across all tables',   color: '#C8A45D' },
          { label: 'SEATED',       value: String(seatedPeople),      sub: `of ${totalPeople} attending`, color: '#7F9A78' },
          { label: 'UNASSIGNED',   value: String(unassigned.length), sub: unassigned.length > 0 ? 'need a seat' : 'all assigned', color: unassigned.length > 0 ? '#C47A52' : '#7A6657' },
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

      {/* Over-capacity warning */}
      {overCapacity.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 10, marginBottom: 16,
          background: 'rgba(196,122,82,0.08)', border: '1px solid rgba(196,122,82,0.3)' }}>
          <AlertTriangle size={14} style={{ color: '#C47A52', flexShrink: 0 }} strokeWidth={1.8}/>
          <p style={{ fontSize: 12, color: '#C47A52' }}>
            {overCapacity.map(t => t.label).join(', ')} {overCapacity.length === 1 ? 'is' : 'are'} over capacity.
          </p>
        </div>
      )}

      <div style={{ marginBottom: 28 }}>
        <BaliBorder width={500} opacity={0.5}/>
      </div>

      {/* ── DnD Context ── */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 24, alignItems: 'start' }}>

          {/* ── Tables grid ── */}
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
                    onEdit={setTableModal} onDelete={deleteTable}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Unassigned sidebar ── */}
          <div style={{ position: 'sticky', top: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 3, height: 18, backgroundColor: '#C47A52', borderRadius: 2 }}/>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, color: '#3B2A22', margin: 0 }}>
                Unassigned
              </h2>
              {unassigned.length > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#C47A52', background: 'rgba(196,122,82,0.15)', padding: '2px 8px', borderRadius: 10 }}>
                  {unassigned.length}
                </span>
              )}
            </div>

            <Droppable droppableId="unassigned" type="guest" ignoreContainerClipping>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    background: snapshot.isDraggingOver ? 'rgba(196,122,82,0.07)' : '#FAF3E6',
                    border: `1.5px solid ${snapshot.isDraggingOver ? 'rgba(196,122,82,0.4)' : '#E8D5A3'}`,
                    borderRadius: 16, padding: 12,
                    minHeight: 80, transition: 'all 0.15s',
                  }}
                >
                  {unassigned.length === 0 && !snapshot.isDraggingOver ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                      <p style={{ fontSize: 12, color: '#7F9A78', fontWeight: 600 }}>✓ All guests seated</p>
                    </div>
                  ) : (
                    <>
                      {unassigned.length === 0 && snapshot.isDraggingOver && (
                        <p style={{ fontSize: 10, color: '#C47A52', textAlign: 'center', padding: '8px 0', fontStyle: 'italic' }}>
                          Drop here to unassign
                        </p>
                      )}
                      {unassigned.map((g, i) => (
                        <GuestChip key={g.id} guest={g} index={i} tableId="unassigned"/>
                      ))}
                    </>
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

            {/* Quick guide */}
            <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 12,
              background: 'rgba(200,164,93,0.08)', border: '1px solid rgba(200,164,93,0.25)' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#7A6657', letterSpacing: '0.06em', marginBottom: 6 }}>HOW TO USE</p>
              <ul style={{ listStyle: 'none', fontSize: 11, color: '#7A6657', lineHeight: 1.8 }}>
                <li>→ Drag guests onto tables</li>
                <li>→ Drag between tables to move</li>
                <li>→ Drag back here to unassign</li>
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

      {/* ── Modal ── */}
      {tableModal && (
        <TableModal
          initial={tableModal === 'new' ? undefined : tableModal as Table}
          onSave={saveTable} onClose={() => setTableModal(null)}
        />
      )}
    </div>
  )
}
