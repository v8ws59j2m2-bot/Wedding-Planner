import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { CurrencyProvider } from './context/CurrencyContext'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { AuthScreen } from './components/AuthScreen.tsx'
import { MigratePage } from './pages/MigratePage.tsx'
import { supabase } from './lib/supabase.ts'
import type { Session } from '@supabase/supabase-js'

const MIGRATED_KEY = 'jb-supabase-migrated'

function Root() {
  const [session,  setSession]  = useState<Session | null>(null)
  const [checking, setChecking] = useState(true)
  const [needsMigration, setNeedsMigration] = useState(false)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      // Check if this is a new login with existing localStorage data that hasn't been migrated
      if (session && !localStorage.getItem(MIGRATED_KEY)) {
        const hasLocalData = !!localStorage.getItem('jamie-beth-wedding-planner')
        setNeedsMigration(hasLocalData)
      }
      setChecking(false)
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(160deg, #1A1208 0%, #2A1E10 100%)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12, animation: 'floatSlow 3s ease-in-out infinite' }}>🌺</div>
          <p style={{ color: 'rgba(200,164,93,0.6)', fontSize: 12, letterSpacing: '0.15em' }}>LOADING</p>
        </div>
      </div>
    )
  }

  if (!session) return <AuthScreen/>

  if (needsMigration) {
    return (
      <MigratePage onDone={() => {
        localStorage.setItem(MIGRATED_KEY, '1')
        setNeedsMigration(false)
      }}/>
    )
  }

  return (
    <ErrorBoundary>
      <CurrencyProvider>
        <App/>
      </CurrencyProvider>
    </ErrorBoundary>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root/>
  </StrictMode>,
)
