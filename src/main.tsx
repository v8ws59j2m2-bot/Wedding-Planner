import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { CurrencyProvider } from './context/CurrencyContext'
import { MoodBoardProvider } from './context/MoodBoardContext'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { AuthScreen } from './components/AuthScreen.tsx'
import { MigratePage } from './pages/MigratePage.tsx'
import { supabase } from './lib/supabase.ts'
import type { Session } from '@supabase/supabase-js'

const MIGRATED_KEY = 'jb-supabase-migrated'

// Read auth state outside React — avoids setState-during-render entirely
function getInitialSession(): Session | null {
  try {
    // Supabase stores session in localStorage under this key
    const storageKey = `sb-${new URL(import.meta.env.VITE_SUPABASE_URL as string).hostname.split('.')[0]}-auth-token`
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Check it hasn't expired
    if (parsed?.expires_at && parsed.expires_at * 1000 < Date.now()) return null
    return parsed as Session
  } catch {
    return null
  }
}

function Root() {
  const [session,        setSession]        = useState<Session | null>(getInitialSession)
  const [needsMigration, setNeedsMigration] = useState(() => {
    const s = getInitialSession()
    if (!s) return false
    if (localStorage.getItem(MIGRATED_KEY)) return false
    return !!localStorage.getItem('jamie-beth-wedding-planner')
  })

  useEffect(() => {
    // Refresh session from Supabase (handles token refresh, expiry etc.)
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      if (s && !localStorage.getItem(MIGRATED_KEY)) {
        const hasLocalData = !!localStorage.getItem('jamie-beth-wedding-planner')
        if (hasLocalData) setNeedsMigration(true)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => subscription.unsubscribe()
  }, [])

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
        <MoodBoardProvider>
          <App/>
        </MoodBoardProvider>
      </CurrencyProvider>
    </ErrorBoundary>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root/>
  </StrictMode>,
)
