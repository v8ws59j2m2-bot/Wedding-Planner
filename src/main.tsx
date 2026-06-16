import { StrictMode, useState, useEffect, useRef } from 'react'
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
  const [session,        setSession]        = useState<Session | null>(null)
  const [checking,       setChecking]       = useState(true)
  const [needsMigration, setNeedsMigration] = useState(false)
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true

    // Subscribe to auth changes first
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (mountedRef.current) {
        setSession(newSession)
        setChecking(false)
      }
    })

    // Then get the current session — onAuthStateChange will fire with the result
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (mountedRef.current) {
        setSession(s)
        if (s && !localStorage.getItem(MIGRATED_KEY)) {
          const hasLocalData = !!localStorage.getItem('jamie-beth-wedding-planner')
          setNeedsMigration(hasLocalData)
        }
        setChecking(false)
      }
    })

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
    }
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
