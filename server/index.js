import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { migrate } from './db/migrate.js'
import { analyzeRouter } from './routes/analyze.js'
import { authRouter } from './routes/auth.js'
import { historyRouter } from './routes/history.js'
import { batchRouter } from './routes/batch.js'
import { reportRouter } from './routes/report.js'
import { accountRouter } from './routes/account.js'
import { logger } from './utils/logger.js'

const app = express()
const PORT = process.env.PORT || 3001

// Security headers
app.use(helmet())

// CORS — trim whitespace to avoid silent mismatches
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ?.split(',').map(s => s.trim()).filter(Boolean) || []

if (!allowedOrigins.length) {
  logger.warn('ALLOWED_ORIGINS not set — CORS open to all origins (dev only)')
}

app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : '*' }))

app.use(express.json({ limit: '2mb' }))

// Global rate limit: 120 requests per 15 min per IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes, réessayez dans quelques minutes.' }
}))

// Stricter limit on auth endpoints: 10 attempts per 15 min
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives de connexion, réessayez dans 15 minutes.' }
})

app.use('/api/auth', authLimiter, authRouter)
app.use('/api/history', historyRouter)
app.use('/api/batch', batchRouter)
app.use('/api/report', reportRouter)
app.use('/api/account', accountRouter)
app.use('/api', analyzeRouter)

await migrate()

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
