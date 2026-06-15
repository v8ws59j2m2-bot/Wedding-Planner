import { useState, useEffect, useCallback, useContext } from 'react'
import { createContext } from 'react'

// ── Tour context (shared with App) ────────────────────────────────────────────
interface TourCtx { startTour: (id: string) => void }
export const TourCtxDefault: TourCtx = { startTour: () => {} }
export const TourCtx = createContext<TourCtx>(TourCtxDefault)
import { X, ChevronRight, ChevronLeft } from 'lucide-react'

// ── Tour definitions ──────────────────────────────────────────────────────────
export interface TourStep {
  title: string
  body: string
  target?: string   // CSS selector — if provided, highlights that element
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
}

export interface Tour {
  id: string
  steps: TourStep[]
}

const TOURS: Record<string, Tour> = {
  seating: {
    id: 'seating',
    steps: [
      {
        title: 'Welcome to the Seating Chart',
        body: 'Here you can assign your guests to tables, then arrange them into specific seats. Start by adding a table using the "Add table" button.',
        position: 'center',
      },
      {
        title: 'Assigning guests to tables',
        body: 'Drag any guest from the Unassigned list on the right onto a table card. You can move guests between tables the same way.',
        position: 'center',
      },
      {
        title: 'Arranging specific seats',
        body: 'Click any table card to open the seating detail view. From there, drag guests onto individual seats around the table.',
        position: 'center',
      },
      {
        title: 'Labelling seats',
        body: 'Inside the table detail view, you can give seats custom labels like "Head of Table" or "Seat 1". Click any seat label to edit it.',
        position: 'center',
      },
      {
        title: 'Round vs rectangular tables',
        body: 'Round tables distribute seats evenly around the perimeter. Rectangular tables split guests along the two long sides — equal numbers top and bottom.',
        position: 'center',
      },
    ],
  },

  payments: {
    id: 'payments',
    steps: [
      {
        title: 'Payment Stages',
        body: 'Payment Stages let you plan ahead — add a deposit, second instalment, and final balance with due dates. They appear in Upcoming Payments so nothing gets missed.',
        position: 'center',
      },
      {
        title: 'Adding a stage',
        body: 'Give the stage a name (e.g. "Deposit"), pick a due date, then choose Fixed Amount (£) or Percentage of total. Tick it as paid once it\'s settled.',
        position: 'center',
      },
      {
        title: 'Final Balance Due By',
        body: 'For confirmed (Booked) expenses, set either a specific final balance date or mark it as "Date TBC" if the date isn\'t confirmed yet. Both appear in Upcoming Payments.',
        position: 'center',
      },
      {
        title: 'Upcoming Payments dashboard',
        body: 'Switch to the Upcoming Payments tab to see everything at a glance — Overdue (red), Due in 14 days (amber), and future items. Click → on any row to open that expense directly.',
        position: 'center',
      },
    ],
  },

  accommodation: {
    id: 'accommodation',
    steps: [
      {
        title: 'Room Allocation',
        body: 'Add your villas and guest rooms here, then assign guests to each room by dragging them from the Unallocated panel.',
        position: 'center',
      },
      {
        title: 'Adding rooms',
        body: 'Click "Add room" to set up a room — give it a name, pick the type (Villa, Suite, etc.), and enter its sleeping capacity.',
        position: 'center',
      },
      {
        title: 'Dragging guests in',
        body: 'Confirmed guests appear in the Unallocated sidebar. Drag them onto a room card to assign them. Drag back to unallocate.',
        position: 'center',
      },
      {
        title: 'Extra bedding',
        body: 'If a room needs a cot or rollaway bed, click "Request extra bedding" at the bottom of the room card. The app tracks whether extra beds cover any capacity overage.',
        position: 'center',
      },
    ],
  },

  travel: {
    id: 'travel',
    steps: [
      {
        title: 'Travel & Logistics',
        body: 'Record flight details for each guest — arrival flight, departure flight, and whether they need an airport transfer.',
        position: 'center',
      },
      {
        title: 'Editing flight details',
        body: 'Click the edit (pencil) icon on any guest row to open their travel form. Enter flight number, date, time, and airport for both arrival and departure.',
        position: 'center',
      },
      {
        title: 'Arrivals & Departures views',
        body: 'Switch between "All Guests", "Arrivals", and "Departures" using the view buttons at the top. The timeline views group guests by date and sort by time.',
        position: 'center',
      },
      {
        title: 'Transfer tracking',
        body: 'Toggle "Needs airport transfer" for any guest who needs collecting. The summary card at the top shows the total transfer count at a glance.',
        position: 'center',
      },
    ],
  },

  budget: {
    id: 'budget',
    steps: [
      {
        title: 'Budget & Payments',
        body: 'This section has three tabs: Budget (all your expenses), Upcoming Payments (due dates and overdue items), and Financial Overview (charts and totals).',
        position: 'center',
      },
      {
        title: 'Booked vs Quoted',
        body: '"Booked" expenses are confirmed — they count toward your budget totals and charts. "Quoted" expenses are potential spend — they\'re tracked separately and excluded from totals until confirmed.',
        position: 'center',
      },
      {
        title: 'Recording payments',
        body: 'Open any expense to add individual payments with dates. The app tracks total paid and outstanding balance automatically. Use Payment Stages to plan future milestones.',
        position: 'center',
      },
      {
        title: 'Linking to vendors',
        body: 'Every expense must be linked to a vendor. Add your suppliers on the Vendors page first, then link them here — the category auto-fills from the vendor.',
        position: 'center',
      },
    ],
  },
}

// ── localStorage tour state ───────────────────────────────────────────────────
const TOURS_KEY = 'jb-tours-completed'

function getCompletedTours(): Set<string> {
  try {
    const raw = localStorage.getItem(TOURS_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch { return new Set() }
}

function markTourComplete(tourId: string) {
  const completed = getCompletedTours()
  completed.add(tourId)
  localStorage.setItem(TOURS_KEY, JSON.stringify([...completed]))
}

export function isTourCompleted(tourId: string): boolean {
  return getCompletedTours().has(tourId)
}

export function resetAllTours() {
  localStorage.removeItem(TOURS_KEY)
}

// ── Tour hook ─────────────────────────────────────────────────────────────────
export function useTour(tourId: string) {
  const [active, setActive] = useState(false)
  const [step,   setStep]   = useState(0)
  const tour = TOURS[tourId]

  const start = useCallback((force = false) => {
    if (!tour) return
    if (!force && isTourCompleted(tourId)) return
    setStep(0)
    setActive(true)
  }, [tourId, tour])

  const next = useCallback(() => {
    if (!tour) return
    if (step < tour.steps.length - 1) {
      setStep(s => s + 1)
    } else {
      setActive(false)
      markTourComplete(tourId)
    }
  }, [step, tour, tourId])

  const prev = useCallback(() => {
    setStep(s => Math.max(0, s - 1))
  }, [])

  const skip = useCallback(() => {
    setActive(false)
    markTourComplete(tourId)
  }, [tourId])

  return { active, step, start, next, prev, skip, tour }
}

// ── Tour overlay component ────────────────────────────────────────────────────
interface TourOverlayProps {
  tourId: string
  active: boolean
  step: number
  tour: Tour | undefined
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
}

export function TourOverlay({ active, step, tour, onNext, onPrev, onSkip }: TourOverlayProps) {
  if (!active || !tour) return null

  const current   = tour.steps[step]
  const isLast    = step === tour.steps.length - 1
  const isFirst   = step === 0
  const progress  = ((step + 1) / tour.steps.length) * 100

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSkip()
      if (e.key === 'ArrowRight' || e.key === 'Enter') onNext()
      if (e.key === 'ArrowLeft' && !isFirst) onPrev()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onNext, onPrev, onSkip, isFirst])

  return (
    <>
      {/* Backdrop */}
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(42,30,20,0.55)',
        zIndex: 8000, backdropFilter: 'blur(1px)',
      }} onClick={onSkip}/>

      {/* Card */}
      <div role="dialog" aria-modal="true" aria-label={current.title}
        style={{
          position: 'fixed',
          bottom: 40, left: '50%', transform: 'translateX(-50%)',
          zIndex: 8001,
          width: '100%', maxWidth: 420,
          background: '#FFF8EE',
          border: '1.5px solid #E8D5A3',
          borderRadius: 20,
          padding: '28px 28px 22px',
          boxShadow: '0 24px 64px rgba(42,30,20,0.3)',
          fontFamily: 'Inter, sans-serif',
          animation: 'tooltipIn 0.2s ease-out',
        }}>

        {/* Progress bar */}
        <div style={{ height: 3, background: '#F2E3CF', borderRadius: 2, marginBottom: 20, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 2,
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #C8A45D, #E8C87A)',
            transition: 'width 0.3s ease',
          }}/>
        </div>

        {/* Step counter + dismiss */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#C8A45D', letterSpacing: '0.1em' }}>
            STEP {step + 1} OF {tour.steps.length}
          </span>
          <button onClick={onSkip} aria-label="Skip tour"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A89080', padding: 2, lineHeight: 1 }}>
            <X size={16}/>
          </button>
        </div>

        {/* Content */}
        <h3 style={{
          fontFamily: 'Playfair Display, serif', fontSize: 18, fontStyle: 'italic',
          color: '#3B2A22', marginBottom: 10,
        }}>
          {current.title}
        </h3>
        <p style={{ fontSize: 13, color: '#5A4035', lineHeight: 1.7, marginBottom: 22 }}>
          {current.body}
        </p>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
          {!isFirst && (
            <button onClick={onPrev}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '8px 14px',
                borderRadius: 9, border: '1.5px solid #E8D5A3', background: 'transparent',
                color: '#7A6657', fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}>
              <ChevronLeft size={13}/> Back
            </button>
          )}
          <button onClick={onSkip}
            style={{
              padding: '8px 14px', borderRadius: 9,
              border: '1.5px solid #E8D5A3', background: 'transparent',
              color: '#A89080', fontSize: 12, cursor: 'pointer',
            }}>
            Skip
          </button>
          <button onClick={onNext} autoFocus
            style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '8px 18px',
              borderRadius: 9, border: 'none', background: '#3B2A22',
              color: '#FFF8EE', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
            {isLast ? 'Done' : 'Next'} {!isLast && <ChevronRight size={13}/>}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Inline "Take a tour" button ───────────────────────────────────────────────
export function TourButton({ tourId, label = 'Take a tour' }: { tourId: string; label?: string }) {
  const { startTour } = useContext(TourCtx)
  return (
    <button
      onClick={() => startTour(tourId)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        fontSize: 11, fontWeight: 600, color: '#C8A45D',
        background: 'rgba(200,164,93,0.1)', border: '1px solid rgba(200,164,93,0.35)',
        padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(200,164,93,0.18)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(200,164,93,0.1)'}
    >
      ✦ {label}
    </button>
  )
}
