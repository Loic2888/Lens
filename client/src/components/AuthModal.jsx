import { useState } from 'react'
import { login, register } from '../api.js'
import PasswordInput from './PasswordInput.jsx'

export default function AuthModal({ onAuth }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = mode === 'login'
        ? await login(email, password)
        : await register(email, password)
      onAuth(data.email)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <img src="/logoLoupe-sans-fond.png" alt="Konsole logo" className="auth-logo" />
        <h2>Web Analyser</h2>
        <p className="auth-subtitle">
          {mode === 'login' ? 'Connectez-vous à votre compte' : 'Créez votre compte'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            type="email"
            className="auth-input"
            placeholder="E-mail"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            disabled={loading}
          />
          <PasswordInput
            className="auth-input"
            placeholder="Mot de passe (8 caractères minimum)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            disabled={loading}
            name="current-password"
          />
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="analyze-btn" disabled={loading}>
            {loading ? '…' : mode === 'login' ? 'Se connecter' : 'Créer un compte'}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'login' ? 'Pas encore de compte ? ' : 'Déjà un compte ? '}
          <button
            className="auth-switch-btn"
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
          >
            {mode === 'login' ? "S'inscrire" : 'Se connecter'}
          </button>
        </p>
      </div>
    </div>
  )
}
