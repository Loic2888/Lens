import { Router } from 'express'
import { generatePdf } from '../services/pdfGenerator.js'

export const reportRouter = Router()

reportRouter.post('/generate', async (req, res) => {
  const { result } = req.body

  if (!result || typeof result !== 'object') {
    return res.status(400).json({ error: 'result requis' })
  }

  // Validate minimum required shape before passing to PDF generator
  if (!result.company || typeof result.company.domain !== 'string') {
    return res.status(400).json({ error: 'result.company.domain requis' })
  }

  // Sanitize domain for filename — keep only safe characters
  const domain = result.company.domain.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 100)
  const filename = `${domain}-analyse.pdf`

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

  try {
    const doc = generatePdf(result)
    doc.pipe(res)
    doc.end()
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: 'Génération PDF échouée' })
    }
  }
})
