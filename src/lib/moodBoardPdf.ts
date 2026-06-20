import { jsPDF } from 'jspdf'
import { getMoodBoardFileKind } from './moodBoardFiles'
import type { MoodBoardImage, MoodBoardSwatch } from './supabaseData'
import type { WeddingDetails } from '../types'

export const MOOD_BOARD_PDF_PALETTE_SECTION = 'palette' as const
export type MoodBoardPdfCategorySection = string
export type MoodBoardPdfSectionId = typeof MOOD_BOARD_PDF_PALETTE_SECTION | MoodBoardPdfCategorySection

export type MoodBoardPdfExportOptions = {
  wedding: WeddingDetails
  images: MoodBoardImage[]
  swatches: MoodBoardSwatch[]
  selectedSections: Set<MoodBoardPdfSectionId>
  onProgress?: (message: string) => void
}

const PAGE_W = 210
const PAGE_H = 297
const MARGIN = 16
const FOOTER_H = 12
const CONTENT_W = PAGE_W - MARGIN * 2
const USABLE_H = PAGE_H - MARGIN - FOOTER_H

const JPEG_QUALITY = 0.82
const MAX_IMAGE_PX = 1400

const GRID_COLS = 2
const GRID_GAP = 5
const CELL_W = (CONTENT_W - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS
const CELL_IMG_H = 52
const CELL_CAPTION_H = 9
const ROW_H = CELL_IMG_H + CELL_CAPTION_H + GRID_GAP
const SECTION_GAP = 10

const COL = {
  cocoa: [59, 42, 34] as [number, number, number],
  muted: [122, 102, 87] as [number, number, number],
  gold: [200, 164, 93] as [number, number, number],
  sand: [232, 213, 163] as [number, number, number],
  ivory: [255, 248, 238] as [number, number, number],
  cream: [250, 243, 230] as [number, number, number],
}

type LoadedImage = {
  dataUrl: string
  width: number
  height: number
}

type GridCell = {
  image: MoodBoardImage
  loaded: LoadedImage | null
}

function formatWeddingDate(iso: string): string {
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
  } catch {
    return iso
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  if (h.length !== 6) return COL.cocoa
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

function fitInBox(
  srcW: number,
  srcH: number,
  maxW: number,
  maxH: number,
): { w: number; h: number } {
  const scale = Math.min(maxW / srcW, maxH / srcH)
  return { w: srcW * scale, h: srcH * scale }
}

async function loadImageForPdf(src: string): Promise<LoadedImage | null> {
  if (!src || getMoodBoardFileKind(src) !== 'image') return null

  const encode = (img: HTMLImageElement): LoadedImage => {
    let w = img.naturalWidth
    let h = img.naturalHeight
    const longEdge = Math.max(w, h)
    if (longEdge > MAX_IMAGE_PX) {
      const scale = MAX_IMAGE_PX / longEdge
      w = Math.round(w * scale)
      h = Math.round(h * scale)
    }

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas unavailable')
    ctx.drawImage(img, 0, 0, w, h)

    return {
      dataUrl: canvas.toDataURL('image/jpeg', JPEG_QUALITY),
      width: w,
      height: h,
    }
  }

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.crossOrigin = 'anonymous'
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Image load failed'))
      el.src = src
    })
    return encode(img)
  } catch {
    try {
      const res = await fetch(src)
      if (!res.ok) return null
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image()
          el.onload = () => resolve(el)
          el.onerror = () => reject(new Error('Blob image load failed'))
          el.src = objectUrl
        })
        return encode(img)
      } finally {
        URL.revokeObjectURL(objectUrl)
      }
    } catch {
      return null
    }
  }
}

class MoodBoardPdfBuilder {
  private doc: jsPDF
  private y = MARGIN

  constructor() {
    this.doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  }

  private ensureSpace(mm: number) {
    if (this.y + mm > USABLE_H) {
      this.doc.addPage()
      this.paintPageBackground()
      this.y = MARGIN
    }
  }

  private paintPageBackground() {
    this.doc.setFillColor(...COL.ivory)
    this.doc.rect(0, 0, PAGE_W, PAGE_H, 'F')
  }

  private drawHeader(wedding: WeddingDetails) {
    this.paintPageBackground()

    this.doc.setTextColor(...COL.cocoa)
    this.doc.setFont('times', 'italic')
    this.doc.setFontSize(24)
    this.doc.text('Mood Board', MARGIN, this.y + 7)

    this.y += 12
    this.doc.setDrawColor(...COL.gold)
    this.doc.setLineWidth(0.5)
    this.doc.line(MARGIN, this.y, PAGE_W - MARGIN, this.y)
    this.y += 8

    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(15)
    this.doc.text(`${wedding.partner1} & ${wedding.partner2}`, MARGIN, this.y)
    this.y += 7

    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(10)
    this.doc.setTextColor(...COL.muted)
    const lines = [
      formatWeddingDate(wedding.date),
      wedding.venue,
      wedding.location,
      wedding.theme ? `Theme: ${wedding.theme}` : '',
    ].filter(Boolean)
    for (const line of lines) {
      this.doc.text(line, MARGIN, this.y)
      this.y += 5
    }

    this.y += 4
  }

  /** Plain-text headings only — no emojis (jsPDF cannot render them reliably). */
  private drawSectionTitle(title: string) {
    this.ensureSpace(16)
    this.doc.setFillColor(...COL.gold)
    this.doc.roundedRect(MARGIN, this.y - 3, 2.5, 9, 1, 1, 'F')

    this.doc.setTextColor(...COL.cocoa)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(13)
    this.doc.text(title, MARGIN + 6, this.y + 3)
    this.y += 10

    this.doc.setDrawColor(...COL.sand)
    this.doc.setLineWidth(0.25)
    this.doc.line(MARGIN, this.y, PAGE_W - MARGIN, this.y)
    this.y += 6
  }

  private drawPalette(swatches: MoodBoardSwatch[]) {
    if (!swatches.length) return
    this.drawSectionTitle('Colour Palette')

    const stripH = 12
    this.ensureSpace(stripH + 18)
    const swW = CONTENT_W / swatches.length
    swatches.forEach((sw, i) => {
      const x = MARGIN + i * swW
      this.doc.setFillColor(...hexToRgb(sw.hex))
      this.doc.rect(x, this.y, swW - 0.3, stripH, 'F')
    })
    this.y += stripH + 3

    this.doc.setFontSize(7.5)
    swatches.forEach((sw, i) => {
      const x = MARGIN + i * swW + swW / 2
      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(...COL.cocoa)
      this.doc.text(sw.name, x, this.y, { align: 'center', maxWidth: swW - 2 })
      this.doc.setTextColor(...COL.muted)
      this.doc.text(sw.hex, x, this.y + 3.2, { align: 'center', maxWidth: swW - 2 })
    })
    this.y += 12 + SECTION_GAP
  }

  private drawGridCell(cell: GridCell, x: number, y: number) {
    this.doc.setFillColor(...COL.cream)
    this.doc.roundedRect(x, y, CELL_W, CELL_IMG_H, 1.5, 1.5, 'F')

    if (cell.loaded) {
      const { w, h } = fitInBox(cell.loaded.width, cell.loaded.height, CELL_W - 2, CELL_IMG_H - 2)
      const ix = x + (CELL_W - w) / 2
      const iy = y + (CELL_IMG_H - h) / 2
      this.doc.addImage(cell.loaded.dataUrl, 'JPEG', ix, iy, w, h, undefined, 'MEDIUM')
    } else {
      this.doc.setFontSize(8)
      this.doc.setTextColor(...COL.muted)
      this.doc.text('Image unavailable', x + CELL_W / 2, y + CELL_IMG_H / 2, { align: 'center' })
    }

    const caption = cell.image.caption?.trim() || 'Untitled'
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(7.5)
    this.doc.setTextColor(...COL.cocoa)
    const truncated = this.doc.splitTextToSize(caption, CELL_W - 2).slice(0, 2)
    this.doc.text(truncated, x + 1, y + CELL_IMG_H + 4)
  }

  private drawImageGrid(cells: GridCell[]) {
    for (let i = 0; i < cells.length; i += GRID_COLS) {
      this.ensureSpace(ROW_H)
      const row = cells.slice(i, i + GRID_COLS)
      row.forEach((cell, col) => {
        const x = MARGIN + col * (CELL_W + GRID_GAP)
        this.drawGridCell(cell, x, this.y)
      })
      this.y += ROW_H
    }
    this.y += SECTION_GAP
  }

  async build(options: MoodBoardPdfExportOptions): Promise<jsPDF> {
    const { wedding, images, swatches, selectedSections, onProgress } = options

    this.drawHeader(wedding)

    if (selectedSections.has(MOOD_BOARD_PDF_PALETTE_SECTION)) {
      onProgress?.('Adding colour palette...')
      this.drawPalette(swatches)
    }

    const categories = [...selectedSections].filter(
      (s): s is string => s !== MOOD_BOARD_PDF_PALETTE_SECTION,
    )

    for (const category of categories) {
      const sectionImages = images.filter(
        i => i.category === category && getMoodBoardFileKind(i.src) === 'image',
      )
      if (!sectionImages.length) continue

      onProgress?.(`Adding ${category}...`)
      this.drawSectionTitle(category)

      const cells: GridCell[] = []
      for (const img of sectionImages) {
        onProgress?.(`Loading ${img.caption || category}...`)
        const loaded = await loadImageForPdf(img.src)
        cells.push({ image: img, loaded })
      }
      this.drawImageGrid(cells)
    }

    const pageCount = this.doc.getNumberOfPages()
    for (let p = 1; p <= pageCount; p++) {
      this.doc.setPage(p)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(7.5)
      this.doc.setTextColor(...COL.muted)
      this.doc.text(
        `${wedding.partner1} & ${wedding.partner2} - Mood Board - Page ${p} of ${pageCount}`,
        PAGE_W / 2,
        PAGE_H - 8,
        { align: 'center' },
      )
    }

    return this.doc
  }
}

export async function generateMoodBoardPdf(options: MoodBoardPdfExportOptions): Promise<void> {
  const builder = new MoodBoardPdfBuilder()
  const doc = await builder.build(options)
  const slug = `${options.wedding.partner1}-${options.wedding.partner2}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const date = new Date().toISOString().split('T')[0]
  doc.save(`mood-board-${slug}-${date}.pdf`)
}