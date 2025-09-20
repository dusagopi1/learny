import { useEffect, useMemo, useRef, useState } from 'react'
import { marked } from 'marked'
import { searchTopEmbeddableVideoId } from '../../utils/youtubeApi'
import { generateContentWithGemini, askAboutDocument } from '../../utils/geminiApi'
import { auth, db } from '../../firebase-config'
import { doc, getDoc } from 'firebase/firestore'
import { useToast } from '../../components/Toast'

export default function StudentAISuggestion() {
  const [selectedGrade, setSelectedGrade] = useState('')
  const [subject, setSubject] = useState('')
  const [chapter, setChapter] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('English')

  const { showToast } = useToast()
  const [userPoints, setUserPoints] = useState(0)
  const [notesUnlockedNotified, setNotesUnlockedNotified] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('aiNotesUnlockedNotified') === 'true'
    return false
  })
  const NOTES_UNLOCK_POINTS = 200

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const snap = await getDoc(doc(db, 'users', user.uid))
          if (snap.exists()) {
            setUserPoints(Number(snap.data().totalPoints || 0))
          } else {
            setUserPoints(0)
          }
        } catch {
          setUserPoints(0)
        }
      } else {
        setUserPoints(0)
      }
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (userPoints >= NOTES_UNLOCK_POINTS && !notesUnlockedNotified) {
      showToast('🎉 AI Notes unlocked! You can now generate PDF notes.', 'success', { duration: 5000 })
      setNotesUnlockedNotified(true)
      if (typeof window !== 'undefined') localStorage.setItem('aiNotesUnlockedNotified', 'true')
    }
  }, [userPoints, notesUnlockedNotified, showToast])

  const grades = Array.from({ length: 12 }, (_, i) => String(i + 1))
  const subjects = [
    { value: 'physics', label: 'Physics' },
    { value: 'chemistry', label: 'Chemistry' },
    { value: 'biology', label: 'Biology' },
    { value: 'math', label: 'Math' },
    { value: 'algebra', label: 'Algebra' },
    { value: 'calculus', label: 'Calculus' },
    { value: 'statistics', label: 'Statistics' },
    { value: 'computer science', label: 'Computer Science' },
  ]
  const languages = ['English', 'Hindi', 'Telugu', 'Odia', 'Tamil']

  const query = useMemo(() => {
    const parts = []
    if (selectedGrade) parts.push(`Class ${selectedGrade}`)
    if (subject) parts.push(subject)
    if (chapter) parts.push(chapter)
    if (selectedLanguage) parts.push(selectedLanguage)
    parts.push('HD lecture')
    return parts.join(' ')
  }, [selectedGrade, subject, chapter, selectedLanguage])

  const queryVariants = useMemo(() => {
    if (!selectedGrade || !subject || !chapter) return []
    const g = `Class ${selectedGrade}`
    const s = subject
    const c = chapter
    const lang = selectedLanguage || 'English'
    return [
      `${g} ${s} ${c} ${lang} HD lecture`,
      `${s} ${c} for ${g} in ${lang}`,
      `${c} ${s} ${g} ${lang} NCERT`,
      `${g} ${s} ${c} ${lang} CBSE`,
      `${g} ${s} ${c} ${lang} explained`,
    ]
  }, [selectedGrade, subject, chapter, selectedLanguage])

  const [variantIndex, setVariantIndex] = useState(0)
  const activeQuery = queryVariants[variantIndex] || query

  const [videoId, setVideoId] = useState('')
  const [error, setError] = useState('')
  const [notesLoading, setNotesLoading] = useState(false)
  const [qaQuestion, setQaQuestion] = useState('')
  const [qaLoading, setQaLoading] = useState(false)
  const [qaAnswer, setQaAnswer] = useState('')
  const [chatOpen, setChatOpen] = useState(false)
  const [messages, setMessages] = useState([]) // {role: 'user'|'ai', text}
  const chatEndRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      setError('')
      setVideoId('')
      if (!selectedGrade || !subject || !chapter) return
      try {
        const id = await searchTopEmbeddableVideoId(activeQuery)
        if (!cancelled) setVideoId(id)
      } catch (e) {
        if (e && e.message === 'YOUTUBE_API_KEY_MISSING') {
          if (!cancelled) setVideoId('')
        } else {
          console.warn('YouTube API error:', e)
          if (!cancelled) setError('No embeddable result found. Try Next suggestion or Open on YouTube.')
        }
      }
    }
    run()
    return () => { cancelled = true }
  }, [activeQuery, selectedGrade, subject, chapter])

  const embedSrc = useMemo(() => {
    if (!selectedGrade || !subject || !chapter) return ''
    if (videoId) return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`
    const q = encodeURIComponent(activeQuery)
    return `https://www.youtube-nocookie.com/embed?listType=search&list=${q}&rel=0&modestbranding=1`
  }, [selectedGrade, subject, chapter, activeQuery, videoId])

  const openOnYouTubeHref = useMemo(() => {
    if (!selectedGrade || !subject || !chapter) return ''
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(activeQuery)}`
  }, [activeQuery, selectedGrade, subject, chapter])

  const notesLocked = userPoints < NOTES_UNLOCK_POINTS

  return (
    <div className="student-main-content fade-in">
      <div className="welcome-banner">
        <h2 className="gradient-text">AI Video Suggestion</h2>
        <p>Select Class, Subject, Chapter and Language to watch the top suggested video.</p>
      </div>

      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
          <label htmlFor="gradeSelect">Class</label>
          <select id="gradeSelect" value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)}
            style={{
              padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-color, #e5e7eb)',
              background: 'var(--bg-elev, #fff)', color: 'var(--text-color, #333)', fontSize: 16,
              appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', cursor: 'pointer',
              minWidth: 120,
              outline: 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              '&:focus': { borderColor: 'var(--primary-color, #6d28d9)', boxShadow: '0 0 0 2px rgba(109, 40, 217, 0.2)' }
            }}
          >
            <option value="">-- Choose class --</option>
            {grades.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
          <label htmlFor="subjectSelect">Subject</label>
          <select id="subjectSelect" value={subject} onChange={(e) => setSubject(e.target.value)}
            style={{
              padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-color, #e5e7eb)',
              background: 'var(--bg-elev, #fff)', color: 'var(--text-color, #333)', fontSize: 16,
              appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', cursor: 'pointer',
              minWidth: 160,
              outline: 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              '&:focus': { borderColor: 'var(--primary-color, #6d28d9)', boxShadow: '0 0 0 2px rgba(109, 40, 217, 0.2)' }
            }}
          >
            <option value="">-- Choose subject --</option>
            {subjects.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, flexDirection: 'column', minWidth: 240 }}>
          <label htmlFor="chapterInput">Chapter / Topic</label>
          <input
            id="chapterInput"
            type="text"
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
            placeholder="e.g., Laws of Motion"
            style={{
              padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-color, #e5e7eb)',
              background: 'var(--bg-elev, #fff)', color: 'var(--text-color, #333)', fontSize: 16,
              outline: 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              '&:focus': { borderColor: 'var(--primary-color, #6d28d9)', boxShadow: '0 0 0 2px rgba(109, 40, 217, 0.2)' }
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
          <label htmlFor="languageSelect">Language</label>
          <select id="languageSelect" value={selectedLanguage} onChange={(e) => setSelectedLanguage(e.target.value)}
            style={{
              padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-color, #e5e7eb)',
              background: 'var(--bg-elev, #fff)', color: 'var(--text-color, #333)', fontSize: 16,
              appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', cursor: 'pointer',
              minWidth: 160,
              outline: 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              '&:focus': { borderColor: 'var(--primary-color, #6d28d9)', boxShadow: '0 0 0 2px rgba(109, 40, 217, 0.2)' }
            }}
          >
            {languages.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {!selectedGrade || !subject || !chapter ? (
        <p className="content-placeholder">Enter Class, Subject, Chapter and Language to get a suggestion.</p>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <p style={{ marginBottom: 8 }}>Suggested query: <strong>{activeQuery}</strong></p>
            <div style={{ display: 'flex', gap: 8 }}>
              {queryVariants.length > 1 && (
                <button className="btn secondary-btn" onClick={() => setVariantIndex((variantIndex + 1) % queryVariants.length)}>Next suggestion</button>
              )}
              <a className="btn secondary-btn-alt" href={openOnYouTubeHref} target="_blank" rel="noreferrer">Open on YouTube</a>
            </div>
          </div>
          <div
            style={chatOpen ? {
              position: 'fixed', left: 16, bottom: 16, width: 270, height: 180,
              border: '1px solid var(--border-color, #e5e7eb)', borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)', overflow: 'hidden', zIndex: 50,
              transition: 'all 240ms ease'
            } : {
              position: 'relative', paddingTop: '56.25%', border: '1px solid var(--border-color, #e5e7eb)',
              transition: 'all 240ms ease'
            }}
          >
            <iframe
              title="Suggested Video"
              src={embedSrc}
              style={chatOpen ? { width: '100%', height: '100%', border: 0 } : { position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          {error && <p className="content-placeholder" style={{ marginTop: 8 }}>{error}</p>}

          <div style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              disabled={notesLoading || notesLocked}
              onClick={async () => {
              try {
                setNotesLoading(true)
                const topic = `Class ${selectedGrade} ${subject} - ${chapter}`
                const prompt = `Create concise, student-friendly study notes for the topic: "${topic}". Structure with:
1) Key concepts and definitions
2) Step-by-step explanations or derivations (if applicable)
3) Worked example(s)
4) Common misconceptions
5) 5 quick practice questions with answers
Keep it within ~2 pages.`
                const notes = await generateContentWithGemini(prompt)
                let jsPDFLib
                try {
                  jsPDFLib = await import('jspdf')
                } catch (e) {
                  alert('PDF generator not available. Please run npm install to add jspdf.')
                  return
                }
                const { jsPDF } = jsPDFLib
                const docPdf = new jsPDF({ unit: 'pt', format: 'a4' })
                const left = 40, top = 60, maxWidth = 515
                docPdf.setFont('Times', 'bold')
                docPdf.setFontSize(16)
                docPdf.text(`AI Notes: ${topic}`.slice(0, 90), left, top)
                docPdf.setFont('Times', 'normal')
                docPdf.setFontSize(12)
                const rawLines = (notes || 'No content').split('\n')
                let y = top + 24
                const lineHeight = 16
                rawLines.forEach((raw) => {
                  const hasBoldMarkerAtStart = /^\s*\*\*/.test(raw)
                  const cleaned = raw.replace(/\*\*/g, '')
                  const wrapped = docPdf.splitTextToSize(cleaned, maxWidth)
                  wrapped.forEach((ln, idx) => {
                    if (y > 790) { docPdf.addPage(); y = 60 }
                    if (hasBoldMarkerAtStart && idx === 0) {
                      docPdf.setFont('Times', 'bold')
                    } else {
                      docPdf.setFont('Times', 'normal')
                    }
                    docPdf.text(ln, left, y)
                    y += lineHeight
                  })
                })
                const filename = `AI_Notes_Class${selectedGrade}_${subject}_${chapter}`.replace(/\s+/g, '_') + '.pdf'
                docPdf.save(filename)
              } finally {
                setNotesLoading(false)
              }
            }}
              className={`btn ${notesLocked ? 'secondary-btn' : 'primary-btn'} ${notesLocked ? 'disabled' : ''}`}
            >{notesLocked ? 'AI Notes (Locked - 200 coins)' : (notesLoading ? 'Generating…' : 'Generate AI Notes (PDF)')}</button>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Ask a question about this topic…"
                value={qaQuestion}
                onChange={(e) => setQaQuestion(e.target.value)}
                style={{
                  minWidth: 260,
                  padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-color, #e5e7eb)',
                  background: 'var(--bg-elev, #fff)', color: 'var(--text-color, #333)', fontSize: 16,
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  '&:focus': { borderColor: 'var(--primary-color, #6d28d9)', boxShadow: '0 0 0 2px rgba(109, 40, 217, 0.2)' }
                }}
              />
              <button disabled={!qaQuestion || qaLoading} onClick={async () => {
                setChatOpen(true)
                setQaLoading(true)
                setQaAnswer('')
                const userMsg = { role: 'user', text: qaQuestion }
                setMessages((m) => [...m, userMsg])
                try {
                  const topic = `Class ${selectedGrade} ${subject} - ${chapter}`
                  const sys = `You are a helpful tutor. Be concise and step-by-step. Topic context: ${topic}.`
                  const answer = await generateContentWithGemini(`${sys}\nQuestion: ${qaQuestion}`)
                  const aiMsg = { role: 'ai', text: answer }
                  setMessages((m) => [...m, aiMsg])
                } finally {
                  setQaLoading(false)
                  setQaQuestion('')
                  setTimeout(() => chatEndRef.current && chatEndRef.current.scrollIntoView({ behavior: 'smooth' }), 50)
                }
              }}
              className="btn primary-btn"
              >{qaLoading ? 'Answering…' : 'Ask AI'}</button>
            </div>
          </div>

          {chatOpen && (
            <div style={{
              marginTop: 12, border: '1px solid var(--border-color, #e5e7eb)', borderRadius: 8, overflow: 'hidden'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-elev, #fafafa)' }}>
                <strong>AI Tutor</strong>
                <button onClick={() => setChatOpen(false)} className="btn secondary-btn">Close</button>
              </div>
              <div style={{ maxHeight: 360, overflow: 'auto', padding: 12 }}>
                {messages.map((m, idx) => (
                   <div key={idx} style={{ marginBottom: 10 }}>
                     <div style={{ fontSize: 12, color: '#666' }}>{m.role === 'user' ? 'You' : 'AI'}</div>
                     <div
                       style={{ lineHeight: 1.6 }}
                       dangerouslySetInnerHTML={{ __html: marked.parse(m.text || '') }}
                     />
                   </div>
                 ))}
                 {qaLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                   <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 10 }}>
                     <img src="/assets/chatbot-icon.png" alt="AI Avatar" style={{ width: 24, height: 24, borderRadius: '50%', marginRight: 8, alignSelf: 'flex-start' }} />
                     <div style={{ maxWidth: '70%', padding: '8px 12px', borderRadius: 16, background: '#f5f5f5', color: '#333', fontSize: 14 }}>
                       AI is thinking...
                     </div>
                   </div>
                 )}
                 <div ref={chatEndRef} />
               </div>
               <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid var(--border-color, #e5e7eb)' }}>
                 <input
                   type="text"
                   placeholder="Type your message…"
                   value={qaQuestion}
                   onChange={(e) => setQaQuestion(e.target.value)}
                   onKeyDown={async (e) => {
                     if (e.key === 'Enter' && qaQuestion && !qaLoading) {
                       e.preventDefault()
                       const text = qaQuestion
                       setQaQuestion('')
                       setQaLoading(true)
                       setMessages((m) => [...m, { role: 'user', text }])
                       try {
                         const topic = `Class ${selectedGrade} ${subject} - ${chapter}`
                         const sys = `You are a helpful tutor. Be concise and step-by-step. Topic context: ${topic}.`
                         const answer = await generateContentWithGemini(`${sys}\nQuestion: ${text}`)
                         setMessages((m) => [...m, { role: 'ai', text: answer }])
                       } finally {
                         setQaLoading(false)
                         setTimeout(() => chatEndRef.current && chatEndRef.current.scrollIntoView({ behavior: 'smooth' }), 50)
                       }
                     }
                   }}
                   style={{
                     flex: 1,
                     padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-color, #e5e7eb)',
                     background: 'var(--bg-elev, #fff)', color: 'var(--text-color, #333)', fontSize: 16,
                     outline: 'none',
                     transition: 'border-color 0.2s, box-shadow 0.2s',
                     '&:focus': { borderColor: 'var(--primary-color, #6d28d9)', boxShadow: '0 0 0 2px rgba(109, 40, 217, 0.2)' }
                   }}
                 />
                 <button disabled={!qaQuestion || qaLoading} onClick={async () => {
                   const text = qaQuestion
                   setQaQuestion('')
                   setQaLoading(true)
                   setMessages((m) => [...m, { role: 'user', text }])
                   try {
                     const topic = `Class ${selectedGrade} ${subject} - ${chapter}`
                     const sys = `You are a helpful tutor. Be concise and step-by-step. Topic context: ${topic}.`
                     const answer = await generateContentWithGemini(`${sys}\nQuestion: ${text}`)
                     setMessages((m) => [...m, { role: 'ai', text: answer }])
                   } finally {
                     setQaLoading(false)
                     setTimeout(() => chatEndRef.current && chatEndRef.current.scrollIntoView({ behavior: 'smooth' }), 50)
                   }
                 }}
                   className="btn primary-btn"
                 >{qaLoading ? 'Sending…' : 'Send'}</button>
               </div>
             </div>
          )}
        </div>
      )}
    </div>
  )
}
    