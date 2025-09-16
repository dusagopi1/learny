import { useEffect, useRef, useState } from 'react'
import { auth, db, storage } from '../../firebase-config'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, orderBy } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { askAboutDocument } from '../../utils/geminiApi'

export default function StudentDocChat() {
  const [user, setUser] = useState(null)
  const [file, setFile] = useState(null)
  const [fileUrl, setFileUrl] = useState('')
  const [threadId, setThreadId] = useState('')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState([]) // {role, text, at}
  const endRef = useRef(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u))
    return () => unsub()
  }, [])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function handleUpload(selected) {
    if (!user || !selected) return
    setLoading(true)
    try {
      const storageRef = ref(storage, `docchat/${user.uid}/${Date.now()}_${selected.name}`)
      await uploadBytes(storageRef, selected)
      const url = await getDownloadURL(storageRef)
      setFile(selected)
      setFileUrl(url)
      // create a new thread
      const docRef = await addDoc(collection(db, 'docThreads'), {
        uid: user.uid,
        fileName: selected.name,
        fileUrl: url,
        createdAt: serverTimestamp(),
      })
      setThreadId(docRef.id)
      // subscribe to messages
      const q = query(collection(db, 'docThreads', docRef.id, 'messages'), orderBy('createdAt'))
      onSnapshot(q, (snap) => {
        const rows = snap.docs.map((d) => d.data())
        setMessages(rows)
      })
    } finally {
      setLoading(false)
    }
  }

  async function sendMessage() {
    if (!input || !user || !threadId || !file) return
    const text = input
    setInput('')
    setLoading(true)
    const msgsRef = collection(db, 'docThreads', threadId, 'messages')
    await addDoc(msgsRef, { role: 'user', text, createdAt: serverTimestamp() })
    try {
      const answer = await askAboutDocument(file, text)
      await addDoc(msgsRef, { role: 'ai', text: answer, createdAt: serverTimestamp() })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="student-main-content fade-in">
      <div className="welcome-banner" style={{ marginBottom: 8 }}>
        <h2 className="gradient-text">Document Chat</h2>
        <p>Upload a document and chat with AI grounded on its content.</p>
      </div>

      {!file && (
        <label style={{ display: 'inline-flex', gap: 10, alignItems: 'center', padding: '12px 16px', border: '2px dashed var(--border-color, #e5e7eb)', borderRadius: 10, cursor: 'pointer' }}>
          Upload document
          <input type="file" accept=".pdf,.txt,.md,.doc,.docx,.png,.jpg,.jpeg" style={{ display: 'none' }} onChange={(e) => handleUpload(e.target.files?.[0])} />
        </label>
      )}

      {file && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          <div style={{ padding: 10, border: '1px solid var(--border-color, #e5e7eb)', borderRadius: 8 }}>
            <div style={{ fontWeight: 600 }}>{file.name}</div>
            <a href={fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>Open original</a>
          </div>
          <div style={{ maxHeight: 520, overflow: 'auto', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: 8 }}>
            <div style={{ padding: 12 }}>
              {messages.map((m, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{m.role === 'user' ? 'You' : 'AI'}</div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="Ask about the document…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !loading) sendMessage() }}
              style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-color, #e5e7eb)' }}
            />
            <button disabled={!input || loading} onClick={sendMessage} style={{ padding: '10px 14px', borderRadius: 8, border: 0, background: 'var(--primary-color, #6d28d9)', color: '#fff' }}>Send</button>
          </div>
        </div>
      )}
    </div>
  )
}


