import { useMemo, useState } from 'react'
import { X, FileDown, CheckSquare, Square } from 'lucide-react'
import {
  generateMoodBoardPdf,
  MOOD_BOARD_PDF_PALETTE_SECTION,
  type MoodBoardPdfSectionId,
} from '../lib/moodBoardPdf'
import type { MoodBoardImage, MoodBoardSwatch } from '../lib/supabaseData'
import type { WeddingDetails } from '../types'

export type MoodBoardExportSection = {
  id: MoodBoardPdfSectionId
  label: string
  count: number
  icon?: string
}

type Props = {
  wedding: WeddingDetails
  images: MoodBoardImage[]
  swatches: MoodBoardSwatch[]
  sections: MoodBoardExportSection[]
  onClose: () => void
}

export function MoodBoardExportModal({
  wedding,
  images,
  swatches,
  sections,
  onClose,
}: Props) {
  const allIds = useMemo(() => sections.map(s => s.id), [sections])
  const [selected, setSelected] = useState<Set<MoodBoardPdfSectionId>>(
    () => new Set(allIds),
  )
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState<string | null>(null)

  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id))
  const noneSelected = selected.size === 0

  const toggle = (id: MoodBoardPdfSectionId) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(allIds))
  }

  const handleExport = async () => {
    if (noneSelected) return
    setGenerating(true)
    setError(null)
    setProgress('Preparing PDF…')
    try {
      await generateMoodBoardPdf({
        wedding,
        images,
        swatches,
        selectedSections: selected,
        onProgress: setProgress,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate PDF')
    } finally {
      setGenerating(false)
      setProgress('')
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(42,30,20,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100, padding: 16,
      }}
      onClick={e => e.target === e.currentTarget && !generating && onClose()}
    >
      <div
        style={{
          background: '#FFF8EE', borderRadius: 20, padding: 28,
          width: '100%', maxWidth: 440,
          boxShadow: '0 24px 80px rgba(42,30,20,0.22)',
          border: '1.5px solid #E8D5A3',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <h2 style={{
              fontFamily: 'Playfair Display, serif', fontSize: 20, fontStyle: 'italic',
              color: '#3B2A22', margin: 0,
            }}>
              Export to PDF
            </h2>
            <p style={{ fontSize: 12, color: '#7A6657', margin: '6px 0 0', lineHeight: 1.5 }}>
              Full-size images for vendors. Wedding details appear at the top.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={generating}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A6657' }}
          >
            <X size={16} />
          </button>
        </div>

        <button
          type="button"
          onClick={toggleAll}
          disabled={generating || !sections.length}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0 12px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 600, color: '#3B2A22', padding: 0,
          }}
        >
          {allSelected ? <CheckSquare size={16} color="#C8A45D" /> : <Square size={16} color="#7A6657" />}
          Select all
        </button>

        <div style={{
          display: 'flex', flexDirection: 'column', gap: 6,
          maxHeight: 280, overflowY: 'auto', marginBottom: 16,
        }}>
          {sections.map(section => {
            const checked = selected.has(section.id)
            return (
              <label
                key={section.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 10,
                  border: `1.5px solid ${checked ? '#C8A45D' : '#E8D5A3'}`,
                  background: checked ? 'rgba(200,164,93,0.08)' : '#FAF3E6',
                  cursor: generating ? 'default' : 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={generating}
                  onChange={() => toggle(section.id)}
                  style={{ accentColor: '#C8A45D' }}
                />
                <span style={{ flex: 1, fontSize: 13, color: '#3B2A22' }}>
                  {section.icon ? `${section.icon} ` : ''}{section.label}
                </span>
                <span style={{ fontSize: 11, color: '#7A6657' }}>{section.count}</span>
              </label>
            )
          })}
        </div>

        {progress && (
          <p style={{ fontSize: 12, color: '#7A6657', marginBottom: 12 }}>{progress}</p>
        )}
        {error && (
          <p style={{ fontSize: 12, color: '#C47A52', marginBottom: 12 }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={generating}
            style={{
              flex: 1, padding: 10, borderRadius: 10, fontSize: 13,
              border: '1.5px solid #E8D5A3', background: 'transparent',
              color: '#7A6657', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={generating || noneSelected}
            style={{
              flex: 2, padding: 10, borderRadius: 10, fontSize: 13, fontWeight: 600,
              border: 'none', background: '#3B2A22', color: '#FFF8EE',
              cursor: generating || noneSelected ? 'default' : 'pointer',
              opacity: generating || noneSelected ? 0.6 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <FileDown size={14} />
            {generating ? 'Generating…' : 'Download PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function buildMoodBoardExportSections(
  images: MoodBoardImage[],
  swatches: MoodBoardSwatch[],
  categories: string[],
  categoryIcons: Record<string, string>,
): MoodBoardExportSection[] {
  const sections: MoodBoardExportSection[] = []

  if (swatches.length > 0) {
    sections.push({
      id: MOOD_BOARD_PDF_PALETTE_SECTION,
      label: 'Colour Palette',
      count: swatches.length,
      icon: '🎨',
    })
  }

  for (const cat of categories) {
    const count = images.filter(i => i.category === cat).length
    if (count > 0) {
      sections.push({
        id: cat,
        label: cat,
        count,
        icon: categoryIcons[cat],
      })
    }
  }

  return sections
}