import { useState, useEffect, useRef, useCallback } from 'react'
import {
  loadMoodBoard,
  saveMoodBoard,
  subscribeToMoodBoard,
  MOODBOARD_PULL_EVENT,
  type MoodBoardData,
  type MoodBoardImage,
  type MoodBoardSwatch,
} from '../lib/supabaseData'
import { supabase } from '../lib/supabase'

const SAVE_DEBOUNCE_MS = 800
const SAVE_ECHO_IGNORE_MS = 1500
const REFETCH_DEBOUNCE_MS = 400

const DEFAULT_SWATCHES: MoodBoardSwatch[] = [
  { id: 'sw-1', hex: '#FFF8EE', name: 'Warm Ivory' },
  { id: 'sw-2', hex: '#C8A45D', name: 'Soft Gold' },
  { id: 'sw-3', hex: '#C47A52', name: 'Terracotta' },
  { id: 'sw-4', hex: '#7F9A78', name: 'Sage Green' },
  { id: 'sw-5', hex: '#3B2A22', name: 'Deep Cocoa' },
  { id: 'sw-6', hex: '#F2E3CF', name: 'Sand Beige' },
]

const EMPTY: MoodBoardData = { images: [], swatches: DEFAULT_SWATCHES, updatedAt: null }

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
  const realtimeRef = useRef<ReturnType<typeof subscribeToMoodBoard> | null>(null)

  const bumpRefresh = useCallback(() => {
    setRefreshKey(Date.now())
  }, [])

  const shouldIgnoreRemote = useCallback(() => {
    if (!isSavingRef.current) return false
    return Date.now() - lastSaveAtRef.current < SAVE_ECHO_IGNORE_MS
  }, [])

  const applyRemote = useCallback((remote: MoodBoardData, reason: string) => {
    if (shouldIgnoreRemote()) {
      console.log('[moodboard] ignoring remote', { reason })
      return
    }

    const remoteTime = remote.updatedAt ? new Date(remote.updatedAt).getTime() : 0
    const localTime = serverUpdatedAtRef.current ? new Date(serverUpdatedAtRef.current).getTime() : 0

    if (boardRef.current.images.length > 0 && remote.images.length === 0 && remoteTime <= localTime) {
      console.log('[moodboard] ignoring empty remote over local images', { reason })
      return
    }

    const swatches = remote.swatches.length > 0 ? remote.swatches : DEFAULT_SWATCHES
    setBoard({ images: remote.images, swatches, updatedAt: remote.updatedAt })
    serverUpdatedAtRef.current = remote.updatedAt
    bumpRefresh()
    console.log('[moodboard] applied remote', { reason, images: remote.images.length })
  }, [bumpRefresh, shouldIgnoreRemote])

  const pullLatest = useCallback(async (reason: string) => {
    if (!hasLoadedRef.current) return
    if (shouldIgnoreRemote()) return

    console.log('[moodboard] pullLatest start', { reason })
    try {
      const remote = await loadMoodBoard()
      applyRemote(remote, reason)
      console.log('[moodboard] pullLatest ok', { reason, images: remote.images.length })
    } catch (err) {
      console.log('[moodboard] pullLatest failed', { reason, err })
    }
  }, [applyRemote, shouldIgnoreRemote])

  const pullLatestRef = useRef(pullLatest)
  pullLatestRef.current = pullLatest

  const scheduleSave = useCallback((next: Omit<MoodBoardData, 'updatedAt'>) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      if (!hasLoadedRef.current) return
      isSavingRef.current = true
      lastSaveAtRef.current = Date.now()
      console.log('[moodboard] save start', { images: next.images.length })
      try {
        await saveMoodBoard(next)
        console.log('[moodboard] save ok')
      } catch (err) {
        console.log('[moodboard] save failed', err)
      } finally {
        isSavingRef.current = false
      }
    }, SAVE_DEBOUNCE_MS)
  }, [])

  const updateBoard = useCallback((
    update: MoodBoardData | ((prev: MoodBoardData) => MoodBoardData),
  ) => {
    setBoard(prev => {
      const next = typeof update === 'function' ? update(prev) : update
      scheduleSave({ images: next.images, swatches: next.swatches })
      return next
    })
    bumpRefresh()
  }, [scheduleSave, bumpRefresh])

  const addImages = useCallback((imgs: MoodBoardImage[]) => {
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

  // Initial load + realtime (runs once)
  useEffect(() => {
    let cancelled = false

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) throw new Error('Not authenticated')

      const loaded = await loadMoodBoard()
      if (cancelled) return

      const swatches = loaded.swatches.length > 0 ? loaded.swatches : DEFAULT_SWATCHES
      setBoard({ images: loaded.images, swatches, updatedAt: loaded.updatedAt })
      serverUpdatedAtRef.current = loaded.updatedAt
      hasLoadedRef.current = true
      setLoading(false)
      bumpRefresh()
      console.log('[moodboard] initial load ok', { images: loaded.images.length })

      const sub = subscribeToMoodBoard(user.id, {
        onData: (remote) => applyRemote(remote, 'realtime'),
        shouldIgnoreUpdate: shouldIgnoreRemote,
        onSubscribed: () => { void pullLatestRef.current('subscribed') },
      })
      realtimeRef.current = sub
    }

    init().catch(err => {
      console.log('[moodboard] init failed', err)
      if (!cancelled) setLoading(false)
    })

    return () => {
      cancelled = true
      realtimeRef.current?.destroy()
      realtimeRef.current = null
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Catch-up on focus / visibility / Sync Now
  useEffect(() => {
    const schedulePull = (reason: string) => {
      if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current)
      refetchTimerRef.current = setTimeout(() => {
        refetchTimerRef.current = null
        realtimeRef.current?.reconnect()
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

  // Periodic pull while tab visible
  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden) return
      void pullLatestRef.current('interval')
    }, 20_000)
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