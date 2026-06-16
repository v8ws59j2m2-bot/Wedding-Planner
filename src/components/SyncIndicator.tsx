import { useState, useEffect } from 'react'
import { Cloud, CloudOff, RefreshCw, CheckCircle } from 'lucide-react'

interface Props {
  syncing: boolean
  syncError: string | null
}

export function SyncIndicator({ syncing, syncError }: Props) {
  const [online, setOnline] = useState(navigator.onLine)
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => {
    const on  = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  // Show "Saved" briefly after syncing completes
  useEffect(() => {
    if (!syncing && online && !syncError) {
      setJustSaved(true)
      const t = setTimeout(() => setJustSaved(false), 2000)
      return () => clearTimeout(t)
    }
  }, [syncing, online, syncError])

  if (!online) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5,
      fontSize: 11, color: '#C47A52', padding: '4px 10px', borderRadius: 20,
      background: 'rgba(196,122,82,0.1)', border: '1px solid rgba(196,122,82,0.3)' }}>
      <CloudOff size={12}/> Offline
    </div>
  )

  if (syncError) return (
    <div title={syncError} style={{ display: 'flex', alignItems: 'center', gap: 5,
      fontSize: 11, color: '#C47A52', padding: '4px 10px', borderRadius: 20,
      background: 'rgba(196,122,82,0.1)', border: '1px solid rgba(196,122,82,0.3)',
      cursor: 'help' }}>
      <CloudOff size={12}/> Sync error
    </div>
  )

  if (syncing) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5,
      fontSize: 11, color: '#C8A45D', padding: '4px 10px', borderRadius: 20,
      background: 'rgba(200,164,93,0.1)', border: '1px solid rgba(200,164,93,0.3)' }}>
      <RefreshCw size={12} style={{ animation: 'spinSlow 1s linear infinite' }}/> Saving…
    </div>
  )

  if (justSaved) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5,
      fontSize: 11, color: '#7F9A78', padding: '4px 10px', borderRadius: 20,
      background: 'rgba(127,154,120,0.1)', border: '1px solid rgba(127,154,120,0.3)' }}>
      <CheckCircle size={12}/> Saved
    </div>
  )

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5,
      fontSize: 11, color: '#7A6657', padding: '4px 10px', borderRadius: 20,
      opacity: 0.6 }}>
      <Cloud size={12}/> Synced
    </div>
  )
}
