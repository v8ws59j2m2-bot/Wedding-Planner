import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { AppData, WeddingDetails } from '../types'

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

const LOG = (msg: string, detail?: unknown) => {
  if (detail !== undefined) console.log('[sync]', msg, detail)
  else console.log('[sync]', msg)
}

const RECONNECT_BASE_MS = 1000
const RECONNECT_MAX_MS = 30_000

export const DEFAULT_APP_DATA: AppData = {
  guests: [], budget: [], checklist: [], vendors: [],
  moodImages: [], events: [], travelInfo: [],
}

export const DEFAULT_WEDDING_DETAILS: WeddingDetails = {
  partner1: 'Jamie', partner2: 'Beth',
  date: '2028-04-05', venue: 'Private Villa Estate',
  time: '14:00', location: 'Canggu, Bali, Indonesia',
  theme: 'Romantic Balinese Minimalist',
}

async function getUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user?.id) return session.user.id
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

/** Throws if not authenticated — used for writes that must not fail silently. */
async function requireUserId(): Promise<string> {
  const userId = await getUserId()
  if (!userId) throw new Error('Not authenticated')
  return userId
}

const SESSION_REFRESH_BUFFER_SEC = 120

function formatSupabaseError(error: { message?: string; code?: string; details?: string }): string {
  const parts = [error.message, error.code && `(${error.code})`, error.details].filter(Boolean)
  return parts.join(' ') || 'Unknown database error'
}

/**
 * Ensure a valid JWT is attached before DB writes (mobile uploads can outlast token lifetime).
 * Returns the authenticated user id from the live session.
 */
async function ensureWriteSession(knownUserId?: string): Promise<string> {
  const { data: { session: cached } } = await supabase.auth.getSession()
  const expiresAt = cached?.expires_at ?? 0
  const nowSec = Math.floor(Date.now() / 1000)
  const needsRefresh = !cached?.access_token || expiresAt - nowSec < SESSION_REFRESH_BUFFER_SEC

  if (needsRefresh) {
    const { data: refreshed, error } = await supabase.auth.refreshSession()
    if (error || !refreshed.session?.user?.id) {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user?.id) throw new Error('Not authenticated — please sign in again')
      if (knownUserId && user.id !== knownUserId) {
        console.log('[moodboard] session user differs from cached ref', { knownUserId, sessionUserId: user.id })
      }
      return user.id
    }
    if (refreshed.session.access_token) {
      await supabase.realtime.setAuth(refreshed.session.access_token)
    }
    return refreshed.session.user.id
  }

  const userId = cached!.user!.id
  if (knownUserId && userId !== knownUserId) {
    console.log('[moodboard] session user differs from cached ref', { knownUserId, sessionUserId: userId })
  }
  return userId
}

// Simple retry with backoff for reliable saves
async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: any
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, 300 * attempt)) // backoff 300ms, 600ms, ...
      }
    }
  }
  throw lastError
}

// Map a Supabase app_data row → AppData (shared by load + realtime)
export function mapAppDataRow(row: Record<string, unknown>): AppData {
  const guests = ((row.guests as AppData['guests']) ?? []).map(g => {
    if (!g.firstName && !g.lastName && g.name) {
      const parts = g.name.split('&')[0].trim().split(' ')
      return { ...g, firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') || undefined }
    }
    return g
  })

  return {
    guests,
    budget:     (row.budget      as AppData['budget'])     ?? [],
    checklist:  (row.checklist   as AppData['checklist'])  ?? [],
    vendors:    (row.vendors     as AppData['vendors'])    ?? [],
    moodImages: (row.mood_images as AppData['moodImages']) ?? [],
    events:     (row.events      as AppData['events'])     ?? [],
    travelInfo: (row.travel_info as AppData['travelInfo']) ?? [],
  }
}

// ── AppData ───────────────────────────────────────────────────────────────────
export async function loadAppData(): Promise<AppData> {
  const userId = await getUserId()
  if (!userId) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('app_data').select('*').eq('user_id', userId).maybeSingle()

  if (error) throw error
  if (!data) return { ...DEFAULT_APP_DATA }

  return mapAppDataRow(data)
}

export async function saveAppData(appData: AppData): Promise<void> {
  const userId = await getUserId()
  if (!userId) return
  await withRetry(async () => {
    const { error } = await supabase.from('app_data').upsert({
      user_id: userId,
      guests: appData.guests, budget: appData.budget,
      checklist: appData.checklist, vendors: appData.vendors,
      mood_images: appData.moodImages, events: appData.events,
      travel_info: appData.travelInfo,
    }, { onConflict: 'user_id' })
    if (error) throw error
  })
}

// ── Realtime subscription for app_data ────────────────────────────────────────
export type AppDataRealtimeCallbacks = {
  onData: (data: AppData) => void
  onStatus: (status: ConnectionStatus) => void
  shouldIgnoreUpdate?: () => boolean
  onSubscribed?: () => void
}

export function subscribeToAppData(
  userId: string,
  callbacks: AppDataRealtimeCallbacks,
): { reconnect: () => void; destroy: () => void; getChannelStatus: () => string } {
  let channel: RealtimeChannel | null = null
  let channelStatus = 'idle'
  let reconnectAttempt = 0
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let destroyed = false

  const setConnectionStatus = (status: ConnectionStatus) => {
    callbacks.onStatus(status)
  }

  const removeChannel = () => {
    if (channel) {
      LOG('removing channel')
      supabase.removeChannel(channel)
      channel = null
      channelStatus = 'idle'
    }
  }

  const scheduleReconnect = () => {
    if (destroyed || reconnectTimer) return
    setConnectionStatus('reconnecting')

    const delay = Math.min(RECONNECT_BASE_MS * 2 ** reconnectAttempt, RECONNECT_MAX_MS)
    reconnectAttempt += 1
    LOG('scheduling reconnect', { attempt: reconnectAttempt - 1, delayMs: delay })

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      if (!destroyed) connect()
    }, delay)
  }

  const connect = () => {
    if (destroyed) return
    removeChannel()
    setConnectionStatus('connecting')
    LOG('connecting channel', { userId })

    channel = supabase
      .channel(`app-data-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_data', filter: `user_id=eq.${userId}` },
        (payload) => {
          LOG('realtime event', { event: payload.eventType, hasNew: !!payload.new })
          if (callbacks.shouldIgnoreUpdate?.()) return
          if (!payload.new || typeof payload.new !== 'object') return
          const row = payload.new as Record<string, unknown>
          if (row.user_id !== userId) return
          const mapped = mapAppDataRow(row)
          callbacks.onData(mapped)
          LOG('realtime applied', {
            guests: mapped.guests.length,
            budget: mapped.budget.length,
            checklist: mapped.checklist.length,
          })
        },
      )
      .subscribe((status, err) => {
        channelStatus = status
        LOG('channel status', { status, err: err?.message ?? null })

        if (status === 'SUBSCRIBED') {
          reconnectAttempt = 0
          setConnectionStatus('connected')
          callbacks.onSubscribed?.()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setConnectionStatus('reconnecting')
          scheduleReconnect()
        }
      })
  }

  connect()

  return {
    reconnect: () => {
      if (destroyed) return
      reconnectAttempt = 0
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
      connect()
    },
    destroy: () => {
      destroyed = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      removeChannel()
      setConnectionStatus('disconnected')
    },
    getChannelStatus: () => channelStatus,
  }
}

// ── Wedding Details ───────────────────────────────────────────────────────────
export async function loadWeddingDetails(): Promise<WeddingDetails> {
  const userId = await getUserId()
  if (!userId) return { ...DEFAULT_WEDDING_DETAILS }
  const { data, error } = await supabase
    .from('wedding_details').select('*').eq('user_id', userId).single()
  if (error || !data) return { ...DEFAULT_WEDDING_DETAILS }
  return { partner1: data.partner1, partner2: data.partner2, date: data.date,
    venue: data.venue, time: data.time, location: data.location, theme: data.theme }
}

export async function saveWeddingDetails(details: WeddingDetails): Promise<void> {
  const userId = await getUserId()
  if (!userId) return
  await withRetry(async () => {
    const { error } = await supabase.from('wedding_details')
      .upsert({ user_id: userId, ...details }, { onConflict: 'user_id' })
    if (error) throw error
  })
}

// ── Seating ───────────────────────────────────────────────────────────────────
export async function loadSeating(): Promise<{ tables: any[] }> {
  const userId = await getUserId()
  if (!userId) return { tables: [] }
  const { data, error } = await supabase
    .from('seating_data').select('tables').eq('user_id', userId).single()
  if (error || !data) return { tables: [] }
  return { tables: data.tables ?? [] }
}

export async function saveSeating(seatingData: { tables: any[] }): Promise<void> {
  const userId = await getUserId()
  if (!userId) return
  await withRetry(async () => {
    const { error } = await supabase.from('seating_data')
      .upsert({ user_id: userId, tables: seatingData.tables }, { onConflict: 'user_id' })
    if (error) throw error
  })
}

// ── Timeline ─────────────────────────────────────────────────────────────────
export async function loadTimeline(): Promise<any[]> {
  const userId = await getUserId()
  if (!userId) return []
  // Timeline is stored as part of app_data — fetch it directly
  const { data, error } = await supabase
    .from('app_data').select('*').eq('user_id', userId).single()
  if (error || !data) return []
  return data.timeline ?? []
}

export async function saveTimeline(timeline: any[]): Promise<void> {
  const userId = await getUserId()
  if (!userId) return
  await withRetry(async () => {
    // Upsert a row with just timeline — merge with existing data server-side
    const { data: existing } = await supabase
      .from('app_data').select('*').eq('user_id', userId).single()
    if (!existing) return // no app_data row yet — skip, will be created on next full save
    const { error } = await supabase.from('app_data')
      .update({ timeline } as any)
      .eq('user_id', userId)
    if (error) throw error
  })
}

// ── Mood Board ────────────────────────────────────────────────────────────────
export interface MoodBoardImage {
  id: string
  src: string
  caption: string
  category: string
  notes?: string
}

export interface MoodBoardSwatch {
  id: string
  hex: string
  name: string
}

export interface MoodBoardData {
  images: MoodBoardImage[]
  swatches: MoodBoardSwatch[]
  updatedAt: string | null
}

export const MOODBOARD_PULL_EVENT = 'moodboard-pull'

const MB_LOG = (msg: string, detail?: unknown) => {
  if (detail !== undefined) console.log('[moodboard]', msg, detail)
  else console.log('[moodboard]', msg)
}

export type LoadMoodBoardOptions = {
  /** When true, one-time migration from app_data.mood_images if moodboard_data is empty. */
  allowLegacyMigration?: boolean
}

function normalizeMoodBoardImages(raw: unknown): MoodBoardImage[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((item): item is MoodBoardImage => {
    if (!item || typeof item !== 'object') return false
    const img = item as MoodBoardImage
    return typeof img.id === 'string' && img.id.length > 0
      && typeof img.src === 'string' && img.src.length > 0
  })
}

function normalizeMoodBoardSwatches(raw: unknown): MoodBoardSwatch[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((item): item is MoodBoardSwatch => {
    if (!item || typeof item !== 'object') return false
    const sw = item as MoodBoardSwatch
    return typeof sw.id === 'string' && typeof sw.hex === 'string' && typeof sw.name === 'string'
  })
}

function mapMoodBoardRow(row: Record<string, unknown>): MoodBoardData {
  return {
    images: normalizeMoodBoardImages(row.images),
    swatches: normalizeMoodBoardSwatches(row.swatches),
    updatedAt: (row.updated_at as string) ?? null,
  }
}

export function moodBoardTime(updatedAt: string | null): number {
  return updatedAt ? new Date(updatedAt).getTime() : 0
}

function mergeSwatches(local: MoodBoardSwatch[], remote: MoodBoardSwatch[]): MoodBoardSwatch[] {
  if (remote.length === 0) return local
  if (local.length === 0) return remote
  const byId = new Map<string, MoodBoardSwatch>()
  for (const sw of remote) byId.set(sw.id, sw)
  for (const sw of local) {
    if (!byId.has(sw.id)) byId.set(sw.id, sw)
  }
  const order = [...remote.map(s => s.id), ...local.map(s => s.id).filter(id => !remote.some(r => r.id === id))]
  const seen = new Set<string>()
  const merged: MoodBoardSwatch[] = []
  for (const id of order) {
    if (seen.has(id)) continue
    const sw = byId.get(id)
    if (sw) {
      merged.push(sw)
      seen.add(id)
    }
  }
  return merged
}

/**
 * Merge local and remote mood board snapshots.
 * Uses serverUpdatedAt (not React state updatedAt) for timestamp comparison.
 */
export function mergeMoodBoardData(
  local: MoodBoardData,
  remote: MoodBoardData,
  hasPendingLocalChanges: boolean,
  localServerUpdatedAt: string | null,
): MoodBoardData {
  const remoteTime = moodBoardTime(remote.updatedAt)
  const localTime = moodBoardTime(localServerUpdatedAt)
  const remoteIsNewer = remoteTime > localTime

  if (remoteIsNewer && !hasPendingLocalChanges) {
    return {
      images: remote.images,
      swatches: mergeSwatches(local.swatches, remote.swatches),
      updatedAt: remote.updatedAt,
    }
  }

  if (hasPendingLocalChanges) {
    // Apply remote deletions; keep only local-only uploads not yet on the server
    const remoteIds = new Set(remote.images.map(i => i.id))
    const localOnly = local.images.filter(i => !remoteIds.has(i.id))
    return {
      images: [...remote.images, ...localOnly],
      swatches: mergeSwatches(local.swatches, remote.swatches),
      updatedAt: remoteTime >= localTime ? remote.updatedAt : localServerUpdatedAt,
    }
  }

  if (!remoteIsNewer && remote.images.length < local.images.length) {
    const localIds = new Set(local.images.map(i => i.id))
    const remoteOnly = remote.images.filter(i => !localIds.has(i.id))
    return {
      images: [...local.images, ...remoteOnly],
      swatches: mergeSwatches(local.swatches, remote.swatches),
      updatedAt: localServerUpdatedAt,
    }
  }

  const byId = new Map<string, MoodBoardImage>()
  for (const img of remote.images) byId.set(img.id, img)
  for (const img of local.images) {
    if (!byId.has(img.id)) byId.set(img.id, img)
  }

  const seen = new Set<string>()
  const images: MoodBoardImage[] = []
  for (const img of local.images) {
    const merged = byId.get(img.id)
    if (merged) {
      images.push(merged)
      seen.add(img.id)
    }
  }
  for (const img of remote.images) {
    if (!seen.has(img.id)) {
      images.push(byId.get(img.id)!)
      seen.add(img.id)
    }
  }

  return {
    images,
    swatches: mergeSwatches(local.swatches, remote.swatches),
    updatedAt: remoteTime >= localTime ? remote.updatedAt : localServerUpdatedAt,
  }
}

export function shouldRejectStaleMoodBoardRemote(
  local: MoodBoardData,
  remote: MoodBoardData,
  localServerUpdatedAt: string | null,
  hasPendingLocalChanges: boolean,
): boolean {
  if (hasPendingLocalChanges) return false

  const remoteTime = moodBoardTime(remote.updatedAt)
  const localTime = moodBoardTime(localServerUpdatedAt)

  if (local.images.length > 0 && remote.images.length === 0 && remoteTime <= localTime) {
    return true
  }

  if (remote.images.length < local.images.length && remoteTime <= localTime) {
    return true
  }

  return false
}

async function fetchLegacyMoodImages(userId: string): Promise<MoodBoardImage[]> {
  const { data, error } = await supabase
    .from('app_data')
    .select('mood_images')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return normalizeMoodBoardImages(data?.mood_images)
}

async function migrateLegacyMoodImages(
  userId: string,
  legacyImages: MoodBoardImage[],
  swatches: MoodBoardSwatch[],
): Promise<MoodBoardData> {
  MB_LOG('migrating legacy mood_images to moodboard_data', { count: legacyImages.length })
  const migrated = { images: legacyImages, swatches }
  try {
    const { updatedAt } = await saveMoodBoard(migrated, userId)
    await clearLegacyMoodImages(userId)
    return { ...migrated, updatedAt }
  } catch (err) {
    MB_LOG('legacy migration save failed', err)
    return { ...migrated, updatedAt: null }
  }
}

/** Clear legacy mood_images from app_data after successful moodboard_data migration. */
export async function clearLegacyMoodImages(userId?: string): Promise<void> {
  const uid = userId ?? await getUserId()
  if (!uid) return
  const { error } = await supabase
    .from('app_data')
    .update({ mood_images: [] })
    .eq('user_id', uid)
  if (error) MB_LOG('clear legacy mood_images failed', error)
}

export async function loadMoodBoard(
  options: LoadMoodBoardOptions = {},
  knownUserId?: string,
): Promise<MoodBoardData> {
  const { allowLegacyMigration = false } = options
  const userId = knownUserId ?? await requireUserId()

  const { data, error } = await supabase
    .from('moodboard_data')
    .select('images,swatches,updated_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error

  const mapped = data ? mapMoodBoardRow(data) : { images: [], swatches: [], updatedAt: null }

  // Always return DB row when it has images (canonical source)
  if (mapped.images.length > 0) return mapped

  // Row exists with only swatches — still canonical
  if (data && mapped.swatches.length > 0) return mapped

  if (!allowLegacyMigration) return mapped

  const legacyImages = await fetchLegacyMoodImages(userId)
  if (legacyImages.length > 0) {
    return migrateLegacyMoodImages(userId, legacyImages, mapped.swatches)
  }

  return mapped
}

export type SaveMoodBoardResult = {
  updatedAt: string
  imageCount: number
}

/**
 * Persist mood board metadata to moodboard_data.
 * Refreshes the auth session before writing and always uses the live JWT user id
 * (cached refs from hooks must not override auth.uid() for RLS).
 */
export async function saveMoodBoard(
  board: Omit<MoodBoardData, 'updatedAt'>,
  knownUserId?: string,
): Promise<SaveMoodBoardResult> {
  const images = normalizeMoodBoardImages(board.images)
  const swatches = normalizeMoodBoardSwatches(board.swatches)

  return withRetry(async () => {
    const userId = await ensureWriteSession(knownUserId)

    const { error: upsertError } = await supabase
      .from('moodboard_data')
      .upsert({ user_id: userId, images, swatches }, { onConflict: 'user_id' })

    if (upsertError) throw new Error(formatSupabaseError(upsertError))

    const { data, error: readError } = await supabase
      .from('moodboard_data')
      .select('updated_at,images')
      .eq('user_id', userId)
      .maybeSingle()

    if (readError) throw new Error(formatSupabaseError(readError))

    const savedImages = normalizeMoodBoardImages(data?.images)
    const updatedAt = (data?.updated_at as string) ?? new Date().toISOString()

    if (images.length > 0 && savedImages.length === 0) {
      throw new Error('moodboard_data save could not be verified — no images persisted')
    }

    const savedIds = new Set(savedImages.map(i => i.id))
    const missing = images.filter(i => !savedIds.has(i.id))
    if (missing.length > 0) {
      MB_LOG('save missing image ids after upsert', { missing: missing.map(i => i.id) })
      throw new Error(`moodboard_data save incomplete: ${missing.length} image(s) not persisted`)
    }

    MB_LOG('save ok', { images: savedImages.length, updatedAt })
    return { updatedAt, imageCount: savedImages.length }
  })
}

export type MoodBoardRealtimeCallbacks = {
  onData: (data: MoodBoardData) => void
  shouldIgnoreUpdate?: () => boolean
  onSubscribed?: () => void
}

export function subscribeToMoodBoard(
  userId: string,
  callbacks: MoodBoardRealtimeCallbacks,
): { reconnect: () => void; destroy: () => void; getChannelStatus: () => string } {
  let channel: RealtimeChannel | null = null
  let channelStatus = 'idle'
  let reconnectAttempt = 0
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let destroyed = false

  const removeChannel = () => {
    if (channel) {
      MB_LOG('removing channel')
      supabase.removeChannel(channel)
      channel = null
      channelStatus = 'idle'
    }
  }

  const scheduleReconnect = () => {
    if (destroyed || reconnectTimer) return
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** reconnectAttempt, RECONNECT_MAX_MS)
    reconnectAttempt += 1
    MB_LOG('scheduling reconnect', { attempt: reconnectAttempt - 1, delayMs: delay })
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      if (!destroyed) connect()
    }, delay)
  }

  const connect = () => {
    if (destroyed) return
    removeChannel()
    MB_LOG('connecting channel', { userId })

    channel = supabase
      .channel(`moodboard-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'moodboard_data', filter: `user_id=eq.${userId}` },
        (payload) => {
          MB_LOG('realtime event', { event: payload.eventType })
          if (callbacks.shouldIgnoreUpdate?.()) return
          if (!payload.new || typeof payload.new !== 'object') return
          const row = payload.new as Record<string, unknown>
          if (row.user_id !== userId) return
          const mapped = mapMoodBoardRow(row)
          callbacks.onData(mapped)
          MB_LOG('realtime applied', { images: mapped.images.length })
        },
      )
      .subscribe((status, err) => {
        channelStatus = status
        MB_LOG('channel status', { status, err: err?.message ?? null })
        if (status === 'SUBSCRIBED') {
          reconnectAttempt = 0
          callbacks.onSubscribed?.()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          scheduleReconnect()
        }
      })
  }

  connect()

  return {
    reconnect: () => {
      if (destroyed) return
      reconnectAttempt = 0
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
      connect()
    },
    destroy: () => {
      destroyed = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      removeChannel()
    },
    getChannelStatus: () => channelStatus,
  }
}

// Upload image to Supabase Storage (bucket 'moodboard' must exist and have policies for authenticated users)
export async function uploadMoodImage(file: File): Promise<string> {
  const userId = await ensureWriteSession()
  const fileExt = file.name.split('.').pop() || 'jpg'
  const filePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`
  const { error } = await supabase.storage
    .from('moodboard')
    .upload(filePath, file, { cacheControl: '3600', upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from('moodboard').getPublicUrl(filePath)
  return data.publicUrl
}

// ── Accommodation ─────────────────────────────────────────────────────────────
export async function loadAccommodation(): Promise<{ rooms: any[] }> {
  const userId = await getUserId()
  if (!userId) return { rooms: [] }
  const { data, error } = await supabase
    .from('accommodation_data').select('rooms').eq('user_id', userId).single()
  if (error || !data) return { rooms: [] }
  return { rooms: data.rooms ?? [] }
}

export async function saveAccommodation(accomData: { rooms: any[] }): Promise<void> {
  const userId = await getUserId()
  if (!userId) return
  await withRetry(async () => {
    const { error } = await supabase.from('accommodation_data')
      .upsert({ user_id: userId, rooms: accomData.rooms }, { onConflict: 'user_id' })
    if (error) throw error
  })
}
