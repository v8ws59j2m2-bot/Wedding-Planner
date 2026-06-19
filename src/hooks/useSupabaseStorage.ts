// ─────────────────────────────────────────────────────────────────────────────
// useSupabaseStorage — replaces useStorage for authenticated sessions.
// Keeps a local cache in useState so the UI is always fast; syncs to Supabase
// on every change with debounce to avoid hammering the API.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  loadAppData,
  saveAppData,
  loadWeddingDetails,
  subscribeToAppData,
  MOODBOARD_PULL_EVENT,
  type ConnectionStatus,
} from '../lib/supabaseData'
import { exportAllData, parseImport } from '../services/dataService'
import { supabase, registerRealtimeReconnect } from '../lib/supabase'
import type { AppData } from '../types'

const DEFAULT: AppData = {
  guests: [], budget: [], checklist: [], vendors: [],
  moodImages: [], events: [], travelInfo: [],
}

const SAVE_ECHO_IGNORE_MS = 1200
const HEALTH_CHECK_MS = 20_000

export function useSupabaseStorage() {
  const [data, setDataState] = useState<AppData>(DEFAULT)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncErr, setSyncErr] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasLoadedRef = useRef(false)
  const isSavingRef = useRef(false)
  const lastSaveAtRef = useRef(0)
  const realtimeRef = useRef<ReturnType<typeof subscribeToAppData> | null>(null)
  const pullLatestRef = useRef<(reason: string) => Promise<void>>(async () => {})

  const shouldIgnoreRemote = useCallback(() => {
    if (!isSavingRef.current) return false
    return Date.now() - lastSaveAtRef.current < SAVE_ECHO_IGNORE_MS
  }, [])

  // Pull latest from Supabase — shared by Sync Now, focus catch-up, and reconnect
  const pullLatest = useCallback(async (reason: string) => {
    if (!hasLoadedRef.current) return
    if (shouldIgnoreRemote()) return

    console.log('[sync] pullLatest start', { reason })
    setSyncing(true)
    setSyncErr(null)
    try {
      const loaded = await loadAppData()
      setDataState(loaded)
      console.log('[sync] pullLatest ok', {
        reason,
        guests: loaded.guests.length,
        budget: loaded.budget.length,
        checklist: loaded.checklist.length,
      })
      // Mood board has its own realtime channel — only pull on explicit user/resume actions
      if (reason === 'sync-now' || reason === 'focus' || reason === 'visibility' || reason === 'online') {
        window.dispatchEvent(new CustomEvent(MOODBOARD_PULL_EVENT, { detail: { reason } }))
      }
    } catch (err) {
      console.log('[sync] pullLatest failed', { reason, err })
      setSyncErr('Could not refresh from Supabase')
    } finally {
      setSyncing(false)
    }
  }, [shouldIgnoreRemote])

  pullLatestRef.current = pullLatest

  const syncNow = useCallback(async () => {
    realtimeRef.current?.reconnect()
    await pullLatest('sync-now')
  }, [pullLatest])

  // Initial load + realtime subscription
  useEffect(() => {
    let cancelled = false
    let unregisterHeartbeat: (() => void) | undefined

    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user || cancelled) throw new Error('Not authenticated')

      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token)
        console.log('[sync] realtime auth set on init')
      }

      const loaded = await loadAppData()
      if (cancelled) return

      setDataState(loaded)
      hasLoadedRef.current = true
      setLoading(false)
      console.log('[sync] initial load ok', {
        guests: loaded.guests.length,
        budget: loaded.budget.length,
        checklist: loaded.checklist.length,
      })

      const sub = subscribeToAppData(user.id, {
        onData: setDataState,
        onStatus: setConnectionStatus,
        shouldIgnoreUpdate: shouldIgnoreRemote,
        onSubscribed: () => { void pullLatestRef.current('subscribed') },
      })
      realtimeRef.current = sub

      unregisterHeartbeat = registerRealtimeReconnect(() => {
        console.log('[sync] heartbeat reconnect')
        setConnectionStatus('reconnecting')
        sub.reconnect()
        void pullLatestRef.current('heartbeat')
      })
    }

    init().catch((err) => {
      console.log('[sync] init failed', err)
      if (!cancelled) setSyncErr('Could not load data')
    }).finally(() => {
      if (!cancelled && !hasLoadedRef.current) setLoading(false)
    })

    return () => {
      cancelled = true
      unregisterHeartbeat?.()
      realtimeRef.current?.destroy()
      realtimeRef.current = null
    }
  }, [shouldIgnoreRemote])

  // Refresh auth + reconnect on token change
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[sync] auth state change', { event })
      if (!session?.access_token) return
      await supabase.realtime.setAuth(session.access_token)
      realtimeRef.current?.reconnect()
    })
    return () => subscription.unsubscribe()
  }, [])

  // Catch-up when tab regains focus or visibility
  useEffect(() => {
    const onResume = (reason: string) => {
      if (document.hidden && reason !== 'online') return
      console.log('[sync] app resumed', { reason })
      realtimeRef.current?.reconnect()
      void pullLatestRef.current(reason)
    }

    const onFocus = () => onResume('focus')
    const onOnline = () => onResume('online')
    const onVisibility = () => {
      if (!document.hidden) onResume('visibility')
    }

    window.addEventListener('focus', onFocus)
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('online', onOnline)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  // Periodic health check while tab is visible
  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden) return
      const status = realtimeRef.current?.getChannelStatus()
      if (status && status !== 'SUBSCRIBED') {
        console.log('[sync] health check — reconnecting', { status })
        realtimeRef.current?.reconnect()
      }
      void pullLatestRef.current('interval')
    }, HEALTH_CHECK_MS)
    return () => clearInterval(id)
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
      lastSaveAtRef.current = Date.now()
      console.log('[sync] save start')
      try {
        await saveWithRetry(() => saveAppData(nextData!))
        console.log('[sync] save ok')
      } catch (err) {
        console.log('[sync] save failed', err)
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

  return {
    data, setData, exportData, importData,
    loading, syncing, syncError: syncErr,
    syncNow, connectionStatus,
  }
}