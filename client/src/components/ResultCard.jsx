import ScoreGauge from './ScoreGauge.jsx'
import { downloadPdf, downloadJson } from '../api.js'

function Pill({ label, active }) {
  return <span className={`pill ${active ? 'pill-active' : 'pill-inactive'}`}>{label}</span>
}

function TechPills({ items }) {
  if (!items?.length) return <span className="empty">—</span>
  return (
    <div className="pill-group">
      {items.map((t, i) => <Pill key={i} label={t} active />)}
    </div>
  )
}

const GTM_LABELS = {
  has_pricing_page: 'Page tarifs',
  has_careers_page: 'Page carrières',
  blog_active: 'Blog actif',
  product_led: 'Croissance produit',
  free_trial_or_freemium: 'Essai gratuit / Freemium',
  demo_cta: 'Démo CTA',
  multilingual: 'Multilingue',
  integrations_page: 'Page intégrations'
}

export default function ResultCard({ result }) {
  const { company, tech_stack, gtm_signals, score } = result

  return (
    <div className="result-card">
      <div className="result-actions">
        <button className="action-btn" onClick={() => window.print()}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
          Imprimer
        </button>
        <button className="action-btn" onClick={() => downloadPdf(result)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
          </svg>
          Télécharger PDF
        </button>
        <button className="action-btn" onClick={() => downloadJson(result)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          JSON
        </button>
      </div>

      <section className="result-section">
        <h2>Identité de l'entreprise</h2>
        <div className="company-grid">
          <div><span className="field-label">Nom</span><span>{company.name ?? '—'}</span></div>
          <div><span className="field-label">Domaine</span><span>{company.domain}</span></div>
          <div><span className="field-label">Secteur</span><span>{company.sector ?? '—'}</span></div>
          <div><span className="field-label">Modèle commercial</span><span>{company.business_model ?? '—'}</span></div>
          <div><span className="field-label">Taille estimée</span><span>{company.estimated_size ?? '—'}</span></div>
          <div><span className="field-label">Fondée</span><span>{company.founded_signal ?? '—'}</span></div>
          <div><span className="field-label">Siège social</span><span>{company.hq_signal ?? '—'}</span></div>
          {company.description && (
            <div className="company-description">
              <span className="field-label">Description</span>
              <span>{company.description}</span>
            </div>
          )}
        </div>
      </section>

      <section className="result-section">
        <h2>Stack technique</h2>
        <div className="tech-grid">
          <div><span className="field-label">Frontend</span><TechPills items={tech_stack?.frontend} /></div>
          <div><span className="field-label">Analytics</span><TechPills items={tech_stack?.analytics} /></div>
          <div><span className="field-label">Marketing</span><TechPills items={tech_stack?.marketing} /></div>
          <div><span className="field-label">Infrastructure</span><TechPills items={tech_stack?.infrastructure} /></div>
        </div>
        {tech_stack?.detected_via && (
          <p className="detected-via">Détecté via : {tech_stack.detected_via}</p>
        )}
      </section>

      <section className="result-section">
        <h2>Signaux GTM</h2>
        <div className="gtm-grid">
          {Object.entries(GTM_LABELS).map(([key, label]) => (
            <Pill key={key} label={label} active={!!gtm_signals?.[key]} />
          ))}
        </div>
        {gtm_signals?.open_roles_signal && (
          <p className="open-roles">Postes ouverts : {gtm_signals.open_roles_signal}</p>
        )}
      </section>

      <section className="result-section">
        <h2>Score de compatibilité B2B SaaS</h2>
        <ScoreGauge score={score} />
      </section>
    </div>
  )
}
