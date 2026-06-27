import { useState } from 'react'
import UrlForm from './components/UrlForm.jsx'
import Loader from './components/Loader.jsx'
import ResultCard from './components/ResultCard.jsx'
import AuthModal from './components/AuthModal.jsx'
import ProfileModal from './components/ProfileModal.jsx'
import HistoryPanel from './components/HistoryPanel.jsx'
import BulkUpload from './components/BulkUpload.jsx'
import IcpWeights from './components/IcpWeights.jsx'
import { analyzeUrl, getAnalysis, isAuthenticated, getEmail, logout } from './api.js'
import { DEFAULT_WEIGHTS } from './defaultWeights.js'

export default function App() {
  const [authed, setAuthed] = useState(isAuthenticated())
  const [userEmail, setUserEmail] = useState(getEmail())
  const [tab, setTab] = useState('analyze')
  const [weights, setWeights] = useState({ ...DEFAULT_WEIGHTS })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [submittedUrl, setSubmittedUrl] = useState('')
  const [showProfile, setShowProfile] = useState(false)

  function handleAuth(email) {
    setAuthed(true)
    setUserEmail(email)
  }

  function handleLogout() {
    logout()
    setAuthed(false)
    setUserEmail(null)
    setResult(null)
    setError(null)
  }

  async function handleSubmit(url) {
    setLoading(true)
    setError(null)
    setResult(null)
    setSubmittedUrl(url)
    try {
      const data = await analyzeUrl(url, weights)
      setResult(data)
      setTab('analyze')
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleLoadHistory(id) {
    try {
      const data = await getAnalysis(id)
      setResult(data)
      setTab('analyze')
    } catch {
      setError('Failed to load analysis')
    }
  }

  if (!authed) return <AuthModal onAuth={handleAuth} />

  if (showProfile) return (
    <ProfileModal
      userEmail={userEmail}
      onClose={() => setShowProfile(false)}
      onLogout={handleLogout}
      onEmailChange={email => setUserEmail(email)}
    />
  )

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-top">
          <img src="/logoLoupe-sans-fond.png" alt="Konsole logo" className="app-logo" />
          <div className="app-brand-text">
            <h1>Web Analyser</h1>
            <p className="app-subtitle">Intelligence B2B et scoring de compatibilité pour chaque entreprise.</p>
          </div>
          <div className="app-user">
            <span className="user-email">{userEmail}</span>
            <button className="profile-btn-header" onClick={() => setShowProfile(true)}>Profil</button>
            <button className="logout-btn" onClick={handleLogout}>Déconnexion</button>
          </div>
        </div>

        <nav className="app-tabs">
          {['analyze', 'bulk', 'history'].map(t => (
            <button
              key={t}
              className={`tab-btn ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'analyze' && 'Analyser'}
              {t === 'bulk' && 'Analyse multiple'}
              {t === 'history' && 'Historique'}
            </button>
          ))}
        </nav>
      </header>

      <main className="app-main">
        {tab === 'analyze' && (
          <>
            <div className="analyze-controls">
              <IcpWeights weights={weights} onChange={setWeights} />
              <UrlForm onSubmit={handleSubmit} loading={loading} />
            </div>
            {loading && <Loader url={submittedUrl} />}
            {error && <div className="error-banner"><strong>Error:</strong> {error}</div>}
            {result && <ResultCard result={result} />}
          </>
        )}

        {tab === 'bulk' && (
          <BulkUpload weights={weights} />
        )}

        {tab === 'history' && (
          <HistoryPanel onLoad={handleLoadHistory} />
        )}
      </main>
    </div>
  )
}
