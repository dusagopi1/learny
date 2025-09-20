import { useEffect, useRef, useState } from 'react'
import { auth, db, storage } from '../../firebase-config'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, addDoc, serverTimestamp, query, onSnapshot, orderBy } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { askAboutDocument } from '../../utils/geminiApi'
import { marked } from 'marked'
import { FaThumbsUp, FaThumbsDown, FaVolumeUp } from 'react-icons/fa'

export default function StudentDocChat() {
  const [user, setUser] = useState(null)
  const [file, setFile] = useState(null)
  const [fileUrl, setFileUrl] = useState('')
  const [threadId, setThreadId] = useState('')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState([]) // {role, text, at}
  const endRef = useRef(null)

  let unsubMessages = useRef(null)

  // Track auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u))
    return () => unsub()
  }, [])

  // Auto-scroll to bottom when messages change
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Cleanup firestore listeners
  useEffect(() => {
    return () => {
      if (unsubMessages.current) unsubMessages.current()
    }
  }, [])

  // Upload and create a thread
  async function handleUpload(selected) {
    if (!user || !selected) return
    setLoading(true)
    try {
      const storageRef = ref(storage, `docchat/${user.uid}/${Date.now()}_${selected.name}`)
      await uploadBytes(storageRef, selected)
      const url = await getDownloadURL(storageRef)
      setFile(selected)
      setFileUrl(url)

      // create new thread
      const docRef = await addDoc(collection(db, 'docThreads'), {
        uid: user.uid,
        fileName: selected.name,
        fileUrl: url,
        createdAt: serverTimestamp(),
      })
      setThreadId(docRef.id)

      // subscribe to messages
      const q = query(collection(db, 'docThreads', docRef.id, 'messages'), orderBy('createdAt'))
      unsubMessages.current = onSnapshot(q, (snap) => {
        const rows = snap.docs.map((d) => d.data())
        setMessages(rows)
      })
    } finally {
      setLoading(false)
    }
  }

  // Send message
async function sendMessage() {
  if (!input || !user || !threadId || !fileUrl) return
  const text = input
  setInput('')
  setLoading(true)

  const msgsRef = collection(db, 'docThreads', threadId, 'messages')

  // Save user message
  await addDoc(msgsRef, { role: 'user', text, createdAt: serverTimestamp() })

  try {
    // Pass the actual file object instead of fileUrl
    const answer = await askAboutDocument(file, text)

    // Save AI response
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

    {!file ? (
      <div
        style={{
          textAlign: 'center',
          padding: '30px 20px 20px 10px',
          width: '90%',
          background: '#fff',
          borderRadius: 145,
          paddingLeft:'50px',
          boxShadow: '0 4px 18px rgba(0,0,0,0.08)',
        }}
      >
        <h3 style={{ marginBottom: 15, color: '#333' }}>
          Ready to Chat Document
        </h3>
        <label
          style={{
            display: 'inline-flex',
            gap: 10,
            alignItems: '',
            padding: '12px 25px',
            background: 'linear-gradient(90deg, #6d28d9, #9a68eb)',
            color: '#fff',
            borderRadius: 25,
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: 600,
            boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
          }}
        >
          <FaThumbsUp /> Upload Document
          <input
            type="file"
            accept=".pdf,.txt,.md,.doc,.docx,.png,.jpg,.jpeg"
            style={{ display: 'none' }}
            onChange={(e) => handleUpload(e.target.files?.[0])}
          />
        </label>
        {loading && <p style={{ marginTop: 15, color: '#666' }}>Uploading...</p>}
      </div>
    ) : (
      <>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            height: 'calc(100vh - 200px)',
            maxHeight: '700px',
            gap: 12,
            background: '#fff',
            borderRadius: 10,
            boxShadow: '0 4px 18px rgba(0,0,0,0.08)',
          }}
        >
          {/* File header */}
          <div
            style={{
              padding: '10px 15px',
              borderBottom: '1px solid #eee',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8f8f8',
              borderRadius: '10px 10px 0 0',
            }}
          >
            <div style={{ fontWeight: 600 }}>{file?.name}</div>
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: 12,
                color: 'var(--primary-color)',
                textDecoration: 'none',
              }}
            >
              Open Original
            </a>
          </div>

          {/* Chat messages */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 15,
              display: 'flex',
              flexDirection: 'column',
              gap: 15,
            }}
          >
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent:
                    m.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                {m.role === 'ai' && (
                  <img
                    src="/src/assets/chatbot-icon.png"
                    alt="AI Avatar"
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      marginRight: 10,
                      alignSelf: 'flex-start',
                    }}
                  />
                )}
                <div
                  style={{
                    maxWidth: '70%',
                    padding: '10px 15px',
                    borderRadius: 20,
                    background:
                      m.role === 'user' ? '#e0f7fa' : '#f5f5f5',
                    color: '#333',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                    position: 'relative',
                  }}
                >
                  {m.role === 'ai' && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: 5,
                      }}
                    >
                      <span
                        style={{
                          background: '#d1c4e9',
                          color: '#673ab7',
                          padding: '3px 8px',
                          borderRadius: 10,
                          fontSize: 10,
                          fontWeight: 'bold',
                        }}
                      >
                        AI Generated
                      </span>
                      <FaVolumeUp
                        style={{
                          marginLeft: 8,
                          color: '#999',
                          cursor: 'pointer',
                        }}
                        title="Read Aloud"
                        onClick={() => {
                          const utterance = new SpeechSynthesisUtterance(
                            m.text
                          )
                          speechSynthesis.speak(utterance)
                        }}
                      />
                    </div>
                  )}
                  <div
                    dangerouslySetInnerHTML={{
                      __html: marked(m.text || ''),
                    }}
                    style={{ lineHeight: 1.6 }}
                  />
                  {m.role === 'ai' && (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        marginTop: 10,
                        paddingTop: 8,
                        borderTop: '1px solid #eee',
                        gap: 10,
                      }}
                    >
                      <span style={{ fontSize: 12, color: '#666' }}>
                        Was this helpful?
                      </span>
                      <FaThumbsUp
                        style={{ color: '#81c784', cursor: 'pointer' }}
                      />
                      <FaThumbsDown
                        style={{ color: '#e57373', cursor: 'pointer' }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading &&
              messages.length > 0 &&
              messages[messages.length - 1].role === 'user' && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-start',
                    marginTop: 15,
                  }}
                >
                  <img
                    src="/assets/chatbot-icon.png"
                    alt="AI Avatar"
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      marginRight: 10,
                      alignSelf: 'flex-start',
                    }}
                  />
                  <div
                    style={{
                      maxWidth: '70%',
                      padding: '10px 15px',
                      borderRadius: 20,
                      background: '#f5f5f5',
                      color: '#333',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                    }}
                  >
                    AI is thinking...
                  </div>
                </div>
              )}
            <div ref={endRef} />
          </div>
        </div>

        {/* Input bar */}
        <div
          style={{
            padding: '10px 15px',
            borderTop: '1px solid #eee',
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            background: '#f8f8f8',
            borderRadius: '0 0 10px 10px',
          }}
        >
          <input
            type="text"
            placeholder="Type your message"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading) sendMessage()
            }}
            style={{
              flex: 1,
              padding: '12px 18px',
              borderRadius: 25,
              border: '1px solid #ddd',
              fontSize: 15,
              outline: 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              '&:focus': { borderColor: 'var(--primary-color, #6d28d9)', boxShadow: '0 0 0 2px rgba(109, 40, 217, 0.2)' }
            }}
          />
          <button
            disabled={!input || loading}
            onClick={sendMessage}
            style={{
              padding: '12px 25px',
              borderRadius: 25,
              border: 0,
              background: 'linear-gradient(90deg, #6d28d9, #9a68eb)',
              color: '#fff',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 3px 10px rgba(0,0,0,0.1)',
            }}
          >
            Send
          </button>
        </div>
      </>
    )}
  </div>
);
}
