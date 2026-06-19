import { X, ExternalLink } from 'lucide-react'

type Props = {
  src: string
  caption?: string
  category?: string
  notes?: string
  onClose: () => void
}

export function FilePreviewModal({ src, caption, category, notes, onClose }: Props) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(42,30,20,0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 110, padding: 16,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: '#FFF8EE', borderRadius: 20, width: '100%', maxWidth: 960,
          maxHeight: '92vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(42,30,20,0.28)', border: '1.5px solid #E8D5A3',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1.5px solid #E8D5A3', flexShrink: 0,
        }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{
              fontFamily: 'Playfair Display, serif', fontSize: 18, fontStyle: 'italic',
              color: '#3B2A22', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {caption || 'Preview'}
            </h2>
            {category && (
              <p style={{ fontSize: 11, color: '#7A6657', margin: '4px 0 0' }}>{category}</p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px',
                borderRadius: 8, border: '1.5px solid #E8D5A3', background: '#FAF3E6',
                color: '#3B2A22', fontSize: 12, fontWeight: 600, textDecoration: 'none',
              }}
            >
              <ExternalLink size={13} /> Open
            </a>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A6657', padding: 4 }}
              aria-label="Close preview"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div style={{
          flex: 1, minHeight: 0, background: '#2A1E14',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <img
            src={src}
            alt={caption || 'Mood board image'}
            style={{
              maxWidth: '100%', maxHeight: 'calc(92vh - 140px)',
              objectFit: 'contain', borderRadius: 12,
              boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
            }}
          />
        </div>

        {notes && (
          <div style={{
            padding: '14px 20px', borderTop: '1.5px solid #E8D5A3',
            background: '#FAF3E6', flexShrink: 0,
          }}>
            <p style={{ fontSize: 12, color: '#7A6657', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
              {notes}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}