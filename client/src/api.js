/**
 * client/src/api.js
 *
 * Thin HTTP client for the Konsole Analyzer backend. Centralizes all API
 * calls so that the base URL (read from the VITE_API_URL environment variable)
 * and error handling are defined in one place rather than scattered across
 * components. Components import named functions from this module instead of
 * calling fetch directly.
 */

/**
 * Sends a URL to the backend analysis pipeline and returns the structured
 * intelligence object. url is the raw string the user typed into the form —
 * normalization happens server-side. Throws an Error with a human-readable
 * message if the server responds with a non-2xx status or if the network
 * request fails entirely.
 */
export async function analyzeUrl(url) {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Analysis failed')
  }
  return res.json()
}
