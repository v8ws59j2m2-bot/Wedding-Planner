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
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
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

function mapMoodBoardRow(row: Record<string, unknown>): MoodBoardData {
  return {
    images: (row.images as MoodBoardImage[]) ?? [],
    swatches: (row.swatches as MoodBoardSwatch[]) ?? [],
    updatedAt: (row.updated_at as string) ?? null,
  }
}

function moodBoardTime(updatedAt: string | null): number {
  return updatedAt ? new Date(updatedAt).getTime() : 0
}

/** Union-merge images by id; newer snapshot wins conflicts unless local edits are pending. */
export function mergeMoodBoardData(
  local: MoodBoardData,
  remote: MoodBoardData,
  hasPendingLocalChanges: boolean,
): MoodBoardData {
  const remoteTime = moodBoardTime(remote.updatedAt)
  const localTime = moodBoardTime(local.updatedAt)
  const remoteIsNewer = remoteTime > localTime

  // Remote is authoritative when newer and nothing is waiting to save
  if (remoteIsNewer && !hasPendingLocalChanges) {
    return {
      images: remote.images,
      swatches: remote.swatches.length > 0 ? remote.swatches : local.swatches,
      updatedAt: remote.updatedAt,
    }
  }

  const byId = new Map<string, MoodBoardImage>()
  for (const img of remote.images) byId.set(img.id, img)
  for (const img of local.images) {
    if (!byId.has(img.id) || hasPendingLocalChanges) byId.set(img.id, img)
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

  const swatches = remote.swatches.length > 0 ? remote.swatches : local.swatches
  const updatedAt = remoteTime >= localTime ? remote.updatedAt : local.updatedAt

  return { images, swatches, updatedAt }
}

export async function loadMoodBoard(): Promise<MoodBoardData> {
  const userId = await getUserId()
  if (!userId) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('moodboard_data')
    .select('images,swatches,updated_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error

  const hasMoodBoardImages = Array.isArray(data?.images) && data.images.length > 0
  if (data && (hasMoodBoardImages || (Array.isArray(data.swatches) && data.swatches.length > 0))) {
    return mapMoodBoardRow(data)
  }

  // Fallback: images may still live in legacy app_data.mood_images
  const { data: appRow, error: appErr } = await supabase
    .from('app_data')
    .select('mood_images')
    .eq('user_id', userId)
    .maybeSingle()

  if (appErr) throw appErr

  const legacyImages = (appRow?.mood_images as MoodBoardImage[]) ?? []
  if (legacyImages.length > 0) {
    MB_LOG('using legacy mood_images from app_data', { count: legacyImages.length })
    const migrated = { images: legacyImages, swatches: (data?.swatches as MoodBoardSwatch[]) ?? [] }
    try {
      const updatedAt = await saveMoodBoard(migrated)
      return { ...migrated, updatedAt }
    } catch (err) {
      MB_LOG('legacy migration save failed', err)
      return { ...migrated, updatedAt: null }
    }
  }

  if (data) return mapMoodBoardRow(data)
  return { images: [], swatches: [], updatedAt: null }
}

export async function saveMoodBoard(board: Omit<MoodBoardData, 'updatedAt'>): Promise<string | null> {
  const userId = await getUserId()
  if (!userId) return null
  return withRetry(async () => {
    const { data, error } = await supabase.from('moodboard_data')
      .upsert({ user_id: userId, images: board.images, swatches: board.swatches }, { onConflict: 'user_id' })
      .select('updated_at')
      .single()
    if (error) throw error
    return (data?.updated_at as string) ?? null
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
): { reconnect: () => void; destroy: () => void } {
  let channel: RealtimeChannel | null = null
  let reconnectAttempt = 0
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let destroyed = false

  const removeChannel = () => {
    if (channel) {
      MB_LOG('removing channel')
      supabase.removeChannel(channel)
      channel = null
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
  }
}

// Upload image to Supabase Storage (bucket 'moodboard' must exist and have policies for authenticated users)
export async function uploadMoodImage(file: File): Promise<string> {
  const userId = await getUserId()
  if (!userId) throw new Error('Login required to upload images')
  const fileExt = file.name.split('.').pop() || 'jpg'
  const filePath = `${userId}/${Date.now()}.${fileExt}`
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
