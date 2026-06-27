export const DEFAULT_WEIGHTS = {
  b2b_model: 20,
  product_led: 15,
  pricing_page: 10,
  integrations_page: 10,
  blog_active: 8,
  demo_cta: 8,
  free_trial: 8,
  careers_page: 5,
  multilingual: 5,
  smb_midmarket: 5,
  tech_sector: 6
}

export function score(analysis, customWeights = {}) {
  const w = { ...DEFAULT_WEIGHTS, ...customWeights }
  const { company, gtm_signals } = analysis
  const positive = []
  const negative = []
  let value = 0

  if (company?.business_model?.toLowerCase().includes('b2b')) {
    value += w.b2b_model
    positive.push('Modèle B2B')
  }

  if (gtm_signals?.product_led) {
    value += w.product_led
    positive.push('Croissance produit (PLG)')
  }

  if (gtm_signals?.has_pricing_page) {
    value += w.pricing_page
    positive.push('Page de tarifs détectée')
  }

  if (gtm_signals?.integrations_page) {
    value += w.integrations_page
    positive.push("Page d'intégrations")
  }

  if (gtm_signals?.blog_active) {
    value += w.blog_active
    positive.push('Blog actif')
  }

  if (gtm_signals?.demo_cta) {
    value += w.demo_cta
    positive.push('CTA démo présent')
  }

  if (gtm_signals?.free_trial_or_freemium) {
    value += w.free_trial
    positive.push('Essai gratuit / Freemium')
  }

  if (gtm_signals?.has_careers_page) {
    value += w.careers_page
    positive.push('Page carrières (signal de croissance)')
  }

  if (gtm_signals?.multilingual) {
    value += w.multilingual
    positive.push('Multilingue (portée mondiale)')
  }

  const size = company?.estimated_size?.toLowerCase() || ''
  if (size.includes('smb') || size.includes('mid-market')) {
    value += w.smb_midmarket
    positive.push('Taille PME/Mid-market (cycle de vente rapide)')
  } else if (size.includes('enterprise') || size.includes('large')) {
    negative.push('Taille Enterprise — cycle de vente potentiellement long')
  }

  const sector = company?.sector?.toLowerCase() || ''
  if (sector.includes('saas') || sector.includes('software') || sector.includes('tech')) {
    value += w.tech_sector
    positive.push('Secteur Software/SaaS')
  }

  value = Math.min(100, Math.max(0, value))

  let label
  if (value <= 30) label = 'Faible compatibilité'
  else if (value <= 55) label = 'Compatibilité modérée'
  else if (value <= 75) label = 'Bonne compatibilité'
  else label = 'Forte compatibilité'

  return { value, label, signals_positive: positive, signals_negative: negative }
}
