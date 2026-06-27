import { useState, useRef } from 'react'
import { startBatch, getBatchJob } from '../api.js'
import ScoreGauge from './ScoreGauge.jsx'

export default function BulkUpload({ weights }) {
  const [urls, setUrls] = useState('')
  const [job, setJob] = useState(null)
  const [results, setResults] = useState([])
  const [error, setError] = useState('')
  const pollRef = useRef(null)

  async function handleStart() {
    const list = urls.split('\n').map(s => s.trim()).filter(Boolean)
    if (!list.length) return setError('Collez au moins une URL')
    if (list.length > 50) return setError('50 URLs maximum')
    setError('')
    setResults([])

    try {
      const { jobId } = await startBatch(list, weights)
      setJob({ id: jobId, total: list.length, processed: 0, status: 'running' })

      pollRef.current = setInterval(async () => {
        const data = await getBatchJob(jobId)
        setJob(data)
        setResults(data.results || [])
        if (data.status === 'completed') {
          clearInterval(pollRef.current)
        }
      }, 1500)
    } catch (err) {
      setError(err.message)
    }
  }

  function handleReset() {
    clearInterval(pollRef.current)
    setJob(null)
    setResults([])
    setUrls('')
    setError('')
  }

  function exportCsv() {
    const rows = [['URL', 'Company', 'Score', 'Label', 'Business Model', 'Sector', 'Error']]
    results.forEach(r => {
      rows.push([
        r.url,
        r.result?.company?.name || '',
        r.result?.score?.value ?? '',
        r.result?.score?.label || '',
        r.result?.company?.business_model || '',
        r.result?.company?.sector || '',
        r.error || ''
      ])
    })
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'batch-analysis.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const isDone = job?.status === 'completed'

  return (
    <div className="bulk-panel">
      {!job ? (
        <>
          <p className="bulk-hint">Collez une URL par ligne (50 max). Les résultats sont sauvegardés dans votre historique.</p>
          <textarea
            className="bulk-textarea"
            placeholder={"stripe.com\nhubspot.com\nnotion.so"}
            value={urls}
            onChange={e => setUrls(e.target.value)}
            rows={8}
          />
          {error && <p className="form-error">{error}</p>}
          <button className="analyze-btn" onClick={handleStart}>Lancer l'analyse multiple</button>
        </>
      ) : (
        <>
          <div className="bulk-progress-bar-wrap">
            <div
              className="bulk-progress-bar"
              style={{ width: `${Math.round(((job.processed || 0) / job.total) * 100)}%` }}
            />
          </div>
          <p className="bulk-status">
            {isDone
              ? `Terminé — ${job.total} URLs analysées`
              : `Analyse en cours… ${job.processed || 0} / ${job.total}`}
          </p>

          <div className="bulk-results">
            {results.map((r, i) => (
              <div key={i} className={`bulk-result-row ${r.error ? 'bulk-result-error' : ''}`}>
                <div className="bulk-result-header">
                  <span className="bulk-result-domain">{r.result?.company?.domain || r.url}</span>
                  {r.result?.score && (
                    <span className={`history-score score-${scoreClass(r.result.score.value)}`}>
                      {r.result.score.value} — {r.result.score.label}
                    </span>
                  )}
                  {r.error && <span className="bulk-error-msg">{r.error}</span>}
                </div>
                {r.result?.company?.description && (
                  <p className="bulk-result-desc">{r.result.company.description}</p>
                )}
              </div>
            ))}
          </div>

          <div className="bulk-actions">
            {isDone && (
              <button className="action-btn" onClick={exportCsv}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Exporter CSV
              </button>
            )}
            <button className="action-btn" onClick={handleReset}>Nouvelle analyse</button>
          </div>
        </>
      )}
    </div>
  )
}

function scoreClass(value) {
  if (!value && value !== 0) return 'none'
  if (value <= 30) return 'weak'
  if (value <= 55) return 'moderate'
  if (value <= 75) return 'good'
  return 'strong'
}
