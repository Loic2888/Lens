/**
 * client/src/components/ResultCard.jsx
 *
 * Full analysis result display component. Renders the complete intelligence
 * object returned by the backend as four distinct sections: Company Identity,
 * Tech Stack, GTM Signals, and B2B SaaS Fit Score. Tech stack items are shown
 * as colored pill badges grouped by category. GTM signals are shown as a badge
 * grid where true signals are highlighted and false ones are greyed out. The
 * fit score section delegates to the ScoreGauge component.
 */
import ScoreGauge from './ScoreGauge.jsx'

/**
 * Single technology or GTM tag badge. label is the display text. active
 * controls the visual style: active pills use a highlighted color to indicate
 * presence, while inactive pills use a muted grey style to indicate absence.
 */
function Pill({ label, active }) {
  return (
    <span className={`pill ${active ? 'pill-active' : 'pill-inactive'}`}>
      {label}
    </span>
  )
}

/**
 * Renders a horizontal group of active tech stack pills. items is an array of
 * technology name strings. Renders a dash placeholder if the array is empty or
 * undefined so the layout doesn't collapse.
 */
function TechPills({ items }) {
  if (!items?.length) return <span className="empty">—</span>
  return (
    <div className="pill-group">
      {items.map((t, i) => <Pill key={i} label={t} active />)}
    </div>
  )
}

// Human-readable labels for each GTM signal key returned by the API. The order
// here determines the order in which signals appear in the badge grid.
const GTM_LABELS = {
  has_pricing_page: 'Pricing page',
  has_careers_page: 'Careers page',
  blog_active: 'Active blog',
  product_led: 'Product-led',
  free_trial_or_freemium: 'Free trial / Freemium',
  demo_cta: 'Demo CTA',
  multilingual: 'Multilingual',
  integrations_page: 'Integrations page'
}

/**
 * Main analysis result card. result is the full response object from
 * POST /api/analyze, containing company, tech_stack, gtm_signals, and score
 * fields. Null or missing values are displayed as an em-dash so no section
 * ever renders blank. The open_roles_signal string from gtm_signals is shown
 * as a plain text note below the badge grid when present.
 */
export default function ResultCard({ result }) {
  const { company, tech_stack, gtm_signals, score } = result

  return (
    <div className="result-card">
      <section className="result-section">
        <h2>Company Identity</h2>
        <div className="company-grid">
          <div><span className="field-label">Name</span><span>{company.name ?? '—'}</span></div>
          <div><span className="field-label">Domain</span><span>{company.domain}</span></div>
          <div><span className="field-label">Sector</span><span>{company.sector ?? '—'}</span></div>
          <div><span className="field-label">Business model</span><span>{company.business_model ?? '—'}</span></div>
          <div><span className="field-label">Estimated size</span><span>{company.estimated_size ?? '—'}</span></div>
          <div><span className="field-label">Founded</span><span>{company.founded_signal ?? '—'}</span></div>
          <div><span className="field-label">HQ</span><span>{company.hq_signal ?? '—'}</span></div>
          {company.description && (
            <div className="company-description">
              <span className="field-label">Description</span>
              <span>{company.description}</span>
            </div>
          )}
        </div>
      </section>

      <section className="result-section">
        <h2>Tech Stack</h2>
        <div className="tech-grid">
          <div><span className="field-label">Frontend</span><TechPills items={tech_stack?.frontend} /></div>
          <div><span className="field-label">Analytics</span><TechPills items={tech_stack?.analytics} /></div>
          <div><span className="field-label">Marketing</span><TechPills items={tech_stack?.marketing} /></div>
          <div><span className="field-label">Infrastructure</span><TechPills items={tech_stack?.infrastructure} /></div>
        </div>
        {tech_stack?.detected_via && (
          <p className="detected-via">Detected via: {tech_stack.detected_via}</p>
        )}
      </section>

      <section className="result-section">
        <h2>GTM Signals</h2>
        <div className="gtm-grid">
          {Object.entries(GTM_LABELS).map(([key, label]) => (
            <Pill key={key} label={label} active={!!gtm_signals?.[key]} />
          ))}
        </div>
        {gtm_signals?.open_roles_signal && (
          <p className="open-roles">Open roles: {gtm_signals.open_roles_signal}</p>
        )}
      </section>

      <section className="result-section">
        <h2>B2B SaaS Fit Score</h2>
        <ScoreGauge score={score} />
      </section>
    </div>
  )
}
