import { supabase } from './supabase'
import type { AppData, WeddingDetails } from '../types'

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

// ── AppData ───────────────────────────────────────────────────────────────────
export async function loadAppData(): Promise<AppData> {
  const userId = await getUserId()
  if (!userId) return { ...DEFAULT_APP_DATA }

  const { data, error } = await supabase
    .from('app_data').select('*').eq('user_id', userId).single()
  if (error || !data) return { ...DEFAULT_APP_DATA }

  const guests = (data.guests ?? []).map((g: any) => {
    if (!g.firstName && !g.lastName && g.name) {
      const parts = g.name.split('&')[0].trim().split(' ')
      return { ...g, firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') || undefined }
    }
    return g
  })

  return {
    guests,
    budget:     data.budget      ?? [],
    checklist:  data.checklist   ?? [],
    vendors:    data.vendors     ?? [],
    moodImages: data.mood_images ?? [],
    events:     data.events      ?? [],
    travelInfo: data.travel_info ?? [],
  }
}

export async function saveAppData(appData: AppData): Promise<void> {
  const userId = await getUserId()
  if (!userId) return
  const { error } = await supabase.from('app_data').upsert({
    user_id: userId,
    guests: appData.guests, budget: appData.budget,
    checklist: appData.checklist, vendors: appData.vendors,
    mood_images: appData.moodImages, events: appData.events,
    travel_info: appData.travelInfo,
  }, { onConflict: 'user_id' })
  if (error) throw error
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
  const { error } = await supabase.from('wedding_details')
    .upsert({ user_id: userId, ...details }, { onConflict: 'user_id' })
  if (error) throw error
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
  const { error } = await supabase.from('seating_data')
    .upsert({ user_id: userId, tables: seatingData.tables }, { onConflict: 'user_id' })
  if (error) throw error
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
  // Upsert a row with just timeline — merge with existing data server-side
  const { data: existing } = await supabase
    .from('app_data').select('*').eq('user_id', userId).single()
  if (!existing) return // no app_data row yet — skip, will be created on next full save
  const { error } = await supabase.from('app_data')
    .update({ timeline } as any)
    .eq('user_id', userId)
  if (error) throw error
}

// ── Mood Board ────────────────────────────────────────────────────────────────
export async function loadMoodBoard(): Promise<{ images: any[]; swatches: any[] }> {
  const userId = await getUserId()
  if (!userId) return { images: [], swatches: [] }
  const { data, error } = await supabase
    .from('moodboard_data').select('images,swatches').eq('user_id', userId).single()
  if (error || !data) return { images: [], swatches: [] }
  return { images: data.images ?? [], swatches: data.swatches ?? [] }
}

export async function saveMoodBoard(board: { images: any[]; swatches: any[] }): Promise<void> {
  const userId = await getUserId()
  if (!userId) return
  const { error } = await supabase.from('moodboard_data')
    .upsert({ user_id: userId, images: board.images, swatches: board.swatches }, { onConflict: 'user_id' })
  if (error) throw error
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
  const { error } = await supabase.from('accommodation_data')
    .upsert({ user_id: userId, rooms: accomData.rooms }, { onConflict: 'user_id' })
  if (error) throw error
}
