import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { pickRandomLoveNote } from '../data/loveNotes'

const DISPLAY_MS = 4000
const FADE_MS = 450

type LoveNoteContextValue = (routeKey: string) => void

const LoveNoteContext = createContext<LoveNoteContextValue | null>(null)

type ActiveNote = {
  id: number
  message: string
}

function LoveNoteOverlay({ message, onDone }: { message: string; onDone: () => void }) {
  const [opacity, setOpacity] = useState(0)

  useEffect(() => {
    setOpacity(0)
    const fadeIn = requestAnimationFrame(() => setOpacity(1))
    const fadeOutTimer = window.setTimeout(() => setOpacity(0), DISPLAY_MS - FADE_MS)
    const doneTimer = window.setTimeout(onDone, DISPLAY_MS)
    return () => {
      cancelAnimationFrame(fadeIn)
      window.clearTimeout(fadeOutTimer)
      window.clearTimeout(doneTimer)
    }
  }, [message, onDone])

  return (
    <div
      aria-live="polite"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 8500,
        pointerEvents: 'none',
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 420,
          width: '100%',
          padding: '22px 28px',
          borderRadius: 20,
          background: 'rgba(255, 248, 238, 0.96)',
          border: '1.5px solid #E8D5A3',
          boxShadow: '0 16px 48px rgba(42, 30, 20, 0.18)',
          textAlign: 'center',
          opacity,
          transform: opacity > 0.5 ? 'translateY(0) scale(1)' : 'translateY(6px) scale(0.98)',
          transition: `opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease`,
        }}
      >
        <p
          style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: 22,
            fontStyle: 'italic',
            color: '#3B2A22',
            lineHeight: 1.45,
            margin: 0,
          }}
        >
          {message}
        </p>
        <p
          style={{
            marginTop: 10,
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#C8A45D',
            fontWeight: 600,
          }}
        >
          For Beth
        </p>
      </div>
    </div>
  )
}

const ROUTE_DEBOUNCE_MS = 100

export function LoveNoteProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveNote | null>(null)
  const lastRouteRef = useRef<string | null>(null)
  const lastMessageRef = useRef<string | undefined>(undefined)
  const noteIdRef = useRef(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const trigger = useCallback((routeKey: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      if (lastRouteRef.current === routeKey) return
      lastRouteRef.current = routeKey

      const message = pickRandomLoveNote(lastMessageRef.current)
      lastMessageRef.current = message
      noteIdRef.current += 1
      setActive({ id: noteIdRef.current, message })
    }, ROUTE_DEBOUNCE_MS)
  }, [])

  const handleDone = useCallback(() => {
    setActive(null)
  }, [])

  return (
    <LoveNoteContext.Provider value={trigger}>
      {children}
      {active && (
        <LoveNoteOverlay key={active.id} message={active.message} onDone={handleDone} />
      )}
    </LoveNoteContext.Provider>
  )
}

/** Show a random love note whenever `routeKey` changes (page or tab navigation). */
export function useLoveNoteOnNavigate(routeKey: string) {
  const trigger = useContext(LoveNoteContext)
  useEffect(() => {
    if (trigger) trigger(routeKey)
  }, [routeKey, trigger])
}