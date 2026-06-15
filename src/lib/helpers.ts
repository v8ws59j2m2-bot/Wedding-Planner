// ─────────────────────────────────────────────────────────────────────────────
// Pure helper functions — no React, no side effects.
// Used across pages and the data service.
// ─────────────────────────────────────────────────────────────────────────────

import type { Guest, Vendor } from '../types'

// ── IDs ───────────────────────────────────────────────────────────────────────
export function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

// ── Formatting ────────────────────────────────────────────────────────────────
export function fmt(n: number): string {
  return '£' + n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function base64Size(b64: string): number {
  const base = b64.split(',')[1] ?? b64
  const padding = (base.endsWith('==') ? 2 : base.endsWith('=') ? 1 : 0)
  return Math.floor((base.length / 4) * 3) - padding
}

// ── Guest helpers ─────────────────────────────────────────────────────────────
export function guestDisplayName(g: Guest): string {
  if (g.firstName || g.lastName) {
    return `${g.firstName ?? ''} ${g.lastName ?? ''}`.trim()
  }
  // Legacy: strip "&" from combined name strings like "Sarah & Tom"
  return g.name.split('&')[0].trim()
}

export function guestAgeCategory(g: Guest): 'adult' | 'child' {
  if (g.ageCategory) return g.ageCategory
  // Legacy fallback: use children count from old schema
  return (g.children ?? 0) > 0 ? 'child' : 'adult'
}

/** Each guest record is one person in the current model */
export function guestHeadcount(_g: Guest): number {
  return 1
}

export function makeGuestRecord(
  fields: Omit<Guest, 'id' | 'name' | 'attending' | 'adults' | 'children'>
): Omit<Guest, 'id'> {
  const isChild = fields.ageCategory === 'child'
  const fullName = `${fields.firstName ?? ''} ${fields.lastName ?? ''}`.trim()
  return {
    ...fields,
    name: fullName,
    attending: 'yes',
    adults:   isChild ? 0 : 1,
    children: isChild ? 1 : 0,
  }
}

// ── Vendor helpers ────────────────────────────────────────────────────────────
export function vendorDeposit(v: Vendor): number {
  return v.deposit ?? 0
}

export function vendorBalance(v: Vendor): number {
  return Math.max(0, (v.quote ?? 0) - vendorDeposit(v))
}

export type VendorPaymentState = 'unpaid' | 'deposit' | 'full'

export function vendorPaymentState(v: Vendor): VendorPaymentState {
  const quote   = v.quote   ?? 0
  const deposit = vendorDeposit(v)
  if (quote <= 0 || deposit <= 0) return 'unpaid'
  if (deposit >= quote)           return 'full'
  return 'deposit'
}

/** Map vendor category to the matching budget category */
export function vendorToBudgetCategory(vendorCat: string): string {
  const map: Record<string, string> = {
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
  return map[vendorCat] ?? 'Miscellaneous'
}

// ── Payment stage helpers ─────────────────────────────────────────────────────
import type { PaymentStage } from '../types'

export function paymentStageAmount(stage: PaymentStage, estimated: number): number {
  return stage.type === 'percentage' ? (estimated * stage.value) / 100 : stage.value
}

export function countOverduePayments(budget: import('../types').BudgetItem[]): number {
  const now = new Date(); now.setHours(0, 0, 0, 0)
  return budget.filter(b => {
    if ((b.status ?? 'booked') !== 'booked') return false
    const paidSoFar = (b.payments ?? []).reduce((s, p) => s + p.amount, 0)
    if (Math.max(0, b.estimated - paidSoFar) <= 0) return false
    const stageOverdue = (b.paymentStages ?? []).some(s =>
      !s.paid && new Date(s.dueDate + 'T00:00:00') < now
    )
    const finalOverdue = b.finalBalanceDue && !b.finalBalanceTBC &&
      new Date(b.finalBalanceDue + 'T00:00:00') < now
    return stageOverdue || !!finalOverdue
  }).length
}

// ── Date helpers ──────────────────────────────────────────────────────────────
export function daysUntil(isoDate: string): number {
  return Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86400000)
}

export function isOverdue(isoDate: string): boolean {
  return new Date(isoDate) < new Date()
}

export function isDueSoon(isoDate: string, withinDays = 14): boolean {
  const d = daysUntil(isoDate)
  return d >= 0 && d <= withinDays
}

// ── File helpers ──────────────────────────────────────────────────────────────
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
