/**
 * client/src/components/Loader.jsx
 *
 * Loading state component displayed while the backend analysis pipeline is
 * running. Shows an animated spinner, the domain being analyzed, and a brief
 * description of the processing stages so the user knows the app is working
 * and roughly what is happening.
 */

/**
 * Animated loading indicator for the analysis request. url is the raw URL
 * string that the user submitted; the component strips the protocol prefix
 * before displaying it so the label reads cleanly (e.g. "stripe.com" rather
 * than "https://stripe.com").
 */
export default function Loader({ url }) {
  const displayUrl = url.replace(/^https?:\/\//, '')

  return (
    <div className="loader">
      <div className="spinner" />
      <p className="loader-text">Analyse de <strong>{displayUrl}</strong>…</p>
      <p className="loader-sub">Collecte des signaux · Analyse IA · Calcul du score</p>
    </div>
  )
}
