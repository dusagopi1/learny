import React, { useEffect, useMemo, useRef, useState } from 'react'
import { auth, db } from '../../firebase-config'
import { doc, getDoc, setDoc, updateDoc, onSnapshot, arrayUnion, arrayRemove } from 'firebase/firestore'
import { generateContentWithGemini } from '../../utils/geminiApi'
import { useToast } from '../../components/Toast'
import { FaCalendarAlt, FaCheckCircle, FaPlus, FaTrash, FaLightbulb } from 'react-icons/fa'
import { marked } from 'marked';

export default function StudentStudyPlanner() {
  const { showToast } = useToast()
  const [studentId, setStudentId] = useState(null)
  const [loading, setLoading] = useState(true)

  // Planner inputs
  const [exam, setExam] = useState('BIPS')
  const [language, setLanguage] = useState('English')
  const [timeframe, setTimeframe] = useState(8) // weeks
  const [hoursPerDay, setHoursPerDay] = useState(2)
  const [focusAreas, setFocusAreas] = useState('Math, Reasoning, English')

  // AI outputs
  const [isGenerating, setIsGenerating] = useState(false)
  const [planMd, setPlanMd] = useState('')

  // Todos
  const [newTodo, setNewTodo] = useState('')
  const [todos, setTodos] = useState([]) // {id, text, done}

  // Load user and existing planner data
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setStudentId(null)
        setTodos([])
        setPlanMd('')
        setLoading(false)
        return
      }
      setStudentId(user.uid)
      const userRef = doc(db, 'users', user.uid)
      const unsubUser = onSnapshot(userRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data()
          setTodos(Array.isArray(data.studyTodos) ? data.studyTodos : [])
          if (typeof data.studyPlan === 'string') setPlanMd(data.studyPlan)
        }
        setLoading(false)
      })
      return () => unsubUser()
    })
    return () => unsub()
  }, [])

  const savePlan = async (content) => {
    if (!studentId) return
    try {
      await setDoc(doc(db, 'users', studentId), { studyPlan: content }, { merge: true })
    } catch (e) {
      console.error(e)
    }
  }

  const generatePlan = async () => {
    if (!studentId) return showToast('Please login', 'error')
    if (!exam.trim()) return showToast('Enter an exam/goal', 'error')
    setIsGenerating(true)
    setPlanMd('')
    try {
      const prompt = `You are an expert mentor. Create a detailed, weekly study roadmap and a visual road map including the topics to focus on  for ${exam} in ${language}. Timeframe: ${timeframe} weeks, ${hoursPerDay} hour(s) per day. Focus areas: ${focusAreas}. Include sections: 1) Overview and strategy, 2) Weekly plan table, 3) Daily routine (with breaks), 4) Important books with authors/editions, 5) Top free websites/channels with brief why, 6) Practice and mock test cadence, 7) Tips for revision & exam day. Format using Markdown headings, lists and a table.`
      const out = await generateContentWithGemini(prompt)
      setPlanMd(out)
      await savePlan(out)
      showToast('Study plan generated!', 'success')
    } catch (e) {
      console.error(e)
      showToast('Failed to generate plan', 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  const addTodo = async () => {
    if (!studentId) return
    const text = newTodo.trim()
    if (!text) return
    const item = { id: Date.now().toString(), text, done: false }
    try {
      await updateDoc(doc(db, 'users', studentId), { studyTodos: arrayUnion(item) })
      setNewTodo('')
    } catch (e) {
      // ensure doc exists
      await setDoc(doc(db, 'users', studentId), { studyTodos: [item] }, { merge: true })
      setNewTodo('')
    }
  }

  const toggleTodo = async (id) => {
    if (!studentId) return
    const current = todos.find(t => t.id === id)
    if (!current) return
    const updated = { ...current, done: !current.done }
    try {
      await updateDoc(doc(db, 'users', studentId), {
        studyTodos: todos.map(t => t.id === id ? updated : t)
      })
    } catch (e) { console.error(e) }
  }

  const removeTodo = async (id) => {
    if (!studentId) return
    try {
      await updateDoc(doc(db, 'users', studentId), {
        studyTodos: todos.filter(t => t.id !== id)
      })
    } catch (e) { console.error(e) }
  }

  // Build simple visual roadmap data
  const weeks = useMemo(() => Array.from({ length: timeframe }, (_, i) => i + 1), [timeframe])
  const focusList = useMemo(() => focusAreas.split(',').map(s => s.trim()).filter(Boolean), [focusAreas])

  return (
    <div className="page fade-in">
      <div className="ai-quiz-generator-container" style={{ marginTop: 16 }}>
        <h2><FaCalendarAlt /> Study Planner</h2>
        <p className="description">Generate an AI-powered roadmap and track your todos.</p>

        <div className="card-item" style={{ padding: 16, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div className="input-group">
            <label>Target Exam / Goal</label>
            <input value={exam} onChange={(e)=>setExam(e.target.value)} placeholder="e.g., BIPS" />
          </div>
          <div className="input-group">
            <label>Language</label>
            <select value={language} onChange={(e)=>setLanguage(e.target.value)}>
              {['English','Hindi','Telugu','Odia','Tamil'].map(l=> <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label>Timeframe (weeks)</label>
            <input type="number" min="1" max="52" value={timeframe} onChange={(e)=>setTimeframe(Number(e.target.value)||1)} />
          </div>
          <div className="input-group">
            <label>Hours per day</label>
            <input type="number" min="1" max="12" value={hoursPerDay} onChange={(e)=>setHoursPerDay(Number(e.target.value)||1)} />
          </div>
          <div className="input-group" style={{ gridColumn: '1 / -1' }}>
            <label>Focus Areas</label>
            <input value={focusAreas} onChange={(e)=>setFocusAreas(e.target.value)} placeholder="Comma separated" />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 12, alignItems: 'center' }}>
            <button className="btn primary-btn large-btn" disabled={isGenerating} onClick={generatePlan}>{isGenerating ? 'Generating…' : 'Generate Plan with AI'}</button>
            {planMd && <span style={{ color: '#6b7280' }}><FaLightbulb /> Tip: Update inputs and regenerate anytime.</span>}
          </div>
        </div>

        <div className="card-item" style={{ padding: 16, marginTop: 16 }}>
          <h3 style={{ marginBottom: 8 }}>Roadmap</h3>
          {!planMd ? (
            <p className="content-placeholder">No plan yet. Generate one above.</p>
          ) : (
            <div style={{ lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: marked.parse(planMd || '') }} />
          )}
        </div>

        {/* Visual Roadmap SVG */}
        <div className="card-item" style={{ padding: 16, marginTop: 16 }}>
          <h3 style={{ marginBottom: 8 }}>Visual Roadmap</h3>
          <svg viewBox={`0 0 ${Math.max(600, weeks.length * 120)} 180`} width="100%" height="180" style={{ background: 'var(--bg-elev, #fff)', borderRadius: 12 }}>
            <defs>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#6366f1"/>
                <stop offset="100%" stopColor="#22c55e"/>
              </linearGradient>
            </defs>
            <line x1="40" y1="90" x2={40 + (weeks.length-1)*100} y2="90" stroke="url(#lineGrad)" strokeWidth="6" strokeLinecap="round"/>
            {weeks.map((w, idx) => {
              const x = 40 + idx*100
              const isMilestone = [1, Math.ceil(weeks.length/2), weeks.length].includes(w)
              return (
                <g key={w}>
                  <circle cx={x} cy="90" r={isMilestone ? 12 : 8} fill={isMilestone ? '#22c55e' : '#6366f1'} />
                  <text x={x} y="70" textAnchor="middle" fontSize="12" fill="#374151">W{w}</text>
                </g>
              )
            })}
            <text x={40 + (weeks.length-1)*100} y="130" textAnchor="end" fontWeight="700" fill="#16a34a">Exam</text>
            <text x="40" y="130" textAnchor="start" fontWeight="700" fill="#6366f1">Start</text>
          </svg>
          <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap', color: '#6b7280' }}>
            <span><span style={{ display:'inline-block', width:10, height:10, background:'#6366f1', borderRadius:3, marginRight:6 }} /> Weekly node</span>
            <span><span style={{ display:'inline-block', width:10, height:10, background:'#22c55e', borderRadius:3, marginRight:6 }} /> Milestone</span>
            <span>Hours/day: <strong>{hoursPerDay}</strong></span>
            {!!focusList.length && <span>Focus: <strong>{focusList.join(' • ')}</strong></span>}
          </div>
        </div>

        <div className="card-item" style={{ padding: 16, marginTop: 16 }}>
          <h3 style={{ marginBottom: 8 }}>Todo List</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              value={newTodo}
              onChange={(e)=>setNewTodo(e.target.value)}
              placeholder="Add a task…"
              style={{ flex: 1 }}
            />
            <button className="btn secondary-btn" onClick={addTodo}><FaPlus /> Add</button>
          </div>
          {(!todos || todos.length === 0) ? (
            <p className="content-placeholder">No tasks yet.</p>
          ) : (
            <ul style={{ display: 'grid', gap: 8 }}>
              {todos.map((t) => (
                <li key={t.id} className="card-item" style={{ padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" checked={!!t.done} onChange={()=>toggleTodo(t.id)} />
                    <span style={{ textDecoration: t.done ? 'line-through' : 'none', color: t.done ? '#6b7280' : 'inherit' }}>{t.text}</span>
                  </label>
                  <button className="icon-btn delete-btn" onClick={()=>removeTodo(t.id)} title="Remove"><FaTrash /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
