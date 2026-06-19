// ─────────────────────────────────────────────────────────────────────────────
// useSupabaseStorage — replaces useStorage for authenticated sessions.
// Keeps a local cache in useState so the UI is always fast; syncs to Supabase
// on every change with debounce to avoid hammering the API.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react'
import { loadAppData, saveAppData, loadWeddingDetails } from '../lib/supabaseData'
import { exportAllData, parseImport } from '../services/dataService'
import { supabase } from '../lib/supabase'
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

  // Basic realtime subscription for app_data (live sync across tabs/devices when authenticated)
  useEffect(() => {
    const channel = supabase
      .channel('app-data-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_data' },
        (payload) => {
          if (payload.new && typeof payload.new === 'object') {
            const newData = payload.new as any
            // Only update if it looks like our data (has guests etc.)
            if (Array.isArray(newData.guests)) {
              setDataState({
                guests: newData.guests ?? [],
                budget: newData.budget ?? [],
                checklist: newData.checklist ?? [],
                vendors: newData.vendors ?? [],
                moodImages: newData.mood_images ?? [],
                events: newData.events ?? [],
                travelInfo: newData.travel_info ?? [],
              })
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Simple retry helper for reliability
  async function saveWithRetry(fn: () => Promise<void>, attempts = 3) {
    let lastErr: any
    for (let i = 0; i < attempts; i++) {
      try {
        await fn()
        return
      } catch (e) {
        lastErr = e
        if (i < attempts - 1) await new Promise(r => setTimeout(r, 300 * (i + 1)))
      }
    }
    throw lastErr
  }

  // Debounced save to Supabase on every data change
  const setData = useCallback((update: AppData | ((prev: AppData) => AppData)) => {
    // Compute next state without calling other setters inside the updater
    let nextData: AppData | null = null
    setDataState(prev => {
      nextData = typeof update === 'function' ? update(prev) : update
      return nextData
    })
    // Schedule side effects outside the updater function
    setSyncErr(null)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (nextData) {
        setSyncing(true)
        try {
          await saveWithRetry(() => saveAppData(nextData!))
        } catch {
          setSyncErr('Could not save to Supabase — changes kept locally until next successful sync')
        } finally {
          setSyncing(false)
        }
      }
    }, 800)
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

  const syncNow = useCallback(async () => {
    setSyncErr(null)
    setSyncing(true)
    try {
      await saveWithRetry(() => saveAppData(data))
    } catch {
      setSyncErr('Sync failed. Changes will retry automatically.')
    } finally {
      setSyncing(false)
    }
  }, [data])

  return { data, setData, exportData, importData, loading, syncing, syncError: syncErr, syncNow }
}
