import { useState, useEffect, useRef, useCallback } from 'react'
import {
  loadMoodBoard,
  saveMoodBoard,
  subscribeToMoodBoard,
  moodBoardTime,
  MOODBOARD_PULL_EVENT,
  type MoodBoardData,
  type MoodBoardImage,
  type MoodBoardSwatch,
} from '../lib/supabaseData'
import { supabase, registerRealtimeReconnect } from '../lib/supabase'

const METADATA_SAVE_DEBOUNCE_MS = 600
const SAVE_ECHO_IGNORE_MS = 1200
const REFETCH_DEBOUNCE_MS = 400
const HEALTH_CHECK_MS = 30_000
const PERSIST_TIMEOUT_MS = 20_000
const INIT_WAIT_MS = 10_000

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

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    promise
      .then(value => { clearTimeout(timer); resolve(value) })
      .catch(err => { clearTimeout(timer); reject(err) })
  })
}

async function waitForReady(
  isReady: () => boolean,
  maxMs: number,
): Promise<boolean> {
  const start = Date.now()
  while (!isReady()) {
    if (Date.now() - start > maxMs) return false
    await new Promise(r => setTimeout(r, 100))
  }
  return true
}

async function waitForSession(maxMs = 8000, isCancelled?: () => boolean) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    if (isCancelled?.()) throw new Error('cancelled')
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) return session
    await new Promise(r => setTimeout(r, 100))
  }
  throw new Error('Not authenticated')
}

export function useMoodBoard() {
  const [board, setBoard] = useState<MoodBoardData>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [saveError, setSaveError] = useState<string | null>(null)

  const boardRef = useRef(board)
  boardRef.current = board

  const userIdRef = useRef<string | null>(null)
  const hasLoadedRef = useRef(false)
  const isSavingRef = useRef(false)
  const lastSaveAtRef = useRef(0)
  const serverUpdatedAtRef = useRef<string | null>(null)
  const metadataSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const persistChainRef = useRef<Promise<{ ok: true } | { ok: false; error: string }>>(
    Promise.resolve({ ok: true }),
  )
  const realtimeRef = useRef<ReturnType<typeof subscribeToMoodBoard> | null>(null)

  const bumpRefresh = useCallback(() => {
    setRefreshKey(Date.now())
  }, [])

  const shouldIgnoreRemote = useCallback(() => {
    if (!isSavingRef.current) return false
    return Date.now() - lastSaveAtRef.current < SAVE_ECHO_IGNORE_MS
  }, [])

  const persistBoard = useCallback(async (
    snapshot: Pick<MoodBoardData, 'images' | 'swatches'>,
    reason: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    const run = async (): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (!hasLoadedRef.current) {
        console.log('[moodboard] persist skipped — not ready', { reason })
        return { ok: false, error: 'Mood board not ready yet — please wait and try again' }
      }

      isSavingRef.current = true
      lastSaveAtRef.current = Date.now()
      console.log('[moodboard] persist start', { reason, images: snapshot.images.length })

      try {
        const { updatedAt } = await withTimeout(
          saveMoodBoard(snapshot, userIdRef.current ?? undefined),
          PERSIST_TIMEOUT_MS,
          'saveMoodBoard',
        )
        serverUpdatedAtRef.current = updatedAt
        setSaveError(null)
        console.log('[moodboard] persist ok', { reason, images: snapshot.images.length, updatedAt })
        return { ok: true }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not save mood board'
        console.error('[moodboard] persist failed', { reason, err })
        setSaveError(msg)
        return { ok: false, error: msg }
      } finally {
        isSavingRef.current = false
      }
    }

    persistChainRef.current = persistChainRef.current.then(run, run)
    return persistChainRef.current
  }, [])

  const flushMetadataSave = useCallback(async () => {
    if (metadataSaveTimerRef.current) {
      clearTimeout(metadataSaveTimerRef.current)
      metadataSaveTimerRef.current = null
    }
    const snapshot = boardRef.current
    await persistBoard(
      { images: snapshot.images, swatches: snapshot.swatches },
      'metadata-flush',
    )
  }, [persistBoard])

  const scheduleMetadataSave = useCallback(() => {
    if (metadataSaveTimerRef.current) clearTimeout(metadataSaveTimerRef.current)
    metadataSaveTimerRef.current = setTimeout(() => {
      metadataSaveTimerRef.current = null
      void flushMetadataSave()
    }, METADATA_SAVE_DEBOUNCE_MS)
  }, [flushMetadataSave])

  const applyRealtimeRemote = useCallback((remote: MoodBoardData) => {
    if (shouldIgnoreRemote()) return

    const remoteTime = moodBoardTime(remote.updatedAt)
    const localTime = moodBoardTime(serverUpdatedAtRef.current)

    if (
      remote.images.length < boardRef.current.images.length &&
      remoteTime <= localTime &&
      metadataSaveTimerRef.current === null &&
      !isSavingRef.current
    ) {
      console.log('[moodboard] ignoring stale realtime', {
        remoteImages: remote.images.length,
        localImages: boardRef.current.images.length,
      })
      return
    }

    const next = withDefaultSwatches(remote)
    setBoard(next)
    if (remote.updatedAt) serverUpdatedAtRef.current = remote.updatedAt
    bumpRefresh()
    console.log('[moodboard] realtime applied', { images: next.images.length })
  }, [bumpRefresh, shouldIgnoreRemote])

  const pullLatest = useCallback(async (reason: string) => {
    const userId = userIdRef.current
    if (!userId || !hasLoadedRef.current) return
    if (shouldIgnoreRemote()) return

    console.log('[moodboard] pullLatest start', { reason })
    try {
      const remote = await loadMoodBoard({ allowLegacyMigration: false }, userId)
      applyRealtimeRemote(remote)
      console.log('[moodboard] pullLatest ok', { reason, images: remote.images.length })
    } catch (err) {
      console.log('[moodboard] pullLatest failed', { reason, err })
    }
  }, [applyRealtimeRemote, shouldIgnoreRemote])

  const pullLatestRef = useRef(pullLatest)
  pullLatestRef.current = pullLatest

  const updateBoardLocal = useCallback((
    update: MoodBoardData | ((prev: MoodBoardData) => MoodBoardData),
  ) => {
    setBoard(prev => (typeof update === 'function' ? update(prev) : update))
  }, [])

  const addImages = useCallback(async (
    imgs: MoodBoardImage[],
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    if (!imgs.length) return { ok: true }

    const ready = await waitForReady(
      () => hasLoadedRef.current && !!userIdRef.current,
      INIT_WAIT_MS,
    )
    if (!ready) {
      const error = 'Mood board is still loading — please wait and try again'
      setSaveError(error)
      return { ok: false, error }
    }

    const prev = boardRef.current
    const nextImages = [...prev.images, ...imgs]
    const nextBoard: MoodBoardData = { ...prev, images: nextImages }
    boardRef.current = nextBoard
    updateBoardLocal(nextBoard)
    bumpRefresh()

    const result = await persistBoard(
      { images: nextImages, swatches: prev.swatches },
      'add-images',
    )

    if (!result.ok) {
      boardRef.current = prev
      updateBoardLocal(prev)
      bumpRefresh()
    }

    return result
  }, [bumpRefresh, persistBoard, updateBoardLocal])

  const saveImage = useCallback((img: MoodBoardImage) => {
    updateBoardLocal(prev => ({
      ...prev,
      images: prev.images.map(i => i.id === img.id ? img : i),
    }))
    scheduleMetadataSave()
  }, [scheduleMetadataSave, updateBoardLocal])

  const deleteImage = useCallback(async (id: string) => {
    const prev = boardRef.current
    const nextImages = prev.images.filter(i => i.id !== id)
    const nextBoard = { ...prev, images: nextImages }
    boardRef.current = nextBoard
    updateBoardLocal(nextBoard)

    const result = await persistBoard({ images: nextImages, swatches: prev.swatches }, 'delete-image')
    if (!result.ok) {
      boardRef.current = prev
      updateBoardLocal(prev)
    }
  }, [persistBoard, updateBoardLocal])

  const saveSwatch = useCallback((s: MoodBoardSwatch) => {
    updateBoardLocal(prev => {
      const exists = prev.swatches.find(x => x.id === s.id)
      return {
        ...prev,
        swatches: exists
          ? prev.swatches.map(x => x.id === s.id ? s : x)
          : [...prev.swatches, s],
      }
    })
    scheduleMetadataSave()
  }, [scheduleMetadataSave, updateBoardLocal])

  const deleteSwatch = useCallback((id: string) => {
    updateBoardLocal(prev => ({
      ...prev,
      swatches: prev.swatches.filter(s => s.id !== id),
    }))
    scheduleMetadataSave()
  }, [scheduleMetadataSave, updateBoardLocal])

  useEffect(() => {
    let cancelled = false
    let unregisterHeartbeat: (() => void) | undefined

    async function init() {
      const session = await waitForSession(8000, () => cancelled)
      const user = session.user
      if (!user || cancelled) throw new Error('cancelled')

      userIdRef.current = user.id

      if (session.access_token) {
        await supabase.realtime.setAuth(session.access_token)
      }

      const loaded = await loadMoodBoard({ allowLegacyMigration: true }, user.id)
      if (cancelled) return

      const initial = withDefaultSwatches(loaded)
      boardRef.current = initial
      setBoard(initial)
      serverUpdatedAtRef.current = loaded.updatedAt
      hasLoadedRef.current = true
      setLoading(false)
      bumpRefresh()
      console.log('[moodboard] initial load ok', { images: loaded.images.length, updatedAt: loaded.updatedAt })

      const sub = subscribeToMoodBoard(user.id, {
        onData: applyRealtimeRemote,
        shouldIgnoreUpdate: shouldIgnoreRemote,
      })
      realtimeRef.current = sub

      unregisterHeartbeat = registerRealtimeReconnect(() => {
        sub.reconnect()
      })
    }

    init().catch(err => {
      if (cancelled || (err instanceof Error && err.message === 'cancelled')) return
      console.error('[moodboard] init failed', err)
      setSaveError('Could not load mood board from Supabase')
      setLoading(false)
    })

    return () => {
      cancelled = true
      unregisterHeartbeat?.()
      realtimeRef.current?.destroy()
      realtimeRef.current = null
      if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current)
      void flushMetadataSave()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onPageHide = () => { void flushMetadataSave() }
    window.addEventListener('pagehide', onPageHide)
    return () => window.removeEventListener('pagehide', onPageHide)
  }, [flushMetadataSave])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.access_token || !session.user) return
      userIdRef.current = session.user.id
      await supabase.realtime.setAuth(session.access_token)
      realtimeRef.current?.reconnect()
    })
    return () => subscription.unsubscribe()
  }, [])

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

  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden) return
      const status = realtimeRef.current?.getChannelStatus()
      if (status && status !== 'SUBSCRIBED') realtimeRef.current?.reconnect()
    }, HEALTH_CHECK_MS)
    return () => clearInterval(id)
  }, [])

  return {
    board,
    loading,
    refreshKey,
    saveError,
    addImages,
    saveImage,
    deleteImage,
    saveSwatch,
    deleteSwatch,
    pullLatest,
  }
}