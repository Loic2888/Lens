/**
 * client/src/components/UrlForm.jsx
 *
 * URL input form component. Renders a single text field and a submit button
 * that allow the user to enter a company website address and trigger an
 * analysis. Performs lightweight client-side validation before calling the
 * parent's onSubmit handler — full URL validation and normalization happen
 * server-side. Disables the form controls while an analysis request is in
 * flight to prevent duplicate submissions.
 */
import { useState } from 'react'

/**
 * Controlled form component for capturing and submitting a company URL.
 * onSubmit is called with the trimmed URL string once the form passes local
 * validation. loading is a boolean that disables the input and button while
 * a request is in progress.
 */
export default function UrlForm({ onSubmit, loading }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  /**
   * Handles form submission. Prevents the default browser form action, then
   * validates that the input is non-empty and contains no spaces. Displays an
   * inline error message if validation fails; otherwise clears any previous
   * error and calls onSubmit with the trimmed input.
   */
  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) {
      setError('Veuillez saisir une URL')
      return
    }
    if (trimmed.includes(' ')) {
      setError("L'URL ne peut pas contenir d'espaces")
      return
    }
    setError('')
    onSubmit(trimmed)
  }

  return (
    <form className="url-form" onSubmit={handleSubmit}>
      <div className="url-input-row">
        <div className="url-input-wrapper">
          <img src="/logoLoupe-sans-fond.png" alt="" className="url-input-icon" />
          <input
            type="text"
            className="url-input"
            placeholder="ex : stripe.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
            aria-label="Company website URL"
          />
        </div>
        <button type="submit" className="analyze-btn" disabled={loading}>
          {loading ? 'Analyse en cours…' : 'Analyser'}
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}
    </form>
  )
}
