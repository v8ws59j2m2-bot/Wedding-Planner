// ─────────────────────────────────────────────────────────────────────────────
// Core domain types
// When migrating to Supabase these become the row shapes for each table.
// Keep all field names snake_case-friendly so they map directly to DB columns.
// ─────────────────────────────────────────────────────────────────────────────

export type Page =
  | 'dashboard'
  | 'guests'
  | 'budget-payments'
  | 'vendors'
  | 'accommodation'
  | 'seating'
  | 'planning'
  | 'settings'

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
  /** @deprecated Use firstName + lastName — migrated on load in dataService */
  name: string
  /** @deprecated Always 'yes' in current model — filter with attending !== 'no' for safety */
  attending: 'yes' | 'no' | 'pending'
  /** @deprecated Use ageCategory — kept only for guestAgeCategory() fallback */
  adults: number
  /** @deprecated Use ageCategory — kept only for guestAgeCategory() fallback */
  children: number
}

// ── Budget ────────────────────────────────────────────────────────────────────
export type BudgetItemStatus = 'booked' | 'quoted'

export interface Payment {
  id: string
  date: string    // ISO date string
  amount: number  // always stored in GBP
  note?: string
}

export type PaymentStageType = 'fixed' | 'percentage'

export interface PaymentStage {
  id: string
  description: string
  dueDate: string          // ISO date string
  type: PaymentStageType
  value: number            // £ amount if fixed, 0–100 if percentage
  paid: boolean
}

export interface BudgetItem {
  id: string
  category: string
  description: string
  /** 'booked' = confirmed spend (affects totals). 'quoted' = potential spend (excluded from totals). Defaults to 'booked' for backward compat. */
  status?: BudgetItemStatus
  /** Always stored in GBP for calculations */
  estimated: number
  /** Sum of all payments — computed from payments[] on save; kept in sync for FinancialOverview compat */
  actual: number
  /** Derived: true when actual >= estimated — computed on save */
  paid: boolean
  /** Individual payment records (what has actually been paid) */
  payments?: Payment[]
  /** Optional milestone gates for scheduled future payments */
  paymentStages?: PaymentStage[]
  /** Final balance due date (ISO date string). Mutually exclusive with finalBalanceTBC. */
  finalBalanceDue?: string
  /** When true, final payment date is not yet confirmed. Mutually exclusive with finalBalanceDue. */
  finalBalanceTBC?: boolean
  notes?: string
  /** When set, this item is linked to a vendor */
  vendorId?: string
  // Input currency tracking
  /** Currency the amount was originally entered in */
  currency?: 'GBP' | 'IDR'
  /** Original estimated amount in the input currency (before GBP conversion) */
  estimatedLocal?: number
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
}

// ── Events & Activities ───────────────────────────────────────────────────────
export type EventType = 'wedding' | 'activity'

export type PaymentMethod = 'couple' | 'self'

export interface ActivitySignup {
  guestId: string
  paid: boolean
}

export interface Event {
  id: string
  type: EventType
  title: string
  date: string       // ISO date string
  time?: string
  endTime?: string
  location?: string
  description?: string
  dressCode?: string
  transport?: string
  includeInItinerary: boolean
  // Activity-only fields
  isFree?: boolean
  costPerPerson?: number
  paymentMethod?: PaymentMethod
  signups?: ActivitySignup[]
}

// ── Travel & Logistics ────────────────────────────────────────────────────────
export interface FlightDetails {
  flightNumber?: string
  // Departure (takeoff) leg
  departureDate?: string   // ISO date string
  departureTime?: string   // HH:MM
  departureAirport?: string
  // Arrival (landing) leg
  arrivalDate?: string     // ISO date string
  arrivalTime?: string     // HH:MM
  arrivalAirport?: string
  notes?: string
  // Legacy — kept for backward compat with old data
  /** @deprecated Use departureDate/departureTime/departureAirport */
  date?: string
  /** @deprecated Use departureTime */
  time?: string
  /** @deprecated Use departureAirport */
  airport?: string
}

export interface GuestTravel {
  guestId: string
  arrival?: FlightDetails
  departure?: FlightDetails
  needsTransfer: boolean
  transferNotes?: string
}

// ── Mood Board ────────────────────────────────────────────────────────────────
export interface MoodImage {
  id: string
  src: string        // base64 or URL
  caption: string
  category: string
  notes?: string
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
  guests:      Guest[]
  budget:      BudgetItem[]
  checklist:   ChecklistItem[]
  vendors:     Vendor[]
  moodImages:  MoodImage[]
  events:      Event[]
  travelInfo:  GuestTravel[]
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
