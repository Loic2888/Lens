import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import { pool } from '../db/index.js'

export const historyRouter = Router()

const PAGE_SIZE = 50

historyRouter.get('/', requireAuth, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const offset = (page - 1) * PAGE_SIZE

  const [listResult, countResult] = await Promise.all([
    pool.query(
      `SELECT id, domain, url, result->'score' AS score, created_at
       FROM analyses WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.userId, PAGE_SIZE, offset]
    ),
    pool.query(
      'SELECT COUNT(*)::int AS total FROM analyses WHERE user_id = $1',
      [req.user.userId]
    )
  ])

  const total = countResult.rows[0].total
  res.json({
    items: listResult.rows,
    page,
    totalPages: Math.ceil(total / PAGE_SIZE) || 1,
    total
  })
})

historyRouter.get('/:id', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, domain, url, result, created_at FROM analyses WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.userId]
  )
  if (!rows.length) return res.status(404).json({ error: 'Not found' })
  res.json({ ...rows[0].result, id: rows[0].id })
})

historyRouter.delete('/:id', requireAuth, async (req, res) => {
  await pool.query(
    'DELETE FROM analyses WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.userId]
  )
  res.json({ ok: true })
})
