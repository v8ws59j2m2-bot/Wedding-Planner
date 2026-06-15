import { useState } from 'react'
import { CalendarDays, BookOpen, CheckSquare, Image } from 'lucide-react'
import { Events } from './Events'
import { Itinerary } from './Itinerary'
import { Checklist } from './Checklist'
import { MoodBoard } from './MoodBoard'
import type { AppData } from '../types'

export type PlanningTab = 'events' | 'itinerary' | 'checklist' | 'moodboard'

interface Props {
  data: AppData
  setData: (d: AppData | ((p: AppData) => AppData)) => void
  initialTab?: PlanningTab
}

const VALID_TABS: PlanningTab[] = ['events', 'itinerary', 'checklist', 'moodboard']

export function PlanningPage({ data, setData, initialTab = 'events' }: Props) {
  const safeInitial: PlanningTab = VALID_TABS.includes(initialTab) ? initialTab : 'events'
  const [tab, setTab] = useState<PlanningTab>(safeInitial)

  // Overdue checklist count for badge
  const overdueChecklist = data.checklist.filter(c =>
    !c.completed && c.dueDate && new Date(c.dueDate) < new Date()
  ).length

  const TABS = [
    { key: 'events'    as PlanningTab, label: 'Events',    icon: CalendarDays, badge: 0 },
    { key: 'itinerary' as PlanningTab, label: 'Itinerary', icon: BookOpen,     badge: 0 },
    { key: 'checklist' as PlanningTab, label: 'Checklist', icon: CheckSquare,  badge: overdueChecklist },
    { key: 'moodboard' as PlanningTab, label: 'Mood Board',icon: Image,        badge: 0 },
  ]

  return (
    <div>
      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 4,
        borderBottom: '2px solid #F2E3CF',
        marginBottom: 0,
      }}>
        {TABS.map(t => {
          const active = tab === t.key
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '12px 20px', borderRadius: 0, border: 'none',
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
                  background: '#C47A52', color: '#fff',
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
        {tab === 'events'    && <Events    data={data} setData={setData}/>}
        {tab === 'itinerary' && <Itinerary data={data}/>}
        {tab === 'checklist' && <Checklist data={data} setData={setData}/>}
        {tab === 'moodboard' && <MoodBoard data={data} setData={setData}/>}
      </div>
    </div>
  )
}
