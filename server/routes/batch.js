import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import { pool } from '../db/index.js'
import { normalizeUrl, validateUrl } from '../utils/urlHelper.js'
import { scrape } from '../services/scraper.js'
import { analyze } from '../services/analyzer.js'
import { score } from '../services/scorer.js'
import { logger } from '../utils/logger.js'
import { getActiveModel } from '../services/analyzer.js'

export const batchRouter = Router()

batchRouter.post('/', requireAuth, async (req, res) => {
  const { urls, weights } = req.body
  if (!Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: 'urls array required' })
  }
  if (urls.length > 50) {
    return res.status(400).json({ error: 'Maximum 50 URLs per batch' })
  }

  const { rows } = await pool.query(
    'INSERT INTO batch_jobs (user_id, total) VALUES ($1, $2) RETURNING id',
    [req.user.userId, urls.length]
  )
  const jobId = rows[0].id

  processBatch(jobId, req.user.userId, urls, weights).catch(async err => {
    logger.error('Batch job failed', { jobId, detail: err.message })
    await pool.query("UPDATE batch_jobs SET status = 'failed' WHERE id = $1", [jobId])
  })

  res.json({ jobId })
})

batchRouter.get('/:id', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, status, total, processed, results, created_at, completed_at FROM batch_jobs WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.userId]
  )
  if (!rows.length) return res.status(404).json({ error: 'Not found' })
  res.json(rows[0])
})

async function processBatch(jobId, userId, urls, weights) {
  const results = []

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i].trim()
    let result = null
    let error = null

    try {
      const normalized = normalizeUrl(url)
      validateUrl(normalized)
      const domain = new URL(normalized).hostname

      const rawSignals = await scrape(url)
      const analysis = await analyze(rawSignals, domain)
      const scoreResult = score(analysis, weights)

      result = {
        company: { name: analysis.company?.name ?? null, domain, ...analysis.company },
        tech_stack: analysis.tech_stack ?? {},
        gtm_signals: analysis.gtm_signals ?? {},
        score: {
          value: scoreResult.value,
          label: scoreResult.label,
          rationale: analysis.score?.rationale ?? null,
          signals_positive: scoreResult.signals_positive,
          signals_negative: scoreResult.signals_negative
        },
        meta: { scraped_at: new Date().toISOString(), analysis_model: getActiveModel() }
      }

      await pool.query(
        'INSERT INTO analyses (user_id, domain, url, result) VALUES ($1, $2, $3, $4)',
        [userId, domain, normalized, JSON.stringify(result)]
      )
    } catch (err) {
      error = err.detail || err.message || 'Analysis failed'
    }

    results.push({ url, result, error })

    await pool.query(
      'UPDATE batch_jobs SET processed = $1, results = $2 WHERE id = $3',
      [i + 1, JSON.stringify(results), jobId]
    )

    if (i < urls.length - 1) {
      await new Promise(r => setTimeout(r, 800))
    }
  }

  await pool.query(
    "UPDATE batch_jobs SET status = 'completed', completed_at = NOW() WHERE id = $1",
    [jobId]
  )
}
