/**
 * client/src/components/ScoreGauge.jsx
 *
 * Visual B2B SaaS fit score display. Renders the numeric score inside a
 * color-coded circle, a one-sentence rationale from Claude below it, and two
 * columns listing the positive and negative signals that drove the score. The
 * color of the circle border and score text shifts from red through orange and
 * blue to green as the score increases, giving an immediate visual cue about
 * the quality of the fit.
 */

/**
 * Maps a numeric score (0–100) to a color hex string that reflects fit quality.
 * Scores up to 30 are red (weak fit), 31–55 are orange (moderate fit), 56–75
 * are blue (good fit), and 76–100 are green (strong fit). The returned color
 * is applied to both the circle border and the score numeral.
 */
function scoreColor(value) {
  if (value <= 30) return '#ea384c'  // Youno red
  if (value <= 55) return '#de6f4a'  // Youno terracotta light
  if (value <= 75) return '#2d40ea'  // Youno blue
  return '#cc532b'                   // Youno terracotta — strong fit
}

/**
 * Fit score display component. score is the score object from the API response
 * containing value (0–100), label (e.g. "Strong fit"), rationale (a sentence
 * from Claude explaining the score), signals_positive (array of strings), and
 * signals_negative (array of strings). Renders nothing for optional fields
 * that are empty or null so the layout degrades gracefully when a company has
 * no positive or no negative signals.
 */
export default function ScoreGauge({ score }) {
  const { value, label, rationale, signals_positive, signals_negative } = score
  const color = scoreColor(value)

  return (
    <div className="score-gauge">
      <div className="score-circle" style={{ borderColor: color, color }}>
        <span className="score-value">{value}</span>
        <span className="score-label">{label}</span>
      </div>

      {rationale && <p className="score-rationale">{rationale}</p>}

      <div className="score-signals">
        {signals_positive?.length > 0 && (
          <div className="signals-col">
            <h4>Signaux positifs</h4>
            <ul>
              {signals_positive.map((s, i) => (
                <li key={i}><span className="signal-icon">✅</span> {s}</li>
              ))}
            </ul>
          </div>
        )}
        {signals_negative?.length > 0 && (
          <div className="signals-col">
            <h4>Points de vigilance</h4>
            <ul>
              {signals_negative.map((s, i) => (
                <li key={i}><span className="signal-icon">⚠️</span> {s}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
