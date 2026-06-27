import { Router } from 'express'
import { register, login } from '../services/auth.js'

export const authRouter = Router()

authRouter.post('/register', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password || password.length < 8) {
    return res.status(400).json({ error: 'Email and password (min 8 characters) required' })
  }
  try {
    await register(email, password)
    const result = await login(email, password)
    res.json(result)
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already registered' })
    }
    res.status(500).json({ error: 'Registration failed' })
  }
})

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' })
  }
  try {
    const result = await login(email, password)
    res.json(result)
  } catch {
    res.status(401).json({ error: 'Invalid credentials' })
  }
})
