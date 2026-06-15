import { useState, useRef } from 'react'
import {
  Download, Upload, Trash2, Save, AlertTriangle,
  CheckCircle, RefreshCw, Heart, Shield, FileSpreadsheet,
} from 'lucide-react'
import {
  downloadGuestsTemplate, downloadVendorsTemplate, downloadBudgetTemplate,
  downloadAccommodationTemplate, downloadEventsTemplate, downloadChecklistTemplate,
} from '../lib/csvTemplates'
import { SmallLeaf, Frangipani, BaliBorder, TempleGate } from '../components/Botanicals'
import { useCurrencyContext } from '../context/CurrencyContext'
import { CURRENCY_LABELS } from '../hooks/useCurrency'
import type { AppData } from '../types'

// ── helpers ───────────────────────────────────────────────────────────────────
function exportJSON(data: AppData, weddingDetails: WeddingDetails) {
  const bundle = { weddingDetails, ...data, exportedAt: new Date().toISOString() }
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url
  a.download = `jamie-beth-wedding-backup-${new Date().toISOString().split('T')[0]}.json`
  a.click(); URL.revokeObjectURL(url)
}

// ── types ─────────────────────────────────────────────────────────────────────
export interface WeddingDetails {
  partner1: string
  partner2: string
  date: string
  venue: string
  time: string
  location: string
  theme: string
}

const DETAILS_KEY = 'jb-wedding-details'
const DEFAULT_DETAILS: WeddingDetails = {
  partner1: 'Jamie',
  partner2: 'Beth',
  date: '2028-04-05',
  venue: 'Private Villa Estate',
  time: '14:00',
  location: 'Canggu, Bali, Indonesia',
  theme: 'Romantic Balinese Minimalist',
}

export function useWeddingDetails(): [WeddingDetails, (d: WeddingDetails) => void] {
  const [details, setDetails] = useState<WeddingDetails>(() => {
    try {
      const raw = localStorage.getItem(DETAILS_KEY)
      return raw ? { ...DEFAULT_DETAILS, ...JSON.parse(raw) } : DEFAULT_DETAILS
    } catch { return DEFAULT_DETAILS }
  })
  const save = (d: WeddingDetails) => { setDetails(d); localStorage.setItem(DETAILS_KEY, JSON.stringify(d)) }
  return [details, save]
}

// ── sub-components ────────────────────────────────────────────────────────────

function ActionCard({ icon: Icon, title, description, buttonLabel, buttonColor = '#3B2A22', onClick, danger = false }: {
  icon: React.ElementType
  title: string
  description: string
  buttonLabel: string
  buttonColor?: string
  onClick: () => void
  danger?: boolean
}) {
  const [hover, setHover] = useState(false)
  return (
    <div style={{
      background: '#FAF3E6',
      border: `1.5px solid ${danger ? 'rgba(196,122,82,0.35)' : '#E8D5A3'}`,
      borderRadius: 20,
      padding: 28,
      display: 'flex', flexDirection: 'column', gap: 16,
      position: 'relative', overflow: 'hidden',
      transition: 'box-shadow 0.2s',
      boxShadow: hover ? '0 8px 32px rgba(42,30,20,0.1)' : '0 2px 8px rgba(42,30,20,0.04)',
    }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Background decoration */}
      <div style={{ position: 'absolute', bottom: -16, right: -16, opacity: 0.07, pointerEvents: 'none' }}>
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
          <rect x="8" y="8" width="64" height="64" rx="8" transform="rotate(45 40 40)" fill={danger ? '#C47A52' : '#C8A45D'}/>
        </svg>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: danger ? 'rgba(196,122,82,0.12)' : 'rgba(200,164,93,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={20} style={{ color: danger ? '#C47A52' : '#C8A45D' }} strokeWidth={1.5}/>
        </div>
        <div>
          <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 17, fontWeight: 500, color: '#3B2A22', marginBottom: 6 }}>
            {title}
          </h3>
          <p style={{ fontSize: 13, color: '#7A6657', lineHeight: 1.6 }}>{description}</p>
        </div>
      </div>

      <button
        onClick={onClick}
        style={{
          padding: '11px 24px', borderRadius: 12,
          background: buttonColor, color: '#FFF8EE',
          border: 'none', fontSize: 13, fontWeight: 600,
          cursor: 'pointer', alignSelf: 'flex-start',
          transition: 'opacity 0.15s',
          letterSpacing: '0.02em',
        }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.85'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
      >
        {buttonLabel}
      </button>
    </div>
  )
}

// ── Import modal ──────────────────────────────────────────────────────────────
function ImportModal({ file, onMerge, onReplace, onClose }: {
  file: File
  onMerge: (parsed: AppData) => void
  onReplace: (parsed: AppData) => void
  onClose: () => void
}) {
  const [parsed, setParsed] = useState<AppData | null>(null)
  const [error,  setError]  = useState('')
  const [loaded, setLoaded] = useState(false)

  useState(() => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target?.result as string)
        setParsed(data)
        setLoaded(true)
      } catch {
        setError('This file could not be read. Please check it is a valid JSON backup.')
        setLoaded(true)
      }
    }
    reader.readAsText(file)
  })

  const guests  = parsed?.guests?.length  ?? 0
  const budget  = parsed?.budget?.length  ?? 0
  const tasks   = parsed?.checklist?.length ?? 0
  const vendors = parsed?.vendors?.length ?? 0

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,30,20,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#FFF8EE', borderRadius: 24, padding: 40, width: '100%', maxWidth: 480,
        boxShadow: '0 32px 80px rgba(42,30,20,0.25)', border: '1.5px solid #E8D5A3' }}>

        {!loaded ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <RefreshCw size={28} style={{ color: '#C8A45D', animation: 'spinSlow 1s linear infinite' }}/>
            <p style={{ fontSize: 13, color: '#7A6657', marginTop: 12 }}>Reading file…</p>
          </div>
        ) : error ? (
          <>
            <AlertTriangle size={28} style={{ color: '#C47A52', display: 'block', margin: '0 auto 14px' }}/>
            <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: '#3B2A22', textAlign: 'center', marginBottom: 8 }}>
              File error
            </p>
            <p style={{ fontSize: 13, color: '#7A6657', textAlign: 'center', marginBottom: 24 }}>{error}</p>
            <button onClick={onClose} style={{ width: '100%', padding: 10, borderRadius: 10, fontSize: 13,
              border: '1.5px solid #E8D5A3', background: 'transparent', color: '#7A6657', cursor: 'pointer' }}>
              Close
            </button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
              <Frangipani size={32} opacity={0.6}/>
            </div>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, fontStyle: 'italic', color: '#3B2A22', textAlign: 'center', marginBottom: 8 }}>
              Import backup
            </h2>
            <p style={{ fontSize: 13, color: '#7A6657', textAlign: 'center', marginBottom: 20 }}>
              <strong style={{ color: '#3B2A22' }}>{file.name}</strong> contains:
            </p>

            {/* File summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
              {[
                { label: 'Guests',    value: guests  },
                { label: 'Budget',    value: budget  },
                { label: 'Tasks',     value: tasks   },
                { label: 'Vendors',   value: vendors },
              ].map(r => (
                <div key={r.label} style={{ background: '#F2E3CF', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
                  <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, color: '#3B2A22', fontWeight: 500 }}>{r.value}</p>
                  <p style={{ fontSize: 11, color: '#7A6657' }}>{r.label}</p>
                </div>
              ))}
            </div>

            {/* Thin rule */}
            <div style={{ height: 1, background: '#E8D5A3', margin: '0 0 20px' }}/>

            <p style={{ fontSize: 12, color: '#7A6657', marginBottom: 20, lineHeight: 1.6 }}>
              <strong style={{ color: '#3B2A22' }}>Replace</strong> — overwrites all current data with this file.<br/>
              <strong style={{ color: '#3B2A22' }}>Merge</strong> — adds items from this file, keeping your existing data.
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 10, fontSize: 13,
                border: '1.5px solid #E8D5A3', background: 'transparent', color: '#7A6657', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={() => { if (parsed) onMerge(parsed) }} style={{ flex: 1, padding: 10, borderRadius: 10, fontSize: 13, fontWeight: 600,
                border: '1.5px solid #C8A45D', background: 'transparent', color: '#C8A45D', cursor: 'pointer' }}>
                Merge
              </button>
              <button onClick={() => { if (parsed) onReplace(parsed) }} style={{ flex: 1.5, padding: 10, borderRadius: 10, fontSize: 13, fontWeight: 600,
                border: 'none', background: '#3B2A22', color: '#FFF8EE', cursor: 'pointer' }}>
                Replace all
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Clear confirmation modal ───────────────────────────────────────────────────
function ClearModal({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  const [typed, setTyped] = useState('')
  const confirmed = typed.trim().toLowerCase() === 'delete'
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,30,20,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#FFF8EE', borderRadius: 24, padding: 40, width: '100%', maxWidth: 440,
        boxShadow: '0 32px 80px rgba(42,30,20,0.3)', border: '1.5px solid rgba(196,122,82,0.4)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <AlertTriangle size={40} style={{ color: '#C47A52', marginBottom: 14 }} strokeWidth={1.5}/>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, color: '#3B2A22', marginBottom: 10 }}>
            Clear all data?
          </h2>
          <p style={{ fontSize: 13, color: '#7A6657', lineHeight: 1.7 }}>
            This will permanently delete <strong style={{ color: '#3B2A22' }}>all</strong> guests, budget items,
            checklist tasks, vendors, mood board images, and seating data.<br/><br/>
            <strong style={{ color: '#C47A52' }}>This cannot be undone.</strong> We strongly recommend exporting a backup first.
          </p>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#7A6657', letterSpacing: '0.08em', marginBottom: 8 }}>
            TYPE "DELETE" TO CONFIRM
          </label>
          <input
            value={typed} onChange={e => setTyped(e.target.value)}
            placeholder="delete"
            style={{
              width: '100%', padding: '10px 14px',
              border: `1.5px solid ${confirmed ? '#C47A52' : '#E8D5A3'}`,
              borderRadius: 10, background: '#FFFDF7', color: '#3B2A22',
              fontSize: 14, fontFamily: 'Inter, sans-serif', outline: 'none',
              textAlign: 'center', letterSpacing: '0.1em',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 10, fontSize: 13,
            border: '1.5px solid #E8D5A3', background: 'transparent', color: '#7A6657', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={() => { if (confirmed) { onConfirm(); onClose() } }}
            disabled={!confirmed}
            style={{ flex: 1.5, padding: 10, borderRadius: 10, fontSize: 13, fontWeight: 600,
              border: 'none',
              background: confirmed ? '#C47A52' : '#E8D5A3',
              color: confirmed ? '#fff' : '#7A6657',
              cursor: confirmed ? 'pointer' : 'default',
              transition: 'all 0.15s',
            }}>
            Clear everything
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
interface Props {
  data: AppData
  setData: (d: AppData | ((p: AppData) => AppData)) => void
}

export function Settings({ data, setData }: Props) {
  const [details, saveDetails] = useWeddingDetails()
  const [form, setForm] = useState<WeddingDetails>({ ...details })
  const [saved, setSaved] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [showClear, setShowClear] = useState(false)
  const { prefs, updatePrefs, rates, loading: ratesLoading, lastUpdated, refetch } = useCurrencyContext()
  const fileRef = useRef<HTMLInputElement>(null)

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    border: '1.5px solid #E8D5A3', borderRadius: 12,
    background: '#FFFDF7', color: '#3B2A22', fontSize: 13,
    fontFamily: 'Inter, sans-serif', outline: 'none',
  }
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 700,
    color: '#7A6657', letterSpacing: '0.08em', marginBottom: 6,
  }

  const handleSaveDetails = () => {
    saveDetails(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleMerge = (imported: AppData) => {
    setData(d => ({
      guests:    [...d.guests,    ...(imported.guests    ?? [])],
      budget:    [...d.budget,    ...(imported.budget    ?? [])],
      checklist: [...d.checklist, ...(imported.checklist ?? [])],
      vendors:   [...d.vendors,   ...(imported.vendors   ?? [])],
      moodImages:[...(d.moodImages ?? []), ...(imported.moodImages ?? [])],
      events:      [...(d.events ?? []), ...(imported.events ?? [])],
      travelInfo:  [...(d.travelInfo ?? []), ...(imported.travelInfo ?? [])],
    }))
    setImportFile(null)
  }

  const handleReplace = (imported: AppData) => {
    setData({
      guests:    imported.guests    ?? [],
      budget:    imported.budget    ?? [],
      checklist: imported.checklist ?? [],
      vendors:   imported.vendors   ?? [],
      moodImages:imported.moodImages ?? [],
      events:     imported.events     ?? [],
      travelInfo: imported.travelInfo ?? [],
    })
    setImportFile(null)
  }

  const handleClear = () => {
    setData({ guests: [], budget: [], checklist: [], vendors: [], moodImages: [], events: [], travelInfo: [] })
    localStorage.removeItem('jb-seating')
    localStorage.removeItem('jb-moodboard')
    localStorage.removeItem('jb-timeline')
  }

  const guestCount  = data.guests.length
  const budgetCount = data.budget.length
  const taskCount   = data.checklist.length
  const vendorCount = data.vendors.length

  return (
    <div className="page-content" style={{maxWidth: 780}}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 30, fontStyle: 'italic', color: '#3B2A22', margin: 0 }}>
            Settings & Data
          </h1>
          <SmallLeaf size={22} opacity={0.6} rotate={-15}/>
          <Frangipani size={26} opacity={0.5}/>
        </div>
        <p style={{ fontSize: 13, color: '#7A6657' }}>
          Manage your wedding details and keep your data safe.
        </p>
      </div>

      <div style={{ marginBottom: 36 }}>
        <BaliBorder width={500} opacity={0.5}/>
      </div>

      {/* ── Wedding details ── */}
      <section style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{ width: 3, height: 18, backgroundColor: '#C47A52', borderRadius: 2 }}/>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: '#3B2A22', margin: 0 }}>
            Wedding Details
          </h2>
          <Heart size={14} style={{ color: '#C8A45D' }} strokeWidth={1.5}/>
        </div>

        <div style={{
          background: '#FAF3E6', border: '1.5px solid #E8D5A3',
          borderRadius: 20, padding: 32, position: 'relative', overflow: 'hidden',
        }}>
          {/* Decorative temple gate */}
          <div style={{ position: 'absolute', right: -20, bottom: -20, opacity: 0.06, pointerEvents: 'none' }}>
            <TempleGate width={140} opacity={1}/>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, position: 'relative' }}>
            <div>
              <label style={lbl}>PARTNER 1 NAME</label>
              <input style={inp} value={form.partner1} onChange={e => setForm(f => ({ ...f, partner1: e.target.value }))}/>
            </div>
            <div>
              <label style={lbl}>PARTNER 2 NAME</label>
              <input style={inp} value={form.partner2} onChange={e => setForm(f => ({ ...f, partner2: e.target.value }))}/>
            </div>
            <div>
              <label style={lbl}>WEDDING DATE</label>
              <input style={inp} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}/>
            </div>
            <div>
              <label style={lbl}>CEREMONY TIME</label>
              <input style={inp} type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}/>
            </div>
            <div>
              <label style={lbl}>VENUE NAME</label>
              <input style={inp} value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))}/>
            </div>
            <div>
              <label style={lbl}>LOCATION</label>
              <input style={inp} value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="City, Country"/>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={lbl}>WEDDING THEME</label>
              <input style={inp} value={form.theme} onChange={e => setForm(f => ({ ...f, theme: e.target.value }))} placeholder="e.g. Romantic Balinese Minimalist"/>
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <button onClick={handleSaveDetails}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '11px 24px', borderRadius: 12,
                background: saved ? '#7F9A78' : '#3B2A22', color: '#FFF8EE',
                border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                transition: 'background 0.3s',
              }}>
              {saved ? <CheckCircle size={15}/> : <Save size={15}/>}
              {saved ? 'Saved!' : 'Save details'}
            </button>
          </div>
        </div>
      </section>

      {/* ── Data snapshot ── */}
      <section style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 3, height: 18, backgroundColor: '#C47A52', borderRadius: 2 }}/>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: '#3B2A22', margin: 0 }}>
            Your Data
          </h2>
        </div>
        <div className="grid-4">
          {[
            { label: 'Guests',  value: guestCount },
            { label: 'Budget items', value: budgetCount },
            { label: 'Tasks',   value: taskCount },
            { label: 'Vendors', value: vendorCount },
          ].map(s => (
            <div key={s.label} style={{
              background: '#FAF3E6', border: '1.5px solid #E8D5A3',
              borderRadius: 14, padding: '16px 18px', textAlign: 'center',
            }}>
              <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 500, color: '#3B2A22', lineHeight: 1 }}>{s.value}</p>
              <p style={{ fontSize: 11, color: '#7A6657', marginTop: 4 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Currency settings ── */}
      <section style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 3, height: 18, backgroundColor: '#C47A52', borderRadius: 2 }}/>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: '#3B2A22', margin: 0 }}>
            Currency
          </h2>
          <Frangipani size={20} opacity={0.45}/>
        </div>

        <div style={{ background: '#FAF3E6', border: '1.5px solid #E8D5A3', borderRadius: 20, padding: 28, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', bottom: -20, right: -20, opacity: 0.06, pointerEvents: 'none' }}>
            <TempleGate width={120} opacity={1}/>
          </div>

          <p style={{ fontSize: 13, color: '#7A6657', marginBottom: 20, lineHeight: 1.6 }}>
            All monetary values are stored in <strong style={{ color: '#3B2A22' }}>GBP (£)</strong> internally. Choose a display currency to view amounts converted to Indonesian Rupiah or US Dollars throughout the app.
          </p>

          {/* Currency selector */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#7A6657', letterSpacing: '0.08em', marginBottom: 10 }}>
              DISPLAY CURRENCY
            </label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {(['GBP', 'IDR'] as const).map(c => {
                const info = CURRENCY_LABELS[c]
                const active = prefs.display === c
                return (
                  <button key={c} onClick={() => updatePrefs({ display: c })}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 18px', borderRadius: 12, cursor: 'pointer',
                      border: `1.5px solid ${active ? '#C8A45D' : '#E8D5A3'}`,
                      background: active ? 'rgba(200,164,93,0.12)' : 'transparent',
                      transition: 'all 0.15s',
                    }}>
                    <span style={{ fontSize: 18 }}>{info.flag}</span>
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: '#3B2A22', margin: 0 }}>
                        {info.symbol} {c}
                      </p>
                      <p style={{ fontSize: 10, color: '#7A6657', margin: 0 }}>{info.name}</p>
                    </div>
                    {active && <span style={{ fontSize: 12, color: '#C8A45D', fontWeight: 700, marginLeft: 4 }}>✓</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Show both toggle */}
          {prefs.display !== 'GBP' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20,
              padding: '12px 16px', borderRadius: 12, background: 'rgba(200,164,93,0.07)', border: '1px solid rgba(200,164,93,0.25)' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#3B2A22', marginBottom: 2 }}>Show GBP alongside</p>
                <p style={{ fontSize: 11, color: '#7A6657' }}>Display both currencies side-by-side (e.g. Rp 26,000,000 · £1,250)</p>
              </div>
              <button onClick={() => updatePrefs({ showBoth: !prefs.showBoth })}
                style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: prefs.showBoth ? '#7F9A78' : '#E8D5A3', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 3, left: prefs.showBoth ? 23 : 3,
                  transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}/>
              </button>
            </div>
          )}

          {/* Live rates */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#7A6657', letterSpacing: '0.08em', marginBottom: 10 }}>
              LIVE EXCHANGE RATES (GBP base)
            </label>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
              {rates && (
                <div style={{ background: '#FFF8EE', border: '1px solid #E8D5A3', borderRadius: 10, padding: '10px 16px' }}>
                  <p style={{ fontSize: 10, color: '#7A6657', marginBottom: 4 }}>🇮🇩 1 GBP =</p>
                  <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, color: '#3B2A22' }}>
                    Rp {Math.round(rates.IDR).toLocaleString('id-ID')}
                  </p>
                </div>
              )}
              {ratesLoading && (
                <p style={{ fontSize: 12, color: '#7A6657', fontStyle: 'italic' }}>Fetching latest rates…</p>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={refetch} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                border: '1.5px solid #E8D5A3', background: 'transparent', color: '#3B2A22', cursor: 'pointer' }}>
                ↻ Refresh rates
              </button>
              {lastUpdated && (
                <span style={{ fontSize: 11, color: '#7A6657', opacity: 0.7 }}>
                  Last updated: {lastUpdated.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} at {lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            <p style={{ fontSize: 11, color: '#7A6657', marginTop: 8, fontStyle: 'italic' }}>
              Rates from European Central Bank via Frankfurter API. Updated every 12 hours.
            </p>
          </div>
        </div>
      </section>

      {/* ── Backup reminder ── */}
      <div style={{
        display: 'flex', gap: 14, padding: '16px 20px', borderRadius: 14, marginBottom: 36,
        background: 'rgba(200,164,93,0.08)', border: '1px solid rgba(200,164,93,0.35)',
      }}>
        <Shield size={18} style={{ color: '#C8A45D', flexShrink: 0, marginTop: 1 }} strokeWidth={1.5}/>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#3B2A22', marginBottom: 3 }}>Keep your data safe</p>
          <p style={{ fontSize: 12, color: '#7A6657', lineHeight: 1.7 }}>
            All data is stored locally in your browser. We recommend exporting a backup regularly
            and saving the JSON file somewhere safe — a USB drive, cloud storage, or email it to yourself.
            If you clear your browser data, your planning data will be lost without a backup.
          </p>
        </div>
      </div>

      {/* ── Action cards ── */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{ width: 3, height: 18, backgroundColor: '#C47A52', borderRadius: 2 }}/>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: '#3B2A22', margin: 0 }}>
            Backup & Restore
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ActionCard
            icon={Download}
            title="Export all data"
            description="Download a complete backup of everything — guests, budget, checklist, vendors, mood board, seating, and your wedding details — as a single JSON file."
            buttonLabel="Export JSON backup"
            onClick={() => exportJSON(data, details)}
          />

          <ActionCard
            icon={Upload}
            title="Import from backup"
            description="Restore data from a previously exported JSON backup file. You can choose to merge with your existing data, or replace everything."
            buttonLabel="Choose file to import"
            buttonColor="#7F9A78"
            onClick={() => fileRef.current?.click()}
          />

          <ActionCard
            icon={Trash2}
            title="Clear all data"
            description="Permanently delete all your planning data including guests, budget, tasks, vendors, mood board images, and seating arrangements. This cannot be undone."
            buttonLabel="Clear everything"
            buttonColor="#C47A52"
            danger
            onClick={() => setShowClear(true)}
          />
        </div>
      </section>

      {/* ── Excel templates ── */}
      <section style={{ marginTop: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 3, height: 18, backgroundColor: '#7F9A78', borderRadius: 2 }}/>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: '#3B2A22', margin: 0 }}>
            CSV Import Templates
          </h2>
          <FileSpreadsheet size={16} style={{ color: '#7F9A78' }} strokeWidth={1.5}/>
        </div>
        <p style={{ fontSize: 13, color: '#7A6657', marginBottom: 20, lineHeight: 1.6 }}>
          Download a CSV template for any section, fill it in with your data, then import it using the Import button above.
          Each template includes example rows so you can see exactly how to format your data.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {[
            { label: 'Guests', emoji: '👥', desc: 'Names, party groups, meal prefs', fn: downloadGuestsTemplate },
            { label: 'Vendors', emoji: '🏪', desc: 'Suppliers, categories, status', fn: downloadVendorsTemplate },
            { label: 'Budget & Expenses', emoji: '💳', desc: 'Expense items with amounts', fn: downloadBudgetTemplate },
            { label: 'Checklist', emoji: '✅', desc: 'Tasks, priorities, due dates', fn: downloadChecklistTemplate },
            { label: 'Accommodation', emoji: '🏨', desc: 'Rooms, types, capacities', fn: downloadAccommodationTemplate },
            { label: 'Events & Activities', emoji: '🌴', desc: 'Wedding events + activities', fn: downloadEventsTemplate },
          ].map(t => (
            <button key={t.label} onClick={t.fn}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                borderRadius: 14, border: '1.5px solid #E8D5A3', background: '#FAF3E6',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(127,154,120,0.5)'
                ;(e.currentTarget as HTMLElement).style.background = 'rgba(127,154,120,0.07)'
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLElement).style.borderColor = '#E8D5A3'
                ;(e.currentTarget as HTMLElement).style.background = '#FAF3E6'
              }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{t.emoji}</span>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#3B2A22', marginBottom: 2 }}>{t.label}</p>
                <p style={{ fontSize: 11, color: '#7A6657' }}>{t.desc}</p>
              </div>
              <Download size={13} style={{ color: '#7F9A78', flexShrink: 0, marginLeft: 'auto' }}/>
            </button>
          ))}
        </div>

        <p style={{ fontSize: 11, color: '#A89080', fontStyle: 'italic', marginTop: 12 }}>
          Templates download as .csv files. Open in Excel, Google Sheets, or Numbers. Delete the example rows, fill in your data, save as CSV, then import using the Import button above.
        </p>
      </section>

      {/* Hidden file input */}
      <input ref={fileRef} type="file" accept=".json" hidden
        onChange={e => { if (e.target.files?.[0]) setImportFile(e.target.files[0]) }}/>

      {/* ── Bottom ornament ── */}
      <div style={{ marginTop: 56, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 8, alignItems: 'flex-end' }}>
          <Frangipani size={36} opacity={0.5}/>
          <Frangipani size={44} opacity={0.65}/>
          <Frangipani size={36} opacity={0.5}/>
        </div>
        <BaliBorder width={280} opacity={0.55}/>
        <p style={{ fontFamily: 'Playfair Display, serif', fontStyle: 'italic', fontSize: 13, color: '#C8A45D', opacity: 0.7, marginTop: 10 }}>
          {form.partner1} & {form.partner2} · {form.location}
        </p>
      </div>

      {/* ── Modals ── */}
      {importFile && (
        <ImportModal
          file={importFile}
          onMerge={handleMerge}
          onReplace={handleReplace}
          onClose={() => setImportFile(null)}
        />
      )}
      {showClear && (
        <ClearModal onConfirm={handleClear} onClose={() => setShowClear(false)}/>
      )}
    </div>
  )
}
