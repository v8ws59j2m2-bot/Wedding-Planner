// ─────────────────────────────────────────────────────────────────────────────
// Core domain types
// When migrating to Supabase these become the row shapes for each table.
// Keep all field names snake_case-friendly so they map directly to DB columns.
// ─────────────────────────────────────────────────────────────────────────────

export type Page =
  | 'dashboard' | 'guests'  | 'budget'   | 'checklist'
  | 'vendors'   | 'moodboard'| 'seating'  | 'accommodation'
  | 'finances'  | 'settings'

// ── Guest ─────────────────────────────────────────────────────────────────────
export interface Guest {
  id: string
  firstName?: string
  lastName?: string
  partyName?: string
  ageCategory?: 'adult' | 'child'
  email?: string
  meal?: string
  notes?: string
  // Legacy fields — kept for backward compat with old data
  /** @deprecated Use firstName + lastName */
  name: string
  /** @deprecated All guests are now confirmed; always 'yes' */
  attending: 'yes' | 'no' | 'pending'
  /** @deprecated Use ageCategory */
  adults: number
  /** @deprecated Use ageCategory */
  children: number
  /** @deprecated Removed from UI */
  tableNumber?: string
}

// ── Budget ────────────────────────────────────────────────────────────────────
export interface BudgetItem {
  id: string
  category: string
  description: string
  /** Always stored in GBP for calculations */
  estimated: number
  /** Always stored in GBP for calculations */
  actual: number
  paid: boolean
  notes?: string
  /** When set, this item is auto-managed by a synced vendor — do not edit manually */
  vendorId?: string
  // Input currency tracking
  /** Currency the amount was originally entered in */
  currency?: 'GBP' | 'IDR'
  /** Original estimated amount in the input currency (before GBP conversion) */
  estimatedLocal?: number
  /** Original actual amount in the input currency (before GBP conversion) */
  actualLocal?: number
}

// ── Checklist ─────────────────────────────────────────────────────────────────
export interface ChecklistItem {
  id: string
  title: string
  category: string
  dueDate?: string   // ISO date string
  completed: boolean
  notes?: string
  priority: 'high' | 'medium' | 'low'
}

// ── Vendor ────────────────────────────────────────────────────────────────────
export type VendorStatus = 'quoted' | 'booked'

export interface VendorContract {
  name: string
  mimeType: string
  uploadedAt: string  // ISO date string
  data: string        // base64 data URL
}

export interface Vendor {
  id: string
  name: string
  category: string
  status: VendorStatus
  contact?: string
  email?: string
  phone?: string
  website?: string
  /** Total quoted / contract amount — always stored in GBP */
  quote?: number
  /** Deposit amount paid — always stored in GBP */
  deposit?: number
  /** Currency the vendor quoted in */
  quoteCurrency?: 'GBP' | 'IDR'
  /** Original quote in the vendor's currency (before conversion) */
  quoteLocal?: number
  /** Original deposit in the vendor's currency (before conversion) */
  depositLocal?: number
  /** Final payment due date (ISO date string) */
  balanceDue?: string
  /** Deposit due date (ISO date string) */
  depositDue?: string
  notes?: string
  contract?: VendorContract
  /** When true, deposit is reflected as a linked BudgetItem */
  syncToBudget?: boolean
  // Legacy fields
  /** @deprecated Use quote */
  cost?: number
  /** @deprecated Use status === 'booked' */
  booked: boolean
  /** @deprecated Use deposit */
  paid?: number
}

// ── Mood Board ────────────────────────────────────────────────────────────────
export interface MoodImage {
  id: string
  src: string        // base64 or URL
  caption: string
  category: string
  notes?: string
  // Legacy
  /** @deprecated Use src */
  url?: string
}

export interface ColorSwatch {
  id: string
  hex: string
  name: string
}

// ── App Data (root shape) ─────────────────────────────────────────────────────
// This is what gets serialised to localStorage and exported/imported as JSON.
// When using Supabase each top-level key maps to a table.
export interface AppData {
  guests:    Guest[]
  budget:    BudgetItem[]
  checklist: ChecklistItem[]
  vendors:   Vendor[]
  moodImages: MoodImage[]
}

// ── Wedding Details ───────────────────────────────────────────────────────────
// Stored separately in localStorage under 'jb-wedding-details'
export interface WeddingDetails {
  partner1: string
  partner2: string
  date: string       // ISO date string
  venue: string
  time: string
  location: string
  theme: string
}
