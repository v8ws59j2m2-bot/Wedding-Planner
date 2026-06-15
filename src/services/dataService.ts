// ─────────────────────────────────────────────────────────────────────────────
// Data Service — localStorage implementation
//
// ALL data persistence goes through this file.
// When migrating to Supabase, replace the implementations below with Supabase
// calls. The function signatures stay identical so pages don't need to change.
//
// Future migration guide:
//   1. Add `supabase.ts` client (from @supabase/supabase-js)
//   2. Replace each function body with a Supabase query
//   3. Remove the localStorage fallbacks
//   4. Add auth checks where needed
// ─────────────────────────────────────────────────────────────────────────────

import type { AppData, Guest, BudgetItem, ChecklistItem, Vendor, MoodImage, WeddingDetails } from '../types'
import { uid, vendorDeposit, vendorToBudgetCategory, downloadBlob } from '../lib/helpers'

// ── Storage keys ──────────────────────────────────────────────────────────────
const KEYS = {
  appData:       'jamie-beth-wedding-planner',
  weddingDetails:'jb-wedding-details',
  seating:       'jb-seating',
  accommodation: 'jb-accommodation',
  moodBoard:     'jb-moodboard',
  timeline:      'jb-timeline',
} as const

// ── Default data ──────────────────────────────────────────────────────────────
export const DEFAULT_APP_DATA: AppData = {
  guests:    [],
  budget:    [],
  checklist: [],
  vendors:   [],
  moodImages:[],
}

export const DEFAULT_WEDDING_DETAILS: WeddingDetails = {
  partner1: 'Jamie',
  partner2: 'Beth',
  date:     '2028-04-05',
  venue:    'Private Villa Estate',
  time:     '14:00',
  location: 'Canggu, Bali, Indonesia',
  theme:    'Romantic Balinese Minimalist',
}

// ── Low-level read/write ──────────────────────────────────────────────────────
function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJSON(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value))
}

// ── AppData ───────────────────────────────────────────────────────────────────
export function loadAppData(): AppData {
  return { ...DEFAULT_APP_DATA, ...readJSON<AppData>(KEYS.appData, DEFAULT_APP_DATA) }
}

export function saveAppData(data: AppData): void {
  writeJSON(KEYS.appData, data)
}

// ── Wedding Details ───────────────────────────────────────────────────────────
export function loadWeddingDetails(): WeddingDetails {
  return { ...DEFAULT_WEDDING_DETAILS, ...readJSON<WeddingDetails>(KEYS.weddingDetails, DEFAULT_WEDDING_DETAILS) }
}

export function saveWeddingDetails(details: WeddingDetails): void {
  writeJSON(KEYS.weddingDetails, details)
}

// ── Guests ────────────────────────────────────────────────────────────────────
export function getGuests(data: AppData): Guest[] {
  return data.guests
}

export function upsertGuest(data: AppData, guest: Guest): AppData {
  const exists = data.guests.find(g => g.id === guest.id)
  return {
    ...data,
    guests: exists
      ? data.guests.map(g => g.id === guest.id ? guest : g)
      : [...data.guests, guest],
  }
}

export function deleteGuest(data: AppData, id: string): AppData {
  return { ...data, guests: data.guests.filter(g => g.id !== id) }
}

// ── Budget ────────────────────────────────────────────────────────────────────
export function getBudgetItems(data: AppData): BudgetItem[] {
  return data.budget
}

export function upsertBudgetItem(data: AppData, item: BudgetItem): AppData {
  const exists = data.budget.find(b => b.id === item.id)
  return {
    ...data,
    budget: exists
      ? data.budget.map(b => b.id === item.id ? item : b)
      : [...data.budget, item],
  }
}

export function deleteBudgetItem(data: AppData, id: string): AppData {
  return { ...data, budget: data.budget.filter(b => b.id !== id) }
}

// ── Checklist ─────────────────────────────────────────────────────────────────
export function getChecklistItems(data: AppData): ChecklistItem[] {
  return data.checklist
}

export function upsertChecklistItem(data: AppData, item: ChecklistItem): AppData {
  const exists = data.checklist.find(c => c.id === item.id)
  return {
    ...data,
    checklist: exists
      ? data.checklist.map(c => c.id === item.id ? item : c)
      : [...data.checklist, item],
  }
}

export function deleteChecklistItem(data: AppData, id: string): AppData {
  return { ...data, checklist: data.checklist.filter(c => c.id !== id) }
}

export function toggleChecklistItem(data: AppData, id: string): AppData {
  return {
    ...data,
    checklist: data.checklist.map(c =>
      c.id === id ? { ...c, completed: !c.completed } : c
    ),
  }
}

// ── Vendors ───────────────────────────────────────────────────────────────────
export function getVendors(data: AppData): Vendor[] {
  return data.vendors
}

/** Upsert a vendor and keep its linked budget item in sync */
export function upsertVendor(data: AppData, vendor: Vendor): AppData {
  const exists = data.vendors.find(v => v.id === vendor.id)
  const newVendors = exists
    ? data.vendors.map(v => v.id === vendor.id ? vendor : v)
    : [...data.vendors, vendor]

  // Sync budget item
  const newBudget = syncVendorBudgetItem(data.budget, vendor)

  return { ...data, vendors: newVendors, budget: newBudget }
}

/** Remove vendor and its linked budget item */
export function deleteVendor(data: AppData, id: string): AppData {
  return {
    ...data,
    vendors: data.vendors.filter(v => v.id !== id),
    budget:  data.budget.filter(b => b.vendorId !== id),
  }
}

function syncVendorBudgetItem(budget: BudgetItem[], vendor: Vendor): BudgetItem[] {
  const deposit = vendorDeposit(vendor)
  const linked  = budget.find(b => b.vendorId === vendor.id)

  // Sync automatically when vendor is booked and has a deposit
  if (vendor.status !== 'booked' || deposit <= 0) {
    return linked ? budget.filter(b => b.vendorId !== vendor.id) : budget
  }

  const item: BudgetItem = {
    id:          linked?.id ?? uid(),
    category:    vendorToBudgetCategory(vendor.category),
    description: vendor.name,
    estimated:   vendor.quote ?? deposit,
    actual:      deposit,
    paid:        deposit >= (vendor.quote ?? deposit),
    notes:       `Linked from Vendors · ${vendor.category}`,
    vendorId:    vendor.id,
  }
  return linked
    ? budget.map(b => b.vendorId === vendor.id ? item : b)
    : [...budget, item]
}

// ── Mood Images ───────────────────────────────────────────────────────────────
export function getMoodImages(data: AppData): MoodImage[] {
  return data.moodImages ?? []
}

export function upsertMoodImage(data: AppData, image: MoodImage): AppData {
  const exists = (data.moodImages ?? []).find(i => i.id === image.id)
  return {
    ...data,
    moodImages: exists
      ? (data.moodImages ?? []).map(i => i.id === image.id ? image : i)
      : [...(data.moodImages ?? []), image],
  }
}

export function deleteMoodImage(data: AppData, id: string): AppData {
  return { ...data, moodImages: (data.moodImages ?? []).filter(i => i.id !== id) }
}

// ── Export / Import ───────────────────────────────────────────────────────────
export function exportAllData(data: AppData, details: WeddingDetails): void {
  const bundle = {
    weddingDetails: details,
    ...data,
    exportedAt: new Date().toISOString(),
    version: 2,
  }
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
  downloadBlob(blob, `wedding-backup-${new Date().toISOString().split('T')[0]}.json`)
}

export function exportGuestsCSV(guests: Guest[]): void {
  const { guestDisplayName, guestAgeCategory } = (() => {
    // inline imports to avoid circular deps
    return {
      guestDisplayName: (g: Guest) => {
        if (g.firstName || g.lastName) return `${g.firstName ?? ''} ${g.lastName ?? ''}`.trim()
        return g.name.split('&')[0].trim()
      },
      guestAgeCategory: (g: Guest) => g.ageCategory ?? (g.children > 0 ? 'child' : 'adult'),
    }
  })()
  const header = ['First Name', 'Last Name', 'Party Name', 'Age Category', 'Email', 'Meal', 'Notes']
  const rows = guests.map(g => {
    const name = guestDisplayName(g)
    const parts = name.split(' ')
    return [
      g.firstName ?? parts[0] ?? '',
      g.lastName  ?? parts.slice(1).join(' ') ?? '',
      g.partyName ?? '',
      guestAgeCategory(g),
      g.email  ?? '',
      g.meal   ?? '',
      g.notes  ?? '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
  })
  const csv = [header.join(','), ...rows].join('\n')
  downloadBlob(new Blob([csv], { type: 'text/csv' }), `guests-${new Date().toISOString().split('T')[0]}.csv`)
}

export type ImportResult = { success: true; data: Partial<AppData> } | { success: false; error: string }

export function parseImport(text: string, filename: string): ImportResult {
  try {
    if (filename.endsWith('.json')) {
      const parsed = JSON.parse(text)
      // Handle both full bundle exports and partial data
      const data: Partial<AppData> = {
        guests:    parsed.guests    ?? undefined,
        budget:    parsed.budget    ?? undefined,
        checklist: parsed.checklist ?? undefined,
        vendors:   parsed.vendors   ?? undefined,
        moodImages:parsed.moodImages ?? undefined,
      }
      return { success: true, data }
    }
    if (filename.endsWith('.csv')) {
      const guests = parseGuestsCSV(text)
      return { success: true, data: { guests } }
    }
    return { success: false, error: 'Unsupported file format. Use .json or .csv.' }
  } catch (e) {
    return { success: false, error: 'Could not read file — it may be corrupted.' }
  }
}

function parseGuestsCSV(text: string): Guest[] {
  const makeId = uid
  const lines   = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase())
  const get = (cols: string[], ...keys: string[]) => {
    for (const k of keys) {
      const i = headers.indexOf(k)
      if (i >= 0 && cols[i]) return cols[i].replace(/^"|"$/g, '').trim()
    }
    return ''
  }
  return lines.slice(1).map(line => {
    const cols = line.match(/(".*?"|[^,]+)/g) ?? []
    const firstName   = get(cols, 'first name', 'firstname') || get(cols, 'name')
    const lastName    = get(cols, 'last name',  'lastname')
    const partyName   = get(cols, 'party name', 'partyname', 'party', 'family', 'group')
    const ageCat      = get(cols, 'age category', 'agecategory', 'age', 'type')
    const ageCategory: 'adult' | 'child' = ageCat.toLowerCase().includes('child') ? 'child' : 'adult'
    const isChild = ageCategory === 'child'
    const fullName = `${firstName} ${lastName}`.trim()
    const record: Omit<Guest, 'id'> = {
      firstName, lastName: lastName || undefined,
      partyName: partyName || undefined, ageCategory,
      email: get(cols, 'email') || undefined, meal: get(cols, 'meal') || undefined,
      notes: get(cols, 'notes') || undefined,
      name: fullName, attending: 'yes',
      adults: isChild ? 0 : 1, children: isChild ? 1 : 0,
    }
    return { id: makeId(), ...record }
  }).filter(g => g.name)
}

// ── Clear everything ──────────────────────────────────────────────────────────
export function clearAllData(): void {
  Object.values(KEYS).forEach(key => localStorage.removeItem(key))
}
