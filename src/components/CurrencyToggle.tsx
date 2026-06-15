import { useState } from 'react'
import { RefreshCw, ChevronDown } from 'lucide-react'
import { useCurrencyContext } from '../context/CurrencyContext'
import { CURRENCY_LABELS, type Currency } from '../hooks/useCurrency'

const CURRENCIES: Currency[] = ['GBP', 'IDR']

export function CurrencyToggle() {
  const { prefs, updatePrefs, rates, loading, error, lastUpdated, refetch } = useCurrencyContext()
  const [open, setOpen] = useState(false)

  const current = CURRENCY_LABELS[prefs.display]

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', position: 'relative' }}>
      {/* Currency picker */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            cursor: 'pointer',
            border: `1.5px solid ${prefs.display !== 'GBP' ? '#C8A45D' : '#E8D5A3'}`,
            background: prefs.display !== 'GBP' ? 'rgba(200,164,93,0.12)' : 'transparent',
            color: '#3B2A22', transition: 'all 0.15s',
          }}
        >
          <span>{current.flag}</span>
          <span>{current.symbol} {prefs.display}</span>
          <ChevronDown size={11} style={{ color: '#7A6657', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}/>
        </button>

        {open && (
          <div
            style={{
              position: 'absolute', top: '110%', left: 0, zIndex: 50,
              background: '#FFF8EE', border: '1.5px solid #E8D5A3',
              borderRadius: 12, padding: 6, minWidth: 180,
              boxShadow: '0 8px 24px rgba(42,30,20,0.12)',
            }}
            onMouseLeave={() => setOpen(false)}
          >
            {CURRENCIES.map(c => {
              const info = CURRENCY_LABELS[c]
              const rate = c === 'GBP' ? null : rates?.IDR
              const active = prefs.display === c
              return (
                <button
                  key={c}
                  onClick={() => { updatePrefs({ display: c }); setOpen(false) }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', borderRadius: 8, border: 'none',
                    background: active ? 'rgba(200,164,93,0.12)' : 'transparent',
                    cursor: 'pointer', gap: 8, transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(200,164,93,0.06)' }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{info.flag}</span>
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: '#3B2A22', margin: 0 }}>
                        {info.symbol} {c}
                      </p>
                      <p style={{ fontSize: 10, color: '#7A6657', margin: 0 }}>{info.name}</p>
                    </div>
                  </div>
                  {rate && (
                    <span style={{ fontSize: 10, color: '#7A6657', fontStyle: 'italic' }}>
                      £1 = Rp{Math.round(rate).toLocaleString('id-ID')}
                    </span>
                  )}
                  {active && <span style={{ fontSize: 10, color: '#C8A45D', fontWeight: 700 }}>✓</span>}
                </button>
              )
            })}

            {/* Show both toggle */}
            <div style={{ height: 1, background: '#F2E3CF', margin: '6px 0' }}/>
            <button
              onClick={() => updatePrefs({ showBoth: !prefs.showBoth })}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', borderRadius: 8, border: 'none',
                background: 'transparent', cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 11, color: '#7A6657' }}>Show GBP alongside</span>
              <div style={{
                width: 36, height: 20, borderRadius: 10,
                background: prefs.showBoth ? '#7F9A78' : '#E8D5A3',
                position: 'relative', transition: 'background 0.2s',
              }}>
                <div style={{
                  width: 14, height: 14, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 3,
                  left: prefs.showBoth ? 19 : 3,
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}/>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Rate info + refresh */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {loading && (
          <span style={{ fontSize: 11, color: '#7A6657', display: 'flex', alignItems: 'center', gap: 4 }}>
            <RefreshCw size={10} style={{ animation: 'spinSlow 1s linear infinite' }}/> Updating rates…
          </span>
        )}
        {!loading && lastUpdated && (
          <span style={{ fontSize: 10, color: '#7A6657', opacity: 0.7 }}>
            Rates: {lastUpdated.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} {lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        {!loading && (
          <button onClick={refetch} title="Refresh exchange rates"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C8A45D', padding: 2, lineHeight: 1 }}>
            <RefreshCw size={11}/>
          </button>
        )}
        {error && (
          <span style={{ fontSize: 10, color: '#C47A52' }}>⚠ {error}</span>
        )}
      </div>
    </div>
  )
}

// ── Inline amount with secondary currency ─────────────────────────────────────
// Use this where showing both currencies side-by-side is helpful
export function DualAmount({ gbp, compact = false }: { gbp: number; compact?: boolean }) {
  const { display, displayBoth, prefs } = useCurrencyContext()
  if (!prefs.showBoth || prefs.display === 'GBP') {
    return <span>{display(gbp)}</span>
  }
  if (compact) {
    return (
      <span>
        {display(gbp)}
        <span style={{ fontSize: '0.8em', opacity: 0.6, marginLeft: 4 }}>
          ({displayBoth(gbp).split('·')[1]?.trim()})
        </span>
      </span>
    )
  }
  return <span>{displayBoth(gbp)}</span>
}
