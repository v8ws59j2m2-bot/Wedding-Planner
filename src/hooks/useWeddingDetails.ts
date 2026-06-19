import { useState, useEffect } from 'react'
import { loadWeddingDetails as loadFromSupabase } from '../lib/supabaseData'
import type { WeddingDetails } from '../types'

const DEFAULT: WeddingDetails = {
  partner1: 'Jamie', partner2: 'Beth',
  date: '2028-04-05', venue: 'Private Villa Estate',
  time: '14:00', location: 'Canggu, Bali, Indonesia',
  theme: 'Romantic Balinese Minimalist',
}

/** Read wedding details — Supabase first, localStorage fallback, then defaults. */
export function useWeddingDetails(): WeddingDetails {
  const [details, setDetails] = useState<WeddingDetails>(DEFAULT)

  useEffect(() => {
    // Load from Supabase (no local fallback for auth users; sync initial from defaults or cache if needed)
    loadFromSupabase()
      .then(d => setDetails(d))
      .catch(() => { /* keep defaults on error */ })
  }, [])

  return details
}
