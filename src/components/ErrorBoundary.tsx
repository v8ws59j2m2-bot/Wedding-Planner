import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null; stack: string }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, stack: '' }

  static getDerivedStateFromError(error: Error): State {
    return { error, stack: '' }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
    this.setState({ stack: info.componentStack ?? '' })
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#FFF8EE', padding: 24,
      }}>
        <div style={{
          maxWidth: 480, width: '100%', textAlign: 'center',
          background: '#FAF3E6', border: '1.5px solid rgba(196,122,82,0.35)',
          borderRadius: 20, padding: 40,
          boxShadow: '0 8px 32px rgba(42,30,20,0.1)',
        }}>
          {/* Decorative diamond */}
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ marginBottom: 16 }}>
            <rect x="4" y="4" width="32" height="32" rx="4" transform="rotate(45 20 20)"
              fill="none" stroke="#C47A52" strokeWidth="1.5" opacity="0.6"/>
          </svg>

          <h1 style={{
            fontFamily: 'Playfair Display, serif', fontSize: 22, fontStyle: 'italic',
            color: '#3B2A22', marginBottom: 10,
          }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 13, color: '#7A6657', lineHeight: 1.7, marginBottom: 24 }}>
            The app encountered an unexpected error. Your data is safe — it's stored in your browser
            and hasn't been affected.
          </p>

          {/* Error detail — collapsed */}
          <details style={{ marginBottom: 24, textAlign: 'left' }}>
            <summary style={{ fontSize: 12, color: '#A89080', cursor: 'pointer', marginBottom: 8 }}>
              Error details
            </summary>
            <pre style={{
              fontSize: 11, color: '#C47A52', background: 'rgba(196,122,82,0.08)',
              border: '1px solid rgba(196,122,82,0.2)', borderRadius: 8, padding: 12,
              overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              maxHeight: 200, overflowY: 'auto',
            }}>
              {error.message}
              {this.state.stack ? '\n\nComponent stack:\n' + this.state.stack : ''}
            </pre>
          </details>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              onClick={() => {
                // Export data before reloading so nothing is lost
                try {
                  const raw = localStorage.getItem('jamie-beth-wedding-planner')
                  if (raw) {
                    const blob = new Blob([raw], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `wedding-emergency-backup-${new Date().toISOString().split('T')[0]}.json`
                    a.click()
                    URL.revokeObjectURL(url)
                  }
                } catch { /* silent */ }
              }}
              style={{
                padding: '9px 18px', borderRadius: 10, fontSize: 13,
                border: '1.5px solid #E8D5A3', background: 'transparent',
                color: '#7A6657', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}>
              Export data first
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                border: 'none', background: '#3B2A22', color: '#FFF8EE',
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}>
              Reload app
            </button>
          </div>
        </div>
      </div>
    )
  }
}
