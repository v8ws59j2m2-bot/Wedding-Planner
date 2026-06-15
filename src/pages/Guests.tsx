import { useState, useMemo, useRef } from 'react'
import {
  UserPlus, Search, Download, FileJson, X,
  Trash2, Edit2, Users, Baby, Upload, ChevronDown, ChevronRight,
} from 'lucide-react'
import { SmallLeaf, Frangipani, BaliBorder } from '../components/Botanicals'
import type { Guest, AppData } from '../types'

// ── helpers ───────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2, 10) }

function displayName(g: Guest) {
  if (g.firstName || g.lastName) return `${g.firstName ?? ''} ${g.lastName ?? ''}`.trim()
  return g.name ?? ''
}

// Derive a Guest from new fields, maintaining legacy compat
function makeGuest(fields: Omit<Guest, 'id' | 'name' | 'attending' | 'adults' | 'children'>): Omit<Guest, 'id'> {
  const isChild = fields.ageCategory === 'child'
  const fullName = `${fields.firstName ?? ''} ${fields.lastName ?? ''}`.trim()
  return {
    ...fields,
    name: fullName,
    attending: 'yes',
    adults: isChild ? 0 : 1,
    children: isChild ? 1 : 0,
  }
}

function exportCSV(guests: Guest[]) {
  const header = ['First Name', 'Last Name', 'Party Name', 'Age Category', 'Email', 'Meal', 'Notes']
  const rows = guests.map(g => [
    g.firstName ?? g.name, g.lastName ?? '',
    g.partyName ?? '', g.ageCategory ?? 'adult',
    g.email ?? '', g.meal ?? '', g.notes ?? '',
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
  const csv = [header.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url
  a.download = `guests-${new Date().toISOString().split('T')[0]}.csv`
  a.click(); URL.revokeObjectURL(url)
}

function exportJSON(data: AppData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url
  a.download = `wedding-data-${new Date().toISOString().split('T')[0]}.json`
  a.click(); URL.revokeObjectURL(url)
}

// Parse CSV rows into Guest objects
function parseCSV(text: string): Omit<Guest, 'id'>[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase())
  return lines.slice(1).map(line => {
    const cols = line.match(/(".*?"|[^,]+)/g)?.map(c => c.replace(/^"|"$/g, '').trim()) ?? []
    const get = (...keys: string[]) => {
      for (const k of keys) {
        const i = headers.indexOf(k)
        if (i >= 0 && cols[i]) return cols[i]
      }
      return ''
    }
    const firstName   = get('first name', 'firstname', 'first_name') || get('name')
    const lastName    = get('last name', 'lastname', 'last_name')
    const partyName   = get('party name', 'partyname', 'party', 'family', 'group')
    const ageCat      = get('age category', 'agecategory', 'age', 'type')
    const ageCategory = ageCat.toLowerCase().includes('child') ? 'child' : 'adult'
    return makeGuest({ firstName, lastName: lastName || undefined, partyName: partyName || undefined,
      ageCategory, email: get('email') || undefined, meal: get('meal') || undefined,
      notes: get('notes') || undefined })
  }).filter(g => g.name)
}

// ── EMPTY form ────────────────────────────────────────────────────────────────
const EMPTY: Omit<Guest, 'id' | 'name' | 'attending' | 'adults' | 'children'> = {
  firstName: '', lastName: '', partyName: '', ageCategory: 'adult',
  email: '', meal: '', notes: '',
}

// ── Elegant radio button ──────────────────────────────────────────────────────
function AgeRadio({ value, selected, onChange }: {
  value: 'adult' | 'child'
  selected: boolean
  onChange: () => void
}) {
  const label  = value === 'adult' ? 'Adult (13+)' : 'Child (12 and under)'
  const Icon   = value === 'adult' ? Users : Baby
  const color  = selected ? '#C8A45D' : '#7A6657'
  return (
    <button
      type="button"
      onClick={onChange}
      style={{
        flex: 1, display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
        border: `1.5px solid ${selected ? '#C8A45D' : '#E8D5A3'}`,
        background: selected ? 'rgba(200,164,93,0.1)' : 'transparent',
        transition: 'all 0.15s',
      }}
    >
      {/* Custom radio circle */}
      <div style={{
        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
        border: `2px solid ${color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}>
        {selected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#C8A45D' }}/>}
      </div>
      <Icon size={14} style={{ color, flexShrink: 0 }} strokeWidth={1.5}/>
      <span style={{ fontSize: 13, fontWeight: selected ? 600 : 400, color: selected ? '#3B2A22' : '#7A6657' }}>
        {label}
      </span>
    </button>
  )
}

// ── Party name autocomplete ───────────────────────────────────────────────────
function PartyAutocomplete({ value, existing, onChange }: {
  value: string
  existing: string[]
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)

  const suggestions = existing
    .filter(p => p && p.toLowerCase().includes(value.toLowerCase()) && p !== value)
    .slice(0, 8)

  const showDropdown = focused && suggestions.length > 0

  return (
    <div style={{ position: 'relative' }}>
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => { setFocused(true); setOpen(true) }}
        onBlur={() => setTimeout(() => { setFocused(false); setOpen(false) }, 150)}
        placeholder="e.g. Smith Family, Johnson Side, Uni Friends"
        style={{
          width: '100%', padding: '9px 12px',
          border: `1.5px solid ${showDropdown ? '#C8A45D' : '#E8D5A3'}`,
          borderRadius: showDropdown ? '10px 10px 0 0' : 10,
          background: '#FFFDF7', color: '#3B2A22', fontSize: 13,
          fontFamily: 'Inter, sans-serif', outline: 'none',
          borderBottom: showDropdown ? '1px solid #F2E3CF' : undefined,
          transition: 'border-color 0.15s',
        }}
      />
      {showDropdown && open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: '#FFF8EE',
          border: '1.5px solid #C8A45D', borderTop: 'none',
          borderRadius: '0 0 10px 10px',
          boxShadow: '0 8px 20px rgba(42,30,20,0.1)',
          overflow: 'hidden',
        }}>
          {suggestions.map((s, i) => (
            <button
              key={s}
              onMouseDown={e => { e.preventDefault(); onChange(s); setOpen(false) }}
              style={{
                width: '100%', textAlign: 'left',
                padding: '9px 14px',
                background: 'transparent', border: 'none',
                borderBottom: i < suggestions.length - 1 ? '1px solid #F2E3CF' : 'none',
                fontSize: 13, color: '#3B2A22', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(200,164,93,0.1)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              {/* Highlight matching part */}
              {(() => {
                const idx = s.toLowerCase().indexOf(value.toLowerCase())
                if (idx === -1 || !value) return <span>{s}</span>
                return <>
                  <span>{s.slice(0, idx)}</span>
                  <span style={{ fontWeight: 700, color: '#C8A45D' }}>{s.slice(idx, idx + value.length)}</span>
                  <span>{s.slice(idx + value.length)}</span>
                </>
              })()}
            </button>
          ))}
          {/* Option to create new if typed value doesn't exactly match */}
          {value.trim() && !existing.includes(value.trim()) && (
            <div style={{ padding: '8px 14px', borderTop: suggestions.length > 0 ? '1px solid #F2E3CF' : 'none',
              fontSize: 11, color: '#7A6657', fontStyle: 'italic' }}>
              Press Enter to create "{value.trim()}" as a new party
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Guest form modal ──────────────────────────────────────────────────────────
function GuestModal({ initial, existingParties, onSave, onClose }: {
  initial?: Guest
  existingParties: string[]
  onSave: (g: Guest) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<Omit<Guest, 'id' | 'name' | 'attending' | 'adults' | 'children'>>(() =>
    initial ? {
      firstName: initial.firstName ?? initial.name.split(' ')[0] ?? '',
      lastName:  initial.lastName  ?? initial.name.split(' ').slice(1).join(' ') ?? '',
      partyName: initial.partyName ?? '',
      ageCategory: initial.ageCategory ?? (initial.children > 0 ? 'child' : 'adult'),
      email: initial.email ?? '', meal: initial.meal ?? '',
      notes: initial.notes ?? '',
    } : { ...EMPTY }
  )

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px',
    border: '1.5px solid #E8D5A3', borderRadius: 10,
    background: '#FFFDF7', color: '#3B2A22', fontSize: 13,
    fontFamily: 'Inter, sans-serif', outline: 'none',
  }
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 700,
    color: '#7A6657', letterSpacing: '0.06em', marginBottom: 5,
  }

  const canSave = (form.firstName ?? '').trim().length > 0

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(59,42,34,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: '#FFF8EE', borderRadius: 20, padding: 36,
        width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 24px 60px rgba(59,42,34,0.18)', border: '1.5px solid #E8D5A3',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, fontStyle: 'italic', color: '#3B2A22', margin: 0 }}>
              {initial ? 'Edit guest' : 'Add a guest'}
            </h2>
            <Frangipani size={22} opacity={0.5}/>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A6657' }}>
            <X size={18}/>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Name row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>FIRST NAME *</label>
              <input style={inp} value={form.firstName ?? ''} autoFocus
                onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                placeholder="e.g. Sarah"/>
            </div>
            <div>
              <label style={lbl}>LAST NAME</label>
              <input style={inp} value={form.lastName ?? ''}
                onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                placeholder="e.g. Johnson"/>
            </div>
          </div>

          {/* Party name */}
          <div>
            <label style={lbl}>PARTY / FAMILY NAME</label>
            <PartyAutocomplete
              value={form.partyName ?? ''}
              existing={existingParties}
              onChange={v => setForm(f => ({ ...f, partyName: v }))}
            />
            <p style={{ fontSize: 11, color: '#7A6657', marginTop: 4, fontStyle: 'italic' }}>
              {existingParties.length > 0
                ? `Start typing to match an existing party, or type a new name.`
                : 'Use this to group guests together for easy filtering.'}
            </p>
          </div>

          {/* Age category */}
          <div>
            <label style={{ ...lbl, marginBottom: 10 }}>AGE CATEGORY</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <AgeRadio value="adult"
                selected={form.ageCategory === 'adult'}
                onChange={() => setForm(f => ({ ...f, ageCategory: 'adult' }))}/>
              <AgeRadio value="child"
                selected={form.ageCategory === 'child'}
                onChange={() => setForm(f => ({ ...f, ageCategory: 'child' }))}/>
            </div>
          </div>

          {/* Optional fields */}
          <details style={{ cursor: 'pointer' }}>
            <summary style={{ fontSize: 12, color: '#7A6657', fontWeight: 500, listStyle: 'none', display: 'flex', alignItems: 'center', gap: 6, userSelect: 'none' }}>
              <ChevronDown size={14}/> Optional details (email, meal preference, notes)
            </summary>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
              <div>
                <label style={lbl}>EMAIL</label>
                <input style={inp} type="email" value={form.email ?? ''}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="sarah@example.com"/>
              </div>
              <div>
                <div>
                  <label style={lbl}>MEAL PREFERENCE</label>
                  <div style={{ position: 'relative' }}>
                    <select style={{ ...inp, appearance: 'none', paddingRight: 28 }}
                      value={form.meal ?? ''}
                      onChange={e => setForm(f => ({ ...f, meal: e.target.value }))}>
                      {['', 'No preference', 'Vegetarian', 'Vegan', 'Halal', 'Gluten-free', 'Pescatarian'].map(o =>
                        <option key={o} value={o}>{o || 'No preference'}</option>)}
                    </select>
                    <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#7A6657', pointerEvents: 'none' }}/>
                  </div>
                </div>
              </div>
              <div>
                <label style={lbl}>NOTES</label>
                <textarea style={{ ...inp, resize: 'vertical', minHeight: 64 }}
                  value={form.notes ?? ''}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Dietary requirements, travel notes, etc."/>
              </div>
            </div>
          </details>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: 10, borderRadius: 10, fontSize: 13,
            border: '1.5px solid #E8D5A3', background: 'transparent', color: '#7A6657', cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={() => {
            if (!canSave) return
            const guest: Guest = { id: initial?.id ?? uid(), ...makeGuest(form) }
            onSave(guest)
          }} disabled={!canSave} style={{
            flex: 2, padding: 10, borderRadius: 10, fontSize: 13, fontWeight: 600,
            border: 'none',
            background: canSave ? '#3B2A22' : '#E8D5A3',
            color: canSave ? '#FFF8EE' : '#7A6657',
            cursor: canSave ? 'pointer' : 'default',
          }}>
            {initial ? 'Save changes' : 'Add guest'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Party group row ───────────────────────────────────────────────────────────
function PartyGroup({ partyName, guests, onEdit, onDelete }: {
  partyName: string
  guests: Guest[]
  onEdit: (g: Guest) => void
  onDelete: (id: string) => void
}) {
  const [open, setOpen] = useState(true)
  const adults   = guests.filter(g => (g.ageCategory ?? (g.children > 0 ? 'child' : 'adult')) === 'adult').length
  const children = guests.filter(g => (g.ageCategory ?? (g.children > 0 ? 'child' : 'adult')) === 'child').length

  return (
    <div style={{ marginBottom: 8 }}>
      {/* Party header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px', borderRadius: open ? '12px 12px 0 0' : 12,
          background: 'rgba(200,164,93,0.1)', border: '1.5px solid #E8D5A3',
          borderBottom: open ? 'none' : undefined,
          cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
        }}
      >
        {open
          ? <ChevronDown size={14} style={{ color: '#7A6657', flexShrink: 0 }}/>
          : <ChevronRight size={14} style={{ color: '#7A6657', flexShrink: 0 }}/>}
        <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 14, fontWeight: 500, color: '#3B2A22', flex: 1 }}>
          {partyName || 'No party assigned'}
        </span>
        <span style={{ fontSize: 11, color: '#7A6657' }}>
          {guests.length} guest{guests.length !== 1 ? 's' : ''}
          {adults > 0 && ` · ${adults} adult${adults !== 1 ? 's' : ''}`}
          {children > 0 && ` · ${children} child${children !== 1 ? 'ren' : ''}`}
        </span>
      </button>

      {/* Guest rows */}
      {open && (
        <div style={{ border: '1.5px solid #E8D5A3', borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
          {guests.map((g, i) => {
            const isChild = (g.ageCategory ?? (g.children > 0 ? 'child' : 'adult')) === 'child'
            return (
              <div key={g.id}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 120px 80px',
                  alignItems: 'center', gap: 12,
                  padding: '12px 16px',
                  borderBottom: i < guests.length - 1 ? '1px solid #F2E3CF' : 'none',
                  background: '#FAF3E6',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(200,164,93,0.05)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#FAF3E6'}
              >
                {/* Name */}
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#3B2A22' }}>{displayName(g)}</p>
                  {g.email && <p style={{ fontSize: 11, color: '#7A6657', marginTop: 1 }}>{g.email}</p>}
                </div>

                {/* Party + meal */}
                <div>
                  {g.meal && g.meal !== 'No preference' && (
                    <p style={{ fontSize: 11, color: '#7A6657', fontStyle: 'italic' }}>{g.meal}</p>
                  )}
                  {g.notes && <p style={{ fontSize: 11, color: '#C8A45D', marginTop: 1, fontStyle: 'italic' }}>{g.notes}</p>}
                </div>

                {/* Age badge */}
                <div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                    background: isChild ? 'rgba(196,122,82,0.12)' : 'rgba(127,154,120,0.12)',
                    border: `1px solid ${isChild ? 'rgba(196,122,82,0.35)' : 'rgba(127,154,120,0.35)'}`,
                    color: isChild ? '#C47A52' : '#7F9A78',
                  }}>
                    {isChild ? <Baby size={10}/> : <Users size={10}/>}
                    {isChild ? 'Child' : 'Adult'}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                  <button onClick={() => onEdit(g)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A6657', padding: 5 }}>
                    <Edit2 size={13} strokeWidth={1.5}/>
                  </button>
                  <button onClick={() => onDelete(g.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C47A52', padding: 5 }}>
                    <Trash2 size={13} strokeWidth={1.5}/>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
interface Props {
  data: AppData
  setData: (d: AppData | ((prev: AppData) => AppData)) => void
}

export function Guests({ data, setData }: Props) {
  const guests = data.guests
  const [modal,     setModal]     = useState<'new' | Guest | null>(null)
  const [deleteId,  setDeleteId]  = useState<string | null>(null)
  const [search,    setSearch]    = useState('')
  const [partyFilter, setPartyFilter] = useState('All')
  const [groupByParty, setGroupByParty] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)

  const update = (g: Guest[]) => setData(d => ({ ...d, guests: g }))

  const saveGuest = (g: Guest) => {
    const exists = guests.find(x => x.id === g.id)
    update(exists ? guests.map(x => x.id === g.id ? g : x) : [...guests, g])
    setModal(null)
  }

  const deleteGuest = (id: string) => { update(guests.filter(g => g.id !== id)); setDeleteId(null) }

  // Import CSV or JSON
  const handleImport = (file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      try {
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text)
          const imported: Guest[] = (parsed.guests ?? parsed)
          update([...guests, ...imported.map((g: Guest) => ({ ...g, id: uid(), attending: 'yes' as const }))])
        } else {
          const parsed = parseCSV(text)
          update([...guests, ...parsed.map(g => ({ ...g, id: uid() }))])
        }
      } catch { alert('Could not read file.') }
    }
    reader.readAsText(file)
  }

  // Stats
  const total    = guests.length
  const adults   = guests.filter(g => (g.ageCategory ?? (g.children > 0 ? 'child' : 'adult')) === 'adult').length
  const children = guests.filter(g => (g.ageCategory ?? (g.children > 0 ? 'child' : 'adult')) === 'child').length

  // All party names
  const allParties = useMemo(() => {
    const s = new Set<string>()
    guests.forEach(g => s.add(g.partyName ?? ''))
    return ['All', ...[...s].sort((a, b) => a.localeCompare(b))]
  }, [guests])

  // Existing party names (non-empty) for autocomplete
  const existingParties = useMemo(() =>
    allParties.filter(p => p && p !== 'All').sort((a, b) => a.localeCompare(b))
  , [allParties])

  // Filtered list
  const filtered = useMemo(() => {
    let list = guests
    if (partyFilter !== 'All') list = list.filter(g => (g.partyName ?? '') === partyFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(g =>
        displayName(g).toLowerCase().includes(q) ||
        (g.partyName ?? '').toLowerCase().includes(q) ||
        (g.email ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [guests, partyFilter, search])

  // Group by party
  const grouped = useMemo(() => {
    if (!groupByParty) return null
    const map: Record<string, Guest[]> = {}
    filtered.forEach(g => {
      const key = g.partyName ?? ''
      if (!map[key]) map[key] = []
      map[key].push(g)
    })
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered, groupByParty])

  return (
    <div className="page-content" style={{maxWidth: 1000}}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 30, fontStyle: 'italic', color: '#3B2A22', margin: 0 }}>
              Guest List
            </h1>
            <SmallLeaf size={22} opacity={0.5} rotate={-15}/>
            <Frangipani size={26} opacity={0.5}/>
          </div>
          <p style={{ fontSize: 13, color: '#7A6657' }}>All guests are confirmed. Add and manage your full guest list here.</p>
        </div>
        <button onClick={() => setModal('new')} style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '10px 20px', borderRadius: 12,
          background: '#3B2A22', color: '#FFF8EE',
          border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>
          <UserPlus size={15} strokeWidth={2}/> Add guest
        </button>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 28, flexWrap: 'wrap' }}>
        {[
          { label: 'TOTAL GUESTS', value: total, color: '#3B2A22', icon: Users },
          { label: 'ADULTS (13+)', value: adults, color: '#7F9A78', icon: Users },
          { label: 'CHILDREN (12 & under)', value: children, color: '#C47A52', icon: Baby },
          { label: 'PARTIES / GROUPS', value: allParties.length - 1, color: '#C8A45D', icon: Users },
        ].map(s => (
          <div key={s.label} style={{
            background: '#FAF3E6', border: '1.5px solid #E8D5A3',
            borderRadius: 16, padding: '16px 22px', minWidth: 120, textAlign: 'center',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', bottom: -8, right: -8, opacity: 0.1, pointerEvents: 'none' }}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <rect x="4" y="4" width="40" height="40" rx="4" transform="rotate(45 24 24)" fill={s.color}/>
              </svg>
            </div>
            <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 500, color: s.color, lineHeight: 1, marginBottom: 4 }}>{s.value}</p>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#7A6657', letterSpacing: '0.08em' }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 24 }}><BaliBorder width={500} opacity={0.5}/></div>

      {/* ── Controls ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#7A6657' }}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, party, email…"
            style={{
              width: '100%', padding: '9px 12px 9px 34px',
              border: '1.5px solid #E8D5A3', borderRadius: 10,
              background: '#FAF3E6', color: '#3B2A22', fontSize: 13, outline: 'none',
              fontFamily: 'Inter, sans-serif',
            }}/>
        </div>

        {/* Group by party toggle */}
        <button onClick={() => setGroupByParty(g => !g)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
            cursor: 'pointer', transition: 'all 0.15s',
            border: `1.5px solid ${groupByParty ? '#C8A45D' : '#E8D5A3'}`,
            background: groupByParty ? '#C8A45D18' : 'transparent',
            color: groupByParty ? '#3B2A22' : '#7A6657',
          }}>
          Group by party {groupByParty ? '✓' : ''}
        </button>

        {/* Import */}
        <label style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
          cursor: 'pointer', border: '1.5px solid #E8D5A3', color: '#7A6657',
          background: 'transparent', transition: 'all 0.15s',
        }}>
          <Upload size={12}/> Import CSV/JSON
          <input ref={fileRef} type="file" accept=".csv,.json" hidden
            onChange={e => { if (e.target.files?.[0]) handleImport(e.target.files[0]); e.target.value = '' }}/>
        </label>
      </div>

      {/* Party filter pills */}
      {allParties.length > 2 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
          {allParties.map(p => (
            <button key={p} onClick={() => setPartyFilter(p)}
              style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.15s',
                border: `1.5px solid ${partyFilter === p ? '#C47A52' : '#E8D5A3'}`,
                background: partyFilter === p ? '#C47A5218' : 'transparent',
                color: partyFilter === p ? '#C47A52' : '#7A6657',
              }}>
              {p || 'No party'}
            </button>
          ))}
        </div>
      )}

      {/* ── Guest list ── */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 24px', background: '#FAF3E6', borderRadius: 16, border: '1.5px solid #E8D5A3' }}>
          <Users size={36} style={{ color: '#E8D5A3', marginBottom: 14 }} strokeWidth={1}/>
          <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: '#3B2A22', marginBottom: 8 }}>
            {search || partyFilter !== 'All' ? 'No guests match your filter' : 'No guests yet'}
          </p>
          <p style={{ fontSize: 13, color: '#7A6657' }}>
            {search || partyFilter !== 'All' ? 'Try adjusting your search or filter.' : 'Click "Add guest" to start building your list.'}
          </p>
        </div>
      ) : groupByParty && grouped ? (
        /* Grouped view */
        <div>
          {/* Column headers */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 120px 80px',
            padding: '6px 16px', marginBottom: 4,
          }}>
            {['NAME', 'DETAILS', 'AGE', ''].map((h, i) => (
              <span key={i} style={{ fontSize: 10, fontWeight: 700, color: '#7A6657', letterSpacing: '0.08em' }}>{h}</span>
            ))}
          </div>
          {grouped.map(([party, partyGuests]) => (
            <PartyGroup key={party} partyName={party} guests={partyGuests} onEdit={setModal} onDelete={setDeleteId}/>
          ))}
        </div>
      ) : (
        /* Flat view */
        <div style={{ background: '#FAF3E6', borderRadius: 16, border: '1.5px solid #E8D5A3', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 140px 120px 80px',
            padding: '8px 16px', borderBottom: '1px solid #E8D5A3',
            background: 'rgba(200,164,93,0.08)',
          }}>
            {['NAME', 'PARTY', 'AGE', 'MEAL', ''].map((h, i) => (
              <span key={i} style={{ fontSize: 10, fontWeight: 700, color: '#7A6657', letterSpacing: '0.08em' }}>{h}</span>
            ))}
          </div>
          {filtered.map((g, i) => {
            const isChild = (g.ageCategory ?? (g.children > 0 ? 'child' : 'adult')) === 'child'
            return (
              <div key={g.id}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 140px 120px 80px',
                  alignItems: 'center', padding: '12px 16px',
                  borderBottom: i < filtered.length - 1 ? '1px solid #F2E3CF' : 'none',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(200,164,93,0.04)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#3B2A22' }}>{displayName(g)}</p>
                  {g.email && <p style={{ fontSize: 11, color: '#7A6657' }}>{g.email}</p>}
                </div>
                <p style={{ fontSize: 12, color: '#7A6657' }}>{g.partyName || '—'}</p>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: isChild ? 'rgba(196,122,82,0.12)' : 'rgba(127,154,120,0.12)',
                  border: `1px solid ${isChild ? 'rgba(196,122,82,0.3)' : 'rgba(127,154,120,0.3)'}`,
                  color: isChild ? '#C47A52' : '#7F9A78',
                }}>
                  {isChild ? <Baby size={10}/> : <Users size={10}/>}
                  {isChild ? 'Child' : 'Adult'}
                </span>
                <p style={{ fontSize: 12, color: '#7A6657' }}>{g.meal && g.meal !== 'No preference' ? g.meal : '—'}</p>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                  <button onClick={() => setModal(g)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A6657', padding: 5 }}>
                    <Edit2 size={13} strokeWidth={1.5}/>
                  </button>
                  <button onClick={() => setDeleteId(g.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C47A52', padding: 5 }}>
                    <Trash2 size={13} strokeWidth={1.5}/>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Export ── */}
      <div style={{ display: 'flex', gap: 12, marginTop: 32, flexWrap: 'wrap' }}>
        <button onClick={() => exportCSV(guests)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 12,
            border: '1.5px solid #E8D5A3', background: '#FAF3E6', color: '#3B2A22', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          <Download size={14}/> Export guest list CSV
        </button>
        <button onClick={() => exportJSON(data)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 12,
            border: '1.5px solid #E8D5A3', background: '#FAF3E6', color: '#3B2A22', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          <FileJson size={14}/> Export all data JSON
        </button>
      </div>

      {/* ── Modals ── */}
      {modal && (
        <GuestModal
          initial={modal === 'new' ? undefined : modal as Guest}
          existingParties={existingParties}
          onSave={saveGuest} onClose={() => setModal(null)}
        />
      )}

      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(59,42,34,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <div style={{ background: '#FFF8EE', borderRadius: 20, padding: 36, maxWidth: 380, width: '100%',
            textAlign: 'center', boxShadow: '0 24px 60px rgba(59,42,34,0.18)', border: '1.5px solid #E8D5A3' }}>
            <Trash2 size={28} style={{ color: '#C47A52', marginBottom: 14 }} strokeWidth={1.5}/>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: '#3B2A22', marginBottom: 8 }}>
              Remove guest?
            </h3>
            <p style={{ fontSize: 13, color: '#7A6657', marginBottom: 28 }}>
              {displayName(guests.find(g => g.id === deleteId)!)} will be removed from your guest list.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: 10, borderRadius: 10, fontSize: 13,
                border: '1.5px solid #E8D5A3', background: 'transparent', color: '#7A6657', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => deleteGuest(deleteId)} style={{ flex: 1, padding: 10, borderRadius: 10, fontSize: 13,
                fontWeight: 600, border: 'none', background: '#C47A52', color: '#fff', cursor: 'pointer' }}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
