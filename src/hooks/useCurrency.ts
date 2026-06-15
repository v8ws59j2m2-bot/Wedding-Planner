// ─────────────────────────────────────────────────────────────────────────────
// useCurrency — GBP ↔ IDR exchange rates
// Fetches from Frankfurter (ECB data, free, no API key, CORS-safe).
// Caches in localStorage for 12 hours; falls back gracefully if offline.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────
export type Currency = 'GBP' | 'IDR'

export const CURRENCY_LABELS: Record<Currency, { symbol: string; name: string; flag: string }> = {
  GBP: { symbol: '£',  name: 'British Pound',     flag: '🇬🇧' },
  IDR: { symbol: 'Rp', name: 'Indonesian Rupiah', flag: '🇮🇩' },
}

export interface ExchangeRates {
  /** 1 GBP = IDR rate */
  IDR: number
  fetchedAt: number
}

// ── Storage ───────────────────────────────────────────────────────────────────
const RATES_KEY = 'jb-exchange-rates'
const PREFS_KEY = 'jb-currency-prefs'
const CACHE_TTL = 1000 * 60 * 60 * 12   // 12 hours
const API_URL   = 'https://api.frankfurter.dev/v1/latest?from=GBP&to=IDR'

const FALLBACK_RATES: Omit<ExchangeRates, 'fetchedAt'> = {
  IDR: 20500,  // approx fallback — only used if API and cache both fail
}

function loadRates(): ExchangeRates | null {
  try {
    const raw = localStorage.getItem(RATES_KEY)
    if (!raw) return null
    const rates: ExchangeRates = JSON.parse(raw)
    if (Date.now() - rates.fetchedAt > CACHE_TTL) return null
    return rates
  } catch { return null }
}

function saveRates(rates: ExchangeRates): void {
  localStorage.setItem(RATES_KEY, JSON.stringify(rates))
}

export interface CurrencyPrefs {
  display:  Currency
  showBoth: boolean
}

export function loadCurrencyPrefs(): CurrencyPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    return raw ? JSON.parse(raw) : { display: 'GBP', showBoth: false }
  } catch { return { display: 'GBP', showBoth: false } }
}

export function saveCurrencyPrefs(prefs: CurrencyPrefs): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export interface CurrencyHookResult {
  rates:       ExchangeRates | null
  loading:     boolean
  error:       string | null
  lastUpdated: Date | null
  refetch:     () => void
}

export function useCurrencyRates(): CurrencyHookResult {
  const [state, setState] = useState<Omit<CurrencyHookResult, 'refetch'>>(() => {
    const cached = loadRates()
    return { rates: cached, loading: !cached, error: null,
      lastUpdated: cached ? new Date(cached.fetchedAt) : null }
  })

  const fetchRates = async () => {
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const res = await fetch(API_URL)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (!json.rates?.IDR) throw new Error('IDR rate missing')
      const rates: ExchangeRates = { IDR: json.rates.IDR, fetchedAt: Date.now() }
      saveRates(rates)
      setState({ rates, loading: false, error: null, lastUpdated: new Date() })
    } catch {
      const cached = loadRates()
      setState(s => ({
        rates:       cached ?? { ...FALLBACK_RATES, fetchedAt: 0 },
        loading:     false,
        error:       cached
          ? 'Could not update — showing last cached rate.'
          : 'Could not fetch rate — using fallback value.',
        lastUpdated: s.lastUpdated,
      }))
    }
  }

  useEffect(() => {
    const cached = loadRates()
    if (!cached) fetchRates()
    else setState({ rates: cached, loading: false, error: null, lastUpdated: new Date(cached.fetchedAt) })
  }, [])

  return { ...state, refetch: fetchRates }
}

// ── Conversion helpers ────────────────────────────────────────────────────────
export function fromGbp(gbp: number, to: Currency, rates: ExchangeRates): number {
  if (to === 'GBP') return gbp
  return gbp * rates.IDR
}

export function toGbp(amount: number, from: Currency, rates: ExchangeRates): number {
  if (from === 'GBP') return amount
  return amount / rates.IDR
}

export function formatAmount(amount: number, currency: Currency): string {
  if (currency === 'IDR') return 'Rp ' + Math.round(amount).toLocaleString('id-ID')
  return '£' + amount.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function displayAmount(
  gbp: number, display: Currency,
  rates: ExchangeRates | null, showBoth = false
): string {
  if (!rates || display === 'GBP') return formatAmount(gbp, 'GBP')
  const primary = formatAmount(fromGbp(gbp, display, rates), display)
  return showBoth ? `${primary} (${formatAmount(gbp, 'GBP')})` : primary
}

// Legacy compat
export function fmtGbp(n: number): string { return formatAmount(n, 'GBP') }
export function fmtIdr(n: number): string { return formatAmount(n, 'IDR') }
export function gbpToIdr(gbp: number, rate: number): number { return Math.round(gbp * rate) }
export function idrToGbp(idr: number, rate: number): number { return idr / rate }
