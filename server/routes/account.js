import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { pool } from '../db/index.js'
import { requireAuth } from '../middleware/requireAuth.js'

export const accountRouter = Router()

accountRouter.put('/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'Mot de passe actuel et nouveau mot de passe requis (8 caractères min)' })
  }
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.userId])
    if (!rows.length) return res.status(404).json({ error: 'Utilisateur introuvable' })
    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash)
    if (!valid) return res.status(401).json({ error: 'Mot de passe actuel incorrect' })
    const hash = await bcrypt.hash(newPassword, 12)
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.userId])
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

accountRouter.put('/email', requireAuth, async (req, res) => {
  const { currentEmail, newEmail } = req.body
  if (!currentEmail || !newEmail) {
    return res.status(400).json({ error: 'E-mail actuel et nouvel e-mail requis' })
  }
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.userId])
    if (!rows.length) return res.status(404).json({ error: 'Utilisateur introuvable' })
    if (rows[0].email !== currentEmail.toLowerCase().trim()) {
      return res.status(401).json({ error: 'E-mail actuel incorrect' })
    }
    const email = newEmail.toLowerCase().trim()
    await pool.query('UPDATE users SET email = $1 WHERE id = $2', [email, req.user.userId])
    const token = jwt.sign({ userId: req.user.userId, email }, process.env.JWT_SECRET, { expiresIn: '7d' })
    res.json({ token, email })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Cet e-mail est déjà utilisé' })
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

accountRouter.delete('/account', requireAuth, async (req, res) => {
  const { password } = req.body
  if (!password) return res.status(400).json({ error: 'Mot de passe requis pour confirmer la suppression' })
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.userId])
    if (!rows.length) return res.status(404).json({ error: 'Utilisateur introuvable' })
    const valid = await bcrypt.compare(password, rows[0].password_hash)
    if (!valid) return res.status(401).json({ error: 'Mot de passe incorrect' })
    await pool.query('DELETE FROM users WHERE id = $1', [req.user.userId])
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})
