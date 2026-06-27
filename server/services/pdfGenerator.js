import PDFDocument from 'pdfkit'

const C = {
  accent: '#cc532b',
  primary: '#231312',
  muted: '#745452',
  light: '#999999',
  border: '#deddce',
  white: '#ffffff',
  red: '#ea384c',
  orange: '#de6f4a',
  blue: '#2d40ea'
}

function scoreColor(value) {
  if (value <= 30) return C.red
  if (value <= 55) return C.orange
  if (value <= 75) return C.blue
  return C.accent
}

const GTM_LABELS = {
  has_pricing_page: 'Page de tarifs',
  has_careers_page: 'Page carrières',
  blog_active: 'Blog actif',
  product_led: 'Croissance produit',
  free_trial_or_freemium: 'Essai gratuit / Freemium',
  demo_cta: 'Démo CTA',
  multilingual: 'Multilingue',
  integrations_page: 'Page intégrations'
}

function sectionTitle(doc, title) {
  doc.moveDown(0.5)
  doc.fillColor(C.muted).fontSize(8).font('Helvetica-Bold')
     .text(title.toUpperCase(), { characterSpacing: 1 })
  const y = doc.y
  doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor(C.border).lineWidth(0.5).stroke()
  doc.moveDown(0.5)
}

function field(doc, label, value) {
  if (!value) return
  doc.fillColor(C.light).fontSize(8).font('Helvetica-Bold')
     .text(`${label.toUpperCase()}   `, { continued: true })
  doc.fillColor(C.primary).fontSize(9).font('Helvetica').text(String(value))
}

function techRow(doc, label, items) {
  if (!items?.length) return
  field(doc, label, items.join(', '))
}

export function generatePdf(result) {
  const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true })
  const { company, tech_stack, gtm_signals, score, meta } = result

  // ── En-tête ──
  doc.rect(0, 0, doc.page.width, 75).fill(C.accent)
  doc.fillColor(C.white).fontSize(20).font('Helvetica-Bold')
     .text('Web Analyser', 50, 22)
  doc.fontSize(10).font('Helvetica')
     .text(`Rapport d'intelligence B2B  ·  ${company?.domain || ''}`, 50, 48)

  doc.y = 95

  // ── Cercle de score ──
  const color = scoreColor(score?.value ?? 0)
  const cx = doc.page.width - 95
  const cy = 130

  doc.circle(cx, cy, 38).lineWidth(5).strokeColor(color).stroke()
  doc.fillColor(color).fontSize(26).font('Helvetica-Bold')
     .text(String(score?.value ?? 0), cx - 18, cy - 18, { width: 36, align: 'center', lineBreak: false })
  doc.fontSize(7).font('Helvetica')
     .text((score?.label || '').toUpperCase(), cx - 28, cy + 12, { width: 56, align: 'center', lineBreak: false })

  // ── Identité de l'entreprise ──
  sectionTitle(doc, "Identité de l'entreprise")
  field(doc, 'Nom', company?.name)
  field(doc, 'Domaine', company?.domain)
  field(doc, 'Secteur', company?.sector)
  field(doc, 'Modèle commercial', company?.business_model)
  field(doc, 'Taille estimée', company?.estimated_size)
  field(doc, 'Fondation', company?.founded_signal)
  field(doc, 'Siège', company?.hq_signal)
  if (company?.description) field(doc, 'Description', company.description)

  // ── Stack technique ──
  sectionTitle(doc, 'Stack technique')
  techRow(doc, 'Frontend', tech_stack?.frontend)
  techRow(doc, 'Analytics', tech_stack?.analytics)
  techRow(doc, 'Marketing', tech_stack?.marketing)
  techRow(doc, 'Infrastructure', tech_stack?.infrastructure)
  if (tech_stack?.detected_via) {
    doc.fillColor(C.light).fontSize(8).font('Helvetica')
       .text(`Détecté via : ${tech_stack.detected_via}`)
  }

  // ── Signaux GTM ──
  sectionTitle(doc, 'Signaux GTM')
  let px = 50
  let py = doc.y
  const pillH = 16

  Object.entries(GTM_LABELS).forEach(([key, label]) => {
    const active = !!gtm_signals?.[key]
    const tw = doc.widthOfString(label, { fontSize: 8 })
    const pw = tw + 18

    if (px + pw > doc.page.width - 50) {
      px = 50
      py += pillH + 5
    }

    doc.roundedRect(px, py, pw, pillH, 4)
       .fill(active ? C.accent : '#f0ede8')
    doc.fillColor(active ? C.white : C.light)
       .fontSize(8).font('Helvetica')
       .text(label, px + 9, py + 4, { lineBreak: false })

    px += pw + 5
  })

  doc.y = py + pillH + 12

  // ── Analyse ──
  if (score?.rationale) {
    sectionTitle(doc, 'Analyse')
    doc.fillColor(C.muted).fontSize(9).font('Helvetica')
       .text(score.rationale, { lineGap: 2 })
    doc.moveDown(0.5)
  }

  // ── Signaux ──
  if (score?.signals_positive?.length || score?.signals_negative?.length) {
    sectionTitle(doc, 'Signaux')
    const colW = (doc.page.width - 100) / 2

    const startY = doc.y
    let leftY = startY
    let rightY = startY

    if (score.signals_positive?.length) {
      doc.fillColor(C.primary).fontSize(8).font('Helvetica-Bold').text('Signaux positifs', 50, leftY)
      leftY += 13
      score.signals_positive.forEach(s => {
        doc.fillColor(C.primary).fontSize(8).font('Helvetica')
           .text(`✓  ${s}`, 50, leftY, { width: colW - 10 })
        leftY += 12
      })
    }

    if (score.signals_negative?.length) {
      doc.fillColor(C.primary).fontSize(8).font('Helvetica-Bold').text('Points de vigilance', 50 + colW, startY)
      rightY = startY + 13
      score.signals_negative.forEach(s => {
        doc.fillColor(C.muted).fontSize(8).font('Helvetica')
           .text(`⚠  ${s}`, 50 + colW, rightY, { width: colW - 10 })
        rightY += 12
      })
    }

    doc.y = Math.max(leftY, rightY) + 10
  }

  // ── Pied de page ──
  const date = meta?.scraped_at
    ? new Date(meta.scraped_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  const model = meta?.analysis_model || 'IA'
  const pageBottom = doc.page.height - 30
  doc.fillColor(C.light).fontSize(7).font('Helvetica')
     .text(`Généré le ${date}  ·  Web Analyser  ·  Propulsé par ${model}`, 50, pageBottom, {
       align: 'center',
       width: doc.page.width - 100
     })

  return doc
}
