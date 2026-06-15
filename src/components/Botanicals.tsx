// Botanical & Balinese SVG illustrations

// ── White lily sprig ──────────────────────────────────────────────────────────
export function LilySprig({ size = 120, opacity = 1, flip = false }: {
  size?: number; opacity?: number; flip?: boolean
}) {
  return (
    <svg width={size} height={size * 1.4} viewBox="0 0 100 140" fill="none"
      style={{ opacity, transform: flip ? 'scaleX(-1)' : undefined, display: 'block' }}>
      <path d="M50 135 C50 100 48 70 46 40" stroke="#6B7D4E" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M47 95 C40 88 30 85 22 80" stroke="#6B7D4E" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M47 75 C54 65 62 58 72 50" stroke="#6B7D4E" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M46 55 C40 48 36 40 34 30" stroke="#6B7D4E" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M47 95 C38 86 26 82 20 78 C24 76 36 80 47 95Z" fill="#7A8E5A"/>
      <path d="M47 75 C55 64 65 57 74 50 C72 54 60 62 47 75Z" fill="#8B9B6B"/>
      <path d="M34 30 C32 22 29 12 31 4 C36 10 37 22 34 30Z" fill="rgba(255,255,255,0.95)"/>
      <path d="M34 30 C29 22 24 14 24 6 C29 12 33 22 34 30Z" fill="rgba(255,250,240,0.9)"/>
      <path d="M34 30 C39 22 42 12 39 4 C36 10 34 22 34 30Z" fill="rgba(255,252,245,0.92)"/>
      <path d="M46 40 C41 28 34 14 32 2 C39 10 44 26 46 40Z" fill="rgba(255,255,255,0.97)"/>
      <path d="M46 40 C44 26 44 12 48 0 C51 10 51 26 46 40Z" fill="rgba(255,252,245,1)"/>
      <path d="M46 40 C51 28 58 14 63 4 C56 12 51 26 46 40Z" fill="rgba(255,250,240,0.95)"/>
      <path d="M46 40 C37 30 28 20 24 10 C31 16 42 28 46 40Z" fill="rgba(255,253,248,0.9)"/>
      <path d="M46 40 C55 30 64 22 70 14 C63 20 53 28 46 40Z" fill="rgba(255,253,248,0.88)"/>
      <line x1="46" y1="37" x2="43" y2="22" stroke="#C8A45D" strokeWidth="0.9" opacity="0.9"/>
      <line x1="46" y1="37" x2="48" y2="20" stroke="#C8A45D" strokeWidth="0.9" opacity="0.9"/>
      <line x1="46" y1="37" x2="51" y2="22" stroke="#C8A45D" strokeWidth="0.9" opacity="0.9"/>
      <circle cx="43" cy="21" r="2" fill="#D4A855"/>
      <circle cx="48" cy="19" r="2" fill="#D4A855"/>
      <circle cx="51" cy="21" r="2" fill="#D4A855"/>
    </svg>
  )
}

// ── Olive foliage sprig ───────────────────────────────────────────────────────
export function FoliageSprig({ size = 100, opacity = 1, flip = false }: {
  size?: number; opacity?: number; flip?: boolean
}) {
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 100 120" fill="none"
      style={{ opacity, transform: flip ? 'scaleX(-1)' : undefined, display: 'block' }}>
      <path d="M50 118 C50 90 52 65 54 35" stroke="#6B7D4E" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M52 85 C42 76 30 72 18 68" stroke="#6B7D4E" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M53 65 C62 56 72 50 82 44" stroke="#6B7D4E" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M53 48 C44 38 36 30 28 20" stroke="#6B7D4E" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M52 85 C40 74 24 70 16 66 C16 72 30 76 52 85Z" fill="#5A6E3A"/>
      <path d="M52 85 C44 76 30 72 18 68" stroke="#4A5E2E" strokeWidth="0.7" opacity="0.6"/>
      <path d="M53 65 C63 55 74 49 84 44 C82 50 70 56 53 65Z" fill="#7A8E5A"/>
      <path d="M53 48 C43 37 34 28 26 18 C28 24 38 32 53 48Z" fill="#6B7D4E"/>
      <path d="M54 35 C50 26 44 18 40 10 C44 12 50 22 54 35Z" fill="#7A8E5A"/>
      <path d="M54 35 C58 26 64 18 70 12 C66 16 60 24 54 35Z" fill="#6B7D4E"/>
      <path d="M54 35 C54 24 54 14 56 5 C58 10 58 24 54 35Z" fill="#5A6E3A"/>
    </svg>
  )
}

// ── Small leaf accent ─────────────────────────────────────────────────────────
export function SmallLeaf({ size = 60, opacity = 1, rotate = 0 }: {
  size?: number; opacity?: number; rotate?: number
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none"
      style={{ opacity, transform: `rotate(${rotate}deg)`, display: 'block' }}>
      <path d="M30 55 C28 40 20 28 10 15 C22 18 34 32 30 55Z" fill="#6B7D4E"/>
      <path d="M30 55 C32 40 40 28 50 15 C38 18 26 32 30 55Z" fill="#7A8E5A"/>
      <path d="M30 55 C30 40 30 24 30 10" stroke="#5A6E3A" strokeWidth="0.8" opacity="0.6" strokeLinecap="round"/>
    </svg>
  )
}

// ── Frangipani — coloured, Balinese style ─────────────────────────────────────
export function Frangipani({ size = 80, opacity = 1 }: {
  size?: number; opacity?: number
}) {
  // Five petals, warm cream-to-pink blush with gold centre
  const petals = [0, 72, 144, 216, 288]
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none"
      style={{ opacity, display: 'block' }}>
      {petals.map((deg, i) => {
        const rad = (deg - 90) * Math.PI / 180
        const cx = 50 + 20 * Math.cos(rad)
        const cy = 50 + 20 * Math.sin(rad)
        return (
          <ellipse key={i} cx={cx} cy={cy} rx="14" ry="22"
            fill="rgba(255,248,235,0.97)"
            stroke="rgba(220,180,130,0.5)" strokeWidth="0.7"
            transform={`rotate(${deg}, ${cx}, ${cy})`}
          />
        )
      })}
      {/* Petal blush overlay — warm pink tinge */}
      {petals.map((deg, i) => {
        const rad = (deg - 90) * Math.PI / 180
        const cx = 50 + 20 * Math.cos(rad)
        const cy = 50 + 20 * Math.sin(rad)
        return (
          <ellipse key={`b${i}`} cx={cx + Math.cos(rad) * 6} cy={cy + Math.sin(rad) * 6}
            rx="6" ry="10"
            fill="rgba(220,160,100,0.18)"
            transform={`rotate(${deg}, ${cx}, ${cy})`}
          />
        )
      })}
      {/* Gold centre */}
      <circle cx="50" cy="50" r="10" fill="#E8C87A"/>
      <circle cx="50" cy="50" r="6"  fill="#D4A855"/>
      <circle cx="50" cy="50" r="3"  fill="#C8943A"/>
      {/* Stamens */}
      {[0,45,90,135,180,225,270,315].map((deg, i) => {
        const r = (deg - 90) * Math.PI / 180
        return <line key={i} x1={50} y1={50}
          x2={50 + 8 * Math.cos(r)} y2={50 + 8 * Math.sin(r)}
          stroke="#C8943A" strokeWidth="0.8" opacity="0.7"
        />
      })}
    </svg>
  )
}

// ── Balinese temple gate silhouette ───────────────────────────────────────────
export function TempleGate({ width = 160, opacity = 1 }: {
  width?: number; opacity?: number
}) {
  const h = width * 1.3
  return (
    <svg width={width} height={h} viewBox="0 0 160 208" fill="none"
      style={{ opacity, display: 'block' }}>
      {/* Stone base */}
      <rect x="20" y="188" width="120" height="20" rx="2"
        fill="rgba(139,107,60,0.35)" stroke="rgba(139,107,60,0.5)" strokeWidth="0.8"/>
      {/* Steps */}
      <rect x="28" y="180" width="104" height="10" rx="1" fill="rgba(139,107,60,0.28)"/>
      <rect x="36" y="173" width="88" height="9" rx="1" fill="rgba(139,107,60,0.25)"/>

      {/* LEFT TOWER */}
      <path d="M36 173 L36 108 L32 95 L28 80 L30 62 L34 46 L38 30 L42 16 L46 6 L50 16 L52 30 L52 173 Z"
        fill="rgba(120,90,45,0.32)" stroke="rgba(139,107,60,0.6)" strokeWidth="1"/>
      {/* Left tiers */}
      <rect x="30" y="108" width="22" height="8" rx="1" fill="rgba(139,107,60,0.3)"/>
      <rect x="28" y="95"  width="24" height="8" rx="1" fill="rgba(139,107,60,0.28)"/>
      <rect x="26" y="80"  width="26" height="9" rx="1" fill="rgba(139,107,60,0.26)"/>
      <rect x="28" y="66"  width="24" height="8" rx="1" fill="rgba(139,107,60,0.28)"/>
      <rect x="30" y="53"  width="22" height="8" rx="1" fill="rgba(139,107,60,0.3)"/>
      <rect x="33" y="40"  width="18" height="8" rx="1" fill="rgba(139,107,60,0.32)"/>
      <rect x="36" y="28"  width="14" height="8" rx="1" fill="rgba(139,107,60,0.35)"/>
      <rect x="40" y="17"  width="10" height="7" rx="1" fill="rgba(139,107,60,0.38)"/>
      {/* Left decorative notches */}
      {[130, 148, 162].map((y, i) => (
        <rect key={i} x="36" y={y} width="14" height="3" rx="1" fill="rgba(139,107,60,0.25)"/>
      ))}

      {/* RIGHT TOWER — mirror */}
      <path d="M124 173 L124 108 L128 95 L132 80 L130 62 L126 46 L122 30 L118 16 L114 6 L110 16 L108 30 L108 173 Z"
        fill="rgba(120,90,45,0.32)" stroke="rgba(139,107,60,0.6)" strokeWidth="1"/>
      <rect x="108" y="108" width="22" height="8" rx="1" fill="rgba(139,107,60,0.3)"/>
      <rect x="108" y="95"  width="24" height="8" rx="1" fill="rgba(139,107,60,0.28)"/>
      <rect x="106" y="80"  width="26" height="9" rx="1" fill="rgba(139,107,60,0.26)"/>
      <rect x="108" y="66"  width="24" height="8" rx="1" fill="rgba(139,107,60,0.28)"/>
      <rect x="108" y="53"  width="22" height="8" rx="1" fill="rgba(139,107,60,0.3)"/>
      <rect x="109" y="40"  width="18" height="8" rx="1" fill="rgba(139,107,60,0.32)"/>
      <rect x="110" y="28"  width="14" height="8" rx="1" fill="rgba(139,107,60,0.35)"/>
      <rect x="110" y="17"  width="10" height="7" rx="1" fill="rgba(139,107,60,0.38)"/>
      {[130, 148, 162].map((y, i) => (
        <rect key={i} x="110" y={y} width="14" height="3" rx="1" fill="rgba(139,107,60,0.25)"/>
      ))}

      {/* Gap between towers */}
      <rect x="52" y="173" width="56" height="16" rx="0"
        fill="rgba(0,0,0,0)" />

      {/* Decorative carvings on towers */}
      <circle cx="44" cy="88"  r="3" fill="none" stroke="rgba(139,107,60,0.4)" strokeWidth="0.7"/>
      <circle cx="44" cy="120" r="3" fill="none" stroke="rgba(139,107,60,0.4)" strokeWidth="0.7"/>
      <circle cx="116" cy="88"  r="3" fill="none" stroke="rgba(139,107,60,0.4)" strokeWidth="0.7"/>
      <circle cx="116" cy="120" r="3" fill="none" stroke="rgba(139,107,60,0.4)" strokeWidth="0.7"/>
    </svg>
  )
}

// ── Tropical palm frond ───────────────────────────────────────────────────────
export function PalmFrond({ size = 120, opacity = 1, flip = false }: {
  size?: number; opacity?: number; flip?: boolean
}) {
  return (
    <svg width={size} height={size * 1.1} viewBox="0 0 120 132" fill="none"
      style={{ opacity, transform: flip ? 'scaleX(-1)' : undefined, display: 'block' }}>
      <path d="M60 130 C58 100 55 70 40 30" stroke="#6B7D4E" strokeWidth="2" strokeLinecap="round"/>
      <path d="M50 90 C38 82 20 80 6 78 C12 72 36 76 50 90Z"   fill="#5A6E3A"/>
      <path d="M47 70 C34 58 18 52 4 46 C10 42 32 50 47 70Z"   fill="#6B7D4E"/>
      <path d="M45 50 C34 36 22 26 10 16 C18 14 34 26 45 50Z"  fill="#7A8E5A"/>
      <path d="M42 32 C36 20 30 10 26 2 C32 2 40 14 42 32Z"    fill="#6B7D4E"/>
      <path d="M54 85 C64 74 78 70 92 66 C88 72 68 78 54 85Z"  fill="#7A8E5A"/>
      <path d="M51 65 C60 52 74 44 88 36 C84 42 64 52 51 65Z"  fill="#6B7D4E"/>
      <path d="M46 44 C54 30 64 20 76 10 C72 16 56 28 46 44Z"  fill="#5A6E3A"/>
      <path d="M50 90 C38 82 20 80 6 78" stroke="#4A5E2E" strokeWidth="0.5" opacity="0.5"/>
      <path d="M47 70 C34 58 18 52 4 46" stroke="#4A5E2E" strokeWidth="0.5" opacity="0.5"/>
    </svg>
  )
}

// ── Rice field terrace lines ──────────────────────────────────────────────────
export function RiceFields({ width = 200, height = 60, opacity = 1 }: {
  width?: number; height?: number; opacity?: number
}) {
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none"
      style={{ opacity, display: 'block' }}>
      {[0.12, 0.30, 0.50, 0.68, 0.84].map((t, i) => {
        const y = t * height
        const amp = 3 + i * 2
        const d = `M0 ${y} ` + Array.from({ length: 8 }, (_, j) => {
          const x1 = (j / 8) * width, x2 = ((j + 0.5) / 8) * width, x3 = ((j + 1) / 8) * width
          return `C ${x1 + width/16} ${y - amp} ${x2 - width/16} ${y + amp} ${x3} ${y}`
        }).join(' ')
        return <path key={i} d={d}
          stroke="#6B7D4E" strokeWidth={0.8 + i * 0.15} opacity={0.35 + i * 0.08}
          fill="none" strokeLinecap="round"
        />
      })}
    </svg>
  )
}

// ── Balinese decorative border ─────────────────────────────────────────────────
export function BaliBorder({ width = 300, opacity = 1 }: {
  width?: number; opacity?: number
}) {
  const unit = 24
  const count = Math.floor(width / unit)
  return (
    <svg width={count * unit} height={20} viewBox={`0 0 ${count * unit} 20`} fill="none"
      style={{ opacity, display: 'block' }}>
      {Array.from({ length: count }, (_, i) => (
        <g key={i} transform={`translate(${i * unit + unit / 2}, 10)`}>
          {/* Outer diamond */}
          <rect x="-6" y="-6" width="12" height="12" rx="1.5"
            transform="rotate(45)" fill="#C8A45D" opacity="0.5"/>
          {/* Inner diamond */}
          <rect x="-3.5" y="-3.5" width="7" height="7" rx="1"
            transform="rotate(45)" fill="#C8A45D" opacity="0.4"/>
          {/* Centre dot */}
          <circle cx="0" cy="0" r="2" fill="#C8A45D" opacity="0.8"/>
        </g>
      ))}
      <line x1="0" y1="1"  x2={count * unit} y2="1"  stroke="#C8A45D" strokeWidth="0.6" opacity="0.4"/>
      <line x1="0" y1="19" x2={count * unit} y2="19" stroke="#C8A45D" strokeWidth="0.6" opacity="0.4"/>
    </svg>
  )
}

// ── Balinese batik tile — used as card background accent ──────────────────────
export function BatikCorner({ size = 60, opacity = 1, flip = false }: {
  size?: number; opacity?: number; flip?: boolean
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none"
      style={{ opacity, transform: flip ? 'scaleX(-1)' : undefined, display: 'block' }}>
      {/* Spiral lotus-inspired corner motif */}
      <path d="M0 60 C10 40 25 25 60 0" stroke="#C8A45D" strokeWidth="0.8" opacity="0.6"/>
      <path d="M0 60 C8 48 18 38 40 20 C50 12 58 5 60 0" stroke="#C8A45D" strokeWidth="0.5" opacity="0.4"/>
      <path d="M0 60 C15 50 30 42 50 28 C54 24 58 18 60 10" stroke="#8B9B6B" strokeWidth="0.6" opacity="0.4"/>
      {/* Dots along the curve */}
      {[[8,52],[18,42],[30,30],[42,18],[52,8]].map(([x,y], i) => (
        <circle key={i} cx={x} cy={y} r="1.5" fill="#C8A45D" opacity="0.5"/>
      ))}
      {/* Small leaf at corner */}
      <path d="M4 56 C8 48 16 42 22 36 C18 38 10 46 4 56Z" fill="#7A8E5A" opacity="0.5"/>
      <path d="M4 56 C12 52 20 48 28 40 C22 44 14 50 4 56Z" fill="#6B7D4E" opacity="0.4"/>
    </svg>
  )
}
