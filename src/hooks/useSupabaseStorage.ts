// ─────────────────────────────────────────────────────────────────────────────
// useSupabaseStorage — replaces useStorage for authenticated sessions.
// Keeps a local cache in useState so the UI is always fast; syncs to Supabase
// on every change with debounce to avoid hammering the API.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react'
import { loadAppData, saveAppData, loadWeddingDetails, saveWeddingDetails } from '../lib/supabaseData'
import { exportAllData, parseImport } from '../services/dataService'
import type { AppData } from '../types'

const DEFAULT: AppData = {
  guests: [], budget: [], checklist: [], vendors: [],
  moodImages: [], events: [], travelInfo: [],
}

export function useSupabaseStorage() {
  const [data,    setDataState] = useState<AppData>(DEFAULT)
  const [loading, setLoading]   = useState(true)
  const [syncing, setSyncing]   = useState(false)
  const [syncErr, setSyncErr]   = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load on mount
  useEffect(() => {
    loadAppData()
      .then(d => setDataState(d))
      .catch(() => setSyncErr('Could not load data'))
      .finally(() => setLoading(false))
  }, [])

  // Debounced save to Supabase on every data change
  const setData = useCallback((update: AppData | ((prev: AppData) => AppData)) => {
    setDataState(prev => {
      const next = typeof update === 'function' ? update(prev) : update
      setSyncErr(null)
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        setSyncing(true)
        saveAppData(next)
          .catch(() => setSyncErr('Could not save — changes may be lost'))
          .finally(() => setSyncing(false))
      }, 800)
      return next
    })
  }, [])

  const exportData = useCallback(async () => {
    const details = await loadWeddingDetails()
    exportAllData(data, details)
  }, [data])

  const importData = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const result = parseImport(text, file.name)
      if (!result.success) { alert(result.error); return }
      setData(prev => ({
        ...prev,
        ...(result.data.guests    !== undefined && { guests:     result.data.guests }),
        ...(result.data.budget    !== undefined && { budget:     result.data.budget }),
        ...(result.data.checklist !== undefined && { checklist:  result.data.checklist }),
        ...(result.data.vendors   !== undefined && { vendors:    result.data.vendors }),
        ...(result.data.moodImages!== undefined && { moodImages: result.data.moodImages }),
        ...(result.data.events    !== undefined && { events:     result.data.events }),
        ...(result.data.travelInfo!== undefined && { travelInfo: result.data.travelInfo }),
      }))
    }
    reader.readAsText(file)
  }, [setData])

  return { data, setData, exportData, importData, loading, syncing, syncError: syncErr }
}
