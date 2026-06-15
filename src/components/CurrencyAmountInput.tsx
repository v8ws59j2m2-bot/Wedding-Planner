// ─────────────────────────────────────────────────────────────────────────────
// CurrencyAmountInput
// An amount input with a currency selector. Displays the GBP equivalent
// below the input when a non-GBP currency is selected.
// ─────────────────────────────────────────────────────────────────────────────

import { CURRENCY_LABELS, formatAmount, type Currency } from '../hooks/useCurrency'
import { useCurrencyContext } from '../context/CurrencyContext'

interface Props {
  label:          string
  localAmount:    number | ''   // amount in the selected input currency
  inputCurrency:  Currency
  onAmountChange: (v: number | '') => void
  onCurrencyChange: (c: Currency) => void
  placeholder?:   string
  required?:      boolean
}

const INPUT_CURRENCIES: Currency[] = ['GBP', 'IDR']

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  border: '1.5px solid #E8D5A3', borderRadius: 10,
  background: '#FFFDF7', color: '#3B2A22', fontSize: 13,
  fontFamily: 'Inter, sans-serif', outline: 'none',
}

export function CurrencyAmountInput({
  label, localAmount, inputCurrency,
  onAmountChange, onCurrencyChange,
  placeholder = '0', required,
}: Props) {
  const { rates } = useCurrencyContext()
  const info = CURRENCY_LABELS[inputCurrency]

  // Compute GBP equivalent for display
  const gbpEquiv: number | null = (() => {
    if (!localAmount || inputCurrency === 'GBP') return null
    if (!rates) return null
    return (localAmount as number) / rates.IDR
  })()

  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 700,
    color: '#7A6657', letterSpacing: '0.06em', marginBottom: 5,
  }

  return (
    <div>
      <label style={lbl}>
        {label}{required && ' *'}
      </label>
      <div style={{ display: 'flex', gap: 6 }}>
        {/* Currency selector */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <select
            value={inputCurrency}
            onChange={e => onCurrencyChange(e.target.value as Currency)}
            style={{
              ...inp, width: 'auto', paddingRight: 28, paddingLeft: 8,
              appearance: 'none', fontWeight: 600, minWidth: 72,
              background: inputCurrency !== 'GBP' ? 'rgba(200,164,93,0.1)' : '#FFFDF7',
              borderColor: inputCurrency !== 'GBP' ? '#C8A45D' : '#E8D5A3',
            }}
          >
            {INPUT_CURRENCIES.map(c => (
              <option key={c} value={c}>
                {CURRENCY_LABELS[c].flag} {c}
              </option>
            ))}
          </select>
          <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            fontSize: 10, color: '#7A6657', pointerEvents: 'none' }}>▾</span>
        </div>

        {/* Amount input */}
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            fontSize: 12, color: '#7A6657', fontWeight: 600, pointerEvents: 'none',
          }}>
            {info.symbol}
          </span>
          <input
            style={{ ...inp, paddingLeft: inputCurrency === 'IDR' ? 24 : 22 }}
            type="number"
            min={0}
            step={inputCurrency === 'IDR' ? 1000 : 1}
            value={localAmount === '' ? '' : localAmount}
            onChange={e => onAmountChange(e.target.value === '' ? '' : +e.target.value)}
            placeholder={placeholder}
          />
        </div>
      </div>

      {/* GBP equivalent */}
      {gbpEquiv !== null && (
        <p style={{ fontSize: 11, color: '#C8A45D', marginTop: 4, fontStyle: 'italic' }}>
          ≈ {formatAmount(gbpEquiv, 'GBP')} GBP
          <span style={{ color: '#7A6657', marginLeft: 4 }}>
            (at {rates ? `1 IDR = £${(1 / rates.IDR).toFixed(8).replace(/\.?0+$/, '')}` : 'current rate'})
          </span>
        </p>
      )}
      {inputCurrency !== 'GBP' && !rates && (
        <p style={{ fontSize: 11, color: '#C47A52', marginTop: 4 }}>
          Exchange rates unavailable — GBP equivalent not shown.
        </p>
      )}
    </div>
  )
}

// ── Helper: convert local amount to GBP for storage ───────────────────────────
export function localToGbp(
  localAmount: number,
  currency: Currency,
  rates: { IDR: number } | null
): number {
  if (currency === 'GBP' || !rates) return localAmount
  return localAmount / rates.IDR
}
