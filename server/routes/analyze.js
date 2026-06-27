import { Router } from 'express'
import { normalizeUrl, validateUrl } from '../utils/urlHelper.js'
import { scrape } from '../services/scraper.js'
import { analyze, getActiveModel } from '../services/analyzer.js'
import { score } from '../services/scorer.js'
import { logger } from '../utils/logger.js'
import { optionalAuth } from '../middleware/requireAuth.js'
import { pool } from '../db/index.js'

export const analyzeRouter = Router()

analyzeRouter.post('/analyze', optionalAuth, async (req, res) => {
  const { url, weights } = req.body

  if (!url || typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ error: 'Invalid or unreachable URL' })
  }

  let normalized
  try {
    normalized = normalizeUrl(url)
    validateUrl(normalized)
  } catch (err) {
    return res.status(400).json({ error: err.detail || 'Invalid URL' })
  }

  const domain = new URL(normalized).hostname

  try {
    logger.info('Starting analysis', { domain })

    const rawSignals = await scrape(url)
    const analysis = await analyze(rawSignals, domain)
    const scoreResult = score(analysis, weights)

    const result = {
      company: {
        name: analysis.company?.name ?? null,
        domain,
        description: analysis.company?.description ?? null,
        sector: analysis.company?.sector ?? null,
        business_model: analysis.company?.business_model ?? null,
        estimated_size: analysis.company?.estimated_size ?? null,
        founded_signal: analysis.company?.founded_signal ?? null,
        hq_signal: analysis.company?.hq_signal ?? null
      },
      tech_stack: analysis.tech_stack ?? { frontend: [], analytics: [], marketing: [], infrastructure: [], detected_via: null },
      gtm_signals: analysis.gtm_signals ?? {},
      score: {
        value: scoreResult.value,
        label: scoreResult.label,
        rationale: analysis.score?.rationale ?? null,
        signals_positive: scoreResult.signals_positive,
        signals_negative: scoreResult.signals_negative
      },
      meta: {
        scraped_at: new Date().toISOString(),
        scrape_method: 'direct_fetch',
        analysis_model: getActiveModel()
      }
    }

    let analysisId = null
    if (req.user) {
      const { rows } = await pool.query(
        'INSERT INTO analyses (user_id, domain, url, result) VALUES ($1, $2, $3, $4) RETURNING id',
        [req.user.userId, domain, normalized, JSON.stringify(result)]
      )
      analysisId = rows[0].id
    }

    logger.info('Analysis complete', { domain, score: scoreResult.value })
    res.json({ ...result, id: analysisId })
  } catch (err) {
    logger.error('Analysis pipeline failed', { domain, code: err.code, detail: err.detail })

    if (err.code === 'SCRAPE_FAILED') {
      return res.status(400).json({ error: 'Invalid or unreachable URL' })
    }

    const isOverloaded = err.detail && (err.detail.includes('503') || err.detail.includes('high demand') || err.detail.includes('overloaded'))
    res.status(500).json({
      error: isOverloaded
        ? 'The AI model is temporarily overloaded. Please try again in a few seconds.'
        : 'Analysis failed'
    })
  }
})
