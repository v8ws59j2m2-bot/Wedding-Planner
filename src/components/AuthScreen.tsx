import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Frangipani, BaliBorder } from './Botanicals'

export function AuthScreen() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [mode,     setMode]     = useState<'login' | 'signup'>('login')
  const [sent,     setSent]     = useState(false)

  const inp: React.CSSProperties = {
    width: '100%', padding: '12px 14px',
    border: '1.5px solid #E8D5A3', borderRadius: 12,
    background: '#FFFDF7', color: '#3B2A22', fontSize: 14,
    fontFamily: 'Inter, sans-serif', outline: 'none',
    boxSizing: 'border-box',
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setError(error.message)
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) setError(error.message)
        else setSent(true)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg, #1A1208 0%, #2A1E10 50%, #1E1A0E 100%)',
      padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 12,
            animation: 'floatSlow 8s ease-in-out infinite' }}>
            <Frangipani size={28} opacity={0.7}/>
            <Frangipani size={36} opacity={0.9}/>
            <Frangipani size={28} opacity={0.7}/>
          </div>
          <p style={{ color: '#C8A45D', fontFamily: 'Playfair Display, serif',
            fontSize: 11, letterSpacing: '0.22em', opacity: 0.7, marginBottom: 6 }}>
            WEDDING PLANNER
          </p>
          <h1 style={{ color: '#FFF8EE', fontFamily: 'Playfair Display, serif',
            fontStyle: 'italic', fontSize: 28, fontWeight: 400, lineHeight: 1 }}>
            Jamie & Beth
          </h1>
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>
            <BaliBorder width={160} opacity={0.4}/>
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: '#FFF8EE', borderRadius: 20, padding: 32,
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)', border: '1.5px solid #E8D5A3',
        }}>
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>📧</p>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: '#3B2A22', marginBottom: 8 }}>
                Check your email
              </h2>
              <p style={{ fontSize: 13, color: '#7A6657', lineHeight: 1.6 }}>
                We've sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then come back here to sign in.
              </p>
              <button onClick={() => { setSent(false); setMode('login') }}
                style={{ marginTop: 20, fontSize: 12, color: '#C8A45D', background: 'none',
                  border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, fontStyle: 'italic',
                color: '#3B2A22', marginBottom: 6, textAlign: 'center' }}>
                {mode === 'login' ? 'Welcome back' : 'Create account'}
              </h2>
              <p style={{ fontSize: 12, color: '#7A6657', textAlign: 'center', marginBottom: 24 }}>
                {mode === 'login' ? 'Sign in to access your wedding planner' : 'Set up your planner account'}
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#7A6657',
                    letterSpacing: '0.08em', marginBottom: 5 }}>EMAIL</label>
                  <input style={inp} type="email" value={email} required autoComplete="email"
                    onChange={e => setEmail(e.target.value)} placeholder="you@email.com"/>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#7A6657',
                    letterSpacing: '0.08em', marginBottom: 5 }}>PASSWORD</label>
                  <input style={inp} type="password" value={password} required autoComplete="current-password"
                    onChange={e => setPassword(e.target.value)} placeholder="••••••••"/>
                </div>

                {error && (
                  <p style={{ fontSize: 12, color: '#C47A52', background: 'rgba(196,122,82,0.08)',
                    border: '1px solid rgba(196,122,82,0.3)', borderRadius: 8, padding: '8px 12px' }}>
                    {error}
                  </p>
                )}

                <button type="submit" disabled={loading}
                  style={{ padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 600,
                    border: 'none', background: loading ? '#E8D5A3' : '#3B2A22',
                    color: loading ? '#7A6657' : '#FFF8EE', cursor: loading ? 'default' : 'pointer',
                    transition: 'all 0.15s', marginTop: 4 }}>
                  {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: 20 }}>
                <button onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError('') }}
                  style={{ fontSize: 12, color: '#C8A45D', background: 'none',
                    border: 'none', cursor: 'pointer' }}>
                  {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                </button>
              </div>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(200,164,93,0.4)',
          marginTop: 24, letterSpacing: '0.1em' }}>
          CANGGU · BALI · APRIL 2028
        </p>
      </div>
    </div>
  )
}
