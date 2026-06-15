import { LayoutDashboard, Users, PiggyBank, Store, Armchair, BedDouble, CalendarDays, Settings as SettingsIcon } from 'lucide-react'
import { Frangipani, TempleGate, PalmFrond, BaliBorder } from './Botanicals'
import type { Page } from '../types'

const NAV: { id: Page; label: string; icon: React.ElementType; sub?: string }[] = [
  { id: 'dashboard',       label: 'Dashboard',          icon: LayoutDashboard },
  { id: 'guests',          label: 'Guests',              icon: Users },
  { id: 'budget-payments', label: 'Budget & Payments',   icon: PiggyBank },
  { id: 'vendors',         label: 'Vendors',             icon: Store },
  { id: 'accommodation',   label: 'Accommodation',       icon: BedDouble },
  { id: 'seating',         label: 'Seating',             icon: Armchair },
  { id: 'planning',        label: 'Planning',            icon: CalendarDays, sub: 'Events · Itinerary · Checklist · Mood Board' },
  { id: 'settings',        label: 'Settings',            icon: SettingsIcon },
]

interface Props {
  current: Page
  onChange: (p: Page) => void
  collapsed: boolean
  badges?: Partial<Record<Page, number>>  // page → badge count
}

export function Sidebar({ current, onChange, collapsed, badges = {} }: Props) {
  const w = collapsed ? 64 : 224

  return (
    <aside style={{
      width: w,
      minHeight: '100vh',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      zIndex: 20,
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.3s ease',
      overflow: 'hidden',
      // Deep Balinese forest background
      background: 'linear-gradient(175deg, #1A1208 0%, #2A1E10 35%, #1E1A0E 70%, #251806 100%)',
      boxShadow: '4px 0 32px rgba(20,12,4,0.5)',
    }}>

      {/* Animated background elements inside sidebar */}
      {!collapsed && (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          {/* Temple gate — large, ghostly */}
          <div style={{ position: 'absolute', bottom: 60, left: '50%', transform: 'translateX(-50%)', opacity: 0.12 }}>
            <TempleGate width={200} opacity={1} />
          </div>
          {/* Palm fronds in corners */}
          <div style={{ position: 'absolute', top: -10, right: -10, animation: 'floatSlow 9s ease-in-out infinite', opacity: 0.25 }}>
            <PalmFrond size={120} opacity={1} />
          </div>
          <div style={{ position: 'absolute', bottom: 80, left: -12, animation: 'floatSlow 11s ease-in-out 2s infinite', opacity: 0.2 }}>
            <PalmFrond size={100} opacity={1} flip />
          </div>
          {/* Floating diamonds */}
          {[[30, 20], [80, 45], [20, 65], [70, 78]].map(([x, y], i) => (
            <div key={i} style={{
              position: 'absolute', left: `${x}%`, top: `${y}%`,
              animation: `pulseGold ${5 + i}s ease-in-out ${i * 1.2}s infinite`,
            }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <rect x="1" y="1" width="8" height="8" rx="1" transform="rotate(45 5 5)"
                  fill="#C8A45D" opacity="0.6"/>
              </svg>
            </div>
          ))}
          {/* Frangipani flowers */}
          <div style={{ position: 'absolute', right: 8, top: '35%', animation: 'drift 8s ease-in-out 1s infinite', opacity: 0.2 }}>
            <Frangipani size={36} opacity={1} />
          </div>
          <div style={{ position: 'absolute', left: 12, top: '55%', animation: 'drift 10s ease-in-out 3s infinite', opacity: 0.18 }}>
            <Frangipani size={28} opacity={1} />
          </div>
          {/* Vertical vine-like line */}
          <svg style={{ position: 'absolute', right: 16, top: 0, bottom: 0, height: '100%' }} width="2" viewBox="0 0 2 400" preserveAspectRatio="none">
            <path d="M1 0 C1 50 3 80 1 120 C-1 160 3 190 1 240 C-1 290 3 330 1 400"
              stroke="rgba(200,164,93,0.12)" strokeWidth="1.5" fill="none"/>
          </svg>
        </div>
      )}

      {/* ── Logo / header ── */}
      <div style={{
        padding: collapsed ? '20px 0' : '28px 20px 20px',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
        borderBottom: '1px solid rgba(200,164,93,0.15)',
      }}>
        {collapsed ? (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Frangipani size={32} opacity={0.8} />
          </div>
        ) : (
          <div>
            {/* Frangipani crown */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 8, animation: 'floatSlow 8s ease-in-out infinite' }}>
              <Frangipani size={24} opacity={0.7} />
              <Frangipani size={32} opacity={0.9} />
              <Frangipani size={24} opacity={0.7} />
            </div>
            {/* Names */}
            <p style={{
              color: '#C8A45D', fontFamily: 'Playfair Display, serif',
              fontSize: 11, letterSpacing: '0.22em', opacity: 0.7, marginBottom: 4,
            }}>WEDDING PLANNER</p>
            <p style={{
              color: '#FFF8EE', fontFamily: 'Playfair Display, serif',
              fontStyle: 'italic', fontSize: 18, lineHeight: 1,
            }}>Jamie & Beth</p>
            {/* Gold border under names */}
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
              <BaliBorder width={160} opacity={0.5} />
            </div>
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav style={{ flex: 1, paddingTop: 8, position: 'relative', zIndex: 1, overflowY: 'auto' }}>
        {NAV.map(({ id, label, icon: Icon, sub }) => {
          const active = current === id
          const badge  = badges[id]
          const isSettings = id === 'settings'
          return (
            <div key={id}>
              {/* Subtle divider above Settings */}
              {isSettings && (
                <div style={{ height: 1, background: 'rgba(200,164,93,0.12)', margin: '6px 16px 6px' }}/>
              )}
              <button
                onClick={() => onChange(id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: collapsed ? '13px 0' : sub ? '10px 20px 8px' : '11px 20px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  background: active
                    ? 'linear-gradient(90deg, rgba(200,164,93,0.22) 0%, rgba(200,164,93,0.06) 100%)'
                    : 'transparent',
                  borderLeft: active ? '3px solid #C8A45D' : '3px solid transparent',
                  borderTop: 'none', borderRight: 'none', borderBottom: 'none',
                  color: active ? '#E8D5A3' : 'rgba(255,248,238,0.45)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  animation: active ? 'glowActive 3s ease-in-out infinite' : 'none',
                  textAlign: 'left',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    ;(e.currentTarget as HTMLElement).style.background = 'rgba(200,164,93,0.08)'
                    ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,248,238,0.75)'
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                    ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,248,238,0.45)'
                  }
                }}
              >
                {active && !collapsed && (
                  <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', animation: 'breathe 2s ease-in-out infinite' }}>
                    <Frangipani size={18} opacity={0.6}/>
                  </div>
                )}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <Icon size={17} strokeWidth={1.5}/>
                  {badge !== undefined && badge > 0 && (
                    <span style={{
                      position: 'absolute', top: -5, right: -6,
                      minWidth: 16, height: 16, borderRadius: 8, padding: '0 4px',
                      background: '#C47A52', color: '#fff',
                      fontSize: 9, fontWeight: 700, lineHeight: '16px',
                      textAlign: 'center', display: 'block', whiteSpace: 'nowrap',
                    }}>{badge > 99 ? '99+' : badge}</span>
                  )}
                </div>
                {!collapsed && (
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.04em', display: 'block' }}>{label}</span>
                    {sub && (
                      <span style={{ fontSize: 9, color: 'rgba(255,248,238,0.28)', letterSpacing: '0.04em', display: 'block', marginTop: 1 }}>
                        {sub}
                      </span>
                    )}
                  </div>
                )}
              </button>
            </div>
          )
        })}
      </nav>

      {/* ── Footer ── */}
      <div style={{
        position: 'relative', zIndex: 1,
        borderTop: '1px solid rgba(200,164,93,0.15)',
        padding: collapsed ? '12px 0' : '16px 20px',
        textAlign: 'center',
      }}>
        {collapsed ? (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="12" height="12" rx="1.5" transform="rotate(45 7 7)"
                fill="#C8A45D" opacity="0.5"/>
              <circle cx="7" cy="7" r="2.5" fill="#C8A45D" opacity="0.7"/>
            </svg>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
              <BaliBorder width={140} opacity={0.45} />
            </div>
            {/* Mini rice field */}
            <svg width="140" height="16" viewBox="0 0 140 16" fill="none" style={{ display: 'block', margin: '0 auto 8px' }}>
              {[0.3, 0.6, 0.85].map((t, i) => (
                <path key={i}
                  d={`M0,${t*16} C35,${t*16-2} 70,${t*16+2} 105,${t*16-1} 140,${t*16}`}
                  stroke="#6B7D4E" strokeWidth="0.6" opacity={0.2 + i * 0.08} fill="none"
                  style={{ animation: `floatSlow ${7 + i}s ease-in-out ${i}s infinite` }}
                />
              ))}
            </svg>
            <p style={{ color: 'rgba(200,164,93,0.6)', fontSize: 10, letterSpacing: '0.14em' }}>
              CANGGU · BALI · 2028
            </p>
          </>
        )}
      </div>
    </aside>
  )
}
