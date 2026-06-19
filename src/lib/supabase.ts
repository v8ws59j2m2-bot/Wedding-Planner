import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables')
}

// Handlers invoked when the realtime socket drops (app data, mood board, etc.)
const realtimeReconnectHandlers = new Set<() => void>()

export function registerRealtimeReconnect(handler: () => void): () => void {
  realtimeReconnectHandlers.add(handler)
  return () => { realtimeReconnectHandlers.delete(handler) }
}

export function unregisterRealtimeReconnect(handler?: () => void) {
  if (handler) realtimeReconnectHandlers.delete(handler)
  else realtimeReconnectHandlers.clear()
}

function notifyRealtimeReconnect() {
  for (const handler of realtimeReconnectHandlers) handler()
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    heartbeatIntervalMs: 15_000,
    timeout: 25_000,
    heartbeatCallback: (status) => {
      console.log('[sync] heartbeat', status)
      if (status === 'disconnected' || status === 'timeout' || status === 'error') {
        notifyRealtimeReconnect()
      }
    },
  },
})