import { useEffect, useMemo, useState } from 'react'

export default function StudentLearnings() {
  const [subject, setSubject] = useState('')
  const [selectedGrade, setSelectedGrade] = useState('')
  const [videoMap, setVideoMap] = useState(null)
  const [activeEmbedUrl, setActiveEmbedUrl] = useState('')

  const subjects = [
    { value: 'physics', label: 'Physics' },
    { value: 'chemistry', label: 'Chemistry' },
    { value: 'biology', label: 'Biology' },
    { value: 'algebra', label: 'Algebra' },
    { value: 'calculus', label: 'Calculus' },
    { value: 'statistics', label: 'Statistics' },
    { value: 'precalculus', label: 'Precalculus' },
    { value: 'astronomy', label: 'Astronomy' },
    { value: 'geology', label: 'Geology' },
    { value: 'anatomy', label: 'Anatomy & Physiology' },
  ]

  const grades = Array.from({ length: 12 }, (_, i) => String(i + 1))

  useEffect(() => {
    let cancelled = false
    async function loadMap() {
      try {
        const res = await fetch('/videos-map.json')
        const json = await res.json()
        if (!cancelled) setVideoMap(json)
      } catch (e) {
        console.error('Failed to load videos-map.json', e)
      }
    }
    loadMap()
    return () => { cancelled = true }
  }, [])

  const chapters = useMemo(() => {
    if (!videoMap || !selectedGrade || !subject) return []
    const gradeMap = videoMap[selectedGrade]
    if (!gradeMap) return []
    const subjKey = subject.toLowerCase()
    const list = gradeMap[subjKey]
    if (!Array.isArray(list)) return []
    return list
  }, [videoMap, selectedGrade, subject])

  return (
    <div className="student-main-content fade-in">
      <div className="welcome-banner">
        <h2 className="gradient-text">Learnings</h2>
        <p>Select your Class (grade) and Subject to view chapters and videos.</p>
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <label htmlFor="gradeSelect">Class:</label>
          <select id="gradeSelect" value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)}>
            <option value="">-- Choose class --</option>
            {grades.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <label htmlFor="subjectSelect">Subject:</label>
          <select
            id="subjectSelect"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          >
            <option value="">-- Choose a subject --</option>
            {subjects.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {!selectedGrade || !subject ? (
        <p className="content-placeholder">Select both Class and Subject to continue.</p>
      ) : (
        <div className="enrolled-classes-grid">
          {chapters.map((item) => (
            <div key={item.chapter} className="student-dashboard-card">
              <div>
                <h2>{item.chapter}</h2>
                <div className="class-teacher-info">
                  <span>Class {selectedGrade} • {subject}</span>
                </div>
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 12 }}>
                <button className="icon-btn" onClick={() => setActiveEmbedUrl(item.embedUrl)}>Play</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeEmbedUrl && (
        <div className="modal-overlay fade-in" onClick={() => setActiveEmbedUrl('')}>
          <div className="video-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Video</h3>
              <button className="close-button" onClick={() => setActiveEmbedUrl('')}>×</button>
            </div>
            <div className="modal-content" style={{ padding: 0 }}>
              <div style={{ position: 'relative', paddingTop: '56.25%' }}>
                <iframe
                  src={activeEmbedUrl}
                  title="Provider Video"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


