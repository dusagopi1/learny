import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'

export default function StudentBookReader() {
  const { slug } = useParams()

  const bookUrl = useMemo(() => {
    if (!slug) return ''
    return `https://openstax.org/details/books/${encodeURIComponent(slug)}`
  }, [slug])

  if (!slug) {
    return (
      <div className="student-main-content">
        <p className="content-placeholder">No book selected.</p>
        <Link to="/student/learnings">Back to Learnings</Link>
      </div>
    )
  }

  return (
    <div className="student-main-content" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="welcome-banner" style={{ marginBottom: 8 }}>
        <h2 className="gradient-text">OpenStax Reader</h2>
        <p>Viewing: {slug}</p>
        <div style={{ marginTop: 8, display: 'flex', gap: 12 }}>
          <Link to="/student/learnings">Back</Link>
          <a href={bookUrl} target="_blank" rel="noreferrer">Open on OpenStax</a>
        </div>
      </div>
      <div style={{ flex: 1, border: '1px solid var(--border-color, #e5e7eb)' }}>
        <iframe
          title="OpenStax Book"
          src={bookUrl}
          style={{ width: '100%', height: '100%', border: '0' }}
        />
      </div>
    </div>
  )
}


