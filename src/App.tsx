import { useState, useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { Dashboard } from './pages/Dashboard'
import { Guests } from './pages/Guests'
import { Budget } from './pages/Budget'
import { Checklist } from './pages/Checklist'
import { MoodBoard } from './pages/MoodBoard'
import { Vendors } from './pages/Vendors'
import { SeatingChart } from './pages/SeatingChart'
import { Accommodation } from './pages/Accommodation'
import { FinancialOverview } from './pages/FinancialOverview'
import { Settings } from './pages/Settings'
import { AnimatedBackground } from './components/AnimatedBackground'
import { useStorage } from './hooks/useStorage'
import { useIsMobile } from './hooks/useIsMobile'
import type { Page } from './types'

function PageWrapper({ children, pageKey }: { children: React.ReactNode; pageKey: string }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    setVisible(false)
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [pageKey])
  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(12px)',
      transition: 'opacity 0.35s ease, transform 0.35s ease',
    }}>
      {children}
    </div>
  )
}

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isMobile = useIsMobile()
  const { data, setData, exportData, importData } = useStorage()

  // Close sidebar on page change on mobile
  const navigate = (p: Page) => {
    setPage(p)
    if (isMobile) setSidebarOpen(false)
  }

  // Scroll to top on page change
  useEffect(() => {
    const el = document.getElementById('main-scroll')
    if (el) el.scrollTop = 0
  }, [page])

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard data={data} onNavigate={navigate} />
      case 'guests':    return <Guests data={data} setData={setData} />
      case 'budget':    return <Budget data={data} setData={setData} />
      case 'checklist': return <Checklist data={data} setData={setData} />
      case 'vendors':   return <Vendors data={data} setData={setData} />
      case 'moodboard': return <MoodBoard data={data} setData={setData} />
      case 'seating':       return <SeatingChart data={data} />
      case 'accommodation': return <Accommodation data={data} />
      case 'finances':      return <FinancialOverview data={data} onNavigate={navigate} />
      case 'settings':      return <Settings data={data} setData={setData} />
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      <AnimatedBackground />

      {/* Mobile overlay behind sidebar */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 30,
            background: 'rgba(42,30,20,0.45)',
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Sidebar — fixed drawer on mobile, sticky column on desktop */}
      <div style={{
        position: isMobile ? 'fixed' : 'sticky',
        top: 0, left: 0,
        height: isMobile ? '100vh' : 'auto',
        zIndex: isMobile ? 40 : 20,
        transform: isMobile && !sidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
        transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        flexShrink: 0,
      }}>
        <Sidebar
          current={page}
          onChange={navigate}
          collapsed={false}
        />
      </div>

      {/* Main content */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        minWidth: 0, position: 'relative', zIndex: 1,
        // On desktop with sidebar visible, no extra margin needed
        // On mobile, full width
        marginLeft: isMobile ? 0 : undefined,
      }}>
        <TopBar
          page={page}
          onToggleSidebar={() => setSidebarOpen(o => !o)}
          onExport={exportData}
          onImport={importData}
          isMobile={isMobile}
        />
        <main
          id="main-scroll"
          style={{
            flex: 1, overflowY: 'auto',
            paddingLeft: isMobile ? 0 : 40,
          }}
        >
          <PageWrapper pageKey={page}>
            {renderPage()}
          </PageWrapper>
        </main>
      </div>
    </div>
  )
}
