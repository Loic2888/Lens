import { verifyToken } from '../services/auth.js'

export function requireAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  try {
    req.user = verifyToken(header.slice(7))
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function optionalAuth(req, res, next) {
  const header = req.headers.authorization
  req.user = null
  if (header?.startsWith('Bearer ')) {
    try { req.user = verifyToken(header.slice(7)) } catch {}
  }
  next()
}
