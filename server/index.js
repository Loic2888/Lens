/**
 * server/index.js
 *
 * Entry point for the Konsole Analyzer Express server. Loads environment
 * variables from .env, configures CORS to allow only the origins listed in
 * ALLOWED_ORIGINS, mounts the analysis router under /api, and starts
 * listening on the configured port (defaults to 3001).
 */
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { analyzeRouter } from './routes/analyze.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*'
}))
app.use(express.json())
app.use('/api', analyzeRouter)

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
