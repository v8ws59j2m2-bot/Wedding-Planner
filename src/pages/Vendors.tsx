import { useState, useMemo, useRef } from 'react'
import {
  Plus, Edit2, Trash2, X, Search, FileJson,
  Phone, Mail, Globe, ChevronDown, ExternalLink,
  CheckCircle, Compass, DollarSign, Upload, FileText,
  Image as ImageIcon, Download, Eye, AlertTriangle,
  Paperclip, Calendar, TrendingDown,
} from 'lucide-react'
import { SmallLeaf, Frangipani, BaliBorder } from '../components/Botanicals'
import { CurrencyToggle } from '../components/CurrencyToggle'
import { useCurrencyContext } from '../context/CurrencyContext'
import { CurrencyAmountInput, localToGbp } from '../components/CurrencyAmountInput'
import { CURRENCY_LABELS, type Currency } from '../hooks/useCurrency'
import type { Vendor, AppData } from '../types'

// ── helpers ───────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2, 10) }
function fmt(n: number) {
  return '£' + n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
function exportJSON(data: AppData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url
  a.download = `wedding-data-${new Date().toISOString().split('T')[0]}.json`
  a.click(); URL.revokeObjectURL(url)
}
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
function base64Size(b64: string) {
  // Approximate byte size from base64 string
  const base = b64.split(',')[1] ?? b64
  return Math.round((base.length * 3) / 4)
}

// ── types ─────────────────────────────────────────────────────────────────────
type Status = 'booked' | 'quoted'

interface ContractFile {
  name: string
  mimeType: string
  uploadedAt: string
  data: string   // base64 data URL
}

interface FullVendor extends Vendor {
  contact?: string
  phone?: string
  email?: string
  website?: string
  quote?: number          // total contract amount
  deposit?: number        // deposit paid
  paid?: number           // legacy compat
  depositDue?: string
  balanceDue?: string
  status: Status
  notes?: string
  contract?: ContractFile
  syncToBudget?: boolean  // whether to keep a linked budget item
}

// ── constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
  'Venue', 'Photography', 'Videography', 'Catering',
  'Florals', 'Hair & Beauty', 'Music & DJ', 'Officiant',
  'Transport', 'Cake & Desserts', 'Stationery', 'Lighting & AV',
  'Accommodation', 'Miscellaneous',
]
const CAT_ICONS: Record<string, string> = {
  'Venue': '🏛️', 'Photography': '📷', 'Videography': '🎬',
  'Catering': '🍽️', 'Florals': '🌸', 'Hair & Beauty': '💄',
  'Music & DJ': '🎵', 'Officiant': '💍', 'Transport': '🚌',
  'Cake & Desserts': '🎂', 'Stationery': '📜', 'Lighting & AV': '💡',
  'Accommodation': '🏨', 'Miscellaneous': '📦',
}
const STATUS_CONFIG: Record<Status, { label: string; color: string; icon: React.ElementType }> = {
  booked: { label: 'Booked', color: '#7F9A78', icon: CheckCircle },
  quoted: { label: 'Quoted', color: '#C8A45D', icon: DollarSign },
}
const EMPTY: Omit<FullVendor, 'id'> = {
  name: '', category: CATEGORIES[0], booked: false,
  status: 'quoted', contact: '', phone: '', email: '',
  website: '', cost: 0, quote: 0, deposit: 0, paid: 0,
  depositDue: '', balanceDue: '', notes: '', syncToBudget: false,
}
const MAX_FILE_BYTES = 5 * 1024 * 1024  // 5 MB
const ACCEPTED = '.pdf,.jpg,.jpeg,.png,.webp'

// Map vendor categories → budget categories
const VENDOR_TO_BUDGET_CAT: Record<string, string> = {
  'Venue':           'Venue',
  'Photography':     'Photography',
  'Videography':     'Videography',
  'Catering':        'Catering',
  'Florals':         'Flowers & Décor',
  'Hair & Beauty':   'Hair & Beauty',
  'Music & DJ':      'Music & Entertainment',
  'Officiant':       'Miscellaneous',
  'Transport':       'Transport',
  'Cake & Desserts': 'Catering',
  'Stationery':      'Stationery',
  'Lighting & AV':   'Miscellaneous',
  'Accommodation':   'Miscellaneous',
  'Miscellaneous':   'Miscellaneous',
}
function vendorBudgetCat(vendorCat: string) {
  return VENDOR_TO_BUDGET_CAT[vendorCat] ?? 'Miscellaneous'
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Status }) {
  const { label, color, icon: Icon } = STATUS_CONFIG[status] ?? STATUS_CONFIG['quoted']
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20,
      background: color + '18', border: `1px solid ${color}44`,
      fontSize: 11, fontWeight: 600, color,
    }}>
      <Icon size={10} strokeWidth={2}/>{label}
    </span>
  )
}

// ── Contract status chip ──────────────────────────────────────────────────────
function ContractChip({ contract }: { contract?: ContractFile }) {
  if (!contract) return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#D4C5A4' }}>
      <Paperclip size={9}/> No contract
    </span>
  )
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#7F9A78', fontWeight: 600 }}>
      <CheckCircle size={9}/> Contract uploaded
    </span>
  )
}

// ── Payment helpers ───────────────────────────────────────────────────────────
function paymentState(v: FullVendor): 'unpaid' | 'deposit' | 'full' {
  const quote   = v.quote   ?? 0
  const deposit = v.deposit ?? v.paid ?? 0
  if (quote <= 0 || deposit <= 0) return 'unpaid'
  if (deposit >= quote)           return 'full'
  return 'deposit'
}

function balanceRemaining(v: FullVendor) {
  return Math.max(0, (v.quote ?? 0) - (v.deposit ?? v.paid ?? 0))
}

function PaymentBadge({ vendor }: { vendor: FullVendor }) {
  const state = paymentState(vendor)
  if (state === 'full') return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4,
      fontSize:10, fontWeight:700, color:'#7F9A78',
      background:'rgba(127,154,120,0.12)', border:'1px solid rgba(127,154,120,0.35)',
      padding:'2px 8px', borderRadius:20 }}>
      <CheckCircle size={9}/> Fully paid
    </span>
  )
  if (state === 'deposit') return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4,
      fontSize:10, fontWeight:700, color:'#C8A45D',
      background:'rgba(200,164,93,0.12)', border:'1px solid rgba(200,164,93,0.35)',
      padding:'2px 8px', borderRadius:20 }}>
      <CheckCircle size={9}/> Deposit paid
    </span>
  )
  if ((vendor.quote ?? 0) > 0) return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4,
      fontSize:10, fontWeight:700, color:'#C47A52',
      background:'rgba(196,122,82,0.1)', border:'1px solid rgba(196,122,82,0.3)',
      padding:'2px 8px', borderRadius:20 }}>
      <TrendingDown size={9}/> Awaiting deposit
    </span>
  )
  return null
}

function DateWarning({ label, date }: { label: string; date?: string }) {
  if (!date) return null
  const d    = new Date(date)
  const now  = new Date()
  const days = Math.ceil((d.getTime() - now.getTime()) / 86400000)
  const past = days < 0
  const soon = !past && days <= 14
  if (!soon && !past) return null
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:3,
      fontSize:10, color: past ? '#C47A52' : '#C8A45D', fontWeight:600 }}>
      <Calendar size={9}/>
      {label}: {past ? `overdue ${Math.abs(days)}d` : `due in ${days}d`}
    </span>
  )
}

// ── Contract upload section ───────────────────────────────────────────────────
function ContractSection({ contract, onChange }: {
  contract?: ContractFile
  onChange: (c: ContractFile | undefined) => void
}) {
  const [drag, setDrag]     = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const inputRef            = useRef<HTMLInputElement>(null)

  const isPdf = contract?.mimeType === 'application/pdf'

  const process = async (file: File) => {
    setError('')
    if (file.size > MAX_FILE_BYTES) {
      setError(`File too large — max 5 MB (this file is ${formatBytes(file.size)}).`)
      return
    }
    if (!['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please upload a PDF, JPG, PNG, or WEBP file.')
      return
    }
    setLoading(true)
    try {
      const data = await fileToBase64(file)
      onChange({ name: file.name, mimeType: file.type, uploadedAt: new Date().toISOString(), data })
    } finally {
      setLoading(false)
    }
  }

  const openContract = () => {
    if (!contract) return
    const win = window.open()
    if (win) {
      if (isPdf) {
        win.document.write(`<iframe src="${contract.data}" style="width:100%;height:100vh;border:none;"/>`)
      } else {
        win.document.write(`<img src="${contract.data}" style="max-width:100%;"/>`)
      }
    }
  }

  const downloadContract = () => {
    if (!contract) return
    const a = document.createElement('a')
    a.href = contract.data
    a.download = contract.name
    a.click()
  }

  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#7A6657', letterSpacing: '0.08em', marginBottom: 8 }}>
        CONTRACT
      </label>

      {contract ? (
        /* ── Uploaded state ── */
        <div style={{
          background: 'rgba(127,154,120,0.08)', border: '1.5px solid rgba(127,154,120,0.35)',
          borderRadius: 12, padding: '14px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* File icon */}
            <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: isPdf ? 'rgba(196,122,82,0.15)' : 'rgba(200,164,93,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isPdf ? <FileText size={18} style={{ color: '#C47A52' }}/> : <ImageIcon size={18} style={{ color: '#C8A45D' }}/>}
            </div>
            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#3B2A22',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {contract.name}
              </p>
              <p style={{ fontSize: 10, color: '#7A6657', marginTop: 2 }}>
                {formatBytes(base64Size(contract.data))} · Uploaded {new Date(contract.uploadedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
              </p>
            </div>
            {/* Actions */}
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button onClick={openContract} title="View"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A6657', padding: 5, borderRadius: 6 }}>
                <Eye size={14} strokeWidth={1.5}/>
              </button>
              <button onClick={downloadContract} title="Download"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A6657', padding: 5, borderRadius: 6 }}>
                <Download size={14} strokeWidth={1.5}/>
              </button>
              <button onClick={() => onChange(undefined)} title="Remove"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C47A52', padding: 5, borderRadius: 6 }}>
                <Trash2 size={14} strokeWidth={1.5}/>
              </button>
            </div>
          </div>
          {/* Replace link */}
          <button onClick={() => inputRef.current?.click()}
            style={{ marginTop: 10, background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11, color: '#7A6657', padding: 0, textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
            Replace with a different file
          </button>
          <input ref={inputRef} type="file" accept={ACCEPTED} hidden onChange={e => { if (e.target.files?.[0]) process(e.target.files[0]); e.target.value = '' }}/>
        </div>
      ) : (
        /* ── Upload zone ── */
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files[0]) process(e.dataTransfer.files[0]) }}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `1.5px dashed ${drag ? '#C8A45D' : '#D4C5A4'}`,
            borderRadius: 12, padding: '20px 16px', textAlign: 'center',
            cursor: 'pointer', transition: 'all 0.2s',
            background: drag ? 'rgba(200,164,93,0.06)' : 'transparent',
          }}
        >
          <input ref={inputRef} type="file" accept={ACCEPTED} hidden
            onChange={e => { if (e.target.files?.[0]) process(e.target.files[0]); e.target.value = '' }}/>
          {loading ? (
            <p style={{ fontSize: 12, color: '#7A6657' }}>Uploading…</p>
          ) : (
            <>
              <Upload size={18} style={{ color: '#C8A45D', marginBottom: 6 }}/>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#3B2A22', marginBottom: 2 }}>
                Drop contract here or click to upload
              </p>
              <p style={{ fontSize: 11, color: '#7A6657' }}>PDF, JPG, PNG · Max 5 MB</p>
            </>
          )}
        </div>
      )}

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8,
          fontSize: 11, color: '#C47A52' }}>
          <AlertTriangle size={12}/>{error}
        </div>
      )}
    </div>
  )
}

// ── Summary card ──────────────────────────────────────────────────────────────
function SummaryCard({ label, value, sub, color }: {
  label: string; value: string; sub?: string; color: string
}) {
  return (
    <div style={{ background: '#FAF3E6', border: '1.5px solid #E8D5A3', borderRadius: 16, padding: '18px 22px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', bottom: -8, right: -8, pointerEvents: 'none', opacity: 0.12 }}>
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none"><rect x="6" y="6" width="44" height="44" rx="5" transform="rotate(45 28 28)" fill={color}/></svg>
      </div>
      <p style={{ fontSize: 10, fontWeight: 700, color: '#7A6657', letterSpacing: '0.12em', marginBottom: 8 }}>{label}</p>
      <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 500, color, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: '#7A6657', marginTop: 5 }}>{sub}</p>}
    </div>
  )
}

// ── Vendor card ───────────────────────────────────────────────────────────────
function VendorCard({ vendor, onEdit, onDelete }: {
  vendor: FullVendor; onEdit: (v: FullVendor) => void; onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const { display: d } = useCurrencyContext()
  const deposit  = vendor.deposit ?? vendor.paid ?? 0
  const balance  = balanceRemaining(vendor)
  const pstate   = paymentState(vendor)
  const color    = vendor.status === 'booked' ? '#7F9A78' : vendor.status === 'quoted' ? '#C8A45D' : '#7A6657'
  const isPdf    = vendor.contract?.mimeType === 'application/pdf'

  const openContract = () => {
    if (!vendor.contract) return
    const win = window.open()
    if (win) {
      if (isPdf) win.document.write(`<iframe src="${vendor.contract.data}" style="width:100%;height:100vh;border:none;"/>`)
      else       win.document.write(`<img src="${vendor.contract.data}" style="max-width:100%;"/>`)
    }
  }
  const downloadContract = () => {
    if (!vendor.contract) return
    const a = document.createElement('a'); a.href = vendor.contract.data; a.download = vendor.contract.name; a.click()
  }

  return (
    <div style={{
      background: '#FAF3E6',
      border: `1.5px solid ${vendor.status === 'booked' ? '#7F9A7855' : '#E8D5A3'}`,
      borderRadius: 16, overflow: 'hidden',
      boxShadow: vendor.status === 'booked' ? '0 2px 12px rgba(127,154,120,0.12)' : 'none',
    }}>
      {/* Main row */}
      <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 110px 110px 110px 120px', alignItems: 'center', gap: 12, padding: '16px 20px', cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(200,164,93,0.04)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
      >
        {/* Icon */}
        <div style={{ width: 36, height: 36, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
          {CAT_ICONS[vendor.category] ?? '📌'}
        </div>

        {/* Name + category + badges */}
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#3B2A22', marginBottom: 3 }}>{vendor.name}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 11, color: '#7A6657' }}>{vendor.category}{vendor.contact ? ` · ${vendor.contact}` : ''}</p>
            <ContractChip contract={vendor.contract}/>
            {vendor.status === 'booked' && (vendor.deposit ?? vendor.paid ?? 0) > 0 && (
              <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:10, fontWeight:600, color:'#7F9A78',
                background:'rgba(127,154,120,0.12)', border:'1px solid rgba(127,154,120,0.3)', padding:'2px 7px', borderRadius:20 }}>
                ⇄ Budget synced
              </span>
            )}
          </div>
        </div>

        {/* Quote */}
        <div style={{ textAlign: 'right' }}>
          {(vendor.quote ?? 0) > 0 ? (
            <>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#3B2A22' }}>{d(vendor.quote ?? 0)}</p>
              {vendor.quoteCurrency && vendor.quoteCurrency !== 'GBP' && vendor.quoteLocal ? (
                <p style={{ fontSize: 9, color: '#C8A45D', fontWeight: 600 }}>
                  {CURRENCY_LABELS[vendor.quoteCurrency].symbol}{vendor.quoteLocal.toLocaleString('id-ID')}
                </p>
              ) : <p style={{ fontSize: 10, color: '#7A6657' }}>total</p>}
            </>
          ) : <span style={{ fontSize: 12, color: '#D4C5A4' }}>—</span>}
        </div>

        {/* Deposit */}
        <div style={{ textAlign: 'right' }}>
          {deposit > 0 ? (
            <>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#7F9A78' }}>{d(deposit)}</p>
              {vendor.quoteCurrency && vendor.quoteCurrency !== 'GBP' && vendor.depositLocal ? (
                <p style={{ fontSize: 9, color: '#7F9A78', fontWeight: 600 }}>
                  {CURRENCY_LABELS[vendor.quoteCurrency].symbol}{vendor.depositLocal.toLocaleString('id-ID')}
                </p>
              ) : <p style={{ fontSize: 10, color: '#7A6657' }}>deposit paid</p>}
            </>
          ) : <span style={{ fontSize: 12, color: '#D4C5A4' }}>—</span>}
        </div>

        {/* Balance due */}
        <div style={{ textAlign: 'right' }}>
          {(vendor.quote ?? 0) > 0 ? (
            balance > 0
              ? (<><p style={{ fontSize: 13, fontWeight: 700, color: '#C47A52' }}>{d(balance)}</p><p style={{ fontSize: 10, color: '#C47A52', opacity: 0.8 }}>balance due</p></>)
              : (<><p style={{ fontSize: 13, fontWeight: 600, color: '#7F9A78' }}>£0</p><p style={{ fontSize: 10, color: '#7F9A78' }}>all paid</p></>)
          ) : <span style={{ fontSize: 12, color: '#D4C5A4' }}>—</span>}
        </div>

        {/* Status + expand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
          <StatusBadge status={vendor.status}/>
          <ChevronDown size={14} style={{ color: '#7A6657', transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }}/>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ borderTop: '1px solid #F2E3CF', padding: '20px 20px', background: 'rgba(255,253,248,0.7)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 16 }}>
            {/* Contact */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {vendor.phone && (<a href={`tel:${vendor.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#7A6657', textDecoration: 'none' }}><Phone size={12} style={{ color: '#C8A45D' }}/>{vendor.phone}</a>)}
              {vendor.email && (<a href={`mailto:${vendor.email}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#7A6657', textDecoration: 'none' }}><Mail size={12} style={{ color: '#C8A45D' }}/>{vendor.email}</a>)}
              {vendor.website && (<a href={vendor.website} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#C8A45D', textDecoration: 'none' }}><Globe size={12}/>{vendor.website.replace(/^https?:\/\//, '')}<ExternalLink size={10}/></a>)}
            </div>

            {/* Payment breakdown */}
            {(vendor.quote ?? 0) > 0 && (
              <div style={{ background: '#FAF3E6', border: `1px solid ${balance > 0 ? 'rgba(196,122,82,0.3)' : 'rgba(127,154,120,0.35)'}`, borderRadius: 12, padding: '14px 16px' }}>
                {/* Payment badge */}
                <div style={{ marginBottom: 10 }}>
                  <PaymentBadge vendor={vendor}/>
                </div>
                {/* Progress bar */}
                {(vendor.quote ?? 0) > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ height: 5, borderRadius: 4, background: '#F2E3CF', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 4, transition: 'width 0.4s',
                        width: `${Math.min(100, (deposit / (vendor.quote ?? 1)) * 100)}%`,
                        background: pstate === 'full' ? '#7F9A78' : pstate === 'deposit' ? '#C8A45D' : '#E8D5A3',
                      }}/>
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: '#7A6657' }}>Total quote</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#3B2A22' }}>{d(vendor.quote ?? 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: '#7A6657' }}>Deposit paid</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#7F9A78' }}>{d(deposit)}</span>
                </div>
                <div style={{ height: 1, background: '#E8D5A3', margin: '8px 0' }}/>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: balance > 0 ? '#C47A52' : '#7F9A78' }}>Balance due</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: balance > 0 ? '#C47A52' : '#7F9A78' }}>{d(balance)}</span>
                </div>
                {/* Due dates */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {vendor.depositDue && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: '#7A6657', display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={9}/> Deposit due</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: '#7A6657' }}>{new Date(vendor.depositDue).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                    </div>
                  )}
                  {vendor.balanceDue && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: '#7A6657', display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={9}/> Balance due</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: '#7A6657' }}>{new Date(vendor.balanceDue).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                    </div>
                  )}
                </div>
                {/* Overdue warnings */}
                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <DateWarning label="Deposit" date={vendor.depositDue}/>
                  <DateWarning label="Balance" date={vendor.balanceDue}/>
                </div>
              </div>
            )}

            {/* Notes */}
            {vendor.notes && (
              <div><p style={{ fontSize: 10, fontWeight: 700, color: '#7A6657', letterSpacing: '0.08em', marginBottom: 4 }}>NOTES</p><p style={{ fontSize: 12, color: '#3B2A22', fontStyle: 'italic', lineHeight: 1.5 }}>{vendor.notes}</p></div>
            )}
          </div>

          {/* Contract section in expanded view */}
          {vendor.contract && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
              background: 'rgba(127,154,120,0.07)', border: '1px solid rgba(127,154,120,0.3)',
              borderRadius: 12, padding: '12px 16px',
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                background: isPdf ? 'rgba(196,122,82,0.15)' : 'rgba(200,164,93,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isPdf ? <FileText size={16} style={{ color: '#C47A52' }}/> : <ImageIcon size={16} style={{ color: '#C8A45D' }}/>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#3B2A22', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vendor.contract.name}</p>
                <p style={{ fontSize: 10, color: '#7A6657', marginTop: 2 }}>
                  {formatBytes(base64Size(vendor.contract.data))} · {new Date(vendor.contract.uploadedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={e => { e.stopPropagation(); openContract() }} title="View"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                    border: '1px solid #E8D5A3', background: 'transparent', color: '#7A6657', cursor: 'pointer' }}>
                  <Eye size={12}/> View
                </button>
                <button onClick={e => { e.stopPropagation(); downloadContract() }} title="Download"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                    border: '1px solid #E8D5A3', background: 'transparent', color: '#7A6657', cursor: 'pointer' }}>
                  <Download size={12}/> Download
                </button>
              </div>
            </div>
          )}

          {/* Edit / Delete actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={e => { e.stopPropagation(); onEdit(vendor) }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                border: '1.5px solid #E8D5A3', background: 'transparent', color: '#7A6657', cursor: 'pointer' }}>
              <Edit2 size={12}/> Edit
            </button>
            <button onClick={e => { e.stopPropagation(); onDelete(vendor.id) }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                border: '1.5px solid rgba(196,122,82,0.4)', background: 'transparent', color: '#C47A52', cursor: 'pointer' }}>
              <Trash2 size={12}/> Remove
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Vendor modal ──────────────────────────────────────────────────────────────
function VendorModal({ initial, onSave, onClose }: {
  initial?: FullVendor; onSave: (v: FullVendor) => void; onClose: () => void
}) {
  const { rates } = useCurrencyContext()
  const [form, setForm] = useState<Omit<FullVendor, 'id'>>(initial ? { ...initial } : { ...EMPTY })
  const [quoteCurrency, setQuoteCurrency] = useState<Currency>(initial?.quoteCurrency ?? 'GBP')
  const [quoteLocal,    setQuoteLocal]    = useState<number | ''>(initial?.quoteLocal ?? initial?.quote ?? '')
  const [depositLocal,  setDepositLocal]  = useState<number | ''>(initial?.depositLocal ?? initial?.deposit ?? initial?.paid ?? '')

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px',
    border: '1.5px solid #E8D5A3', borderRadius: 10,
    background: '#FFFDF7', color: '#3B2A22', fontSize: 13,
    fontFamily: 'Inter, sans-serif', outline: 'none',
  }
  const lbl: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 700, color: '#7A6657', letterSpacing: '0.08em', marginBottom: 5 }
  const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,30,20,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#FFF8EE', borderRadius: 20, padding: 36, width: '100%', maxWidth: 580,
        maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(42,30,20,0.22)', border: '1.5px solid #E8D5A3' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, fontStyle: 'italic', color: '#3B2A22', margin: 0 }}>
              {initial ? 'Edit vendor' : 'Add vendor'}
            </h2>
            <Frangipani size={22} opacity={0.5}/>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A6657' }}><X size={18}/></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={lbl}>VENDOR NAME *</label>
            <input style={inp} value={form.name} onChange={set('name')} placeholder="e.g. Villa Canggu Photography"/>
          </div>
          <div style={grid2}>
            <div>
              <label style={lbl}>CATEGORY</label>
              <div style={{ position: 'relative' }}>
                <select style={{ ...inp, appearance: 'none', paddingRight: 28 }} value={form.category} onChange={set('category')}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#7A6657', pointerEvents: 'none' }}/>
              </div>
            </div>
            <div>
              <label style={lbl}>STATUS</label>
              <div style={{ position: 'relative' }}>
                <select style={{ ...inp, appearance: 'none', paddingRight: 28 }} value={form.status} onChange={set('status')}>
                  <option value="quoted">Quoted</option>
                  <option value="booked">Booked</option>
                </select>
                <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#7A6657', pointerEvents: 'none' }}/>
              </div>
            </div>
          </div>
          <div style={grid2}>
            <div><label style={lbl}>CONTACT PERSON</label><input style={inp} value={form.contact} onChange={set('contact')} placeholder="First name"/></div>
            <div><label style={lbl}>PHONE</label><input style={inp} value={form.phone} onChange={set('phone')} placeholder="+62 xxx xxx xxx"/></div>
          </div>
          <div style={grid2}>
            <div><label style={lbl}>EMAIL</label><input style={inp} type="email" value={form.email} onChange={set('email')} placeholder="hello@vendor.com"/></div>
            <div><label style={lbl}>WEBSITE</label><input style={inp} value={form.website} onChange={set('website')} placeholder="https://"/></div>
          </div>
          <div style={{ height: 1, background: '#F2E3CF', margin: '2px 0' }}/>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#7A6657', letterSpacing: '0.08em' }}>PAYMENT</p>
          <CurrencyAmountInput
            label="TOTAL QUOTE / CONTRACT"
            localAmount={quoteLocal}
            inputCurrency={quoteCurrency}
            onAmountChange={v => {
              setQuoteLocal(v)
              const gbp = v === '' ? 0 : localToGbp(+v, quoteCurrency, rates)
              setForm(f => ({ ...f, quote: gbp, quoteLocal: v === '' ? 0 : +v, quoteCurrency }))
            }}
            onCurrencyChange={c => {
              setQuoteCurrency(c)
              setQuoteLocal('')
              setDepositLocal('')
              setForm(f => ({ ...f, quote: 0, deposit: 0, quoteLocal: 0, depositLocal: 0, quoteCurrency: c }))
            }}
          />
          <CurrencyAmountInput
            label="DEPOSIT PAID"
            localAmount={depositLocal}
            inputCurrency={quoteCurrency}
            onAmountChange={v => {
              setDepositLocal(v)
              const gbp = v === '' ? 0 : localToGbp(+v, quoteCurrency, rates)
              setForm(f => ({ ...f, deposit: gbp, paid: gbp, depositLocal: v === '' ? 0 : +v }))
            }}
            onCurrencyChange={c => setQuoteCurrency(c)}
          />
          {/* Live balance */}
          {(form.quote ?? 0) > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', borderRadius: 12,
              background: (form.quote??0)-(form.deposit??form.paid??0) > 0 ? 'rgba(196,122,82,0.07)' : 'rgba(127,154,120,0.08)',
              border: `1px solid ${(form.quote??0)-(form.deposit??form.paid??0) > 0 ? 'rgba(196,122,82,0.3)' : 'rgba(127,154,120,0.3)'}`,
            }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#7A6657', letterSpacing: '0.08em', marginBottom: 2 }}>BALANCE DUE (GBP)</p>
                <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, fontWeight: 500,
                  color: (form.quote??0)-(form.deposit??form.paid??0) > 0 ? '#C47A52' : '#7F9A78' }}>
                  {fmt(Math.max(0, (form.quote ?? 0) - (form.deposit ?? form.paid ?? 0)))}
                </p>
              </div>
              <PaymentBadge vendor={{ ...form, id: '' } as FullVendor}/>
            </div>
          )}
          <div style={grid2}>
            <div>
              <label style={lbl}>DEPOSIT DUE DATE (optional)</label>
              <input style={inp} type="date" value={form.depositDue || ''} onChange={set('depositDue')}/>
            </div>
            <div>
              <label style={lbl}>BALANCE DUE DATE (optional)</label>
              <input style={inp} type="date" value={form.balanceDue || ''} onChange={set('balanceDue')}/>
            </div>
          </div>
          <div>
            <label style={lbl}>NOTES</label>
            <textarea style={{ ...inp, resize: 'vertical', minHeight: 72 }} value={form.notes} onChange={set('notes')} placeholder="Package details, deposit info…"/>
          </div>

          {/* Budget sync info — automatic for booked vendors */}
          {form.status === 'booked' && (form.deposit ?? form.paid ?? 0) > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12,
              background: 'rgba(127,154,120,0.09)', border: '1px solid rgba(127,154,120,0.35)',
            }}>
              <span style={{ fontSize: 18 }}>⇄</span>
              <p style={{ fontSize: 12, color: '#5A7A54', margin: 0 }}>
                Deposit will appear automatically in Budget under <strong>{vendorBudgetCat(form.category)}</strong>
              </p>
            </div>
          )}

          {/* Divider */}
          <div style={{ height: 1, background: '#E8D5A3', margin: '4px 0' }}/>

          {/* Contract upload */}
          <ContractSection
            contract={form.contract}
            onChange={c => setForm(f => ({ ...f, contract: c }))}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 10, fontSize: 13,
            border: '1.5px solid #E8D5A3', background: 'transparent', color: '#7A6657', cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => {
            if (!form.name.trim()) return
            const dep = form.deposit ?? form.paid ?? 0
            onSave({
              id: initial?.id ?? uid(), ...form,
              quote:          form.quote ?? 0,
              deposit:        dep, paid: dep,
              cost:           form.quote ?? 0,
              booked:         form.status === 'booked',
              quoteCurrency,
              quoteLocal:     quoteLocal   === '' ? 0 : +quoteLocal,
              depositLocal:   depositLocal === '' ? 0 : +depositLocal,
            })
          }} disabled={!form.name.trim()} style={{ flex: 2, padding: 10, borderRadius: 10, fontSize: 13, fontWeight: 600,
            border: 'none', background: form.name.trim() ? '#3B2A22' : '#E8D5A3',
            color: form.name.trim() ? '#FFF8EE' : '#7A6657', cursor: form.name.trim() ? 'pointer' : 'default' }}>
            {initial ? 'Save changes' : 'Add vendor'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
interface Props { data: AppData; setData: (d: AppData | ((p: AppData) => AppData)) => void }

export function Vendors({ data, setData }: Props) {
  // Migrate any legacy 'researching' status to 'quoted' on read
  const vendors = (data.vendors as FullVendor[]).map(v =>
    (v.status as string) === 'researching' ? { ...v, status: 'quoted' as Status } : v
  )
  const [modal,      setModal]     = useState<'new' | FullVendor | null>(null)
  const [deleteId,   setDeleteId]  = useState<string | null>(null)
  const [search,     setSearch]    = useState('')
  const [catFilter,  setCatFilter] = useState('All')
  const { display: d } = useCurrencyContext()
  const [statFilter, setStatFilter] = useState<'all' | Status>('all')

  // Sync a vendor's deposit to the budget as a linked item
  const syncBudget = (v: FullVendor, budget: typeof data.budget) => {
    const deposit = v.deposit ?? v.paid ?? 0
    const linked  = budget.find(b => b.vendorId === v.id)

    // Only booked vendors with a deposit sync to budget
    if (v.status !== 'booked' || deposit <= 0) {
      return linked ? budget.filter(b => b.vendorId !== v.id) : budget
    }

    const item = {
      id:          linked?.id ?? uid(),
      category:    vendorBudgetCat(v.category),
      description: v.name,
      estimated:   v.quote ?? deposit,
      actual:      deposit,
      paid:        deposit >= (v.quote ?? deposit),
      notes:       `Linked from Vendors · ${v.category}`,
      vendorId:    v.id,
    }
    return linked
      ? budget.map(b => b.vendorId === v.id ? item : b)
      : [...budget, item]
  }

  const save = (v: FullVendor) => {
    const exists = vendors.find(x => x.id === v.id)
    setData(d => ({
      ...d,
      vendors: exists ? d.vendors.map(x => x.id === v.id ? v : x) : [...d.vendors, v],
      budget:  syncBudget(v, d.budget),
    }))
    setModal(null)
  }

  const del = (id: string) => {
    setData(d => ({
      ...d,
      vendors: d.vendors.filter(v => v.id !== id),
      budget:  d.budget.filter(b => b.vendorId !== id),   // remove linked budget item
    }))
    setDeleteId(null)
  }

  const booked         = vendors.filter(v => v.status === 'booked')
  const quotedOnly     = vendors.filter(v => v.status === 'quoted')
  // Only booked vendors count as committed spend
  const totalQuote     = booked.reduce((s, v) => s + (v.quote ?? 0), 0)
  const totalDeposits  = booked.reduce((s, v) => s + (v.deposit ?? v.paid ?? 0), 0)
  const totalBalance   = booked.reduce((s, v) => s + balanceRemaining(v), 0)
  // Quoted (unconfirmed) totals — shown separately for awareness
  const totalQuotedPending = quotedOnly.reduce((s, v) => s + (v.quote ?? 0), 0)
  const withContract   = vendors.filter(v => v.contract).length

  const catsPresent = ['All', ...CATEGORIES.filter(c => vendors.some(v => v.category === c))]
  const filtered = useMemo(() => {
    let list = vendors
    if (catFilter !== 'All')  list = list.filter(v => v.category === catFilter)
    if (statFilter !== 'all') list = list.filter(v => v.status === statFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(v =>
        v.name.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q) ||
        (v.contact ?? '').toLowerCase().includes(q) ||
        (v.email ?? '').toLowerCase().includes(q)
      )
    }
    return [...list].sort((a, b) => {
      const order = { booked: 0, quoted: 1 }
      return (order[a.status] ?? 3) - (order[b.status] ?? 3)
    })
  }, [vendors, catFilter, statFilter, search])

  return (
    <div className="page-content" style={{maxWidth: 980}}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 30, fontStyle: 'italic', color: '#3B2A22', margin: 0 }}>Vendors</h1>
            <SmallLeaf size={22} opacity={0.6} rotate={-15}/>
            <Frangipani size={26} opacity={0.5}/>
          </div>
          <p style={{ fontSize: 13, color: '#7A6657' }}>
            {vendors.length} vendor{vendors.length !== 1 ? 's' : ''} · {booked.length} booked · {withContract} contract{withContract !== 1 ? 's' : ''} uploaded
          </p>
          <div style={{ marginTop: 10 }}><CurrencyToggle /></div>
        </div>
        <button onClick={() => setModal('new')} style={{
          display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 12,
          background: '#3B2A22', color: '#FFF8EE', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={15} strokeWidth={2}/> Add vendor
        </button>
      </div>

      {/* ── Summary cards — booked vendors only ── */}
      <div className="grid-4" style={{ marginBottom: 8 }}>
        <SummaryCard label="BOOKED TOTAL"    value={totalQuote    > 0 ? d(totalQuote)   : '—'} sub={`${booked.length} confirmed vendor${booked.length !== 1 ? 's' : ''}`}    color="#7F9A78"/>
        <SummaryCard label="DEPOSITS PAID"   value={totalDeposits > 0 ? d(totalDeposits): '—'} sub="from booked vendors"   color="#7F9A78"/>
        <SummaryCard label="BALANCE DUE"     value={totalBalance  > 0 ? d(totalBalance) : '—'} sub="still outstanding"     color={totalBalance > 0 ? '#C47A52' : '#7A6657'}/>
        <SummaryCard label="CONTRACTS"       value={`${withContract} / ${vendors.length}`}        sub="uploaded"              color={withContract === vendors.length && vendors.length > 0 ? '#7F9A78' : '#C8A45D'}/>
      </div>
      {/* Quoted pipeline notice — not included in totals */}
      {totalQuotedPending > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
          borderRadius: 10, background: 'rgba(200,164,93,0.08)', border: '1px solid rgba(200,164,93,0.3)',
          marginBottom: 8, fontSize: 13, color: '#8B6914',
        }}>
          📋 <strong style={{ marginRight: 4 }}>{quotedOnly.length} quoted vendor{quotedOnly.length !== 1 ? 's' : ''}</strong>
          ({d(totalQuotedPending)}) not included in totals — mark as <em style={{ marginLeft: 4 }}>Booked</em> to commit to budget
        </div>
      )}
      {/* Outstanding balance bar */}
      {totalQuote > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ height: 6, borderRadius: 6, background: '#F2E3CF', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 6, transition: 'width 0.6s',
              width: `${Math.min(100, (totalDeposits / totalQuote) * 100)}%`,
              background: 'linear-gradient(90deg, #7F9A78, #A8BE9E)',
            }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
            <span style={{ fontSize: 11, color: '#7A6657' }}>{Math.round((totalDeposits / totalQuote) * 100)}% paid</span>
            <span style={{ fontSize: 11, color: totalBalance > 0 ? '#C47A52' : '#7F9A78', fontWeight: totalBalance > 0 ? 600 : 400 }}>
              {totalBalance > 0 ? `${fmt(totalBalance)} outstanding` : 'All paid ✓'}
            </span>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 28 }}><BaliBorder width={500} opacity={0.5}/></div>

      {/* ── Controls ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#7A6657' }}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vendors…"
            style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1.5px solid #E8D5A3', borderRadius: 10,
              background: '#FAF3E6', color: '#3B2A22', fontSize: 13, outline: 'none', fontFamily: 'Inter, sans-serif' }}/>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'booked', 'quoted'] as const).map(s => (
            <button key={s} onClick={() => setStatFilter(s)}
              style={{ padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                border: `1.5px solid ${statFilter === s ? '#C8A45D' : '#E8D5A3'}`,
                background: statFilter === s ? '#C8A45D18' : 'transparent',
                color: statFilter === s ? '#3B2A22' : '#7A6657' }}>
              {s === 'all' ? `All (${vendors.length})` : `${STATUS_CONFIG[s].label} (${vendors.filter(v => v.status === s).length})`}
            </button>
          ))}
        </div>
      </div>

      {catsPresent.length > 1 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
          {catsPresent.map(cat => (
            <button key={cat} onClick={() => setCatFilter(cat)}
              style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                border: `1.5px solid ${catFilter === cat ? '#C47A52' : '#E8D5A3'}`,
                background: catFilter === cat ? '#C47A5218' : 'transparent',
                color: catFilter === cat ? '#C47A52' : '#7A6657' }}>
              {cat !== 'All' && CAT_ICONS[cat] ? `${CAT_ICONS[cat]} ` : ''}{cat}
            </button>
          ))}
        </div>
      )}

      {/* ── Vendor list ── */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 24px', background: '#FAF3E6', borderRadius: 16, border: '1.5px solid #E8D5A3' }}>
          <div style={{ fontSize: 36, marginBottom: 14 }}>🏛️</div>
          <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: '#3B2A22', marginBottom: 8 }}>
            {search || catFilter !== 'All' || statFilter !== 'all' ? 'No vendors match your filter' : 'No vendors yet'}
          </p>
          <p style={{ fontSize: 13, color: '#7A6657' }}>
            {search || catFilter !== 'All' || statFilter !== 'all' ? 'Try adjusting your search or filters.' : 'Click "Add vendor" to start tracking your suppliers.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(v => (
            <VendorCard key={v.id} vendor={v} onEdit={setModal} onDelete={setDeleteId}/>
          ))}
        </div>
      )}

      {/* ── Export ── */}
      <div style={{ marginTop: 36 }}>
        <button onClick={() => exportJSON(data)} style={{
          display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 12,
          border: '1.5px solid #E8D5A3', background: '#FAF3E6', color: '#3B2A22', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          <FileJson size={14} strokeWidth={2}/> Export all data JSON
        </button>
      </div>

      {/* ── Modals ── */}
      {modal && (
        <VendorModal initial={modal === 'new' ? undefined : modal as FullVendor} onSave={save} onClose={() => setModal(null)}/>
      )}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,30,20,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <div style={{ background: '#FFF8EE', borderRadius: 20, padding: 36, maxWidth: 360, width: '100%', textAlign: 'center',
            boxShadow: '0 24px 60px rgba(42,30,20,0.2)', border: '1.5px solid #E8D5A3' }}>
            <Trash2 size={28} style={{ color: '#C47A52', marginBottom: 14 }} strokeWidth={1.5}/>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: '#3B2A22', marginBottom: 8 }}>Remove vendor?</h3>
            <p style={{ fontSize: 13, color: '#7A6657', marginBottom: 28 }}>
              <strong>{vendors.find(v => v.id === deleteId)?.name}</strong> and any uploaded contract will be permanently removed.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: 10, borderRadius: 10, fontSize: 13, border: '1.5px solid #E8D5A3', background: 'transparent', color: '#7A6657', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => del(deleteId)} style={{ flex: 1, padding: 10, borderRadius: 10, fontSize: 13, fontWeight: 600, border: 'none', background: '#C47A52', color: '#fff', cursor: 'pointer' }}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
