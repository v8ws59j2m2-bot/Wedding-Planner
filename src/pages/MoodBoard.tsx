import { useState, useMemo, useRef } from 'react'
import {
  Plus, X, Edit2, Trash2, Search, FileJson, Upload,
  Palette, Image as ImageIcon, Grid3X3, Filter,
} from 'lucide-react'
import { SmallLeaf, Frangipani, BaliBorder } from '../components/Botanicals'
import { uid } from '../lib/helpers'
import { uploadMoodImage, type MoodBoardImage, type MoodBoardSwatch } from '../lib/supabaseData'
import { supabase } from '../lib/supabase'
import { useMoodBoard } from '../hooks/useMoodBoard'
import type { AppData } from '../types'

// ── helpers ───────────────────────────────────────────────────────────────────
function exportJSON(data: AppData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url
  a.download = `wedding-data-${new Date().toISOString().split('T')[0]}.json`
  a.click(); URL.revokeObjectURL(url)
}

function contrastColor(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) > 160 ? '#3B2A22' : '#FFF8EE'
}

// Cache-bust Supabase Storage URLs for fresh loads across devices
function getDisplaySrc(src: string, refreshKey: number): string {
  if (!src || src.startsWith('data:')) return src
  // Cache-bust Supabase Storage URLs using refreshKey (bumped on data changes/realtime)
  // This avoids browser/CDN caching issues where new uploads don't appear immediately
  const sep = src.includes('?') ? '&' : '?'
  return `${src}${sep}v=${refreshKey}`
}

// ── constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
  'Overall Vision', 'Ceremony', 'Reception', 'Florals',
  'Attire', 'Color Palette', 'Décor', 'Venue', 'Food & Cake',
  'Hair & Beauty', 'Stationery', 'Honeymoon',
]

const CAT_ICONS: Record<string, string> = {
  'Overall Vision': '✨', 'Ceremony': '💍', 'Reception': '🥂',
  'Florals': '🌸', 'Attire': '👗', 'Color Palette': '🎨',
  'Décor': '🕯️', 'Venue': '🏛️', 'Food & Cake': '🎂',
  'Hair & Beauty': '💄', 'Stationery': '📜', 'Honeymoon': '🌴',
}

// ── Swatch editor modal ───────────────────────────────────────────────────────
function SwatchModal({ initial, onSave, onClose }: {
  initial?: MoodBoardSwatch; onSave: (s: MoodBoardSwatch) => void; onClose: () => void
}) {
  const [hex,  setHex]  = useState(initial?.hex  ?? '#C8A45D')
  const [name, setName] = useState(initial?.name ?? '')

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px',
    border: '1.5px solid #E8D5A3', borderRadius: 10,
    background: '#FFFDF7', color: '#3B2A22', fontSize: 13,
    fontFamily: 'Inter, sans-serif', outline: 'none',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,30,20,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#FFF8EE', borderRadius: 20, padding: 32,
        width: '100%', maxWidth: 380, boxShadow: '0 24px 80px rgba(42,30,20,0.22)',
        border: '1.5px solid #E8D5A3' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, fontStyle: 'italic', color: '#3B2A22', margin: 0 }}>
            {initial ? 'Edit colour' : 'Add colour'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A6657' }}><X size={16}/></button>
        </div>
        {/* Big colour preview */}
        <div style={{
          height: 80, borderRadius: 12, backgroundColor: hex,
          marginBottom: 20, border: '1.5px solid #E8D5A3',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: contrastColor(hex) }}>{hex}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#7A6657', letterSpacing: '0.08em', marginBottom: 5 }}>HEX COLOR</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="color" value={hex} onChange={e => setHex(e.target.value)}
                style={{ width: 44, height: 36, border: '1.5px solid #E8D5A3', borderRadius: 8, cursor: 'pointer', padding: 2 }}/>
              <input style={inp} value={hex} onChange={e => setHex(e.target.value)} placeholder="#C8A45D"/>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#7A6657', letterSpacing: '0.08em', marginBottom: 5 }}>COLOUR NAME</label>
            <input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Warm Gold"/>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 10, fontSize: 13,
            border: '1.5px solid #E8D5A3', background: 'transparent', color: '#7A6657', cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => { onSave({ id: initial?.id ?? uid(), hex, name: name || hex }); onClose() }}
            style={{ flex: 2, padding: 10, borderRadius: 10, fontSize: 13, fontWeight: 600,
              border: 'none', background: '#3B2A22', color: '#FFF8EE', cursor: 'pointer' }}>
            {initial ? 'Save' : 'Add colour'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Image card ────────────────────────────────────────────────────────────────
function ImageCard({ img, onEdit, onDelete, refreshKey = 0 }: {
  img: MoodBoardImage; onEdit: (i: MoodBoardImage) => void; onDelete: (id: string) => void; refreshKey?: number
}) {
  const [hover, setHover] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)

  // Cache-busted src using refreshKey (updated on realtime/data change)
  // On error, force additional bust + retry
  const baseSrc = getDisplaySrc(img.src, refreshKey)
  const displaySrc = loadError 
    ? `${baseSrc}${baseSrc.includes('?') ? '&' : '?'}retry=${loadAttempt}-${Date.now()}`
    : baseSrc

  const handleImageError = () => {
    if (loadAttempt < 2) {  // retry up to 2 times with fresh bust
      setLoadError(true)
      setLoadAttempt(a => a + 1)
      // The src change will trigger reload
    }
  }

  const handleImageLoad = () => {
    if (loadError) setLoadError(false)
  }

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderRadius: 16, overflow: 'hidden',
        border: '1.5px solid #E8D5A3',
        background: '#FAF3E6',
        transition: 'transform 0.2s, box-shadow 0.2s',
        transform: hover ? 'translateY(-3px)' : 'none',
        boxShadow: hover ? '0 12px 32px rgba(42,30,20,0.12)' : '0 2px 8px rgba(42,30,20,0.05)',
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      {/* Image */}
      <div style={{ aspectRatio: '4/3', overflow: 'hidden', position: 'relative', background: '#F2E3CF' }}>
        <img 
          src={displaySrc} 
          alt={img.caption}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          loading="lazy"
          onError={handleImageError}
          onLoad={handleImageLoad}
        />
        {loadError && (
          <div 
            onClick={(e) => { e.stopPropagation(); setLoadError(false); setLoadAttempt(0); /* will retry on next render */ }}
            style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 11, textAlign: 'center', padding: 8, cursor: 'pointer'
            }}>
            Failed to load image<br />Click to retry
          </div>
        )}
        {/* Hover overlay with actions */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(42,30,20,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          opacity: hover ? 1 : 0, transition: 'opacity 0.2s',
        }}>
          <button onClick={e => { e.stopPropagation(); onEdit(img) }}
            style={{ background: 'rgba(255,248,238,0.95)', border: 'none', borderRadius: 8,
              padding: '7px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#3B2A22',
              display: 'flex', alignItems: 'center', gap: 5 }}>
            <Edit2 size={12}/> Edit
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(img.id) }}
            style={{ background: 'rgba(196,122,82,0.95)', border: 'none', borderRadius: 8,
              padding: '7px 10px', cursor: 'pointer', color: '#fff' }}>
            <Trash2 size={12}/>
          </button>
        </div>
        {/* Category tag */}
        <div style={{
          position: 'absolute', top: 8, left: 8,
          background: 'rgba(42,30,20,0.65)', borderRadius: 20,
          padding: '2px 8px', fontSize: 10, color: '#E8D5A3', fontWeight: 600,
        }}>
          {CAT_ICONS[img.category] ?? '📌'} {img.category}
        </div>
      </div>
      {/* Caption */}
      {(img.caption || img.notes) && (
        <div style={{ padding: '10px 14px 12px' }}>
          {img.caption && (
            <p style={{ fontSize: 12, fontWeight: 600, color: '#3B2A22', marginBottom: 2, lineHeight: 1.4 }}>{img.caption}</p>
          )}
          {img.notes && (
            <p style={{ fontSize: 11, color: '#7A6657', fontStyle: 'italic', lineHeight: 1.4 }}>{img.notes}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Image edit modal ──────────────────────────────────────────────────────────
function ImageModal({ initial, onSave, onClose }: {
  initial?: MoodBoardImage; onSave: (i: MoodBoardImage) => void; onClose: () => void
}) {
  const [form, setForm] = useState({
    caption:  initial?.caption  ?? '',
    category: initial?.category ?? CATEGORIES[0],
    notes:    initial?.notes    ?? '',
  })
  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px',
    border: '1.5px solid #E8D5A3', borderRadius: 10,
    background: '#FFFDF7', color: '#3B2A22', fontSize: 13,
    fontFamily: 'Inter, sans-serif', outline: 'none',
  }
  const lbl: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 700, color: '#7A6657', letterSpacing: '0.08em', marginBottom: 5 }

  if (!initial) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(42,30,20,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#FFF8EE', borderRadius: 20, padding: 32, width: '100%', maxWidth: 500,
        boxShadow: '0 24px 80px rgba(42,30,20,0.22)', border: '1.5px solid #E8D5A3',
        display: 'flex', gap: 24, maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Thumbnail */}
        <div style={{ width: 120, flexShrink: 0 }}>
          <img src={getDisplaySrc(initial.src, 0)} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 12, border: '1.5px solid #E8D5A3' }}/>
        </div>
        {/* Form */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, fontStyle: 'italic', color: '#3B2A22', margin: 0 }}>Edit image</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A6657' }}><X size={16}/></button>
          </div>
          <div>
            <label style={lbl}>CAPTION</label>
            <input style={inp} value={form.caption} onChange={e => setForm(f => ({ ...f, caption: e.target.value }))} placeholder="e.g. Table floral arrangement"/>
          </div>
          <div>
            <label style={lbl}>CATEGORY</label>
            <div style={{ position: 'relative' }}>
              <select style={{ ...inp, appearance: 'none', paddingRight: 28 }}
                value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={lbl}>NOTES</label>
            <textarea style={{ ...inp, resize: 'vertical', minHeight: 64 }}
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Supplier, colours, why you love it…"/>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button onClick={onClose} style={{ flex: 1, padding: 9, borderRadius: 10, fontSize: 13,
              border: '1.5px solid #E8D5A3', background: 'transparent', color: '#7A6657', cursor: 'pointer' }}>Cancel</button>
            <button onClick={() => { onSave({ ...initial, ...form }); onClose() }}
              style={{ flex: 2, padding: 9, borderRadius: 10, fontSize: 13, fontWeight: 600,
                border: 'none', background: '#3B2A22', color: '#FFF8EE', cursor: 'pointer' }}>Save</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Upload drop zone ───────────────────────────────────────────────────────────
function DropZone({ category, onAdd }: { category: string; onAdd: (imgs: MoodBoardImage[]) => void }) {
  const [drag, setDrag] = useState(false)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const process = async (files: FileList | null) => {
    if (!files?.length) return
    setLoading(true)
    setProgress(0)
    const valid = Array.from(files).filter(f => f.type.startsWith('image/'))

    const results: MoodBoardImage[] = []
    for (let i = 0; i < valid.length; i++) {
      const f = valid[i]
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Login required')
        const url = await uploadMoodImage(f)
        results.push({
          id: uid(),
          src: url,
          caption: f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
          category,
          notes: '',
        })
      } catch (err) {
        console.error('[moodboard] upload failed', f.name, err)
        alert(`Could not upload "${f.name}". Please check your connection and try again.`)
      }
      setProgress(Math.round(((i + 1) / valid.length) * 100))
    }

    onAdd(results)
    setLoading(false)
    setProgress(0)
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); process(e.dataTransfer.files) }}
      onClick={() => inputRef.current?.click()}
      style={{
        border: `2px dashed ${drag ? '#C8A45D' : '#D4C5A4'}`,
        borderRadius: 16, padding: '32px 24px', textAlign: 'center',
        cursor: 'pointer', transition: 'all 0.2s', marginBottom: 32,
        background: drag ? 'rgba(200,164,93,0.07)' : 'transparent',
      }}
    >
      <input ref={inputRef} type="file" accept="image/*" multiple hidden
        onChange={e => process(e.target.files)}/>
      {loading ? (
        <div>
          <p style={{ fontSize: 13, color: '#7A6657' }}>Uploading… {progress}%</p>
          <div style={{ width: '60%', height: 4, background: '#E8D5A3', margin: '8px auto', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: '#C8A45D', transition: 'width .2s' }} />
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 10, opacity: 0.6 }}>
            <Frangipani size={32} opacity={1}/>
            <Upload size={22} style={{ color: '#C8A45D', marginTop: 4 }}/>
            <Frangipani size={32} opacity={1}/>
          </div>
          <p style={{ fontSize: 14, fontFamily: 'Playfair Display, serif', fontStyle: 'italic', color: '#3B2A22', marginBottom: 4 }}>
            Drop images here or click to upload
          </p>
          <p style={{ fontSize: 12, color: '#7A6657' }}>JPG, PNG, WEBP — multiple files supported</p>
        </>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
interface Props { data: AppData; setData: (d: AppData | ((p: AppData) => AppData)) => void }

export function MoodBoard({ data }: Props) {
  const { board, loading, refreshKey, addImages, saveImage, deleteImage, saveSwatch, deleteSwatch } = useMoodBoard()
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [search, setSearch]                 = useState('')
  const [editImage, setEditImage]           = useState<MoodBoardImage | null>(null)
  const [swatchModal, setSwatchModal]       = useState<'new' | MoodBoardSwatch | null>(null)
  const [activeTab, setActiveTab]           = useState<'images' | 'palette'>('images')

  const images   = board.images
  const swatches = board.swatches

  const filtered = useMemo(() => {
    let list = images
    if (activeCategory !== 'All') list = list.filter(i => i.category === activeCategory)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(i => i.caption.toLowerCase().includes(q) || (i.notes ?? '').toLowerCase().includes(q) || i.category.toLowerCase().includes(q))
    }
    return list
  }, [images, activeCategory, search])

  const catCounts = useMemo(() => {
    const map: Record<string, number> = { All: images.length }
    images.forEach(i => { map[i.category] = (map[i.category] ?? 0) + 1 })
    return map
  }, [images])

  const catsWithImages = ['All', ...CATEGORIES.filter(c => (catCounts[c] ?? 0) > 0)]

  if (loading) {
    return (
      <div className="page-content" style={{ maxWidth: 1100, textAlign: 'center', padding: 80 }}>
        <p style={{ color: '#C8A45D', fontSize: 13 }}>Loading mood board…</p>
      </div>
    )
  }

  return (
    <div className="page-content" style={{maxWidth: 1100}}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 30, fontStyle: 'italic', color: '#3B2A22', margin: 0 }}>
              Mood Board
            </h1>
            <SmallLeaf size={22} opacity={0.6} rotate={-15}/>
            <Frangipani size={26} opacity={0.5}/>
          </div>
          <p style={{ fontSize: 13, color: '#7A6657' }}>
            {images.length} image{images.length !== 1 ? 's' : ''} · {swatches.length} colour{swatches.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: '#F2E3CF', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {([['images', '🖼️ Inspiration'], ['palette', '🎨 Colour Palette']] as const).map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '8px 20px', borderRadius: 9, fontSize: 13, fontWeight: 500,
            border: 'none', cursor: 'pointer', transition: 'all 0.15s',
            background: activeTab === tab ? '#FFF8EE' : 'transparent',
            color: activeTab === tab ? '#3B2A22' : '#7A6657',
            boxShadow: activeTab === tab ? '0 1px 4px rgba(59,42,34,0.1)' : 'none',
          }}>{label}</button>
        ))}
      </div>

      <div style={{ marginBottom: 28 }}>
        <BaliBorder width={500} opacity={0.5}/>
      </div>

      {/* ══════════ IMAGES TAB ══════════ */}
      {activeTab === 'images' && (
        <>
          {/* Upload zone */}
          <DropZone
            category={activeCategory === 'All' ? CATEGORIES[0] : activeCategory}
            onAdd={addImages}
          />

          {/* Search + filter */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: '1 1 220px' }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#7A6657' }}/>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search images…"
                style={{
                  width: '100%', padding: '9px 12px 9px 34px',
                  border: '1.5px solid #E8D5A3', borderRadius: 10,
                  background: '#FAF3E6', color: '#3B2A22', fontSize: 13, outline: 'none',
                  fontFamily: 'Inter, sans-serif',
                }}/>
            </div>
            {/* Category filter */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <Filter size={13} style={{ color: '#7A6657' }}/>
              {catsWithImages.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                    cursor: 'pointer', transition: 'all 0.15s',
                    border: `1.5px solid ${activeCategory === cat ? '#C8A45D' : '#E8D5A3'}`,
                    background: activeCategory === cat ? '#C8A45D18' : 'transparent',
                    color: activeCategory === cat ? '#3B2A22' : '#7A6657',
                  }}>
                  {cat !== 'All' && CAT_ICONS[cat] ? `${CAT_ICONS[cat]} ` : ''}{cat}
                  {catCounts[cat] ? <span style={{ marginLeft: 4, opacity: 0.7 }}>({catCounts[cat]})</span> : null}
                </button>
              ))}
            </div>
          </div>

          {/* Image grid */}
          {filtered.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '56px 24px',
              background: '#FAF3E6', borderRadius: 16, border: '1.5px solid #E8D5A3',
            }}>
              <ImageIcon size={36} style={{ color: '#E8D5A3', marginBottom: 14 }} strokeWidth={1}/>
              <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: '#3B2A22', marginBottom: 8 }}>
                {search || activeCategory !== 'All' ? 'No images match your filter' : 'Your mood board is empty'}
              </p>
              <p style={{ fontSize: 13, color: '#7A6657' }}>
                {search || activeCategory !== 'All'
                  ? 'Try adjusting your search or category.'
                  : 'Drop images above to start building your vision.'}
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 20,
            }}>
              {filtered.map(img => (
                <ImageCard key={img.id} img={img}
                  onEdit={setEditImage} onDelete={deleteImage} refreshKey={refreshKey}/>
              ))}
            </div>
          )}
        </>
      )}

      {/* ══════════ PALETTE TAB ══════════ */}
      {activeTab === 'palette' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 3, height: 18, backgroundColor: '#C47A52', borderRadius: 2 }}/>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: '#3B2A22', margin: 0 }}>
                Wedding Colour Palette
              </h2>
            </div>
            <button onClick={() => setSwatchModal('new')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 18px', borderRadius: 10,
                background: '#3B2A22', color: '#FFF8EE',
                border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>
              <Plus size={13}/> Add colour
            </button>
          </div>

          {/* Large palette strip */}
          {swatches.length > 0 && (
            <div style={{
              display: 'flex', height: 80, borderRadius: 16, overflow: 'hidden',
              border: '1.5px solid #E8D5A3', marginBottom: 32,
              boxShadow: '0 4px 20px rgba(42,30,20,0.08)',
            }}>
              {swatches.map(s => (
                <div key={s.id} style={{ flex: 1, backgroundColor: s.hex, position: 'relative' }}
                  title={`${s.name} · ${s.hex}`}/>
              ))}
            </div>
          )}

          {/* Swatch cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 16,
          }}>
            {swatches.map(s => (
              <div key={s.id} style={{
                borderRadius: 16, overflow: 'hidden',
                border: '1.5px solid #E8D5A3',
                boxShadow: '0 2px 8px rgba(42,30,20,0.05)',
              }}>
                {/* Colour block */}
                <div style={{
                  height: 100, backgroundColor: s.hex,
                  position: 'relative',
                  display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
                  padding: 8,
                }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: contrastColor(s.hex),
                    background: `${s.hex}88`,
                    padding: '2px 6px', borderRadius: 6,
                    backdropFilter: 'blur(4px)',
                  }}>{s.hex}</span>
                </div>
                {/* Name + actions */}
                <div style={{ padding: '10px 12px', background: '#FAF3E6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#3B2A22' }}>{s.name}</span>
                  <div style={{ display: 'flex', gap: 2 }}>
                    <button onClick={() => setSwatchModal(s)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A6657', padding: 3 }}>
                      <Edit2 size={12} strokeWidth={1.5}/>
                    </button>
                    <button onClick={() => deleteSwatch(s.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C47A52', padding: 3 }}>
                      <Trash2 size={12} strokeWidth={1.5}/>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Add new swatch card */}
            <button onClick={() => setSwatchModal('new')}
              style={{
                borderRadius: 16, border: '2px dashed #D4C5A4',
                background: 'transparent', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 8, height: 136, transition: 'all 0.2s', color: '#7A6657',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#C8A45D'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = '#D4C5A4'}
            >
              <Palette size={20} strokeWidth={1.5}/>
              <span style={{ fontSize: 12, fontWeight: 500 }}>Add colour</span>
            </button>
          </div>

          {/* Palette inspiration note */}
          <div style={{
            marginTop: 32, padding: '16px 20px', borderRadius: 12,
            background: 'rgba(200,164,93,0.08)', border: '1px solid rgba(200,164,93,0.3)',
            display: 'flex', gap: 12, alignItems: 'flex-start',
          }}>
            <Grid3X3 size={16} style={{ color: '#C8A45D', flexShrink: 0, marginTop: 1 }} strokeWidth={1.5}/>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#3B2A22', marginBottom: 4 }}>Your palette is already beautiful</p>
              <p style={{ fontSize: 12, color: '#7A6657', lineHeight: 1.6 }}>
                The colours from your wedding PDF and website — warm ivory, soft gold, terracotta, sage green and deep cocoa — are pre-loaded above as a starting point. Add or edit to match your final vision.
              </p>
            </div>
          </div>
        </>
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
      {editImage && (
        <ImageModal initial={editImage} onSave={saveImage} onClose={() => setEditImage(null)}/>
      )}
      {swatchModal && (
        <SwatchModal
          initial={swatchModal === 'new' ? undefined : swatchModal as MoodBoardSwatch}
          onSave={saveSwatch} onClose={() => setSwatchModal(null)}
        />
      )}
    </div>
  )
}
