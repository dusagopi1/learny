import React, { useState, useEffect, useRef } from 'react';
import { auth, db, storage } from '../../firebase-config'; // Import storage
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, doc, getDoc, query, onSnapshot, orderBy, serverTimestamp, updateDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useParams, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '../../components/Toast';
import Peer from 'peerjs'; // Import PeerJS
import { useTranslation } from 'react-i18next';

export default function StudentLiveSession() {
  const [user, setUser] = useState(null);
  const [sessionCode, setSessionCode] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sharedFile, setSharedFile] = useState(null);
  const [sharedFileUrl, setSharedFileUrl] = useState('');
  const [sharingLoading, setSharingLoading] = useState(false);
  const [shareMode, setShareMode] = useState('file'); // 'file' or 'youtube'
  const [youtubeUrlInput, setYoutubeUrlInput] = useState('');
  const [sharedYoutubeVideoId, setSharedYoutubeVideoId] = useState('');

  // Voice call states
  const [peer, setPeer] = useState(null);
  const [peerId, setPeerId] = useState('');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callActive, setCallActive] = useState(false);
  const [calling, setCalling] = useState(false);
  const [activeSessionUsers, setActiveSessionUsers] = useState([]); // New state for active users
  const [selectedUserToCall, setSelectedUserToCall] = useState(''); // New state for selected user to call

  const chatEndRef = useRef(null);
  const navigate = useNavigate();
  const { sessionId: routeSessionId } = useParams();
  const { showToast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  // Initialize PeerJS
  useEffect(() => {
    // If user is null or peer is already initialized and connected, do nothing.
    // If peer is initialized but disconnected, destroy it and allow re-initialization.
    if (peer && peer.disconnected) {
      console.warn('PeerJS instance disconnected. Destroying and re-initializing.');
      peer.destroy();
      setPeer(null); // Allow the next render cycle to create a new peer
      return;
    }

    if (user && !peer) {
      const newPeer = new Peer(user.uid, { // Use user.uid as Peer ID
        host: 'localhost',
        port: 9000,
        path: '/myapp'
      });

      newPeer.on('open', (id) => {
        setPeerId(id);
        console.log('My peer ID is:', id);
      });

      newPeer.on('call', (call) => {
        console.log('Incoming call from:', call.peer);
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then((stream) => {
            setLocalStream(stream);
            call.answer(stream);
            call.on('stream', (remoteStream) => {
              setRemoteStream(remoteStream);
              setCallActive(true);
            });
            call.on('close', () => {
              console.log('Call ended');
              endCall();
            });
          })
          .catch((err) => {
            console.error('Failed to get local stream', err);
            showToast('Failed to get mic access for incoming call', 'error');
          });
      });

      newPeer.on('error', (err) => {
        console.error('PeerJS error:', err);
        showToast('Voice call error: ' + err.message, 'error');
      });

      newPeer.on('disconnected', () => {
        console.warn('PeerJS disconnected from server. Attempting to re-initialize.');
        showToast('Voice call service disconnected', 'warning');
        if (peer) {
          peer.destroy();
          setPeer(null);
        }
      });

      setPeer(newPeer);
    }

    return () => {
      if (peer) {
        peer.destroy();
        setPeer(null);
      }
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [user]); // Only re-run if user changes

  useEffect(() => {
    if (routeSessionId) {
      setCurrentSessionId(routeSessionId);
      joinSession(routeSessionId);
    }
  }, [routeSessionId]);

  useEffect(() => {
    if (currentSessionId && user) {
      const messagesRef = collection(db, 'liveSessions', currentSessionId, 'messages');
      const q = query(messagesRef, orderBy('createdAt'));
      const unsubMessages = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => doc.data());
        setMessages(msgs);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      });
      // Also listen for shared file changes in the session document
      const sessionDocRef = doc(db, 'liveSessions', currentSessionId);
      const unsubSession = onSnapshot(sessionDocRef, async (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setSharedFileUrl(data.sharedFileUrl || '');
          setSharedFile(data.sharedFileName ? { name: data.sharedFileName, type: data.sharedFileType } : null); // Reconstruct file object
          setSharedYoutubeVideoId(data.sharedYoutubeVideoId || ''); // Update youtube video ID

          // Update active users for voice call signaling
          const activeUids = data.activeUsers || [];
          // Fetch user details for display names
          const userDetailsPromises = activeUids.map(async (uid) => {
            const userDoc = await getDoc(doc(db, 'users', uid));
            return userDoc.exists() ? { uid, displayName: userDoc.data().displayName || 'Unknown User' } : null;
          });
          const resolvedUsers = (await Promise.all(userDetailsPromises)).filter(Boolean);
          setActiveSessionUsers(resolvedUsers);
        }
      });

      return () => { unsubMessages(); unsubSession(); };
    }
  }, [currentSessionId, user]);

  async function startCall() {
    if (!peer || !user || !currentSessionId || !selectedUserToCall) {
      showToast('Please select a user to call', 'info');
      return;
    }
    if (selectedUserToCall === user.uid) {
      showToast('Cannot call yourself', 'info');
      setCalling(false);
      return;
    }
    setCalling(true);

    try {
      const remotePeerId = selectedUserToCall;
      
      console.log('Attempting to start call...');
      console.log('Current user UID (local peer ID):', user.uid);
      console.log('Selected user to call (remote peer ID):', remotePeerId);
      console.log('Peer object initialized:', !!peer);

      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          if (!stream) {
            console.error('Failed to get local audio stream: stream is null or undefined.');
            showToast('Failed to get mic access for outgoing call', 'error');
            setCalling(false);
            return;
          }
          setLocalStream(stream);
          const call = peer.call(remotePeerId, stream);

          if (!call) {
            console.error('Peer.call returned null or undefined. Could not establish call.');
            showToast('Failed to establish voice call', 'error');
            endCall(); // Clean up local stream and calling state
            return;
          }

          call.on('stream', (remoteStream) => {
            setRemoteStream(remoteStream);
            setCallActive(true);
            setCalling(false);
          });
          call.on('close', () => {
            console.log('Call ended');
            endCall();
          });
          call.on('error', (err) => {
            console.error('Call error:', err);
            showToast('Call failed: ' + err.message, 'error');
            endCall();
          });
        })
        .catch((err) => {
          console.error('Failed to get local stream', err);
          showToast('Failed to get mic access for outgoing call', 'error');
          setCalling(false);
        });

    } catch (error) {
      console.error('Error starting call:', error);
      showToast('Failed to start voice call', 'error');
      setCalling(false);
    }
  }

  function endCall() {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCallActive(false);
    setCalling(false);
    showToast('Call ended', 'info');
  }

  async function createSession() {
    if (!user) return;
    setLoading(true);
    try {
      const newSessionId = uuidv4();
      const sessionDocRef = doc(db, 'liveSessions', newSessionId);
      await setDoc(sessionDocRef, {
        sessionId: newSessionId,
        creatorId: user.uid,
        createdAt: serverTimestamp(),
        activeUsers: [user.uid],
        sharedFileUrl: '',
        sharedFileName: '',
        sharedFileType: '',
        sharedYoutubeVideoId: '', // Initialize new field
      });
      setCurrentSessionId(newSessionId);
      setSessionCode(newSessionId);
      navigate(`/student/live-session/${newSessionId}`);
    } catch (error) {
      console.error('Error creating session:', error);
      showToast('Failed to create session', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function joinSession(id) {
    if (!user || !id) return;
    setLoading(true);
    try {
      const sessionDocRef = doc(db, 'liveSessions', id);
      const sessionSnap = await getDoc(sessionDocRef);
      if (sessionSnap.exists()) {
        const sessionData = sessionSnap.data();
        if (!sessionData.activeUsers.includes(user.uid)) {
          await updateDoc(sessionDocRef, {
            activeUsers: [...sessionData.activeUsers, user.uid]
          });
        }
        setCurrentSessionId(id);
        setSessionCode(id);
        setSharedFileUrl(sessionData.sharedFileUrl || '');
        setSharedFile(sessionData.sharedFileName ? { name: sessionData.sharedFileName, type: sessionData.sharedFileType } : null);
        setSharedYoutubeVideoId(sessionData.sharedYoutubeVideoId || ''); // Load youtube video ID
        navigate(`/student/live-session/${id}`);
      } else {
        showToast('Session not found', 'error');
        setCurrentSessionId(null);
        setSessionCode('');
        navigate('/student/live-session');
      }
    } catch (error) {
      console.error('Error joining session:', error);
      showToast('Failed to join session', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleShareFile(e) {
    const fileToUpload = e.target.files?.[0];
    if (!fileToUpload || !user || !currentSessionId) return;

    setSharingLoading(true);
    try {
      const storageRef = ref(storage, `liveSessions/${currentSessionId}/${fileToUpload.name}`); // Use storage here
      await uploadBytes(storageRef, fileToUpload);
      const downloadURL = await getDownloadURL(storageRef);

      const sessionDocRef = doc(db, 'liveSessions', currentSessionId);
      await updateDoc(sessionDocRef, {
        sharedFileUrl: downloadURL,
        sharedFileName: fileToUpload.name,
        sharedFileType: fileToUpload.type,
        sharedYoutubeVideoId: '', // Clear youtube video ID when sharing a file
      });
      showToast('File shared successfully', 'success');
    } catch (error) {
      console.error('Error sharing file:', error);
      showToast('Failed to share file', 'error');
    } finally {
      setSharingLoading(false);
      e.target.value = null; // Clear input
    }
  }

  async function handleShareYoutubeVideo() {
    if (!youtubeUrlInput || !user || !currentSessionId) return;

    setSharingLoading(true);
    try {
      // Extract video ID from URL
      const videoIdMatch = youtubeUrlInput.match(/youtube\.com\/watch\?v=([^&]+)/);
      const videoId = videoIdMatch ? videoIdMatch[1] : null;

      if (!videoId) {
        showToast('Invalid YouTube URL', 'error');
        setSharingLoading(false);
        return;
      }

      const sessionDocRef = doc(db, 'liveSessions', currentSessionId);
      await updateDoc(sessionDocRef, {
        sharedYoutubeVideoId: videoId,
        sharedFileUrl: '', // Clear file URL when sharing a video
        sharedFileName: '',
        sharedFileType: '',
      });
      showToast('YouTube video shared successfully', 'success');
      setYoutubeUrlInput(''); // Clear input field
    } catch (error) {
      console.error('Error sharing YouTube video:', error);
      showToast('Failed to share YouTube video', 'error');
    } finally {
      setSharingLoading(false);
    }
  }

  async function sendMessage() {
    if (!input.trim() || !user || !currentSessionId) return;
    try {
      const messagesRef = collection(db, 'liveSessions', currentSessionId, 'messages');
      await addDoc(messagesRef, {
        text: input,
        senderId: user.uid,
        senderName: user.displayName || user.email,
        createdAt: serverTimestamp()
      });
      setInput('');
    } catch (error) {
      console.error('Error sending message:', error);
      showToast('Failed to send message', 'error');
    }
  }

  const isVideo = sharedFile?.type.startsWith('video/');
  const isImage = sharedFile?.type.startsWith('image/');
  const isPdf = sharedFile?.type === 'application/pdf';

  return (
    <div className="student-main-content fade-in">
      <div className="welcome-banner">
        <h2 className="gradient-text">Live Study Session</h2>
        <p>Connect with friends</p>
      </div>

      {!user ? (
        <p>Please log in to create or join a session.</p>
      ) : !currentSessionId ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: '#fff', borderRadius: 10, boxShadow: '0 4px 18px rgba(0,0,0,0.08)' }}>
          <h3 style={{ marginBottom: 15, color: '#333' }}>Start a new session or join an existing one:</h3>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <button onClick={createSession} disabled={loading} style={{
              padding: '12px 25px', borderRadius: 25, border: 0,
              background: 'linear-gradient(90deg, #6d28d9, #9a68eb)', color: '#fff',
              fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 3px 10px rgba(0,0,0,0.1)',
              transition: 'background 0.3s ease'
            }}>
              {loading ? 'Creating...' : 'Create New Session'}
            </button>
            <input
              type="text"
              placeholder="Enter session code"
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value)}
              style={{
                padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-color, #e5e7eb)',
                background: 'var(--bg-elev, #fff)', color: 'var(--text-color, #333)', fontSize: 16,
                outline: 'none', flex: 1,
                transition: 'border-color 0.2s, box-shadow 0.2s',
                '&:focus': { borderColor: 'var(--primary-color, #6d28d9)', boxShadow: '0 0 0 2px rgba(109, 40, 217, 0.2)' }
              }}
            />
            <button onClick={() => joinSession(sessionCode)} disabled={loading || !sessionCode} style={{
              padding: '12px 25px', borderRadius: 25, border: 0,
              background: 'linear-gradient(90deg, #2563eb, #7c3aed)', color: '#fff',
              fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 3px 10px rgba(0,0,0,0.1)',
              transition: 'background 0.3s ease'
            }}>
              Join Session
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '5fr 1fr 0.5fr', height: 'calc(100vh - 150px)', gap: 12, background: '#fff', borderRadius: 10, boxShadow: '0 4px 18px rgba(0,0,0,0.08)' }}>
          {/* Top Section: Session Info and Share Code (Spans all columns) */}
          <div style={{ gridColumn: '1 / 4', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Session Header */}
            <div style={{ padding: '10px 15px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f8f8', borderRadius: '10px 10px 0 0' }}>
              <div style={{ fontWeight: 600 }}>Session: {currentSessionId}</div>
              <button onClick={() => {
                setCurrentSessionId(null);
                setSessionCode('');
                navigate('/student/live-session');
                if (callActive) endCall(); // End call if active when leaving session
              }}
              style={{
                padding: '8px 16px', borderRadius: 20, border: '1px solid #dc3545',
                background: '#dc3545', color: '#fff', fontSize: 14, cursor: 'pointer',
                transition: 'background 0.3s ease',
                '&:hover': { background: '#c82333' }
              }}>
                Leave Session
              </button>
            </div>
            {/* Share Code Section */}
            <div style={{ padding: '15px', background: '#f0f8ff', borderRadius: '8px', border: '1px solid #e0f0ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <span style={{ fontWeight: 'bold', color: '#333' }}>Share this code: <span style={{ color: 'var(--primary-color)', userSelect: 'all' }}>{currentSessionId}</span></span>
              <button onClick={() => navigator.clipboard.writeText(currentSessionId)} style={{
                padding: '8px 16px', borderRadius: 20, border: '1px solid #007bff',
                background: '#007bff', color: '#fff', fontSize: 14, cursor: 'pointer',
                transition: 'background 0.3s ease'
              }}>Copy Code</button>
            </div>
          </div>

          {/* Shared Media / Document Viewer (Main Left Section) */}
          <div style={{
            gridColumn: '1 / 2',
            display: 'flex', flexDirection: 'column', gap: '10px', padding: '15px',
            background: '#fafafa', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
          }}>
            <h4 style={{ marginBottom: '5px', color: '#333' }}>Shared Content</h4>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <select
                value={shareMode}
                onChange={(e) => setShareMode(e.target.value)}
                style={{
                  padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', outline: 'none',
                  background: '#fff', cursor: 'pointer', fontSize: 14
                }}
              >
                <option value="file">Share File</option>
                <option value="youtube">Share YouTube Video</option>
              </select>

              {shareMode === 'file' ? (
                <label style={{
                  display: 'inline-flex', gap: 10, alignItems: 'center', padding: '8px 16px', background: 'linear-gradient(90deg, #6d28d9, #9a68eb)', color: '#fff', borderRadius: 20, cursor: 'pointer', fontSize: 14, fontWeight: 600, boxShadow: '0 3px 10px rgba(0,0,0,0.1)'
                }}>
                  {sharingLoading ? 'Uploading...' : 'Upload File'}
                  <input type="file" accept="video/*,image/*,.pdf,.doc,.docx,.txt" style={{ display: 'none' }} onChange={handleShareFile} disabled={sharingLoading} />
                </label>
              ) : (
                <div style={{ display: 'flex', flex: 1, gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="YouTube Video URL"
                    value={youtubeUrlInput}
                    onChange={(e) => setYoutubeUrlInput(e.target.value)}
                    style={{
                      flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', outline: 'none', fontSize: 14
                    }}
                  />
                  <button onClick={handleShareYoutubeVideo} disabled={!youtubeUrlInput || sharingLoading} style={{
                    padding: '8px 16px', borderRadius: 20, border: 0, background: '#ff0000', color: '#fff',
                    cursor: 'pointer', fontSize: 14, fontWeight: 600, boxShadow: '0 3px 10px rgba(0,0,0,0.1)'
                  }}>
                    {sharingLoading ? 'Sharing...' : 'Share'}
                  </button>
                </div>
              )}
            </div>
            {sharedFileUrl || sharedYoutubeVideoId ? (
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px dashed #ccc', borderRadius: '8px', position: 'relative', overflow: 'hidden' }}>
                {isVideo && (
                  <video src={sharedFileUrl} controls style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                )}
                {isImage && (
                  <img src={sharedFileUrl} alt={sharedFile?.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                )}
                {isPdf && (
                  <iframe src={sharedFileUrl} style={{ width: '100%', height: '100%', border: 'none' }} />
                )}
                {sharedYoutubeVideoId && (
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${sharedYoutubeVideoId}`}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="Shared YouTube Video"
                  ></iframe>
                )}
                {!isVideo && !isImage && !isPdf && !sharedYoutubeVideoId && (
                  <a href={sharedFileUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-color)', textDecoration: 'underline' }}>
                    View {sharedFile?.name}
                  </a>
                )}
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: '#666', marginTop: '20px' }}>No content shared yet</p>
            )}
          </div>

          {/* Chat Section (Middle Column) */}
          <div style={{
            gridColumn: '2 / 3', // Remains in the middle column
            display: 'flex', flexDirection: 'column', borderLeft: '1px solid #eee'
          }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: 15, display: 'flex', flexDirection: 'column', gap: 15, borderBottom: '1px solid #eee' }}>
              {messages.map((m, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: m.senderId === user.uid ? 'flex-end' : 'flex-start',
                }}>
                  <div style={{
                    maxWidth: '70%', padding: '10px 15px', borderRadius: 20,
                    background: m.senderId === user.uid ? '#e0f7fa' : '#f5f5f5',
                    color: '#333', boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                    position: 'relative',
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 5 }}>{m.senderName}</div>
                    <div>{m.text}</div>
                    <div style={{ fontSize: 10, color: '#666', marginTop: 5 }}>
                      {m.createdAt?.toDate().toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div style={{ padding: '10px 15px', borderTop: '1px solid #eee', display: 'flex', gap: 10, alignItems: 'center', background: '#f8f8f8', borderRadius: '0 0 10px 10px' }}>
              <input
                type="text"
                placeholder="Type your message"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !loading) sendMessage() }}
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
              <button disabled={!input || loading} onClick={sendMessage} style={{ padding: '12px 25px', borderRadius: 25, border: 0, background: 'linear-gradient(90deg, #6d28d9, #9a68eb)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 3px 10px rgba(0,0,0,0.1)' }}>Send</button>
            </div>
          </div>

          {/* Voice Call Controls & Status (Rightmost Column) */}
          <div style={{
            gridColumn: '3 / 4', // Ensure it takes up the rightmost column always
            display: 'flex', flexDirection: 'column', gap: '10px', padding: '15px', borderLeft: '1px solid #eee',
            background: '#fafafa', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
          }}>
            <h4 style={{ marginBottom: '5px', color: '#333' }}>Voice Call</h4>
            <select
              value={selectedUserToCall}
              onChange={(e) => setSelectedUserToCall(e.target.value)}
              style={{
                padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', outline: 'none',
                background: '#fff', cursor: 'pointer', fontSize: 14, marginBottom: '10px'
              }}
              disabled={callActive || calling}
            >
              <option value="">Select user to call</option>
              {activeSessionUsers.filter(u => u.uid !== user.uid).map(u => (
                <option key={u.uid} value={u.uid}>{u.displayName}</option>
              ))}
            </select>
            {!callActive ? (
              <button onClick={startCall} disabled={calling || !peer || !user || !selectedUserToCall} style={{
                padding: '10px 15px', borderRadius: 20, border: 0, background: 'var(--accent-color, #28a745)', color: '#fff',
                cursor: 'pointer', fontSize: 14, fontWeight: 600, transition: 'background 0.3s ease'
              }}>{calling ? 'Calling...' : 'Start Call'}</button>
            ) : (
              <button onClick={endCall} style={{
                padding: '10px 15px', borderRadius: 20, border: 0, background: 'var(--destructive-color, #dc3545)', color: '#fff',
                cursor: 'pointer', fontSize: 14, fontWeight: 600, transition: 'background 0.3s ease'
              }}>End Call</button>
            )}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              {callActive ? (
                <p style={{ color: 'var(--accent-color, #28a745)', fontWeight: 'bold', textAlign: 'center' }}>Voice Call Active</p>
              ) : (
                <p style={{ color: '#666', textAlign: 'center' }}>No active voice call</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
