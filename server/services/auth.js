import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { pool } from '../db/index.js'

const SALT_ROUNDS = 12

export async function register(email, password) {
  const hash = await bcrypt.hash(password, SALT_ROUNDS)
  const { rows } = await pool.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
    [email.toLowerCase().trim(), hash]
  )
  return rows[0]
}

export async function login(email, password) {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email.toLowerCase().trim()]
  )
  if (!rows.length) throw { code: 'AUTH_FAILED', detail: 'Invalid credentials' }

  const valid = await bcrypt.compare(password, rows[0].password_hash)
  if (!valid) throw { code: 'AUTH_FAILED', detail: 'Invalid credentials' }

  const token = jwt.sign(
    { userId: rows[0].id, email: rows[0].email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
  return { token, email: rows[0].email }
}

export function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET)
}
