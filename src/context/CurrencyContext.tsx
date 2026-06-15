import { createContext, useContext, useState } from 'react'
import {
  useCurrencyRates, loadCurrencyPrefs, saveCurrencyPrefs,
  displayAmount, formatAmount, fromGbp, toGbp,
  type Currency, type CurrencyPrefs, type CurrencyHookResult,
  // ExchangeRates not needed here — rates typed via CurrencyHookResult
} from '../hooks/useCurrency'

interface CurrencyContextValue extends CurrencyHookResult {
  prefs:       CurrencyPrefs
  updatePrefs: (p: Partial<CurrencyPrefs>) => void
  /** Format a GBP value in the user's preferred display currency */
  display:     (gbp: number) => string
  /** Format in a specific currency */
  format:      (amount: number, currency: Currency) => string
  /** Convert GBP → display currency (number only) */
  convert:     (gbp: number) => number
  /** Convert display currency → GBP */
  toGbpValue:  (amount: number) => number
  /** Show both currencies side-by-side */
  displayBoth: (gbp: number) => string
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const rateState = useCurrencyRates()
  const [prefs, setPrefs] = useState<CurrencyPrefs>(loadCurrencyPrefs)

  const updatePrefs = (p: Partial<CurrencyPrefs>) => {
    const next = { ...prefs, ...p }
    setPrefs(next)
    saveCurrencyPrefs(next)
  }

  const rates = rateState.rates

  const display = (gbp: number) =>
    displayAmount(gbp, prefs.display, rates, prefs.showBoth)

  const displayBoth = (gbp: number) => {
    if (!rates || prefs.display === 'GBP') return formatAmount(gbp, 'GBP')
    const converted = fromGbp(gbp, prefs.display, rates)
    return `${formatAmount(converted, prefs.display)}  ·  ${formatAmount(gbp, 'GBP')}`
  }

  const format = (amount: number, currency: Currency) =>
    formatAmount(amount, currency)

  const convert = (gbp: number): number => {
    if (!rates || prefs.display === 'GBP') return gbp
    return fromGbp(gbp, prefs.display, rates)
  }

  const toGbpValue = (amount: number): number => {
    if (!rates || prefs.display === 'GBP') return amount
    return toGbp(amount, prefs.display, rates)
  }

  return (
    <CurrencyContext.Provider value={{
      ...rateState, prefs, updatePrefs,
      display, displayBoth, format, convert, toGbpValue,
    }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrencyContext() {
  const ctx = useContext(CurrencyContext)
  if (!ctx) throw new Error('useCurrencyContext must be used inside CurrencyProvider')
  return ctx
}
