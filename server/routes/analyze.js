/**
 * server/routes/analyze.js
 *
 * Defines the POST /api/analyze route — the single entry point for the full
 * analysis pipeline. Input validation and URL normalization happen here; all
 * business logic is delegated to the service layer. Error codes produced by
 * services are mapped to appropriate HTTP status codes before responding so
 * stack traces never leak to callers in production.
 */
import { Router } from 'express'
import { normalizeUrl, validateUrl } from '../utils/urlHelper.js'
import { scrape } from '../services/scraper.js'
import { analyze } from '../services/analyzer.js'
import { score } from '../services/scorer.js'
import { logger } from '../utils/logger.js'

export const analyzeRouter = Router()

/**
 * POST /api/analyze
 *
 * Accepts a JSON body with a "url" string, runs it through the scraper,
 * Claude analyzer, and deterministic scorer in sequence, then returns the
 * assembled intelligence object. Responds 400 if the URL is missing or the
 * target site is unreachable, and 500 for unexpected pipeline failures.
 */
analyzeRouter.post('/analyze', async (req, res) => {
  const { url } = req.body

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
    const scoreResult = score(analysis)

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
      tech_stack: analysis.tech_stack ?? {
        frontend: [],
        analytics: [],
        marketing: [],
        infrastructure: [],
        detected_via: null
      },
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
        analysis_model: 'gemini-2.5-flash'
      }
    }

    logger.info('Analysis complete', { domain, score: scoreResult.value })
    res.json(result)
  } catch (err) {
    logger.error('Analysis pipeline failed', { domain, code: err.code, detail: err.detail })

    if (err.code === 'SCRAPE_FAILED') {
      return res.status(400).json({ error: 'Invalid or unreachable URL', detail: process.env.NODE_ENV !== 'production' ? err.detail : undefined })
    }

    res.status(500).json({ error: 'Analysis failed', detail: process.env.NODE_ENV !== 'production' ? err.detail : undefined })
  }
})
