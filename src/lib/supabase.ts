import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables')
}

// Registered by the app-data realtime subscription to resubscribe after socket drops
let realtimeReconnectHandler: (() => void) | null = null

export function registerRealtimeReconnect(handler: () => void) {
  realtimeReconnectHandler = handler
}

export function unregisterRealtimeReconnect() {
  realtimeReconnectHandler = null
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
        realtimeReconnectHandler?.()
      }
    },
  },
})