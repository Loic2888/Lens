import { useEffect, useState } from 'react'
import { getHistory, deleteAnalysis } from '../api.js'

export default function HistoryPanel({ onLoad }) {
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getHistory(page)
      .then(data => {
        setItems(data.items)
        setTotalPages(data.totalPages)
        setTotal(data.total)
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [page])

  async function handleDelete(e, id) {
    e.stopPropagation()
    await deleteAnalysis(id)
    // Re-fetch current page; if it becomes empty go back one page
    const data = await getHistory(page).catch(() => null)
    if (data) {
      if (data.items.length === 0 && page > 1) {
        setPage(p => p - 1)
      } else {
        setItems(data.items)
        setTotalPages(data.totalPages)
        setTotal(data.total)
      }
    }
  }

  if (loading) return <div className="history-empty">Chargement de l'historique…</div>

  if (!items.length && page === 1) return (
    <div className="history-empty">
      <p>Aucune analyse pour l'instant.</p>
      <p className="history-hint">Les entreprises analysées apparaîtront ici une fois connecté.</p>
    </div>
  )

  return (
    <div className="history-panel">
      <div className="history-meta-bar">
        <span className="history-total">{total} analyse{total > 1 ? 's' : ''}</span>
      </div>

      <div className="history-list">
        {items.map(row => {
          const score = row.score
          const label = score?.label || '—'
          const value = score?.value ?? '—'
          const date = new Date(row.created_at).toLocaleDateString('fr-FR', {
            day: '2-digit', month: 'short', year: 'numeric'
          })

          return (
            <div key={row.id} className="history-row" onClick={() => onLoad(row.id)} role="button" tabIndex={0}>
              <div className="history-domain">{row.domain}</div>
              <div className="history-meta">
                <span className={`history-score score-${scoreClass(score?.value)}`}>{value} — {label}</span>
                <span className="history-date">{date}</span>
              </div>
              <button
                className="history-delete"
                onClick={e => handleDelete(e, row.id)}
                title="Supprimer"
              >×</button>
            </div>
          )
        })}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-btn"
            onClick={() => setPage(p => p - 1)}
            disabled={page === 1}
          >‹</button>

          {buildPages(page, totalPages).map((p, i) =>
            p === '…' ? (
              <span key={`ellipsis-${i}`} className="page-ellipsis">…</span>
            ) : (
              <button
                key={p}
                className={`page-btn ${p === page ? 'active' : ''}`}
                onClick={() => setPage(p)}
              >{p}</button>
            )
          )}

          <button
            className="page-btn"
            onClick={() => setPage(p => p + 1)}
            disabled={page === totalPages}
          >›</button>
        </div>
      )}
    </div>
  )
}

function buildPages(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages = []
  pages.push(1)
  if (current > 3) pages.push('…')
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p)
  }
  if (current < total - 2) pages.push('…')
  pages.push(total)
  return pages
}

function scoreClass(value) {
  if (!value && value !== 0) return 'none'
  if (value <= 30) return 'weak'
  if (value <= 55) return 'moderate'
  if (value <= 75) return 'good'
  return 'strong'
}
