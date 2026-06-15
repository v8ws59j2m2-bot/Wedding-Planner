import { useState, useEffect } from 'react'
import { Menu, Download, Upload } from 'lucide-react'
import type { Page } from '../types'

const PAGE_TITLES: Record<Page, string> = {
  dashboard: 'Dashboard',
  guests: 'Guest List',
  budget: 'Budget',
  checklist: 'Checklist',
  vendors: 'Vendors',
  moodboard: 'Mood Board',
  seating: 'Seating Chart',
  accommodation: 'Accommodation',
  finances: 'Financial Overview',
  settings: 'Settings & Data',
}

const WEDDING_DATE = new Date('2028-04-05T00:00:00')

function useCountdown() {
  const [days, setDays] = useState(0)
  useEffect(() => {
    const update = () => {
      const diff = WEDDING_DATE.getTime() - Date.now()
      setDays(Math.max(0, Math.ceil(diff / 86400000)))
    }
    update()
    const t = setInterval(update, 60000)
    return () => clearInterval(t)
  }, [])
  return days
}

interface Props {
  page: Page
  onToggleSidebar: () => void
  onExport: () => void
  onImport: (f: File) => void
  isMobile?: boolean
}

export function TopBar({ page, onToggleSidebar, onExport, onImport, isMobile }: Props) {
  const days = useCountdown()

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: isMobile ? '12px 16px' : '12px 32px',
      borderBottom: '1px solid #F2E3CF',
      backgroundColor: '#FFF8EE',
      flexShrink: 0,
    }}>
      {/* Left: hamburger + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={onToggleSidebar}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: 10,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#7A6657', transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.05)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
        >
          <Menu size={20}/>
        </button>
        <h1 style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: isMobile ? 18 : 22,
          color: '#3B2A22', fontWeight: 500, margin: 0,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          maxWidth: isMobile ? '160px' : 'none',
        }}>
          {PAGE_TITLES[page]}
        </h1>
      </div>

      {/* Right: countdown + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 12 }}>
        {/* Countdown — hide on very small screens */}
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 20,
            backgroundColor: '#FAF3E6', border: '1px solid #E8D5A3' }}>
            <span style={{ fontFamily: 'Playfair Display, serif', fontStyle: 'italic', color: '#C47A52', fontSize: 13 }}>
              {days} days
            </span>
            <span style={{ color: '#7A6657', fontSize: 12 }}>to Bali</span>
          </div>
        )}

        {/* Export */}
        <button onClick={onExport} title="Export backup"
          style={{ display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 12px', borderRadius: 8, border: 'none',
            background: 'transparent', cursor: 'pointer', color: '#7A6657', fontSize: 12, fontWeight: 500,
          }}>
          <Download size={15}/>
          {!isMobile && <span>Export</span>}
        </button>

        {/* Import */}
        <label title="Import backup"
          style={{ display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 12px', borderRadius: 8, cursor: 'pointer',
            color: '#7A6657', fontSize: 12, fontWeight: 500,
          }}>
          <Upload size={15}/>
          {!isMobile && <span>Import</span>}
          <input type="file" accept=".json" style={{ display: 'none' }}
            onChange={e => e.target.files?.[0] && onImport(e.target.files[0])}/>
        </label>
      </div>
    </header>
  )
}
