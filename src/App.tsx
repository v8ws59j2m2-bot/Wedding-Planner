import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { Dashboard } from './pages/Dashboard'
import { BudgetPaymentsPage } from './pages/BudgetPaymentsPage'
import { GuestsPage } from './pages/GuestsPage'
import { Vendors } from './pages/Vendors'
import { SeatingChart } from './pages/SeatingChart'
import { Accommodation } from './pages/Accommodation'
import { PlanningPage } from './pages/PlanningPage'
import { Settings } from './pages/Settings'
import { AnimatedBackground } from './components/AnimatedBackground'
import { useSupabaseStorage } from './hooks/useSupabaseStorage'

import { useIsMobile } from './hooks/useIsMobile'
import { countOverduePayments } from './lib/helpers'
import { useTour, TourOverlay, TourCtx } from './components/GuidedTour'
import { useLoveNoteOnNavigate } from './components/LoveNote'
import type { Page } from './types'

// ── Storage quota warning banner ──────────────────────────────────────────────
function useQuotaWarning() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const handler = () => setShow(true)
    window.addEventListener('storage-quota-exceeded', handler)
    return () => window.removeEventListener('storage-quota-exceeded', handler)
  }, [])
  return { show, dismiss: () => setShow(false) }
}

function QuotaBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, maxWidth: 520, width: 'calc(100% - 32px)',
      background: '#3B2A22', color: '#FFF8EE', borderRadius: 14,
      padding: '14px 20px', boxShadow: '0 8px 32px rgba(42,30,20,0.4)',
      display: 'flex', alignItems: 'center', gap: 14,
      fontFamily: 'Inter, sans-serif',
    }}>
      <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Storage almost full</p>
        <p style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.5 }}>
          Your browser storage is nearly full — likely due to large Mood Board images.
          Export a backup now, then remove some images to free space.
        </p>
      </div>
      <button onClick={onDismiss} style={{
        background: 'rgba(255,248,238,0.15)', border: '1px solid rgba(255,248,238,0.3)',
        color: '#FFF8EE', borderRadius: 8, padding: '6px 12px', fontSize: 12,
        fontWeight: 600, cursor: 'pointer', flexShrink: 0,
      }}>
        Got it
      </button>
    </div>
  )
}

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
  const { data, setData, exportData, importData, loading, syncing, syncError, syncNow, connectionStatus } = useSupabaseStorage()
  // All hooks must be called before any early returns (Rules of Hooks)
  const { show: quotaWarning, dismiss: dismissQuota } = useQuotaWarning()
  useLoveNoteOnNavigate(page)

  // Global tour — one active at a time, managed via a single hook instance per ID
  const [activeTourId, setActiveTourId] = useState<string | null>(null)
  const tourControl = useTour(activeTourId ?? 'budget')

  const startTour = useCallback((id: string) => {
    setActiveTourId(id)
  }, [])

  // When activeTourId changes, start the tour on next tick
  useEffect(() => {
    if (activeTourId) tourControl.start(true)
  }, [activeTourId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleTourDone = useCallback(() => {
    tourControl.skip()
    setActiveTourId(null)
  }, [tourControl])

  const navigate = (p: Page) => {
    setPage(p)
    if (isMobile) setSidebarOpen(false)
  }

  useEffect(() => {
    const el = document.getElementById('main-scroll')
    if (el) el.scrollTop = 0
  }, [page])

  // Badge counts
  const overdueChecklist = data.checklist.filter(c =>
    !c.completed && c.dueDate && new Date(c.dueDate) < new Date()
  ).length

  const overduePayments = countOverduePayments(data.budget)

  const renderPage = () => {
    switch (page) {
      case 'dashboard':       return <Dashboard data={data} onNavigate={navigate}/>
      case 'guests':          return <GuestsPage data={data} setData={setData}/>
      case 'budget-payments': return <BudgetPaymentsPage data={data} setData={setData} onNavigate={navigate}/>
      case 'vendors':         return <Vendors data={data} setData={setData}/>
      case 'accommodation':   return <Accommodation data={data}/>
      case 'seating':         return <SeatingChart data={data}/>
      case 'planning':        return <PlanningPage data={data} setData={setData}/>
      case 'settings':        return <Settings data={data} setData={setData}/>
      default:                return <Dashboard data={data} onNavigate={navigate}/>
    }
  }

  // Loading screen — shown after all hooks have been called
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#FFF8EE' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12, animation: 'floatSlow 3s ease-in-out infinite' }}>🌺</div>
          <p style={{ color: '#C8A45D', fontSize: 12, letterSpacing: '0.15em', fontFamily: 'Playfair Display, serif' }}>
            Loading your planner…
          </p>
        </div>
      </div>
    )
  }

  return (
    <TourCtx.Provider value={{ startTour }}>
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      <AnimatedBackground/>

      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 30,
          background: 'rgba(42,30,20,0.45)', backdropFilter: 'blur(2px)',
        }}/>
      )}

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
          badges={{
            'budget-payments': overduePayments || undefined,
            'planning':        overdueChecklist || undefined,
            'guests': (() => {
              const guests = data.guests.filter(g => g.attending !== 'no')
              const travelInfo = data.travelInfo ?? []
              return guests.filter(g => {
                const t = travelInfo.find(x => x.guestId === g.id)
                return !t?.arrival?.date && !t?.departure?.date
              }).length || undefined
            })(),
          }}
        />
      </div>

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        minWidth: 0, position: 'relative', zIndex: 1,
        marginLeft: isMobile ? 0 : undefined,
      }}>
        <TopBar
          page={page}
          onToggleSidebar={() => setSidebarOpen(o => !o)}
          onExport={exportData}
          onImport={importData}
          onStartTour={startTour}
          syncing={syncing}
          syncError={syncError}
          onSyncNow={syncNow}
          connectionStatus={connectionStatus}
          isMobile={isMobile}
        />
        <main id="main-scroll" style={{ flex: 1, overflowY: 'auto', paddingLeft: isMobile ? 0 : 40 }}>
          <PageWrapper pageKey={page}>
            {renderPage()}
          </PageWrapper>
        </main>
      </div>
      {quotaWarning && <QuotaBanner onDismiss={dismissQuota}/>}

      {/* Guided tour overlay */}
      <TourOverlay
        tourId={activeTourId ?? ''}
        active={tourControl.active}
        step={tourControl.step}
        tour={tourControl.tour}
        onNext={tourControl.next}
        onPrev={tourControl.prev}
        onSkip={handleTourDone}
      />
    </div>
    </TourCtx.Provider>
  )
}
