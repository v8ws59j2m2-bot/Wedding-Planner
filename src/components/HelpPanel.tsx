import { useState } from 'react'
import { X, Search, ChevronRight } from 'lucide-react'
import { resetAllTours } from './GuidedTour'

interface TourLink {
  tourId: string
  label: string
  description: string
  emoji: string
}

const TOUR_LINKS: TourLink[] = [
  { tourId: 'budget',        label: 'Budget & Payments',    description: 'Expenses, payment tracking, stages, and the financial overview', emoji: '💳' },
  { tourId: 'payments',      label: 'Payment Stages',       description: 'Planning future payments with milestones and due dates',          emoji: '📅' },
  { tourId: 'seating',       label: 'Seating Chart',        description: 'Table assignment and seat-level placement',                       emoji: '🪑' },
  { tourId: 'accommodation', label: 'Accommodation',        description: 'Room allocation, extra bedding, and capacity warnings',            emoji: '🏨' },
  { tourId: 'travel',        label: 'Travel & Logistics',   description: 'Flight details, arrivals, departures, and transfers',             emoji: '✈️' },
]

const FAQS = [
  {
    q: 'What\'s the difference between Booked and Quoted?',
    a: 'Booked expenses are confirmed and count toward your budget totals and charts. Quoted expenses are potential spend — tracked separately and excluded from totals until you confirm them.',
  },
  {
    q: 'Why isn\'t my expense showing in the Financial Overview?',
    a: 'Only Booked expenses appear in totals and charts. If an expense is set to Quoted, switch it to Booked by clicking the Quoted pill on the expense row.',
  },
  {
    q: 'How do I back up my data?',
    a: 'Click Export in the top bar at any time. This downloads a JSON file containing everything. Save it to cloud storage or email it to yourself. Import it back using the Import button.',
  },
  {
    q: 'The pie chart doesn\'t include some expenses — why?',
    a: 'The pie chart shows amounts actually paid, not budgeted amounts. Expenses with no payments recorded yet won\'t appear until you log a payment against them.',
  },
  {
    q: 'Why does a vendor show in Budget & Payments?',
    a: 'All expenses must be linked to a vendor. Add your supplier on the Vendors page first, then create an expense linked to them in Budget. The category auto-fills from the vendor.',
  },
  {
    q: 'How do I add guests to an event or activity?',
    a: 'Go to Events & Activities, find the event, and click the Guests button on the event card. Tick guests as Attending, and for paid activities tick Paid once they\'ve paid.',
  },
  {
    q: 'What does the overdue badge on Budget & Payments mean?',
    a: 'It means one or more payment stages or final balance due dates have passed and the payment hasn\'t been marked as settled. Go to the Upcoming Payments tab to see which items.',
  },
]

interface Props {
  onStartTour: (tourId: string) => void
}

export function HelpPanel({ onStartTour }: Props) {
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const filteredFaqs = search.trim()
    ? FAQS.filter(f =>
        f.q.toLowerCase().includes(search.toLowerCase()) ||
        f.a.toLowerCase().includes(search.toLowerCase())
      )
    : FAQS

  return (
    <>
      {/* ? Button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open help"
        title="Help"
        style={{
          width: 32, height: 32, borderRadius: '50%',
          background: open ? '#3B2A22' : 'rgba(200,164,93,0.12)',
          border: '1.5px solid rgba(200,164,93,0.4)',
          color: open ? '#FFF8EE' : '#C8A45D',
          fontSize: 14, fontWeight: 700,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s', fontFamily: 'Georgia, serif',
          flexShrink: 0,
        }}
        onMouseEnter={e => { if (!open) (e.currentTarget as HTMLElement).style.background = 'rgba(200,164,93,0.22)' }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLElement).style.background = 'rgba(200,164,93,0.12)' }}
      >
        ?
      </button>

      {/* Panel */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 5000 }}
            onClick={() => setOpen(false)}
          />

          {/* Slide-in panel */}
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0,
            width: 380, zIndex: 5001,
            background: '#FFF8EE', borderLeft: '1.5px solid #E8D5A3',
            boxShadow: '-8px 0 32px rgba(42,30,20,0.12)',
            display: 'flex', flexDirection: 'column',
            fontFamily: 'Inter, sans-serif',
            animation: 'slideInRight 0.22s ease-out',
          }}>

            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '20px 22px 16px', borderBottom: '1px solid #F2E3CF',
            }}>
              <div>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, fontStyle: 'italic', color: '#3B2A22', margin: 0 }}>
                  Help & Guides
                </h2>
                <p style={{ fontSize: 11, color: '#A89080', marginTop: 3 }}>
                  Tips, tours, and answers
                </p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close help"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A6657', padding: 4 }}>
                <X size={18}/>
              </button>
            </div>

            {/* Scrollable body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>

              {/* Search */}
              <div style={{ position: 'relative', marginBottom: 20 }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#A89080' }}/>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search help…"
                  aria-label="Search help"
                  style={{
                    width: '100%', padding: '8px 10px 8px 30px',
                    border: '1.5px solid #E8D5A3', borderRadius: 10,
                    background: '#FAF3E6', color: '#3B2A22', fontSize: 12,
                    fontFamily: 'Inter, sans-serif', outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Guided tours */}
              {!search && (
                <div style={{ marginBottom: 24 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#7A6657', letterSpacing: '0.1em', marginBottom: 10 }}>
                    GUIDED TOURS
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {TOUR_LINKS.map(t => (
                      <button key={t.tourId}
                        onClick={() => { onStartTour(t.tourId); setOpen(false) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                          border: '1.5px solid #E8D5A3', background: '#FAF3E6',
                          textAlign: 'left', transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => {
                          ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(200,164,93,0.5)'
                          ;(e.currentTarget as HTMLElement).style.background = 'rgba(200,164,93,0.06)'
                        }}
                        onMouseLeave={e => {
                          ;(e.currentTarget as HTMLElement).style.borderColor = '#E8D5A3'
                          ;(e.currentTarget as HTMLElement).style.background = '#FAF3E6'
                        }}>
                        <span style={{ fontSize: 18, flexShrink: 0 }}>{t.emoji}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: '#3B2A22', marginBottom: 1 }}>{t.label}</p>
                          <p style={{ fontSize: 11, color: '#7A6657', lineHeight: 1.4 }}>{t.description}</p>
                        </div>
                        <ChevronRight size={13} style={{ color: '#C8A45D', flexShrink: 0 }}/>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Divider */}
              {!search && <div style={{ height: 1, background: '#F2E3CF', marginBottom: 20 }}/>}

              {/* FAQs */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#7A6657', letterSpacing: '0.1em', marginBottom: 10 }}>
                  {search ? `${filteredFaqs.length} RESULT${filteredFaqs.length !== 1 ? 'S' : ''}` : 'COMMON QUESTIONS'}
                </p>
                {filteredFaqs.length === 0 && (
                  <p style={{ fontSize: 12, color: '#A89080', fontStyle: 'italic' }}>No results for "{search}"</p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {filteredFaqs.map((faq, i) => (
                    <div key={i} style={{
                      borderRadius: 10, border: '1.5px solid',
                      borderColor: openFaq === i ? 'rgba(200,164,93,0.4)' : '#E8D5A3',
                      background: openFaq === i ? 'rgba(200,164,93,0.04)' : '#FAF3E6',
                      overflow: 'hidden',
                    }}>
                      <button
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'flex-start',
                          justifyContent: 'space-between', gap: 8,
                          padding: '10px 12px', background: 'none', border: 'none',
                          cursor: 'pointer', textAlign: 'left',
                        }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#3B2A22', lineHeight: 1.4, flex: 1 }}>
                          {faq.q}
                        </span>
                        <ChevronRight size={12} style={{
                          color: '#C8A45D', flexShrink: 0, marginTop: 2,
                          transform: openFaq === i ? 'rotate(90deg)' : 'none',
                          transition: 'transform 0.15s',
                        }}/>
                      </button>
                      {openFaq === i && (
                        <p style={{
                          fontSize: 12, color: '#5A4035', lineHeight: 1.65,
                          padding: '0 12px 12px', margin: 0,
                        }}>
                          {faq.a}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '12px 22px', borderTop: '1px solid #F2E3CF',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <p style={{ fontSize: 11, color: '#A89080' }}>Jamie & Beth Wedding Planner</p>
              <button
                onClick={() => { resetAllTours(); alert('Tours reset — they\'ll show again on first visit to each feature.') }}
                style={{ fontSize: 11, color: '#A89080', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                Reset tours
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
