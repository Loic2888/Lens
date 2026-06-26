/**
 * client/src/App.jsx
 *
 * Root component of the Konsole Web Analyzer. Owns the top-level application
 * state: the submitted URL, loading flag, analysis result, and any error
 * message. Orchestrates the four states the UI can be in — idle, loading,
 * error, and result — by conditionally rendering the appropriate child
 * components. All API interaction is triggered here and delegated to api.js.
 */
import { useState } from 'react'
import UrlForm from './components/UrlForm.jsx'
import Loader from './components/Loader.jsx'
import ResultCard from './components/ResultCard.jsx'
import { analyzeUrl } from './api.js'

/**
 * Top-level application component. Renders a fixed header containing the URL
 * input form, then a main content area that shows a loading spinner, an error
 * banner, or the full analysis result card depending on the current state.
 * Manages the async lifecycle of the analysis request: sets loading state
 * before the call, clears it in the finally block, and stores either the
 * successful result or the caught error message.
 */
export default function App() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [submittedUrl, setSubmittedUrl] = useState('')

  /**
   * Initiates an analysis request for the given URL. Resets any previous
   * result or error, records the submitted URL for display in the loader, then
   * calls the API. On success, stores the returned analysis object. On
   * failure, stores the error message string.
   */
  async function handleSubmit(url) {
    setLoading(true)
    setError(null)
    setResult(null)
    setSubmittedUrl(url)

    try {
      const data = await analyzeUrl(url)
      setResult(data)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Konsole Web Analyzer</h1>
        <p className="app-subtitle">Enter a company URL to get structured B2B intelligence and a fit score.</p>
        <UrlForm onSubmit={handleSubmit} loading={loading} />
      </header>

      <main className="app-main">
        {loading && <Loader url={submittedUrl} />}
        {error && (
          <div className="error-banner">
            <strong>Error:</strong> {error}
          </div>
        )}
        {result && <ResultCard result={result} />}
      </main>
    </div>
  )
}
