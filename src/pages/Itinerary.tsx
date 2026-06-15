import { useState, useMemo } from 'react'
import { Printer, FileText, Eye, EyeOff, CalendarDays, Clock, MapPin, ChevronDown } from 'lucide-react'
import { SmallLeaf, Frangipani, BaliBorder } from '../components/Botanicals'
import type { AppData, Event, WeddingDetails } from '../types'
import { loadWeddingDetails } from '../services/dataService'

// ── helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}
function fmtDateShort(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}
function fmtTime(t?: string) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')}${ampm}`
}

interface Props { data: AppData }

export function Itinerary({ data }: Props) {
  const details: WeddingDetails = loadWeddingDetails()
  const allEvents = useMemo(() => (data.events ?? []).filter(e => e.includeInItinerary)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? '')), [data.events])

  // User can toggle individual events out of the print
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [extraNotes, setExtraNotes] = useState('')
  const [previewMode, setPreviewMode] = useState(false)

  const toggle = (id: string) => {
    const next = new Set(excluded)
    next.has(id) ? next.delete(id) : next.add(id)
    setExcluded(next)
  }

  const printEvents = allEvents.filter(e => !excluded.has(e.id))

  const byDate = useMemo(() => {
    const map: Record<string, Event[]> = {}
    printEvents.forEach(e => { if (!map[e.date]) map[e.date] = []; map[e.date].push(e) })
    return map
  }, [printEvents])

  const dates = Object.keys(byDate).sort()

  const handlePrint = () => window.print()

  return (
    <div className="page-content" style={{ maxWidth: 900 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 30, fontStyle: 'italic', color: '#3B2A22', margin: 0 }}>
              Guest Itinerary
            </h1>
            <SmallLeaf size={22} opacity={0.6} rotate={-15}/>
            <Frangipani size={26} opacity={0.5}/>
          </div>
          <p style={{ fontSize: 13, color: '#7A6657' }}>
            {printEvents.length} of {allEvents.length} event{allEvents.length !== 1 ? 's' : ''} selected for print · Build and export the guest welcome book
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setPreviewMode(p => !p)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10,
              border: '1.5px solid #E8D5A3', background: '#FAF3E6', color: '#3B2A22', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {previewMode ? <EyeOff size={13}/> : <Eye size={13}/>}
            {previewMode ? 'Edit view' : 'Preview'}
          </button>
          <button onClick={handlePrint}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 12,
              background: '#3B2A22', color: '#FFF8EE', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Printer size={14}/> Print / Save PDF
          </button>
        </div>
      </div>

      {allEvents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', background: '#FAF3E6', borderRadius: 16, border: '1.5px solid #E8D5A3' }}>
          <FileText size={36} style={{ color: '#E8D5A3', marginBottom: 14 }} strokeWidth={1}/>
          <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: '#3B2A22', marginBottom: 8 }}>
            No events to show
          </p>
          <p style={{ fontSize: 13, color: '#7A6657' }}>
            Add events on the Events & Activities page and mark them "Include in itinerary" to see them here.
          </p>
        </div>
      ) : previewMode ? (
        /* ── Preview pane ── */
        <div>
          <div style={{ marginBottom: 28 }}><BaliBorder width={500} opacity={0.5}/></div>
          <PrintLayout events={printEvents} details={details} extraNotes={extraNotes}/>
        </div>
      ) : (
        /* ── Editor view ── */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 28, alignItems: 'start' }}>

          {/* Left — event selector */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 3, height: 18, backgroundColor: '#C47A52', borderRadius: 2 }}/>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, color: '#3B2A22', margin: 0 }}>
                Select events to include
              </h2>
            </div>
            <p style={{ fontSize: 12, color: '#7A6657', marginBottom: 16 }}>
              Toggle events on/off below. Only selected events will appear in the printed itinerary.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              {Object.keys({ ...Object.fromEntries(allEvents.map(e => [e.date, true])) })
                .sort()
                .map(date => (
                  <div key={date}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ background: '#3B2A22', color: '#FFF8EE', borderRadius: 8,
                        padding: '4px 12px', fontSize: 11, fontWeight: 700 }}>
                        {fmtDateShort(date)}
                      </div>
                      <div style={{ flex: 1, height: 1, background: '#E8D5A3' }}/>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {allEvents.filter(e => e.date === date).map(evt => {
                        const isIn = !excluded.has(evt.id)
                        return (
                          <div key={evt.id}
                            onClick={() => toggle(evt.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                              borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                              border: `1.5px solid ${isIn ? (evt.type === 'wedding' ? 'rgba(127,154,120,0.4)' : 'rgba(200,164,93,0.4)') : '#E8D5A3'}`,
                              background: isIn ? (evt.type === 'wedding' ? 'rgba(127,154,120,0.06)' : 'rgba(200,164,93,0.06)') : 'rgba(255,255,255,0.3)',
                              opacity: isIn ? 1 : 0.5,
                            }}>
                            <div style={{
                              width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                              border: `1.5px solid ${isIn ? (evt.type === 'wedding' ? '#7F9A78' : '#C8A45D') : '#E8D5A3'}`,
                              background: isIn ? (evt.type === 'wedding' ? '#7F9A78' : '#C8A45D') : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {isIn && <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                              </svg>}
                            </div>
                            <span style={{ fontSize: 12 }}>{evt.type === 'wedding' ? '💍' : '🌴'}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 600, color: '#3B2A22' }}>{evt.title}</p>
                              <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
                                {evt.time && <span style={{ fontSize: 11, color: '#7A6657' }}>{fmtTime(evt.time)}</span>}
                                {evt.location && <span style={{ fontSize: 11, color: '#7A6657' }}>{evt.location}</span>}
                              </div>
                            </div>
                            {isIn
                              ? <Eye size={13} style={{ color: '#7A6657', flexShrink: 0 }}/>
                              : <EyeOff size={13} style={{ color: '#C4B49A', flexShrink: 0 }}/>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Right — options */}
          <div style={{ position: 'sticky', top: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 3, height: 18, backgroundColor: '#C47A52', borderRadius: 2 }}/>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, color: '#3B2A22', margin: 0 }}>Welcome note</h2>
            </div>
            <div style={{ background: '#FAF3E6', border: '1.5px solid #E8D5A3', borderRadius: 14, padding: '16px' }}>
              <p style={{ fontSize: 11, color: '#7A6657', marginBottom: 8 }}>
                This text will appear at the top of the printed itinerary.
              </p>
              <textarea
                value={extraNotes}
                onChange={e => setExtraNotes(e.target.value)}
                placeholder={`Welcome to Bali — we're so thrilled to celebrate with you!\n\nBelow is your guide to the week's events and activities. Please reach out if you have any questions.`}
                style={{ width: '100%', minHeight: 140, padding: '10px 12px', border: '1.5px solid #E8D5A3',
                  borderRadius: 10, background: '#FFFDF7', color: '#3B2A22', fontSize: 12, lineHeight: 1.6,
                  fontFamily: 'Inter, sans-serif', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
              />
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 12px', borderRadius: 10, background: 'rgba(200,164,93,0.08)', border: '1px solid rgba(200,164,93,0.3)' }}>
                <Printer size={13} style={{ color: '#C8A45D', flexShrink: 0 }}/>
                <p style={{ fontSize: 11, color: '#8B6914' }}>
                  Click <strong>Print / Save PDF</strong> to generate the guest itinerary. Use your browser's print dialog to save as PDF.
                </p>
              </div>
            </div>

            {/* Stats */}
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Wedding events included', value: printEvents.filter(e => e.type === 'wedding').length },
                { label: 'Activities included',     value: printEvents.filter(e => e.type === 'activity').length },
                { label: 'Days covered',            value: dates.length },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 14px', background: '#FAF3E6', borderRadius: 10, border: '1.5px solid #E8D5A3' }}>
                  <span style={{ fontSize: 12, color: '#7A6657' }}>{s.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#3B2A22' }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Hidden print document ── */}
      <div id="itinerary-print" style={{ display: 'none' }}>
        <PrintLayout events={printEvents} details={details} extraNotes={extraNotes}/>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #itinerary-print, #itinerary-print * { visibility: visible; display: block !important; }
          #itinerary-print { position: absolute; left: 0; top: 0; width: 100%; padding: 32px; font-family: Georgia, serif; }
          button { display: none !important; }
        }
      `}</style>
    </div>
  )
}

// ── Print layout ──────────────────────────────────────────────────────────────
function PrintLayout({ events, details, extraNotes }: {
  events: Event[]; details: WeddingDetails; extraNotes: string
}) {
  // Single chronological sort — by date then time
  const sorted = useMemo(() =>
    [...events].sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))
  , [events])

  const byDate = useMemo(() => {
    const map: Record<string, Event[]> = {}
    sorted.forEach(e => { if (!map[e.date]) map[e.date] = []; map[e.date].push(e) })
    return map
  }, [sorted])
  const dates = Object.keys(byDate).sort()

  const weddingDate    = new Date(details.date + 'T00:00:00')
  const weddingDateFmt = weddingDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div style={{ fontFamily: 'Georgia, "Playfair Display", serif', color: '#2A1A0E', maxWidth: 700, margin: '0 auto' }}>
      {/* Cover header */}
      <div style={{ textAlign: 'center', marginBottom: 40, paddingBottom: 32, borderBottom: '2px solid #C8A45D' }}>
        <p style={{ fontSize: 11, letterSpacing: '0.25em', color: '#C8A45D', marginBottom: 8 }}>
          YOU ARE INVITED TO CELEBRATE
        </p>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 36, fontWeight: 400, margin: '0 0 8px',
          fontStyle: 'italic', color: '#2A1A0E', lineHeight: 1.1 }}>
          {(details.partner1 || 'Partner 1')} & {(details.partner2 || 'Partner 2')}
        </h1>
        <p style={{ fontSize: 14, color: '#6B4B30', marginBottom: 4 }}>{weddingDateFmt}</p>
        <p style={{ fontSize: 13, color: '#8B6640' }}>
          {[details.venue, details.location].filter(Boolean).join(' · ') || 'Venue details to be confirmed'}
        </p>
        {extraNotes && (
          <div style={{ marginTop: 24, padding: '16px 24px', border: '1px solid #E8D5A3', borderRadius: 8,
            background: '#FFFDF7', textAlign: 'left' }}>
            <p style={{ fontSize: 13, color: '#3B2A22', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{extraNotes}</p>
          </div>
        )}
      </div>

      {/* Single chronological schedule */}
      <div style={{ marginBottom: 36 }}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 400, fontStyle: 'italic',
          color: '#2A1A0E', borderBottom: '1px solid #C8A45D', paddingBottom: 8, marginBottom: 20 }}>
          Your Schedule
        </h2>
        {dates.map(date => {
          const dayEvents = byDate[date]
          return (
            <div key={date} style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#8B6640', letterSpacing: '0.1em',
                textTransform: 'uppercase', marginBottom: 12 }}>
                {fmtDate(date)}
              </p>
              {dayEvents.map(evt => <PrintEventBlock key={evt.id} event={evt}/>)}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', paddingTop: 24, borderTop: '1px solid #E8D5A3', marginTop: 32 }}>
        <p style={{ fontSize: 11, color: '#8B6640', letterSpacing: '0.15em' }}>
          {(details.partner1 || 'Partner 1').toUpperCase()} & {(details.partner2 || 'Partner 2').toUpperCase()} · {(details.location || 'Bali').toUpperCase()} · {new Date(details.date).getFullYear()}
        </p>
      </div>
    </div>
  )
}

function PrintEventBlock({ event }: { event: Event }) {
  const timeStr = event.time
    ? `${fmtTime(event.time)}${event.endTime ? ` – ${fmtTime(event.endTime)}` : ''}`
    : ''

  return (
    <div style={{ padding: '12px 0 12px 16px', borderLeft: '3px solid #C8A45D', marginBottom: 12 }}>
      <p style={{ fontSize: 15, fontWeight: 700, color: '#2A1A0E', marginBottom: 4 }}>{event.title}</p>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: event.description || event.dressCode || event.transport ? 6 : 0 }}>
        {timeStr && <span style={{ fontSize: 12, color: '#6B4B30' }}>🕐 {timeStr}</span>}
        {event.location && <span style={{ fontSize: 12, color: '#6B4B30' }}>📍 {event.location}</span>}
        {event.type === 'activity' && !event.isFree && event.costPerPerson && (
          <span style={{ fontSize: 12, color: '#6B4B30' }}>
            💳 £{event.costPerPerson}/person{event.paymentMethod === 'self' ? ' (pay vendor directly)' : ' (pay to couple)'}
          </span>
        )}
        {event.type === 'activity' && event.isFree && (
          <span style={{ fontSize: 12, color: '#6B4B30' }}>🎁 Free</span>
        )}
      </div>
      {event.dressCode && <p style={{ fontSize: 12, color: '#6B4B30', marginBottom: 3 }}>👗 Dress code: {event.dressCode}</p>}
      {event.transport && <p style={{ fontSize: 12, color: '#6B4B30', marginBottom: 3 }}>🚌 Transport: {event.transport}</p>}
      {event.description && (
        <p style={{ fontSize: 12, color: '#4A3420', fontStyle: 'italic', lineHeight: 1.6, marginTop: 4 }}>
          {event.description}
        </p>
      )}
    </div>
  )
}
