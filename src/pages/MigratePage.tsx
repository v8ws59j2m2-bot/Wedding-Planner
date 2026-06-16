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
  const [done,    setDone]    = useState(false)

  const migrate = async () => {
    setRunning(true)
    const out: MigrateResult[] = []

    // 1. Main app data
    try {
      const raw = localStorage.getItem('jamie-beth-wedding-planner')
      if (raw) {
        const parsed = JSON.parse(raw)
        const appData = {
          guests:     parsed.guests     ?? [],
          budget:     parsed.budget     ?? [],
          checklist:  parsed.checklist  ?? [],
          vendors:    parsed.vendors    ?? [],
          moodImages: parsed.moodImages ?? [],
          events:     parsed.events     ?? [],
          travelInfo: parsed.travelInfo ?? [],
        }
        await saveAppData(appData)
        out.push({ key: 'App data (guests, budget, vendors, events…)', status: 'ok',
          detail: `${appData.guests.length} guests, ${appData.budget.length} expenses, ${appData.vendors.length} vendors` })
      } else {
        out.push({ key: 'App data', status: 'skipped', detail: 'Nothing in localStorage' })
      }
    } catch (e: any) {
      out.push({ key: 'App data', status: 'error', detail: e.message })
    }

    // 2. Wedding details
    try {
      const raw = localStorage.getItem('jb-wedding-details')
      if (raw) {
        const details = JSON.parse(raw)
        await saveWeddingDetails(details)
        out.push({ key: 'Wedding details', status: 'ok', detail: `${details.partner1} & ${details.partner2}, ${details.date}` })
      } else {
        out.push({ key: 'Wedding details', status: 'skipped', detail: 'Nothing in localStorage' })
      }
    } catch (e: any) {
      out.push({ key: 'Wedding details', status: 'error', detail: e.message })
    }

    // 3. Seating chart
    try {
      const raw = localStorage.getItem('jb-seating')
      if (raw) {
        const seating = JSON.parse(raw)
        await saveSeating(seating)
        out.push({ key: 'Seating chart', status: 'ok', detail: `${seating.tables?.length ?? 0} tables` })
      } else {
        out.push({ key: 'Seating chart', status: 'skipped', detail: 'Nothing in localStorage' })
      }
    } catch (e: any) {
      out.push({ key: 'Seating chart', status: 'error', detail: e.message })
    }

    // 4. Accommodation
    try {
      const raw = localStorage.getItem('jb-accommodation')
      if (raw) {
        const accom = JSON.parse(raw)
        await saveAccommodation(accom)
        out.push({ key: 'Accommodation', status: 'ok', detail: `${accom.rooms?.length ?? 0} rooms` })
      } else {
        out.push({ key: 'Accommodation', status: 'skipped', detail: 'Nothing in localStorage' })
      }
    } catch (e: any) {
      out.push({ key: 'Accommodation', status: 'error', detail: e.message })
    }

    // 5. Mood Board
    try {
      const raw = localStorage.getItem('jb-moodboard')
      if (raw) {
        const board = JSON.parse(raw)
        await saveMoodBoard({ images: board.images ?? [], swatches: board.swatches ?? [] })
        out.push({ key: 'Mood Board', status: 'ok', detail: `${board.images?.length ?? 0} images, ${board.swatches?.length ?? 0} swatches` })
      } else {
        out.push({ key: 'Mood Board', status: 'skipped', detail: 'Nothing in localStorage' })
      }
    } catch (e: any) {
      out.push({ key: 'Mood Board', status: 'error', detail: e.message })
    }

    setResults(out)
    setRunning(false)
    setDone(out.every(r => r.status !== 'error'))
  }

  const statusIcon = (s: MigrateResult['status']) =>
    s === 'ok' ? '✅' : s === 'skipped' ? '⏭️' : '❌'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#FFF8EE', padding: 24 }}>
      <div style={{ maxWidth: 480, width: '100%' }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontStyle: 'italic',
          color: '#3B2A22', marginBottom: 8, textAlign: 'center' }}>
          Migrate your data
        </h1>
        <p style={{ fontSize: 13, color: '#7A6657', textAlign: 'center', lineHeight: 1.7, marginBottom: 32 }}>
          This will copy all your existing planning data from this browser into your Supabase account so it's available on all devices.
        </p>

        {results.length === 0 ? (
          <button onClick={migrate} disabled={running}
            style={{ width: '100%', padding: 14, borderRadius: 14, fontSize: 14, fontWeight: 600,
              border: 'none', background: running ? '#E8D5A3' : '#3B2A22',
              color: running ? '#7A6657' : '#FFF8EE', cursor: running ? 'default' : 'pointer' }}>
            {running ? 'Migrating…' : 'Start migration'}
          </button>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {results.map(r => (
                <div key={r.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '12px 16px', borderRadius: 12, background: '#FAF3E6', border: '1.5px solid #E8D5A3' }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{statusIcon(r.status)}</span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#3B2A22' }}>{r.key}</p>
                    {r.detail && <p style={{ fontSize: 11, color: '#7A6657', marginTop: 2 }}>{r.detail}</p>}
                  </div>
                </div>
              ))}
            </div>

            {done && (
              <button onClick={onDone}
                style={{ width: '100%', padding: 14, borderRadius: 14, fontSize: 14, fontWeight: 600,
                  border: 'none', background: '#3B2A22', color: '#FFF8EE', cursor: 'pointer' }}>
                Continue to planner →
              </button>
            )}

            {!done && (
              <p style={{ fontSize: 12, color: '#C47A52', textAlign: 'center' }}>
                Some items failed to migrate. Check your Supabase connection and try again.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
