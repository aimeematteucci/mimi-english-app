import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'

export default function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <Logo size={64} />
          <div>
            <h1 style={styles.title}>EnglishBox Student</h1>
            <p style={styles.subtitle}>Sign in to your account</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com" required style={styles.input} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required style={styles.input} />
          </div>
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" disabled={loading} style={styles.btn}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p style={styles.footer}>
          Don't have an account?{' '}
          <Link to="/signup" style={styles.link}>Sign up</Link>
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--bg)', padding: 16,
  },
  card: {
    background: 'var(--card-cream)', borderRadius: 28, padding: '40px 36px',
    width: '100%', maxWidth: 420, boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
  },
  header: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 },
  title: { fontSize: 24, fontWeight: 700, color: 'var(--text-dark)', margin: 0 },
  subtitle: { fontSize: 14, color: 'var(--text-muted)', margin: 0 },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 },
  input: {
    width: '100%', padding: '11px 14px', borderRadius: 10,
    border: '1.5px solid rgba(67,73,42,0.2)', background: 'white',
    fontSize: 14, color: 'var(--text-dark)', outline: 'none',
  },
  error: { color: 'var(--danger)', fontSize: 13, marginBottom: 12 },
  btn: {
    width: '100%', padding: '12px', borderRadius: 12, border: 'none',
    background: 'var(--text-dark)', color: 'var(--card-green)', fontSize: 15,
    fontWeight: 600, marginTop: 8, transition: 'opacity 0.2s',
  },
  footer: { textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--text-muted)' },
  link: { color: 'var(--text-dark)', fontWeight: 600 },
}
