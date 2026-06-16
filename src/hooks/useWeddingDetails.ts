import { useState, useEffect } from 'react'
import { loadWeddingDetails as loadFromSupabase } from '../lib/supabaseData'
import type { WeddingDetails } from '../types'

const DEFAULT: WeddingDetails = {
  partner1: 'Jamie', partner2: 'Beth',
  date: '2028-04-05', venue: 'Private Villa Estate',
  time: '14:00', location: 'Canggu, Bali, Indonesia',
  theme: 'Romantic Balinese Minimalist',
}

const DETAILS_KEY = 'jb-wedding-details'

/** Read wedding details — Supabase first, localStorage fallback, then defaults. */
export function useWeddingDetails(): WeddingDetails {
  const [details, setDetails] = useState<WeddingDetails>(() => {
    // Synchronous initial value from localStorage so countdown/display is instant
    try {
      const raw = localStorage.getItem(DETAILS_KEY)
      return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT
    } catch { return DEFAULT }
  })

  useEffect(() => {
    // Async refresh from Supabase
    loadFromSupabase()
      .then(d => setDetails(d))
      .catch(() => { /* keep localStorage value */ })
  }, [])

  return details
}
