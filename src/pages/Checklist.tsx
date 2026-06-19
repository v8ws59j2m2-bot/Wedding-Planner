import { useState, useMemo, useEffect } from 'react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus, Check, Trash2, Edit2, X, GripVertical,
  Clock, Calendar, FileJson, ChevronDown, ChevronRight,
  Sparkles, Sun,
} from 'lucide-react'
import { SmallLeaf, Frangipani, BaliBorder } from '../components/Botanicals'
import type { ChecklistItem, AppData } from '../types'

import { uid } from '../lib/helpers'
import { loadTimeline, saveTimeline as persistTimeline } from '../lib/supabaseData'

// ── helpers ───────────────────────────────────────────────────────────────────
function monthsUntil() {
  const wedding = new Date((() => { try { const r = localStorage.getItem('jb-wedding-details'); return r ? JSON.parse(r).date : '2028-04-05' } catch { return '2028-04-05' } })() + 'T00:00:00')
  return Math.max(0, (wedding.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30.5))
}
function exportJSON(data: AppData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url
  a.download = `wedding-data-${new Date().toISOString().split('T')[0]}.json`
  a.click(); URL.revokeObjectURL(url)
}

// ── Smart suggested tasks ─────────────────────────────────────────────────────
const SUGGESTED: { phase: string; tasks: string[] }[] = [
  { phase: '12+ months', tasks: [
    'Set your overall wedding budget',
    'Choose your wedding date',
    'Research and book the venue',
    'Start your guest list',
    'Choose your wedding party',
    'Begin researching photographers',
    'Book your engagement photos',
  ]},
  { phase: '6 months', tasks: [
    'Book your photographer & videographer',
    'Choose and book catering',
    'Book hair & makeup artists',
    'Send save-the-dates',
    'Research and book entertainment / DJ',
    'Start dress / suit shopping',
    'Book florist and discuss floral vision',
    'Arrange accommodation for guests',
  ]},
  { phase: '3 months', tasks: [
    'Send formal invitations',
    'Finalise ceremony details with officiant',
    'Book airport transfers',
    'Confirm all vendor bookings',
    'Plan honeymoon and book flights',
    'Order wedding cake / desserts',
    'Plan ceremony readings and music',
    'Finalise floral arrangements',
    'Order wedding favours',
  ]},
  { phase: '1 month', tasks: [
    'Final dress / suit fitting',
    'Confirm guest RSVPs and final numbers',
    'Write vows',
    'Create wedding day timeline',
    'Confirm all vendor details',
    'Arrange wedding rings',
    'Plan seating arrangements',
    'Prepare payments for vendors',
    'Pack for the trip to Bali',
  ]},
  { phase: 'Week of', tasks: [
    'Confirm final headcount with caterer',
    'Deliver items to venue',
    'Final fittings and touch-ups',
    'Confirm all vendor arrival times',
    'Prepare emergency kit (pins, painkillers, snacks)',
    'Brief your wedding party on the day timeline',
    'Get a massage or spa treatment — relax!',
  ]},
  { phase: 'Day of', tasks: [
    'Eat a proper breakfast',
    'Get hair and makeup done',
    'Bride / groom getting ready photos',
    'First look photos (if planned)',
    'Ceremony',
    'Cocktail hour & drinks reception',
    'Wedding dinner',
    'Speeches and toasts',
    'First dance',
    'Dancing and celebrations',
    'Late-night snacks',
    'Grand exit',
  ]},
]

const PHASE_COLORS: Record<string, string> = {
  '12+ months': '#7F9A78',
  '6 months':   '#C8A45D',
  '3 months':   '#C47A52',
  '1 month':    '#B87A5A',
  'Week of':    '#8B6B4A',
  'Day of':     '#3B2A22',
}

const PHASES = ['12+ months', '6 months', '3 months', '1 month', 'Week of', 'Day of']

// ── Day-of timeline ───────────────────────────────────────────────────────────
interface TimelineEvent {
  id: string; time: string; title: string; notes?: string; duration?: string
}

const DEFAULT_TIMELINE: TimelineEvent[] = [
  { id: uid(), time: '07:00', title: 'Bride getting ready', duration: '3h', notes: 'Hair & makeup' },
  { id: uid(), time: '10:00', title: 'Groom getting ready', duration: '1h', notes: 'With groomsmen' },
  { id: uid(), time: '11:30', title: 'First look photos', duration: '30m' },
  { id: uid(), time: '14:00', title: 'Ceremony begins', duration: '45m', notes: 'Garden ceremony' },
  { id: uid(), time: '15:00', title: 'Drinks reception & canapés', duration: '1h 30m' },
  { id: uid(), time: '16:30', title: 'Group & couple photos', duration: '1h' },
  { id: uid(), time: '18:00', title: 'Wedding dinner', duration: '2h' },
  { id: uid(), time: '19:30', title: 'Speeches & toasts', duration: '30m' },
  { id: uid(), time: '20:00', title: 'First dance', duration: '10m' },
  { id: uid(), time: '20:15', title: 'Dancing & celebrations', duration: '3h' },
  { id: uid(), time: '23:00', title: 'Late night snacks & wind-down', duration: '1h' },
]

// ── sortable task row ─────────────────────────────────────────────────────────
function SortableTask({ item, onToggle, onEdit, onDelete }: {
  item: ChecklistItem
  onToggle: (id: string) => void
  onEdit: (item: ChecklistItem) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    display: 'flex', alignItems: 'flex-start', gap: 10,
    padding: '12px 16px',
    borderBottom: '1px solid #F2E3CF',
    background: isDragging ? 'rgba(200,164,93,0.06)' : 'transparent',
    cursor: 'default',
  }

  const overdue = !item.completed && item.dueDate && new Date(item.dueDate) < new Date()
  const color = PHASE_COLORS[item.category] ?? '#C8A45D'
  const prio = item.priority

  return (
    <div ref={setNodeRef} style={style}>
      {/* Drag handle */}
      <button {...attributes} {...listeners}
        style={{ background: 'none', border: 'none', cursor: 'grab', color: '#D4C5A4', padding: '2px 0', flexShrink: 0, marginTop: 1 }}>
        <GripVertical size={14} strokeWidth={1.5}/>
      </button>

      {/* Check */}
      <button onClick={() => onToggle(item.id)}
        style={{
          width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
          border: `1.5px solid ${item.completed ? color : '#D4C5A4'}`,
          background: item.completed ? color : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}>
        {item.completed && <Check size={11} color="#FFF8EE" strokeWidth={2.5}/>}
      </button>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 13, fontWeight: 500,
          color: item.completed ? '#7A6657' : '#3B2A22',
          textDecoration: item.completed ? 'line-through' : 'none',
          lineHeight: 1.4,
        }}>{item.title}</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
          {item.dueDate && (
            <span style={{ fontSize: 10, color: overdue ? '#C47A52' : '#7A6657', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Calendar size={9}/>{new Date(item.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
              {overdue && ' · overdue'}
            </span>
          )}
          {prio === 'high' && !item.completed && (
            <span style={{ fontSize: 10, color: '#C47A52', fontWeight: 600 }}>HIGH</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
        <button onClick={() => onEdit(item)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A6657', padding: 4 }}>
          <Edit2 size={12} strokeWidth={1.5}/>
        </button>
        <button onClick={() => onDelete(item.id)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C47A52', padding: 4 }}>
          <Trash2 size={12} strokeWidth={1.5}/>
        </button>
      </div>
    </div>
  )
}

// ── Phase section ─────────────────────────────────────────────────────────────
function PhaseSection({ phase, items, months, onToggle, onEdit, onDelete, onReorder, onAddSuggested }: {
  phase: string; items: ChecklistItem[]; months: number
  onToggle: (id: string) => void
  onEdit: (item: ChecklistItem) => void
  onDelete: (id: string) => void
  onReorder: (phase: string, newOrder: ChecklistItem[]) => void
  onAddSuggested: (phase: string) => void
}) {
  const [open, setOpen] = useState(true)
  const color = PHASE_COLORS[phase] ?? '#C8A45D'
  const done  = items.filter(i => i.completed).length
  const total = items.length
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIdx = items.findIndex(i => i.id === active.id)
      const newIdx = items.findIndex(i => i.id === over.id)
      onReorder(phase, arrayMove(items, oldIdx, newIdx))
    }
  }

  // Is this phase "relevant" — highlight phases due soon
  const phaseMonths: Record<string, number> = {
    '12+ months': 12, '6 months': 6, '3 months': 3, '1 month': 1, 'Week of': 0.25, 'Day of': 0,
  }
  const relevant = months <= (phaseMonths[phase] ?? 99) + 1

  return (
    <div style={{
      background: '#FAF3E6',
      border: `1.5px solid ${relevant && total > 0 && pct < 100 ? color + '55' : '#E8D5A3'}`,
      borderRadius: 16, marginBottom: 14, overflow: 'hidden',
      boxShadow: relevant && total > 0 && pct < 100 ? `0 2px 12px ${color}18` : 'none',
    }}>
      {/* Phase header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 18px', background: 'transparent', border: 'none',
          cursor: 'pointer', textAlign: 'left',
        }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(200,164,93,0.04)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
      >
        <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }}/>
        <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, fontWeight: 500, color: '#3B2A22', flex: 1 }}>
          {phase}
        </span>
        {/* Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {total > 0 && (
            <>
              <div style={{ width: 80, height: 4, borderRadius: 4, background: '#F2E3CF', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 4, width: `${pct}%`, backgroundColor: color, transition: 'width 0.4s' }}/>
              </div>
              <span style={{ fontSize: 11, color: '#7A6657', minWidth: 40 }}>{done}/{total}</span>
            </>
          )}
          {total === 0 && (
            <button
              onClick={e => { e.stopPropagation(); onAddSuggested(phase) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 11, color: color, fontWeight: 600,
                background: 'none', border: `1px solid ${color}55`,
                borderRadius: 20, padding: '3px 10px', cursor: 'pointer',
              }}
            >
              <Sparkles size={10}/> Add suggestions
            </button>
          )}
        </div>
        {open ? <ChevronDown size={14} style={{ color: '#7A6657', flexShrink: 0 }}/> :
                <ChevronRight size={14} style={{ color: '#7A6657', flexShrink: 0 }}/>}
      </button>

      {/* Task list */}
      {open && (
        <div style={{ borderTop: '1px solid #F2E3CF' }}>
          {items.length === 0 ? (
            <p style={{ padding: '12px 18px', fontSize: 12, color: '#7A6657', fontStyle: 'italic' }}>
              No tasks yet for this phase.
            </p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                {items.map(item => (
                  <SortableTask key={item.id} item={item}
                    onToggle={onToggle} onEdit={onEdit} onDelete={onDelete}/>
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}
    </div>
  )
}

// ── Task modal ────────────────────────────────────────────────────────────────
const EMPTY_TASK: Omit<ChecklistItem, 'id'> = {
  title: '', category: '3 months', dueDate: '', completed: false,
  notes: '', priority: 'medium',
}

function TaskModal({ initial, onSave, onClose }: {
  initial?: ChecklistItem; onSave: (t: ChecklistItem) => void; onClose: () => void
}) {
  const [form, setForm] = useState<Omit<ChecklistItem, 'id'>>(initial ? { ...initial } : { ...EMPTY_TASK })
  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px',
    border: '1.5px solid #E8D5A3', borderRadius: 10,
    background: '#FFFDF7', color: '#3B2A22', fontSize: 13,
    fontFamily: 'Inter, sans-serif', outline: 'none',
  }
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 700,
    color: '#7A6657', letterSpacing: '0.08em', marginBottom: 5,
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(42,30,20,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: '#FFF8EE', borderRadius: 20, padding: 36,
        width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 24px 80px rgba(42,30,20,0.22)', border: '1.5px solid #E8D5A3',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, fontStyle: 'italic', color: '#3B2A22', margin: 0 }}>
              {initial ? 'Edit task' : 'New task'}
            </h2>
            <Frangipani size={22} opacity={0.5}/>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A6657' }}>
            <X size={18}/>
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={lbl}>TASK *</label>
            <input style={inp} value={form.title} onChange={set('title')} placeholder="e.g. Book photographer"/>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>PHASE</label>
              <div style={{ position: 'relative' }}>
                <select style={{ ...inp, appearance: 'none', paddingRight: 28 }}
                  value={form.category} onChange={set('category')}>
                  {PHASES.map(p => <option key={p}>{p}</option>)}
                </select>
                <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#7A6657', pointerEvents: 'none' }}/>
              </div>
            </div>
            <div>
              <label style={lbl}>PRIORITY</label>
              <div style={{ position: 'relative' }}>
                <select style={{ ...inp, appearance: 'none', paddingRight: 28 }}
                  value={form.priority} onChange={set('priority')}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#7A6657', pointerEvents: 'none' }}/>
              </div>
            </div>
          </div>
          <div>
            <label style={lbl}>DUE DATE (optional)</label>
            <input style={inp} type="date" value={form.dueDate} onChange={set('dueDate')}/>
          </div>
          <div>
            <label style={lbl}>NOTES (optional)</label>
            <textarea style={{ ...inp, resize: 'vertical', minHeight: 64 }}
              value={form.notes} onChange={set('notes')} placeholder="Any extra details…"/>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: 10, borderRadius: 10, fontSize: 13,
            border: '1.5px solid #E8D5A3', background: 'transparent', color: '#7A6657', cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={() => {
            if (!form.title.trim()) return
            onSave({ id: initial?.id ?? uid(), ...form })
          }} disabled={!form.title.trim()} style={{
            flex: 2, padding: 10, borderRadius: 10, fontSize: 13, fontWeight: 600,
            border: 'none',
            background: form.title.trim() ? '#3B2A22' : '#E8D5A3',
            color: form.title.trim() ? '#FFF8EE' : '#7A6657',
            cursor: form.title.trim() ? 'pointer' : 'default',
          }}>{initial ? 'Save changes' : 'Add task'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Day-of timeline event ─────────────────────────────────────────────────────
function TimelineEventRow({ event, onEdit, onDelete, isLast }: {
  event: TimelineEvent; onEdit: (e: TimelineEvent) => void; onDelete: (id: string) => void; isLast: boolean
}) {
  return (
    <div style={{ display: 'flex', gap: 0, position: 'relative' }}>
      {/* Timeline spine */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 40, flexShrink: 0 }}>
        <div style={{
          width: 12, height: 12, borderRadius: '50%', marginTop: 4,
          background: '#C8A45D', border: '2px solid #FFF8EE',
          boxShadow: '0 0 0 2px #C8A45D33', flexShrink: 0,
        }}/>
        {!isLast && <div style={{ width: 1.5, flex: 1, background: 'linear-gradient(to bottom, #C8A45D55, #E8D5A355)', marginTop: 2 }}/>}
      </div>
      {/* Content */}
      <div style={{
        flex: 1, paddingBottom: isLast ? 0 : 20, paddingLeft: 8,
      }}>
        <div style={{
          background: '#FAF3E6', border: '1.5px solid #E8D5A3',
          borderRadius: 12, padding: '12px 16px',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 15, color: '#C8A45D', fontWeight: 500, minWidth: 44 }}>
                {event.time}
              </span>
              {event.duration && (
                <span style={{ fontSize: 10, color: '#7A6657', background: '#F2E3CF', padding: '2px 6px', borderRadius: 8 }}>
                  {event.duration}
                </span>
              )}
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#3B2A22' }}>{event.title}</p>
            {event.notes && <p style={{ fontSize: 12, color: '#7A6657', marginTop: 2, fontStyle: 'italic' }}>{event.notes}</p>}
          </div>
          <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
            <button onClick={() => onEdit(event)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A6657', padding: 4 }}>
              <Edit2 size={12} strokeWidth={1.5}/>
            </button>
            <button onClick={() => onDelete(event.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C47A52', padding: 4 }}>
              <Trash2 size={12} strokeWidth={1.5}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Timeline event modal ──────────────────────────────────────────────────────
function TimelineModal({ initial, onSave, onClose }: {
  initial?: TimelineEvent; onSave: (e: TimelineEvent) => void; onClose: () => void
}) {
  const [form, setForm] = useState<Omit<TimelineEvent,'id'>>(
    initial ? { time: initial.time, title: initial.title, notes: initial.notes ?? '', duration: initial.duration ?? '' }
            : { time: '', title: '', notes: '', duration: '' }
  )
  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px',
    border: '1.5px solid #E8D5A3', borderRadius: 10,
    background: '#FFFDF7', color: '#3B2A22', fontSize: 13,
    fontFamily: 'Inter, sans-serif', outline: 'none',
  }
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 700,
    color: '#7A6657', letterSpacing: '0.08em', marginBottom: 5,
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,30,20,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#FFF8EE', borderRadius: 20, padding: 32, width: '100%', maxWidth: 420,
        boxShadow: '0 24px 80px rgba(42,30,20,0.22)', border: '1.5px solid #E8D5A3' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, fontStyle: 'italic', color: '#3B2A22', margin: 0 }}>
            {initial ? 'Edit event' : 'Add timeline event'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A6657' }}>
            <X size={16}/>
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={lbl}>TIME</label>
              <input style={inp} type="time" value={form.time} onChange={set('time')}/>
            </div>
            <div>
              <label style={lbl}>DURATION</label>
              <input style={inp} value={form.duration} onChange={set('duration')} placeholder="e.g. 45m, 1h"/>
            </div>
          </div>
          <div>
            <label style={lbl}>EVENT *</label>
            <input style={inp} value={form.title} onChange={set('title')} placeholder="e.g. Ceremony"/>
          </div>
          <div>
            <label style={lbl}>NOTES (optional)</label>
            <input style={inp} value={form.notes} onChange={set('notes')} placeholder="Location, who's involved…"/>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 10, fontSize: 13,
            border: '1.5px solid #E8D5A3', background: 'transparent', color: '#7A6657', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={() => {
            if (!form.title.trim() || !form.time) return
            onSave({ id: initial?.id ?? uid(), ...form })
          }} style={{ flex: 2, padding: 10, borderRadius: 10, fontSize: 13, fontWeight: 600,
            border: 'none', background: '#3B2A22', color: '#FFF8EE', cursor: 'pointer' }}>
            {initial ? 'Save' : 'Add event'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
interface Props { data: AppData; setData: (d: AppData | ((p: AppData) => AppData)) => void }

export function Checklist({ data, setData }: Props) {
  const [taskModal, setTaskModal]       = useState<'new' | ChecklistItem | null>(null)
  const [timelineModal, setTimelineModal] = useState<'new' | TimelineEvent | null>(null)
  const [activeTab, setActiveTab]       = useState<'checklist' | 'timeline'>('checklist')

  // Timeline loaded from Supabase (no localStorage for authenticated users)
  const [timeline, setTimeline] = useState<TimelineEvent[]>(DEFAULT_TIMELINE)

  useEffect(() => {
    loadTimeline().then(tl => {
      if (tl && tl.length > 0) setTimeline(tl)
      else setTimeline(DEFAULT_TIMELINE)
    }).catch(() => setTimeline(DEFAULT_TIMELINE))
  }, [])

  const saveTimeline = (tl: TimelineEvent[]) => {
    setTimeline(tl)
    persistTimeline(tl).catch(err => console.error('Failed to save timeline to Supabase', err))
  }

  const items    = data.checklist
  const months   = monthsUntil()
  const done     = items.filter(i => i.completed).length
  const overdue  = items.filter(i => !i.completed && i.dueDate && new Date(i.dueDate) < new Date()).length

  const updateChecklist = (checklist: ChecklistItem[]) => setData(d => ({ ...d, checklist }))

  const saveTask = (t: ChecklistItem) => {
    const exists = items.find(x => x.id === t.id)
    updateChecklist(exists ? items.map(x => x.id === t.id ? t : x) : [...items, t])
    setTaskModal(null)
  }
  const toggleTask  = (id: string) => updateChecklist(items.map(i => i.id === id ? { ...i, completed: !i.completed } : i))
  const deleteTask  = (id: string) => updateChecklist(items.filter(i => i.id !== id))
  const reorderPhase = (phase: string, newOrder: ChecklistItem[]) => {
    const others = items.filter(i => i.category !== phase)
    updateChecklist([...others, ...newOrder])
  }

  const addSuggested = (phase: string) => {
    const suggestions = SUGGESTED.find(s => s.phase === phase)?.tasks ?? []
    const newItems: ChecklistItem[] = suggestions.map(title => ({
      id: uid(), title, category: phase, completed: false,
      dueDate: '', notes: '', priority: 'medium' as const,
    }))
    updateChecklist([...items, ...newItems])
  }

  const itemsByPhase = useMemo(() => {
    const map: Record<string, ChecklistItem[]> = {}
    PHASES.forEach(p => { map[p] = [] })
    items.forEach(i => { if (map[i.category]) map[i.category].push(i) })
    return map
  }, [items])

  const sortedTimeline = [...timeline].sort((a, b) => a.time.localeCompare(b.time))

  return (
    <div className="page-content" style={{maxWidth: 900}}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 30, fontStyle: 'italic', color: '#3B2A22', margin: 0 }}>
              Checklist & Timeline
            </h1>
            <SmallLeaf size={22} opacity={0.6} rotate={-15}/>
            <Frangipani size={26} opacity={0.5}/>
          </div>
          <p style={{ fontSize: 13, color: '#7A6657' }}>
            {done} of {items.length} tasks complete{overdue > 0 ? ` · ${overdue} overdue` : ''}
          </p>
        </div>
        <button
          onClick={() => activeTab === 'checklist' ? setTaskModal('new') : setTimelineModal('new')}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '10px 20px', borderRadius: 12,
            background: '#3B2A22', color: '#FFF8EE',
            border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Plus size={15} strokeWidth={2}/>
          {activeTab === 'checklist' ? 'Add task' : 'Add event'}
        </button>
      </div>

      {/* ── Overall progress ── */}
      {items.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: '#7A6657' }}>Overall progress</span>
            <span style={{ fontSize: 12, color: '#C8A45D', fontWeight: 600 }}>
              {Math.round((done / items.length) * 100)}%
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 10, background: '#F2E3CF', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 10, transition: 'width 0.6s ease',
              width: `${(done / items.length) * 100}%`,
              background: 'linear-gradient(90deg, #C8A45D, #E8C87A)',
            }}/>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: '#F2E3CF', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {(['checklist', 'timeline'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '8px 20px', borderRadius: 9, fontSize: 13, fontWeight: 500,
            border: 'none', cursor: 'pointer', transition: 'all 0.15s',
            background: activeTab === tab ? '#FFF8EE' : 'transparent',
            color: activeTab === tab ? '#3B2A22' : '#7A6657',
            boxShadow: activeTab === tab ? '0 1px 4px rgba(59,42,34,0.1)' : 'none',
          }}>
            {tab === 'checklist' ? '✓ Checklist' : '🕐 Day-of Timeline'}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 24 }}>
        <BaliBorder width={500} opacity={0.5}/>
      </div>

      {/* ── Checklist tab ── */}
      {activeTab === 'checklist' && (
        <div>
          {/* Smart suggestion banner */}
          {items.length === 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 20px', borderRadius: 14, marginBottom: 24,
              background: 'rgba(200,164,93,0.1)', border: '1.5px solid rgba(200,164,93,0.4)',
            }}>
              <Sparkles size={18} style={{ color: '#C8A45D', flexShrink: 0 }} strokeWidth={1.5}/>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#3B2A22', marginBottom: 2 }}>
                  {Math.round(months)} months until your wedding
                </p>
                <p style={{ fontSize: 12, color: '#7A6657' }}>
                  Click "Add suggestions" on any phase below to auto-populate smart tasks for that stage.
                </p>
              </div>
            </div>
          )}

          {PHASES.map(phase => (
            <PhaseSection
              key={phase} phase={phase}
              items={itemsByPhase[phase] ?? []}
              months={months}
              onToggle={toggleTask} onEdit={setTaskModal}
              onDelete={deleteTask} onReorder={reorderPhase}
              onAddSuggested={addSuggested}
            />
          ))}
        </div>
      )}

      {/* ── Timeline tab ── */}
      {activeTab === 'timeline' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <Sun size={16} style={{ color: '#C8A45D' }} strokeWidth={1.5}/>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, color: '#3B2A22', margin: 0 }}>
              Wedding Day · 5th April 2028
            </h2>
          </div>

          <div style={{ paddingLeft: 4 }}>
            {sortedTimeline.map((event, i) => (
              <TimelineEventRow key={event.id} event={event}
                isLast={i === sortedTimeline.length - 1}
                onEdit={setTimelineModal} onDelete={id => saveTimeline(timeline.filter(e => e.id !== id))}
              />
            ))}
          </div>

          {sortedTimeline.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 24px', background: '#FAF3E6', borderRadius: 16, border: '1.5px solid #E8D5A3' }}>
              <Clock size={32} style={{ color: '#E8D5A3', marginBottom: 12 }} strokeWidth={1}/>
              <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, color: '#3B2A22', marginBottom: 6 }}>
                No timeline events yet
              </p>
              <p style={{ fontSize: 13, color: '#7A6657' }}>Add events to build your wedding day schedule.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Export ── */}
      <div style={{ marginTop: 40 }}>
        <button onClick={() => exportJSON(data)} style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '10px 20px', borderRadius: 12,
          border: '1.5px solid #E8D5A3', background: '#FAF3E6',
          color: '#3B2A22', fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}>
          <FileJson size={14} strokeWidth={2}/> Export all data JSON
        </button>
      </div>

      {/* ── Modals ── */}
      {taskModal && (
        <TaskModal
          initial={taskModal === 'new' ? undefined : taskModal as ChecklistItem}
          onSave={saveTask} onClose={() => setTaskModal(null)}
        />
      )}
      {timelineModal && (
        <TimelineModal
          initial={timelineModal === 'new' ? undefined : timelineModal as TimelineEvent}
          onSave={e => { saveTimeline(timeline.find(t => t.id === e.id) ? timeline.map(t => t.id === e.id ? e : t) : [...timeline, e]); setTimelineModal(null) }}
          onClose={() => setTimelineModal(null)}
        />
      )}
    </div>
  )
}
