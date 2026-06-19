// ─────────────────────────────────────────────────────────────────────────────
// useSupabaseStorage — replaces useStorage for authenticated sessions.
// Keeps a local cache in useState so the UI is always fast; syncs to Supabase
// on every change with debounce to avoid hammering the API.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { loadAppData, saveAppData, loadWeddingDetails, mapAppDataRow } from '../lib/supabaseData'
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
  const hasLoadedRef = useRef(false)
  const isSavingRef  = useRef(false)

  // Load first, then subscribe to realtime — never save or apply remote updates until loaded
  useEffect(() => {
    let cancelled = false
    let channel: RealtimeChannel | null = null

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) throw new Error('Not authenticated')

      const loaded = await loadAppData()
      if (cancelled) return

      setDataState(loaded)
      hasLoadedRef.current = true
      setLoading(false)

      channel = supabase
        .channel(`app-data-realtime-${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'app_data', filter: `user_id=eq.${user.id}` },
          (payload) => {
            if (isSavingRef.current) return
            if (!payload.new || typeof payload.new !== 'object') return
            const row = payload.new as Record<string, unknown>
            if (row.user_id !== user.id) return
            setDataState(mapAppDataRow(row))
          },
        )
        .subscribe()
    }

    init().catch(() => {
      if (!cancelled) setSyncErr('Could not load data')
    }).finally(() => {
      if (!cancelled && !hasLoadedRef.current) setLoading(false)
    })

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  async function saveWithRetry(fn: () => Promise<void>, attempts = 3) {
    let lastErr: unknown
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

  // Debounced save to Supabase on every data change (only after initial load)
  const setData = useCallback((update: AppData | ((prev: AppData) => AppData)) => {
    let nextData: AppData | null = null
    setDataState(prev => {
      nextData = typeof update === 'function' ? update(prev) : update
      return nextData
    })
    setSyncErr(null)
    if (!hasLoadedRef.current) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (!nextData || !hasLoadedRef.current) return
      setSyncing(true)
      isSavingRef.current = true
      try {
        await saveWithRetry(() => saveAppData(nextData!))
      } catch {
        setSyncErr('Could not save to Supabase — changes kept locally until next successful sync')
      } finally {
        isSavingRef.current = false
        setSyncing(false)
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
    if (!hasLoadedRef.current) return
    setSyncErr(null)
    setSyncing(true)
    isSavingRef.current = true
    try {
      await saveWithRetry(() => saveAppData(data))
    } catch {
      setSyncErr('Sync failed. Changes will retry automatically.')
    } finally {
      isSavingRef.current = false
      setSyncing(false)
    }
  }, [data])

  return { data, setData, exportData, importData, loading, syncing, syncError: syncErr, syncNow }
}