import { useState, useEffect, useRef, useCallback } from 'react'
import {
  loadMoodBoard,
  saveMoodBoard,
  subscribeToMoodBoard,
  mergeMoodBoardData,
  shouldRejectStaleMoodBoardRemote,
  MOODBOARD_PULL_EVENT,
  type MoodBoardData,
  type MoodBoardImage,
  type MoodBoardSwatch,
} from '../lib/supabaseData'
import { supabase, registerRealtimeReconnect } from '../lib/supabase'

const SAVE_DEBOUNCE_MS = 800
const SAVE_ECHO_IGNORE_MS = 1500
const REFETCH_DEBOUNCE_MS = 400
const HEALTH_CHECK_MS = 30_000

const DEFAULT_SWATCHES: MoodBoardSwatch[] = [
  { id: 'sw-1', hex: '#FFF8EE', name: 'Warm Ivory' },
  { id: 'sw-2', hex: '#C8A45D', name: 'Soft Gold' },
  { id: 'sw-3', hex: '#C47A52', name: 'Terracotta' },
  { id: 'sw-4', hex: '#7F9A78', name: 'Sage Green' },
  { id: 'sw-5', hex: '#3B2A22', name: 'Deep Cocoa' },
  { id: 'sw-6', hex: '#F2E3CF', name: 'Sand Beige' },
]

const EMPTY: MoodBoardData = { images: [], swatches: DEFAULT_SWATCHES, updatedAt: null }

function withDefaultSwatches(board: MoodBoardData): MoodBoardData {
  return {
    ...board,
    swatches: board.swatches.length > 0 ? board.swatches : DEFAULT_SWATCHES,
  }
}

function boardsEqual(a: MoodBoardData, b: MoodBoardData): boolean {
  if (a.updatedAt !== b.updatedAt) return false
  if (a.images.length !== b.images.length || a.swatches.length !== b.swatches.length) return false
  return a.images.every((img, i) => {
    const other = b.images[i]
    return other && img.id === other.id && img.src === other.src
  })
}

export function useMoodBoard() {
  const [board, setBoard] = useState<MoodBoardData>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const boardRef = useRef(board)
  boardRef.current = board

  const hasLoadedRef = useRef(false)
  const isSavingRef = useRef(false)
  const lastSaveAtRef = useRef(0)
  const serverUpdatedAtRef = useRef<string | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pullInFlightRef = useRef<Promise<void> | null>(null)
  const applyQueueRef = useRef<Promise<void>>(Promise.resolve())
  const realtimeRef = useRef<ReturnType<typeof subscribeToMoodBoard> | null>(null)

  const hasPendingLocalChanges = useCallback(() => {
    return saveTimerRef.current !== null || isSavingRef.current
  }, [])

  const bumpRefresh = useCallback(() => {
    setRefreshKey(Date.now())
  }, [])

  const shouldIgnoreRemote = useCallback(() => {
    if (!isSavingRef.current) return false
    return Date.now() - lastSaveAtRef.current < SAVE_ECHO_IGNORE_MS
  }, [])

  const flushSave = useCallback(async (): Promise<void> => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    if (!hasLoadedRef.current || isSavingRef.current) return

    const snapshot = boardRef.current
    isSavingRef.current = true
    lastSaveAtRef.current = Date.now()
    console.log('[moodboard] save start', { images: snapshot.images.length })
    try {
      const updatedAt = await saveMoodBoard({
        images: snapshot.images,
        swatches: snapshot.swatches,
      })
      if (updatedAt) serverUpdatedAtRef.current = updatedAt
      console.log('[moodboard] save ok', { updatedAt })
    } catch (err) {
      console.log('[moodboard] save failed', err)
    } finally {
      isSavingRef.current = false
    }
  }, [])

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null
      void flushSave()
    }, SAVE_DEBOUNCE_MS)
  }, [flushSave])

  const applyRemoteSync = useCallback((remote: MoodBoardData, reason: string) => {
    if (shouldIgnoreRemote()) {
      console.log('[moodboard] ignoring remote echo', { reason })
      return
    }

    const pending = hasPendingLocalChanges()
    const local = boardRef.current

    if (shouldRejectStaleMoodBoardRemote(local, remote, serverUpdatedAtRef.current, pending)) {
      console.log('[moodboard] rejecting stale remote', {
        reason,
        remoteImages: remote.images.length,
        localImages: local.images.length,
      })
      return
    }

    const merged = withDefaultSwatches(
      mergeMoodBoardData(local, remote, pending, serverUpdatedAtRef.current),
    )

    if (boardsEqual(local, merged)) {
      if (remote.updatedAt && !serverUpdatedAtRef.current) {
        serverUpdatedAtRef.current = remote.updatedAt
      }
      return
    }

    setBoard(merged)
    if (merged.updatedAt) serverUpdatedAtRef.current = merged.updatedAt
    bumpRefresh()
    console.log('[moodboard] applied remote', {
      reason,
      images: merged.images.length,
      pending,
    })
  }, [bumpRefresh, hasPendingLocalChanges, shouldIgnoreRemote])

  const applyRemote = useCallback((remote: MoodBoardData, reason: string) => {
    applyQueueRef.current = applyQueueRef.current
      .then(() => { applyRemoteSync(remote, reason) })
      .catch(err => { console.log('[moodboard] apply queue error', err) })
  }, [applyRemoteSync])

  const pullLatest = useCallback(async (reason: string) => {
    if (!hasLoadedRef.current) return
    if (shouldIgnoreRemote()) return
    if (pullInFlightRef.current) return pullInFlightRef.current

    console.log('[moodboard] pullLatest start', { reason })

    pullInFlightRef.current = applyQueueRef.current.then(async () => {
      try {
        const remote = await loadMoodBoard({ allowLegacyMigration: false })
        applyRemoteSync(remote, reason)
        console.log('[moodboard] pullLatest ok', { reason, images: remote.images.length })
      } catch (err) {
        console.log('[moodboard] pullLatest failed', { reason, err })
      }
    }).finally(() => {
      pullInFlightRef.current = null
    })

    return pullInFlightRef.current
  }, [applyRemoteSync, shouldIgnoreRemote])

  const pullLatestRef = useRef(pullLatest)
  pullLatestRef.current = pullLatest

  const updateBoard = useCallback((
    update: MoodBoardData | ((prev: MoodBoardData) => MoodBoardData),
  ) => {
    setBoard(prev => {
      const next = typeof update === 'function' ? update(prev) : update
      scheduleSave()
      return next
    })
  }, [scheduleSave])

  const addImages = useCallback((imgs: MoodBoardImage[]) => {
    if (!imgs.length) return
    updateBoard(prev => ({ ...prev, images: [...prev.images, ...imgs] }))
  }, [updateBoard])

  const saveImage = useCallback((img: MoodBoardImage) => {
    updateBoard(prev => ({
      ...prev,
      images: prev.images.map(i => i.id === img.id ? img : i),
    }))
  }, [updateBoard])

  const deleteImage = useCallback((id: string) => {
    updateBoard(prev => ({
      ...prev,
      images: prev.images.filter(i => i.id !== id),
    }))
  }, [updateBoard])

  const saveSwatch = useCallback((s: MoodBoardSwatch) => {
    updateBoard(prev => {
      const exists = prev.swatches.find(x => x.id === s.id)
      return {
        ...prev,
        swatches: exists
          ? prev.swatches.map(x => x.id === s.id ? s : x)
          : [...prev.swatches, s],
      }
    })
  }, [updateBoard])

  const deleteSwatch = useCallback((id: string) => {
    updateBoard(prev => ({
      ...prev,
      swatches: prev.swatches.filter(s => s.id !== id),
    }))
  }, [updateBoard])

  // Initial load + realtime (runs once for app lifetime via MoodBoardProvider)
  useEffect(() => {
    let cancelled = false
    let unregisterHeartbeat: (() => void) | undefined

    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user || cancelled) throw new Error('Not authenticated')

      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token)
      }

      const loaded = await loadMoodBoard({ allowLegacyMigration: true })
      if (cancelled) return

      const initial = withDefaultSwatches(loaded)
      setBoard(initial)
      serverUpdatedAtRef.current = loaded.updatedAt
      hasLoadedRef.current = true
      setLoading(false)
      bumpRefresh()
      console.log('[moodboard] initial load ok', { images: loaded.images.length })

      const sub = subscribeToMoodBoard(user.id, {
        onData: (remote) => applyRemote(remote, 'realtime'),
        shouldIgnoreUpdate: shouldIgnoreRemote,
      })
      realtimeRef.current = sub

      unregisterHeartbeat = registerRealtimeReconnect(() => {
        console.log('[moodboard] heartbeat reconnect')
        sub.reconnect()
        void pullLatestRef.current('heartbeat')
      })
    }

    init().catch(err => {
      console.log('[moodboard] init failed', err)
      if (!cancelled) setLoading(false)
    })

    return () => {
      cancelled = true
      unregisterHeartbeat?.()
      realtimeRef.current?.destroy()
      realtimeRef.current = null
      if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current)
      void flushSave()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reconnect mood board channel when auth token refreshes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.access_token) return
      await supabase.realtime.setAuth(session.access_token)
      realtimeRef.current?.reconnect()
    })
    return () => subscription.unsubscribe()
  }, [])

  // Catch-up on focus / visibility / Sync Now
  useEffect(() => {
    const schedulePull = (reason: string) => {
      if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current)
      refetchTimerRef.current = setTimeout(() => {
        refetchTimerRef.current = null
        if (reason === 'sync-now') realtimeRef.current?.reconnect()
        void pullLatestRef.current(reason)
      }, REFETCH_DEBOUNCE_MS)
    }

    const onResume = (reason: string) => {
      if (document.hidden && reason !== 'online' && reason !== 'sync-now') return
      schedulePull(reason)
    }

    const onPullEvent = (e: Event) => {
      const reason = (e as CustomEvent<{ reason?: string }>).detail?.reason ?? 'sync-now'
      schedulePull(reason)
    }

    const onFocus = () => onResume('focus')
    const onOnline = () => onResume('online')
    const onVisibility = () => { if (!document.hidden) onResume('visibility') }

    window.addEventListener('focus', onFocus)
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener(MOODBOARD_PULL_EVENT, onPullEvent)

    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('online', onOnline)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener(MOODBOARD_PULL_EVENT, onPullEvent)
    }
  }, [])

  // Periodic health check — reconnect only, no redundant full pull
  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden) return
      const status = realtimeRef.current?.getChannelStatus()
      if (status && status !== 'SUBSCRIBED') {
        console.log('[moodboard] health check reconnect', { status })
        realtimeRef.current?.reconnect()
      }
    }, HEALTH_CHECK_MS)
    return () => clearInterval(id)
  }, [])

  return {
    board,
    loading,
    refreshKey,
    addImages,
    saveImage,
    deleteImage,
    saveSwatch,
    deleteSwatch,
    pullLatest,
  }
}