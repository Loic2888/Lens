import { useState } from 'react'
import { DEFAULT_WEIGHTS } from '../defaultWeights.js'

const LABELS = {
  b2b_model: 'Modèle B2B',
  product_led: 'Croissance produit',
  pricing_page: 'Page de tarifs',
  integrations_page: 'Page intégrations',
  blog_active: 'Blog actif',
  demo_cta: 'Démo CTA',
  free_trial: 'Essai gratuit / Freemium',
  careers_page: 'Page carrières',
  multilingual: 'Multilingue',
  smb_midmarket: 'Taille PME / Mid-market',
  tech_sector: 'Secteur Software / SaaS'
}

export default function IcpWeights({ weights, onChange }) {
  const [open, setOpen] = useState(false)

  const maxScore = Object.values(weights).reduce((a, b) => a + b, 0)

  function reset() {
    onChange({ ...DEFAULT_WEIGHTS })
  }

  return (
    <div className="icp-panel">
      <button className="icp-toggle" onClick={() => setOpen(o => !o)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
        </svg>
        Paramètres du score ICP
        <span className="icp-badge">Max {maxScore} pts</span>
        <svg className={`icp-chevron ${open ? 'open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div className="icp-body">
          <p className="icp-hint">Ajustez les poids des signaux selon votre Profil Client Idéal. Total par défaut : 100 pts.</p>
          <div className="icp-sliders">
            {Object.entries(LABELS).map(([key, label]) => (
              <div key={key} className="icp-row">
                <span className="icp-label">{label}</span>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={weights[key] ?? 0}
                  onChange={e => onChange({ ...weights, [key]: Number(e.target.value) })}
                  className="icp-slider"
                />
                <span className="icp-value">{weights[key] ?? 0}</span>
              </div>
            ))}
          </div>
          <button className="icp-reset" onClick={reset}>Réinitialiser</button>
        </div>
      )}
    </div>
  )
}
