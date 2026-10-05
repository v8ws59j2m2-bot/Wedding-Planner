import { useState } from 'react'
import { useLoveNoteOnNavigate } from '../components/LoveNote'
import { Users, Plane, Banknote } from 'lucide-react'
import { Guests } from './Guests'
import { TravelLogistics } from './TravelLogistics'
import { StayPayments } from './StayPayments'
import { countOverdueStayParties, GUESTS_TAB_STORAGE_KEY } from '../lib/stayPayments'
import type { AppData } from '../types'

export type GuestsTab = 'list' | 'travel' | 'payments'

interface Props {
  data: AppData
  setData: (d: AppData | ((p: AppData) => AppData)) => void
  initialTab?: GuestsTab
}

function initialGuestsTab(fallback: GuestsTab): GuestsTab {
  try {
    const wanted = sessionStorage.getItem(GUESTS_TAB_STORAGE_KEY)
    sessionStorage.removeItem(GUESTS_TAB_STORAGE_KEY)
    if (wanted === 'payments' || wanted === 'travel' || wanted === 'list') return wanted
  } catch { /* private mode */ }
  return fallback
}

export function GuestsPage({ data, setData, initialTab = 'list' }: Props) {
  const [tab, setTab] = useState<GuestsTab>(() => initialGuestsTab(initialTab))
  useLoveNoteOnNavigate(`guests-${tab}`)

  const missingTravel = (() => {
    const guests = data.guests.filter(g => g.attending !== 'no')
    const travelInfo = data.travelInfo ?? []
    return guests.filter(g => {
      const t = travelInfo.find(x => x.guestId === g.id)
      return !t?.arrival?.date && !t?.departure?.date
    }).length
  })()

  const overdueStay = countOverdueStayParties(data.guests, data.guestStayPayments)

  const TABS = [
    { key: 'list'     as GuestsTab, label: 'Guest List',          icon: Users,    badge: 0 },
    { key: 'payments' as GuestsTab, label: 'Stay payments',       icon: Banknote, badge: overdueStay },
    { key: 'travel'   as GuestsTab, label: 'Travel & Logistics',  icon: Plane,    badge: missingTravel },
  ]

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #F2E3CF', marginBottom: 0 }}>
        {TABS.map(t => {
          const active = tab === t.key
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '12px 22px', borderRadius: 0, border: 'none',
                background: 'transparent', cursor: 'pointer',
                fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: active ? 700 : 500,
                color: active ? '#3B2A22' : '#7A6657',
                borderBottom: active ? '2px solid #C8A45D' : '2px solid transparent',
                marginBottom: -2, transition: 'all 0.15s',
              }}>
              <t.icon size={14} strokeWidth={1.6} style={{ color: active ? '#C8A45D' : '#A89080' }}/>
              {t.label}
              {t.badge > 0 && (
                <span style={{
                  minWidth: 16, height: 16, borderRadius: 8, padding: '0 4px',
                  background: '#C8A45D', color: '#fff',
                  fontSize: 9, fontWeight: 700, lineHeight: '16px', textAlign: 'center',
                }}>
                  {t.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div>
        {tab === 'list'     && <Guests data={data} setData={setData}/>}
        {tab === 'payments' && <StayPayments data={data} setData={setData}/>}
        {tab === 'travel'   && <TravelLogistics data={data} setData={setData}/>}
      </div>
    </div>
  )
}
