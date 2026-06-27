const BASE = import.meta.env.VITE_API_URL || ''

function getToken() {
  return localStorage.getItem('token')
}

function authHeaders() {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(options.headers || {}) }
  })
  if (res.status === 401) {
    if (getToken()) {
      // Token présent mais rejeté = session expirée → déconnexion
      localStorage.removeItem('token')
      window.location.reload()
      return
    }
    // Pas de token = mauvais identifiants → laisser l'erreur remonter normalement
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

export function isAuthenticated() {
  return !!getToken()
}

export function getEmail() {
  const t = getToken()
  if (!t) return null
  try {
    return JSON.parse(atob(t.split('.')[1])).email
  } catch {
    return null
  }
}

export async function login(email, password) {
  const data = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  })
  localStorage.setItem('token', data.token)
  return data
}

export async function register(email, password) {
  const data = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  })
  localStorage.setItem('token', data.token)
  return data
}

export function logout() {
  localStorage.removeItem('token')
}

export async function analyzeUrl(url, weights) {
  return request('/api/analyze', {
    method: 'POST',
    body: JSON.stringify({ url, weights })
  })
}

export async function getHistory(page = 1) {
  return request(`/api/history?page=${page}`)
}

export async function getAnalysis(id) {
  return request(`/api/history/${id}`)
}

export async function deleteAnalysis(id) {
  return request(`/api/history/${id}`, { method: 'DELETE' })
}

export async function startBatch(urls, weights) {
  return request('/api/batch', {
    method: 'POST',
    body: JSON.stringify({ urls, weights })
  })
}

export async function getBatchJob(id) {
  return request(`/api/batch/${id}`)
}

export async function downloadPdf(result) {
  const res = await fetch(`${BASE}/api/report/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ result })
  })
  if (!res.ok) throw new Error('PDF generation failed')

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${result.company?.domain || 'report'}-analysis.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

export async function changePassword(currentPassword, newPassword) {
  return request('/api/account/password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword })
  })
}

export async function changeEmail(currentEmail, newEmail) {
  const data = await request('/api/account/email', {
    method: 'PUT',
    body: JSON.stringify({ currentEmail, newEmail })
  })
  localStorage.setItem('token', data.token)
  return data
}

export async function deleteAccount(password) {
  await request('/api/account/account', {
    method: 'DELETE',
    body: JSON.stringify({ password })
  })
  localStorage.removeItem('token')
}

export function downloadJson(result) {
  const name = result.company?.domain || 'report'
  const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${name}-analysis.json`
  a.click()
  URL.revokeObjectURL(url)
}
