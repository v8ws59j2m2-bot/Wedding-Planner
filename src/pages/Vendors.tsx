import { useState, useMemo, useRef } from 'react'
import {
  Plus, Trash2, X, Search, FileJson,
  ChevronDown,
  Upload, FileText, Image as ImageIcon, Download, Eye,
  AlertTriangle, Paperclip, CheckCircle,
} from 'lucide-react'
import { SmallLeaf, Frangipani, BaliBorder } from '../components/Botanicals'
import { CurrencyToggle } from '../components/CurrencyToggle'
import type { Vendor, AppData } from '../types'
import { uid } from '../lib/helpers'

// ── helpers ───────────────────────────────────────────────────────────────────
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
  notes?: string
  contract?: ContractFile
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
const EMPTY: Omit<FullVendor, 'id'> = {
  name: '', category: CATEGORIES[0], status: 'quoted',
  contact: '', phone: '', email: '',
  website: '', notes: '',
}
const MAX_FILE_BYTES = 5 * 1024 * 1024  // 5 MB
const ACCEPTED = '.pdf,.jpg,.jpeg,.png,.webp'

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
    // Use blob URL instead of document.write — safer, avoids XSS vector
    try {
      const [header, b64] = contract.data.split(',')
      const mime = header.match(/:(.*?);/)?.[1] ?? contract.mimeType
      const bytes = atob(b64)
      const arr = new Uint8Array(bytes.length)
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
      const blob = new Blob([arr], { type: mime })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch {
      window.open(contract.data, '_blank', 'noopener,noreferrer')
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
  return (
    <div
      onClick={() => onEdit(vendor)}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(200,164,93,0.06)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#FAF3E6'}
      style={{
        background: '#FAF3E6', border: '1.5px solid #E8D5A3',
        borderRadius: 14, cursor: 'pointer',
        display: 'grid', gridTemplateColumns: '36px 1fr auto',
        alignItems: 'center', gap: 14, padding: '13px 18px',
        transition: 'background 0.15s',
      }}>

      {/* Icon */}
      <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(200,164,93,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
        {CAT_ICONS[vendor.category] ?? '📌'}
      </div>

      {/* Name + meta */}
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#3B2A22', marginBottom: 2 }}>{vendor.name}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: '#7A6657' }}>{vendor.category}</span>
          {vendor.contact && <span style={{ fontSize: 11, color: '#A89080' }}>· {vendor.contact}</span>}
          {vendor.email && <span style={{ fontSize: 11, color: '#A89080' }}>· {vendor.email}</span>}
          <ContractChip contract={vendor.contract}/>
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={e => { e.stopPropagation(); onDelete(vendor.id) }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C4B49A', padding: 4, lineHeight: 1 }}
        title="Remove vendor">
        <Trash2 size={13} strokeWidth={1.5}/>
      </button>
    </div>
  )
}

// ── Vendor modal ──────────────────────────────────────────────────────────────
function VendorModal({ initial, onSave, onClose }: {
  initial?: FullVendor; onSave: (v: FullVendor) => void; onClose: () => void
}) {
  const [form, setForm] = useState<Omit<FullVendor, 'id'>>(initial ? { ...initial } : { ...EMPTY })

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
          <div>
            <label style={lbl}>CATEGORY</label>
            <div style={{ position: 'relative' }}>
              <select style={{ ...inp, appearance: 'none', paddingRight: 28 }} value={form.category} onChange={set('category')}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#7A6657', pointerEvents: 'none' }}/>
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
          <div>
            <label style={lbl}>NOTES (optional)</label>
            <textarea style={{ ...inp, resize: 'vertical', minHeight: 72 }} value={form.notes} onChange={set('notes')} placeholder="Package details, contact notes…"/>
          </div>

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
            onSave({ id: initial?.id ?? uid(), ...form })
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
  const vendors = data.vendors as FullVendor[]
  const [modal,     setModal]    = useState<'new' | FullVendor | null>(null)
  const [deleteId,  setDeleteId] = useState<string | null>(null)
  const [search,    setSearch]   = useState('')
  const [catFilter, setCatFilter] = useState('All')

  const save = (v: FullVendor) => {
    const exists = vendors.find(x => x.id === v.id)
    setData(prev => ({
      ...prev,
      vendors: exists ? prev.vendors.map(x => x.id === v.id ? v : x) : [...prev.vendors, v],
    }))
    setModal(null)
  }

  const del = (id: string) => {
    setData(prev => ({ ...prev, vendors: prev.vendors.filter(v => v.id !== id) }))
    setDeleteId(null)
  }

  const withContract = vendors.filter(v => v.contract).length

  const catsPresent = ['All', ...CATEGORIES.filter(c => vendors.some(v => v.category === c))]
  const filtered = useMemo(() => {
    let list = vendors
    if (catFilter !== 'All') list = list.filter(v => v.category === catFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(v =>
        v.name.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q) ||
        (v.contact ?? '').toLowerCase().includes(q) ||
        (v.email ?? '').toLowerCase().includes(q)
      )
    }
    return [...list].sort((a, b) => a.name.localeCompare(b.name))
  }, [vendors, catFilter, search])

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
            {vendors.length} vendor{vendors.length !== 1 ? 's' : ''} · {withContract} contract{withContract !== 1 ? 's' : ''} uploaded
          </p>
          <div style={{ marginTop: 10 }}><CurrencyToggle /></div>
        </div>
        <button onClick={() => setModal('new')} style={{
          display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 12,
          background: '#3B2A22', color: '#FFF8EE', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={15} strokeWidth={2}/> Add vendor
        </button>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid-3" style={{ marginBottom: 16 }}>
        <SummaryCard label="TOTAL VENDORS" value={`${vendors.length}`}                     sub="in your directory"     color="#3B2A22"/>
        <SummaryCard label="CATEGORIES"    value={`${new Set(vendors.map(v => v.category)).size}`} sub="represented" color="#C8A45D"/>
        <SummaryCard label="CONTRACTS"     value={`${withContract} / ${vendors.length}`}   sub="uploaded"              color={withContract === vendors.length && vendors.length > 0 ? '#7F9A78' : '#C8A45D'}/>
      </div>

      <div style={{ marginBottom: 28 }}><BaliBorder width={500} opacity={0.5}/></div>

      {/* ── Controls ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#7A6657' }}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vendors…"
            style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1.5px solid #E8D5A3', borderRadius: 10,
              background: '#FAF3E6', color: '#3B2A22', fontSize: 13, outline: 'none', fontFamily: 'Inter, sans-serif' }}/>
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
            {search || catFilter !== 'All' ? 'No vendors match your filter' : 'No vendors yet'}
          </p>
          <p style={{ fontSize: 13, color: '#7A6657' }}>
            {search || catFilter !== 'All' ? 'Try adjusting your search or filters.' : 'Click "Add vendor" to start tracking your suppliers.'}
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
