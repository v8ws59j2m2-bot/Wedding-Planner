import { useEffect, useState } from 'react'

// Floating particles that react to scroll
function useScrollY() {
  const [y, setY] = useState(0)
  useEffect(() => {
    const el = document.getElementById('main-scroll')
    if (!el) return
    // Initialise from current scroll position to avoid jump on first scroll
    setY(el.scrollTop)
    const handler = () => setY(el.scrollTop)
    el.addEventListener('scroll', handler, { passive: true })
    return () => el.removeEventListener('scroll', handler)
  }, [])
  return y
}

// Individual floating botanical element
function FloatingElement({ x, y, size, delay, duration, type, parallax = 1 }: {
  x: number; y: number; size: number; delay: number
  duration: number; type: 'leaf' | 'frangipani' | 'dot' | 'diamond'; parallax?: number
}) {
  const scrollY = useScrollY()
  const offsetY = scrollY * parallax * 0.08

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${x}%`,
    top: `${y}%`,
    transform: `translateY(${-offsetY}px)`,
    animation: `floatSlow ${duration}s ease-in-out ${delay}s infinite`,
    pointerEvents: 'none',
    willChange: 'transform',
  }

  if (type === 'leaf') return (
    <div style={baseStyle}>
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" opacity={0.12}>
        <path d="M20 38 C18 28 12 18 4 8 C14 10 24 22 20 38Z" fill="#6B7D4E"/>
        <path d="M20 38 C22 28 28 18 36 8 C26 10 16 22 20 38Z" fill="#7A8E5A"/>
        <path d="M20 38 L20 8" stroke="#5A6E3A" strokeWidth="0.8" opacity="0.6"/>
      </svg>
    </div>
  )

  if (type === 'frangipani') return (
    <div style={{ ...baseStyle, animation: `drift ${duration}s ease-in-out ${delay}s infinite` }}>
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" opacity={0.1}>
        {[0,72,144,216,288].map((deg, i) => {
          const rad = (deg - 90) * Math.PI / 180
          const cx = 20 + 8 * Math.cos(rad), cy = 20 + 8 * Math.sin(rad)
          return <ellipse key={i} cx={cx} cy={cy} rx="5" ry="9"
            fill="#C8A45D" transform={`rotate(${deg},${cx},${cy})`}/>
        })}
        <circle cx="20" cy="20" r="4" fill="#D4A855"/>
      </svg>
    </div>
  )

  if (type === 'diamond') return (
    <div style={{ ...baseStyle, animation: `pulseGold ${duration}s ease-in-out ${delay}s infinite` }}>
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none" opacity={0.18}>
        <rect x="4" y="4" width="12" height="12" rx="1.5" transform="rotate(45 10 10)"
          fill="#C8A45D"/>
        <circle cx="10" cy="10" r="2.5" fill="#C8A45D"/>
      </svg>
    </div>
  )

  // dot
  return (
    <div style={{ ...baseStyle, animation: `breathe ${duration}s ease-in-out ${delay}s infinite` }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(200,164,93,0.25), transparent)',
      }}/>
    </div>
  )
}

// Rice field wave lines
function RiceWaves({ scrollY }: { scrollY: number }) {
  const lines = [0.18, 0.36, 0.54, 0.72, 0.88]
  return (
    <svg
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {lines.map((t, i) => {
        const y = t * 100 + (scrollY * 0.02 * (i % 2 === 0 ? 1 : -1))
        const amp = 1.5 + i * 0.5
        return (
          <path key={i}
            d={`M0 ${y} C25 ${y - amp} 50 ${y + amp} 75 ${y - amp} 100 ${y}`}
            stroke="#6B7D4E"
            strokeWidth={0.4 + i * 0.08}
            opacity={0.06 + i * 0.015}
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
        )
      })}
    </svg>
  )
}

// Positions for floating elements — deterministic so no hydration mismatch
const ELEMENTS: { x: number; y: number; size: number; delay: number; duration: number; type: 'leaf' | 'frangipani' | 'dot' | 'diamond'; parallax: number }[] = [
  { x: 3,  y: 8,  size: 48, delay: 0,   duration: 7,  type: 'leaf',      parallax: 0.6 },
  { x: 92, y: 5,  size: 40, delay: 1.5, duration: 9,  type: 'leaf',      parallax: 0.8 },
  { x: 8,  y: 35, size: 32, delay: 0.8, duration: 8,  type: 'frangipani',parallax: 0.4 },
  { x: 88, y: 28, size: 36, delay: 2,   duration: 10, type: 'frangipani',parallax: 0.5 },
  { x: 15, y: 62, size: 28, delay: 3,   duration: 7,  type: 'leaf',      parallax: 0.3 },
  { x: 85, y: 55, size: 30, delay: 1,   duration: 8,  type: 'leaf',      parallax: 0.7 },
  { x: 5,  y: 80, size: 38, delay: 2.5, duration: 9,  type: 'frangipani',parallax: 0.2 },
  { x: 94, y: 75, size: 34, delay: 0.5, duration: 11, type: 'frangipani',parallax: 0.4 },
  { x: 20, y: 15, size: 16, delay: 4,   duration: 6,  type: 'diamond',   parallax: 1.0 },
  { x: 75, y: 12, size: 14, delay: 1.2, duration: 7,  type: 'diamond',   parallax: 0.9 },
  { x: 50, y: 5,  size: 12, delay: 2.8, duration: 8,  type: 'diamond',   parallax: 1.2 },
  { x: 30, y: 45, size: 60, delay: 0,   duration: 12, type: 'dot',       parallax: 0.1 },
  { x: 70, y: 65, size: 50, delay: 3,   duration: 14, type: 'dot',       parallax: 0.2 },
  { x: 10, y: 50, size: 20, delay: 1.8, duration: 7,  type: 'diamond',   parallax: 0.6 },
  { x: 90, y: 45, size: 18, delay: 0.3, duration: 9,  type: 'diamond',   parallax: 0.7 },
]

export function AnimatedBackground() {
  const scrollY = useScrollY()

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 0,
      overflow: 'hidden', pointerEvents: 'none',
      background: 'linear-gradient(160deg, #FFF8EE 0%, #FDF4E4 40%, #FFF8EE 100%)',
    }}>
      <RiceWaves scrollY={scrollY} />
      {ELEMENTS.map((el, i) => (
        <FloatingElement key={i} {...el} />
      ))}
    </div>
  )
}
