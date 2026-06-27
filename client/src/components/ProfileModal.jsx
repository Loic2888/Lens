import { useState } from 'react'
import { changePassword, changeEmail, deleteAccount, logout } from '../api.js'
import PasswordInput from './PasswordInput.jsx'

const FAQ = [
  {
    q: "Qu'est-ce que Web Analyser ?",
    a: "Web Analyser est un outil d'intelligence B2B qui analyse n'importe quel site web d'entreprise pour en extraire des informations clés : stack technologique, signaux commerciaux (pricing, blog, démo…), et un score de compatibilité SaaS personnalisable."
  },
  {
    q: "Comment fonctionne l'analyse ?",
    a: "Nous récupérons les données publiques du site (balises HTML, liens, scripts) et les transmettons à un modèle d'intelligence artificielle qui structure les informations et génère une analyse complète. L'ensemble prend généralement entre 5 et 20 secondes."
  },
  {
    q: "Quelles données sont collectées sur les sites analysés ?",
    a: "Uniquement les données publiquement accessibles : balises meta, titres, liens de navigation, sources de scripts et attributs HTML. Aucune donnée personnelle n'est collectée sur les visiteurs des sites analysés."
  },
  {
    q: "Mes analyses sont-elles sauvegardées ?",
    a: "Oui, lorsque vous êtes connecté, chaque analyse est automatiquement sauvegardée dans votre historique et accessible à tout moment depuis l'onglet Historique."
  },
  {
    q: "Combien d'URLs puis-je analyser en masse ?",
    a: "L'analyse multiple accepte jusqu'à 50 URLs par lot. Les résultats sont traités séquentiellement et automatiquement sauvegardés dans votre historique."
  },
  {
    q: "Comment est calculé le score de compatibilité ?",
    a: "Le score (0–100) est calculé de façon déterministe à partir des signaux détectés : modèle B2B, croissance produit (PLG), page de tarifs, intégrations, blog actif, CTA démo, etc. Vous pouvez ajuster les poids de chaque critère via le panneau « Paramètres du score ICP »."
  },
  {
    q: "Puis-je exporter mes analyses ?",
    a: "Oui, chaque analyse peut être exportée en PDF (rapport mis en page) ou en JSON (données brutes) via les boutons disponibles sous les résultats."
  },
  {
    q: "Qui peut voir mes analyses ?",
    a: "Vos analyses sont privées et accessibles uniquement via votre compte. Aucun autre utilisateur n'y a accès."
  }
]

const CGU_SECTIONS = [
  {
    title: "Article 1 – Objet",
    content: "Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de l'application Web Analyser, outil d'intelligence B2B accessible via navigateur web. En créant un compte, l'utilisateur accepte sans réserve les présentes conditions."
  },
  {
    title: "Article 2 – Accès au service",
    content: "L'accès au service est conditionné à la création d'un compte utilisateur. L'utilisateur s'engage à fournir des informations exactes lors de son inscription et à maintenir la confidentialité de ses identifiants de connexion. Toute utilisation du compte par un tiers est de la responsabilité de l'utilisateur."
  },
  {
    title: "Article 3 – Utilisation du service",
    content: "L'utilisateur s'engage à utiliser Web Analyser uniquement à des fins légales et dans le respect des droits des tiers. Il est notamment interdit de : analyser des sites dans le but de collecter des données personnelles à des fins illégales ; utiliser le service à des fins de spam ou de démarchage abusif ; tenter de contourner les mesures de sécurité de l'application ; effectuer des requêtes automatisées massives au-delà des limites prévues par le service."
  },
  {
    title: "Article 4 – Données personnelles",
    content: "Les données collectées par Web Analyser sont limitées à : l'adresse e-mail et le mot de passe hashé de l'utilisateur ; les analyses réalisées (URLs analysées et résultats). Ces données sont stockées de façon sécurisée sur des serveurs hébergés en Europe et ne sont jamais vendues ni partagées avec des tiers. Conformément au RGPD, l'utilisateur dispose d'un droit d'accès, de rectification et de suppression de ses données, exerceable depuis la page Profil."
  },
  {
    title: "Article 5 – Données analysées sur des sites tiers",
    content: "Web Analyser accède uniquement aux données publiquement disponibles sur les sites analysés. L'outil ne contourne aucune protection technique, n'accède pas aux parties privées ou protégées des sites web, et respecte les pratiques standards de crawling (User-Agent déclaré, timeout limité, pas de contournement de robots.txt)."
  },
  {
    title: "Article 6 – Responsabilité",
    content: "Web Analyser fournit des analyses à titre informatif. Les résultats sont générés par intelligence artificielle et peuvent contenir des inexactitudes ou des interprétations incorrectes. L'utilisateur est seul responsable des décisions commerciales, stratégiques ou autres prises sur la base des analyses produites par le service."
  },
  {
    title: "Article 7 – Suppression du compte",
    content: "L'utilisateur peut supprimer son compte et l'ensemble de ses données à tout moment depuis la page Profil, section « Zone de danger ». La suppression est définitive et irréversible. Toutes les analyses associées au compte sont supprimées simultanément."
  },
  {
    title: "Article 8 – Modifications du service",
    content: "Web Analyser se réserve le droit de modifier les présentes CGU et les fonctionnalités du service à tout moment. Les modifications significatives seront communiquées aux utilisateurs par e-mail ou via une notification dans l'application."
  },
  {
    title: "Article 9 – Droit applicable",
    content: "Les présentes CGU sont soumises au droit français. Tout litige relatif à leur interprétation ou à leur exécution sera soumis aux tribunaux compétents de Paris, sauf disposition légale contraire."
  }
]

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="faq-item">
      <button className="faq-question" onClick={() => setOpen(o => !o)}>
        <span>{q}</span>
        <svg className={`icp-chevron ${open ? 'open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && <p className="faq-answer">{a}</p>}
    </div>
  )
}

export default function ProfileModal({ userEmail, onClose, onLogout, onEmailChange }) {
  const [tab, setTab] = useState('account')

  // Change password
  const [curPwd, setCurPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdMsg, setPwdMsg] = useState(null)
  const [pwdLoading, setPwdLoading] = useState(false)

  // Change email
  const [currentEmail, setCurrentEmail] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [emailMsg, setEmailMsg] = useState(null)
  const [emailLoading, setEmailLoading] = useState(false)

  // Delete account
  const [delPwd, setDelPwd] = useState('')
  const [delConfirm, setDelConfirm] = useState(false)
  const [delMsg, setDelMsg] = useState(null)
  const [delLoading, setDelLoading] = useState(false)

  async function handleChangePassword(e) {
    e.preventDefault()
    if (newPwd !== confirmPwd) return setPwdMsg({ type: 'error', text: 'Les mots de passe ne correspondent pas' })
    setPwdLoading(true)
    setPwdMsg(null)
    try {
      await changePassword(curPwd, newPwd)
      setPwdMsg({ type: 'success', text: 'Mot de passe modifié avec succès' })
      setCurPwd(''); setNewPwd(''); setConfirmPwd('')
    } catch (err) {
      setPwdMsg({ type: 'error', text: err.message })
    } finally {
      setPwdLoading(false)
    }
  }

  async function handleChangeEmail(e) {
    e.preventDefault()
    setEmailLoading(true)
    setEmailMsg(null)
    try {
      const data = await changeEmail(currentEmail, newEmail)
      setEmailMsg({ type: 'success', text: 'E-mail modifié avec succès' })
      onEmailChange(data.email)
      setCurrentEmail(''); setNewEmail('')
    } catch (err) {
      setEmailMsg({ type: 'error', text: err.message })
    } finally {
      setEmailLoading(false)
    }
  }

  async function handleDeleteAccount(e) {
    e.preventDefault()
    setDelLoading(true)
    setDelMsg(null)
    try {
      await deleteAccount(delPwd)
      logout()
      onLogout()
    } catch (err) {
      setDelMsg({ type: 'error', text: err.message })
    } finally {
      setDelLoading(false)
    }
  }

  return (
    <div className="profile-overlay">
      <div className="profile-modal">
        <div className="profile-header">
          <h2>Mon profil</h2>
          <button className="profile-close" onClick={onClose} aria-label="Fermer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="profile-tabs">
          {[['account', 'Mon compte'], ['faq', 'Aide & FAQ'], ['cgu', 'CGU']].map(([key, label]) => (
            <button
              key={key}
              className={`profile-tab-btn ${tab === key ? 'active' : ''}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="profile-body">

          {/* ── Mon compte ── */}
          {tab === 'account' && (
            <div className="profile-sections">
              <p className="profile-email-display">
                <span className="field-label">Compte</span>
                <strong>{userEmail}</strong>
              </p>

              {/* Changer l'e-mail */}
              <section className="profile-section">
                <h3>Changer l'adresse e-mail</h3>
                <form onSubmit={handleChangeEmail} className="profile-form">
                  <input
                    type="email"
                    className="auth-input"
                    placeholder="E-mail actuel"
                    value={currentEmail}
                    onChange={e => setCurrentEmail(e.target.value)}
                    required
                    disabled={emailLoading}
                    autoComplete="email"
                  />
                  <input
                    type="email"
                    className="auth-input"
                    placeholder="Nouvel e-mail"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    required
                    disabled={emailLoading}
                    autoComplete="email"
                  />
                  {emailMsg && <p className={emailMsg.type === 'success' ? 'profile-success' : 'auth-error'}>{emailMsg.text}</p>}
                  <button type="submit" className="analyze-btn profile-btn" disabled={emailLoading}>
                    {emailLoading ? '…' : "Modifier l'e-mail"}
                  </button>
                </form>
              </section>

              {/* Changer le mot de passe */}
              <section className="profile-section">
                <h3>Changer le mot de passe</h3>
                <form onSubmit={handleChangePassword} className="profile-form">
                  <PasswordInput
                    className="auth-input"
                    placeholder="Mot de passe actuel"
                    value={curPwd}
                    onChange={e => setCurPwd(e.target.value)}
                    required
                    disabled={pwdLoading}
                    name="current-password"
                  />
                  <PasswordInput
                    className="auth-input"
                    placeholder="Nouveau mot de passe (8 caractères min)"
                    value={newPwd}
                    onChange={e => setNewPwd(e.target.value)}
                    required
                    disabled={pwdLoading}
                    name="new-password"
                  />
                  <PasswordInput
                    className="auth-input"
                    placeholder="Confirmer le nouveau mot de passe"
                    value={confirmPwd}
                    onChange={e => setConfirmPwd(e.target.value)}
                    required
                    disabled={pwdLoading}
                    name="new-password"
                  />
                  {pwdMsg && <p className={pwdMsg.type === 'success' ? 'profile-success' : 'auth-error'}>{pwdMsg.text}</p>}
                  <button type="submit" className="analyze-btn profile-btn" disabled={pwdLoading}>
                    {pwdLoading ? '…' : 'Modifier le mot de passe'}
                  </button>
                </form>
              </section>

              {/* Zone de danger */}
              <section className="profile-section profile-danger-zone">
                <h3>Zone de danger</h3>
                <p className="profile-danger-desc">
                  La suppression de votre compte est <strong>définitive et irréversible</strong>. Toutes vos analyses et données seront effacées.
                </p>
                {!delConfirm ? (
                  <button className="danger-btn" onClick={() => setDelConfirm(true)}>
                    Supprimer mon compte
                  </button>
                ) : (
                  <form onSubmit={handleDeleteAccount} className="profile-form">
                    <PasswordInput
                      className="auth-input"
                      placeholder="Confirmez avec votre mot de passe"
                      value={delPwd}
                      onChange={e => setDelPwd(e.target.value)}
                      required
                      disabled={delLoading}
                      name="current-password"
                    />
                    {delMsg && <p className="auth-error">{delMsg.text}</p>}
                    <div className="danger-btn-row">
                      <button type="submit" className="danger-btn" disabled={delLoading}>
                        {delLoading ? '…' : 'Confirmer la suppression'}
                      </button>
                      <button type="button" className="action-btn" onClick={() => { setDelConfirm(false); setDelPwd('') }}>
                        Annuler
                      </button>
                    </div>
                  </form>
                )}
              </section>
            </div>
          )}

          {/* ── FAQ ── */}
          {tab === 'faq' && (
            <div className="faq-list">
              <p className="profile-intro">Retrouvez ici les réponses aux questions les plus fréquentes sur Web Analyser.</p>
              {FAQ.map((item, i) => <FaqItem key={i} {...item} />)}
            </div>
          )}

          {/* ── CGU ── */}
          {tab === 'cgu' && (
            <div className="cgu-content">
              <h3 className="cgu-title">Conditions Générales d'Utilisation</h3>
              <p className="cgu-date">Dernière mise à jour : juin 2026</p>
              {CGU_SECTIONS.map((s, i) => (
                <div key={i} className="cgu-section">
                  <h4>{s.title}</h4>
                  <p>{s.content}</p>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
