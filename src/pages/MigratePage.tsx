import { useState } from 'react'
import { saveAppData, saveWeddingDetails, saveSeating, saveAccommodation, saveMoodBoard } from '../lib/supabaseData'

interface MigrateResult {
  key: string
  status: 'ok' | 'skipped' | 'error'
  detail?: string
}

export function MigratePage({ onDone }: { onDone: () => void }) {
  const [results, setResults] = useState<MigrateResult[]>([])
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [progress, setProgress] = useState(0)

  const STEPS = [
    { key: 'App data (guests, budget, vendors, events…)', localKey: 'jamie-beth-wedding-planner', save: saveAppData, getDetail: (d: any) => `${d.guests?.length || 0} guests, ${d.budget?.length || 0} expenses, ${d.vendors?.length || 0} vendors` },
    { key: 'Wedding details', localKey: 'jb-wedding-details', save: saveWeddingDetails, getDetail: (d: any) => `${d.partner1} & ${d.partner2}, ${d.date}` },
    { key: 'Seating chart', localKey: 'jb-seating', save: saveSeating, getDetail: (d: any) => `${d.tables?.length || 0} tables` },
    { key: 'Accommodation', localKey: 'jb-accommodation', save: saveAccommodation, getDetail: (d: any) => `${d.rooms?.length || 0} rooms` },
    { key: 'Mood Board', localKey: 'jb-moodboard', save: (b: any) => saveMoodBoard({ images: b.images ?? [], swatches: b.swatches ?? [] }), getDetail: (d: any) => `${d.images?.length || 0} images, ${d.swatches?.length || 0} swatches` },
  ]

  const migrate = async () => {
    setRunning(true)
    setResults([])
    setProgress(0)
    const out: MigrateResult[] = []

    for (let i = 0; i < STEPS.length; i++) {
      const step = STEPS[i]
      setProgress(Math.round(((i) / STEPS.length) * 100))

      try {
        const raw = localStorage.getItem(step.localKey)
        if (raw) {
          const parsed = JSON.parse(raw)
          await step.save(parsed)
          out.push({
            key: step.key,
            status: 'ok',
            detail: step.getDetail(parsed)
          })
        } else {
          out.push({ key: step.key, status: 'skipped', detail: 'Nothing in localStorage' })
        }
      } catch (e: any) {
        out.push({ key: step.key, status: 'error', detail: e.message || 'Unknown error' })
      }

      setResults([...out])
      setProgress(Math.round(((i + 1) / STEPS.length) * 100))
    }

    const success = out.every(r => r.status !== 'error')
    setDone(success)
    setRunning(false)

    if (success) {
      // Auto-clear localStorage on success to fully switch to Supabase
      try {
        localStorage.removeItem('jamie-beth-wedding-planner')
        localStorage.removeItem('jb-wedding-details')
        localStorage.removeItem('jb-seating')
        localStorage.removeItem('jb-accommodation')
        localStorage.removeItem('jb-moodboard')
        localStorage.removeItem('jb-timeline')
        localStorage.removeItem('jb-events')
      } catch {}
    }
  }

  const progressBar = (
    <div style={{ width: '100%', height: 6, background: '#E8D5A3', borderRadius: 3, marginBottom: 16, overflow: 'hidden' }}>
      <div style={{
        width: `${progress}%`,
        height: '100%',
        background: '#C8A45D',
        transition: 'width 0.3s ease'
      }} />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFF8EE', padding: 24 }}>
      <div style={{ maxWidth: 520, width: '100%' }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontStyle: 'italic', color: '#3B2A22', marginBottom: 8, textAlign: 'center' }}>
          Migrate your data
        </h1>
        <p style={{ fontSize: 13, color: '#7A6657', textAlign: 'center', lineHeight: 1.7, marginBottom: 24 }}>
          Copy your local planning data to Supabase for cross-device access.
        </p>

        {results.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={migrate} disabled={running} style={{
              width: '100%', padding: 14, borderRadius: 14, fontSize: 14, fontWeight: 600,
              border: 'none', background: running ? '#E8D5A3' : '#3B2A22', color: running ? '#7A6657' : '#FFF8EE', cursor: running ? 'default' : 'pointer'
            }}>
              {running ? 'Migrating…' : 'Start Migration'}
            </button>
            <button onClick={onDone} style={{
              width: '100%', padding: 14, borderRadius: 14, fontSize: 14,
              border: '1.5px solid #E8D5A3', background: 'transparent', color: '#7A6657', cursor: 'pointer'
            }}>
              Skip — data already in Supabase
            </button>
          </div>
        ) : (
          <>
            {progressBar}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24, maxHeight: 300, overflowY: 'auto' }}>
              {STEPS.map((step, idx) => {
                const r = results[idx] || { key: step.key, status: running && idx === results.length ? 'pending' : 'skipped' as const }
                const isCurrent = running && idx === results.length
                return (
                  <div key={idx} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                    borderRadius: 10, background: '#FAF3E6', border: '1px solid #E8D5A3',
                    opacity: r.status === 'skipped' ? 0.7 : 1
                  }}>
                    <span style={{ fontSize: 15 }}>{r.status === 'ok' ? '✅' : r.status === 'error' ? '❌' : isCurrent ? '⏳' : '⏭️'}</span>
                    <div style={{ flex: 1, fontSize: 13 }}>
                      <div style={{ fontWeight: 600, color: '#3B2A22' }}>{step.key}</div>
                      {r.detail && <div style={{ fontSize: 11, color: '#7A6657' }}>{r.detail}</div>}
                    </div>
                    {isCurrent && <span style={{ fontSize: 11, color: '#C8A45D' }}>processing…</span>}
                  </div>
                )
              })}
            </div>

            {done && (
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <p style={{ color: '#7F9A78', fontWeight: 600, marginBottom: 8 }}>✅ Migration complete! Local data cleared.</p>
                <button onClick={onDone} style={{
                  width: '100%', padding: 14, borderRadius: 14, fontSize: 14, fontWeight: 600,
                  border: 'none', background: '#3B2A22', color: '#FFF8EE', cursor: 'pointer'
                }}>
                  Continue to planner →
                </button>
              </div>
            )}

            {!done && !running && results.length > 0 && (
              <div>
                <p style={{ fontSize: 12, color: '#C47A52', textAlign: 'center', marginBottom: 10 }}>
                  Some items failed. Fix connection and retry.
                </p>
                <button onClick={migrate} style={{ width: '100%', padding: 12, borderRadius: 12, background: '#3B2A22', color: '#FFF8EE', border: 'none', fontWeight: 600 }}>
                  Retry Migration
                </button>
              </div>
            )}

            {running && (
              <p style={{ fontSize: 12, color: '#7A6657', textAlign: 'center' }}>Please keep this tab open…</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
