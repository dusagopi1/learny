import { Outlet, Link, useLocation, NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react'; // Import useState and useEffect
import { auth, db } from '../../firebase-config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, query, collection, where, updateDoc, increment, setDoc, getDoc, getDocs, orderBy, limit } from 'firebase/firestore';
import './Student.css'; // Import student-specific CSS
import { FaTrophy, FaHome, FaBookOpen, FaUsers, FaBars, FaTimes, FaUserCircle, FaRobot, FaCoins, FaGamepad, FaFileAlt, FaBook, FaBell, FaBrain } from 'react-icons/fa'; // Import icons
import { FaFire, FaCalendarAlt, FaCheckCircle } from 'react-icons/fa';
import AIChatPopup from '../../components/AIChatPopup'; // Import AIChatPopup
import StudentDataLoader from '../../components/StudentDataLoader'; // Import StudentDataLoader
import { useToast } from '../../components/Toast'; // Import useToast

export default function StudentLayout() {
  const location = useLocation();
  const { showToast } = useToast();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State for sidebar visibility
  const [showStudentChat, setShowStudentChat] = useState(false); // State for student chatbot visibility
  const [isPageLoading, setIsPageLoading] = useState(false); // New state for page loading
  const [points, setPoints] = useState(0);
  const [pointsHistory, setPointsHistory] = useState([]); // {delta, reason, at}
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [showWhatAreCoinsModal, setShowWhatAreCoinsModal] = useState(false); // New state for "What are these coins?" modal
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [studentId, setStudentId] = useState(null);
  const [aiQuizUnlockedNotified, setAiQuizUnlockedNotified] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('aiQuizUnlockedNotified') === 'true';
    }
    return false;
  });

  // Daily check-in and streaks
  const [streakCount, setStreakCount] = useState(0);
  const [lastCheckinDate, setLastCheckinDate] = useState(null);
  const [todaySeconds, setTodaySeconds] = useState(0);
  const [dailyTimeMap, setDailyTimeMap] = useState({}); // {YYYY-MM-DD: seconds}
  const [showDailyCheckinModal, setShowDailyCheckinModal] = useState(false);

  // Badges modal and leaderboard
  const [showBadgesModal, setShowBadgesModal] = useState(false);
  const [rank, setRank] = useState(null);
  const [totalStudents, setTotalStudents] = useState(null);

  const BADGE_THRESHOLDS = [10, 100, 200, 300, 400, 500];

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
    if (showStudentChat) setShowStudentChat(false); // Close chatbot if sidebar is toggled
  };

  const toggleStudentChat = () => {
    setShowStudentChat(!showStudentChat);
    if (isSidebarOpen) setIsSidebarOpen(false); // Close sidebar if chatbot is toggled
  };

  const classIdMatch = location.pathname.match('/student/class/([a-zA-Z0-9]+)');
  const classId = classIdMatch ? classIdMatch[1] : null;

  // Example: How to trigger the loader. In real use, this would be tied to data fetching.
  useEffect(() => {
    // Simulate a loading process
    setIsPageLoading(true); // Show loader on component mount
    const timer = setTimeout(() => {
      setIsPageLoading(false); // Hide loader after some time
    }, 2000); // Adjust loading time as needed
    return () => clearTimeout(timer);
  }, [location.pathname]); // Re-run effect when path changes

  // Load current user's points, history, streaks, and daily time
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setPoints(0);
        setPointsHistory([]);
        setUnreadNotificationsCount(0);
        setStudentId(null);
        setAiQuizUnlockedNotified(false); // Reset notification state on logout
        localStorage.setItem('aiQuizUnlockedNotified', 'false'); // Persist reset
        setStreakCount(0);
        setLastCheckinDate(null);
        setTodaySeconds(0);
        setDailyTimeMap({});
        return;
      }
      setStudentId(user.uid);
      const userRef = doc(db, 'users', user.uid);
      const unsubUser = onSnapshot(userRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setPoints(Number(data.totalPoints || 0));
          setPointsHistory(Array.isArray(data.pointsHistory) ? data.pointsHistory : []);
          const dt = data.dailyTime || {};
          setDailyTimeMap(dt);
          const todayKey = new Date().toISOString().slice(0,10);
          setTodaySeconds(Number(dt[todayKey] || 0));
          setStreakCount(Number(data.streakCount || 0));
          setLastCheckinDate(data.lastCheckinDate || null);
        }
      });
      return () => unsubUser();
    });
    return () => unsubAuth();
  }, []);

  // AI Quiz Generator Unlock Notification
  useEffect(() => {
    const QUIZ_UNLOCK_POINTS = 150; // Define locally or import from constants
    if (points >= QUIZ_UNLOCK_POINTS && !aiQuizUnlockedNotified) {
      showToast("🎉 AI Quiz Generator Unlocked! You now have access to generate custom quizzes!", 'success', { duration: 5000 });
      setAiQuizUnlockedNotified(true);
      localStorage.setItem('aiQuizUnlockedNotified', 'true');
    }
  }, [points, aiQuizUnlockedNotified, showToast]);

  // Fetch notifications for the student (badge)
  useEffect(() => {
    if (!studentId) return;

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', 'in', [studentId, 'ALL_STUDENTS']),
      where('read', '==', false) // Only fetch unread notifications for the badge
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadNotificationsCount(snapshot.size);
    }, (error) => {
      console.error("Error fetching notifications:", error);
    });

    return () => unsubscribe();
  }, [studentId]);

  // Increment today's time spent every minute and persist
  useEffect(() => {
    if (!studentId) return;
    const userRef = doc(db, 'users', studentId);
    const interval = setInterval(async () => {
      try {
        const todayKey = new Date().toISOString().slice(0,10);
        await updateDoc(userRef, { [`dailyTime.${todayKey}`]: increment(60) });
      } catch (e) {
        // If user doc might not exist or field path missing, ensure doc exists
        try {
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            await setDoc(userRef, { dailyTime: {} }, { merge: true });
          }
        } catch {}
      }
    }, 60000); // every 60 seconds
    return () => clearInterval(interval);
  }, [studentId]);

  // When todaySeconds crosses 3600 and not already checked in today, increment streak
  useEffect(() => {
    if (!studentId) return;
    const todayKey = new Date().toISOString().slice(0,10);
    if (todaySeconds >= 3600 && lastCheckinDate !== todayKey) {
      const userRef = doc(db, 'users', studentId);
      (async () => {
        try {
          await updateDoc(userRef, {
            streakCount: increment(1),
            lastCheckinDate: todayKey,
          });
          showToast('🔥 Daily streak +1! You spent 1 hour today.', 'success');
        } catch (e) {
          console.error('Failed to update streak:', e);
        }
      })();
    }
  }, [todaySeconds, lastCheckinDate, studentId, showToast]);

  // Award badges when thresholds crossed and compute rank
  useEffect(() => {
    if (!studentId) return;
    (async () => {
      try {
        const userRef = doc(db, 'users', studentId);
        const snap = await getDoc(userRef);
        const data = snap.exists() ? snap.data() : {};
        const existingBadges = Array.isArray(data.streakBadges) ? data.streakBadges : [];
        const newlyUnlocked = BADGE_THRESHOLDS.filter(t => streakCount >= t && !existingBadges.includes(t));
        if (newlyUnlocked.length > 0) {
          await updateDoc(userRef, { streakBadges: [...existingBadges, ...newlyUnlocked] });
          showToast(`🏅 New streak badge unlocked: ${newlyUnlocked.join(', ')}!`, 'success');
        }
        // Rank by streakCount among students
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('role', '==', 'student'));
        const all = await getDocs(q);
        const rows = [];
        all.forEach(d => {
          const u = d.data();
          rows.push({ id: d.id, streak: Number(u.streakCount || 0) });
        });
        rows.sort((a,b) => b.streak - a.streak);
        const idx = rows.findIndex(r => r.id === studentId);
        setRank(idx >= 0 ? idx + 1 : null);
        setTotalStudents(rows.length);
      } catch (e) {
        console.error('Badge/rank calc failed', e);
      }
    })();
  }, [studentId, streakCount]);

  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className={`student-layout ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      {isPageLoading && <StudentDataLoader />} {/* Conditionally render loader */}
      <header className="student-header">
        <button className="sidebar-toggle-btn" onClick={toggleSidebar}>
          {isSidebarOpen ? <FaTimes /> : <FaBars />}
        </button>
        <h1 className="portal-title gradient-text">Student Portal</h1> {/* Apply gradient text */}
        {/* Placeholder for user profile/avatar in header */}
        <div className="header-user-profile">
            <FaUserCircle className="user-avatar-icon" />
            <span className="user-greeting">Hi, Student!</span>
            {/* Notification Icon */}
            <Link to="/student/notifications" className="notification-icon-link" style={{ position: 'relative', marginLeft: 12 }}>
                <FaBell size={20} color="#333" />
                {unreadNotificationsCount > 0 && (
                    <span className="notification-badge" style={{ position: 'absolute', top: -5, right: -10, background: 'red', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '10px' }}>
                        {unreadNotificationsCount}
                    </span>
                )}
            </Link>
            {/* Daily Check-in icons: Calendar and Streak (fire) */}
            <button
              className="icon-btn"
              title={`Daily Check-in: ${formatDuration(todaySeconds)} today`}
              onClick={() => setShowDailyCheckinModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 12 }}
            >
              <FaCalendarAlt color="#2563eb" />
            </button>
            <div
              className="icon-btn"
              title={`Streak: ${streakCount} days`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 8, cursor: 'pointer' }}
              onClick={() => setShowBadgesModal(true)}
            >
              <FaFire color="#f97316" />
              <span>{streakCount}</span>
            </div>
            <button
              className="icon-btn"
              title={`Your Points: ${points}`}
              onClick={() => setShowPointsModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 12 }}
            >
              <FaCoins color="#fbbf24" />
              <span>{points}</span>
            </button>
            {/* New "What are these coins?" button */}
            <button className="btn secondary-btn-alt" onClick={() => setShowWhatAreCoinsModal(true)} style={{ marginLeft: 10 }}>
              What are these coins?
            </button>
        </div>
      </header>
      {/* Backdrop to close sidebar on click */}
      {isSidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={toggleSidebar}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 998 }}
        />
      )}
      <nav
        className={`student-sidebar ${isSidebarOpen ? '' : 'sidebar-closed'}`}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: 260,
          maxWidth: '80%',
          transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 240ms ease',
          zIndex: 999,
        }}
      >
        <h3 className="sidebar-title">Navigation</h3>
        <Link to="/student" className={location.pathname === '/student' ? 'active' : ''} onClick={() => setIsSidebarOpen(false)}>
          <FaHome /> <span>Dashboard</span>
        </Link>
        <Link to="/student/leaderboard" className={location.pathname.includes('/leaderboard') ? 'active' : ''} onClick={() => setIsSidebarOpen(false)}>
          <FaTrophy /> <span>Leaderboard</span>
        </Link>
        <Link to="/student/community" className={location.pathname.includes('/community') ? 'active' : ''} onClick={() => setIsSidebarOpen(false)}>
          <FaUsers /> <span>Community</span>
        </Link>
        <Link to="/student/join-class" className={location.pathname.includes('/join-class') ? 'active' : ''} onClick={() => setIsSidebarOpen(false)}>
          <FaBookOpen /> <span>Join Class</span>
        </Link>
        <Link to="/student/ai-suggestion" className={location.pathname.includes('/ai-suggestion') ? 'active' : ''} onClick={() => setIsSidebarOpen(false)}>
          {/* <FaBookOpen /> */}
          <img src="/src/assets/chatbot-icon.png" alt="AI Chatbot" style={{ width: 20, height: 20, borderRadius: '50%' }} /><span>AI Suggestion</span>
        </Link>
        {points >= 250 ? (
          <NavLink to="/student/doc-chat" className={({ isActive }) => isActive ? 'student-sidebar-link active' : 'student-sidebar-link'}>
             <img src="/src/assets/chatbot-icon.png" alt="Connect" style={{ width: 20, height: 20 }} /> AI Document Chat
          </NavLink>
        ) : (
          <div title="Unlock with 250 points" style={{ opacity: 0.6, cursor: 'not-allowed', padding: '8px 15px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/src/assets/chatbot-icon.png" alt="Connect" style={{ width: 20, height: 20 }} /> <span style={{ color: '#d4af37', fontWeight: 600 }}>AI Document Chat (Locked - 250)</span>
          </div>
        )}
        <NavLink to="/student/live-session" className={({ isActive }) => isActive ? 'student-sidebar-link active' : 'student-sidebar-link'}>
          <img src="/src/assets/connect-icon.png" alt="Connect" style={{ width: 20, height: 20 }} /> Connect
        </NavLink>
        <Link to="/student/games" className={location.pathname.includes('/games') ? 'active' : ''} onClick={() => setIsSidebarOpen(false)}>
          <FaGamepad /> <span>Games</span>
        </Link>
        <Link to="/student/stem-games" className={location.pathname.includes('/stem-games') ? 'active' : ''} onClick={() => setIsSidebarOpen(false)}>
          <FaGamepad /> <span>STEM Games</span>
        </Link>
        <Link to="/student/daily-quizzes" className={location.pathname.includes('/daily-quizzes') ? 'active' : ''} onClick={() => setIsSidebarOpen(false)}>
          <FaBook /> <span>Daily Quizzes</span>
        </Link>
        <Link to="/student/study-planner" className={location.pathname.includes('/study-planner') ? 'active' : ''} onClick={() => setIsSidebarOpen(false)}>
        <img src="/src/assets/chatbot-icon.png" alt="Connect" style={{ width: 20, height: 20 }} /> <span>Study Planner</span>
        </Link>
        {points >= 150 ? (
          <Link to="/student/ai-quiz-generator" className={location.pathname.includes('/ai-quiz-generator') ? 'active' : ''} onClick={() => setIsSidebarOpen(false)}>
            <FaBrain /> <span>AI Quiz Generator</span>
          </Link>
        ) : (
          <div title="Unlock with 150 points" style={{ opacity: 0.5, cursor: 'not-allowed', padding: '8px 15px', display: 'flex', alignItems: 'center', gap: 10, color: 'gold' }}>
            <FaBrain /> <span color='gold'>AI Quiz Generator (Locked)</span>
          </div>
        )}
        {/* AI Chatbot Link */}
        <button className={`student-sidebar-link ${showStudentChat ? 'active' : ''}`} onClick={toggleStudentChat} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/src/assets/chatbot-icon.png" alt="AI Chatbot" style={{ width: 20, height: 20, borderRadius: '50%' }} /> <span>AI Chatbot</span>
        </button>
        {/* Potentially add more student links here later */}
        <div className="language-switcher">
          <label htmlFor="language-select" className="sr-only">Select Language</label>
          <select id="language-select" value="en">
            <option value="en">English</option>
            <option value="te">Telugu</option>
            <option value="or">Odia</option>
            <option value="ta">Tamil</option>
            <option value="hi">Hini</option>
          </select>
        </div>
      </nav>
      <main className="student-main-content">
        <Outlet context={{ setIsPageLoading }} /> {/* Pass setIsPageLoading via context */}
      </main>
      
      {showStudentChat && (
          <AIChatPopup classId={classId} onClose={toggleStudentChat} />
      )}
      {showPointsModal && (
        <div className="modal-overlay fade-in" onClick={() => setShowPointsModal(false)}>
          <div className="video-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Your Score</h3>
              <button className="close-button" onClick={() => setShowPointsModal(false)}><FaTimes /></button>
            </div>
            <div className="modal-content">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <FaCoins color="#fbbf24" />
                <strong style={{ fontSize: 18 }}>Points: {points}</strong>
              </div>
              <h4>History</h4>
              {(!pointsHistory || pointsHistory.length === 0) ? (
                <p className="content-placeholder">No score history yet.</p>
              ) : (
                <div style={{ maxHeight: 280, overflow: 'auto' }}>
                  {pointsHistory.slice().reverse().map((h, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-color, #e5e7eb)' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{h.reason || "Activity"}</div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>{h.at ? new Date(h.at.seconds ? h.at.seconds * 1000 : h.at).toLocaleString() : ''}</div>
                      </div>
                      <div style={{ fontWeight: 700, color: (h.delta || 0) >= 0 ? 'green' : 'crimson' }}>
                        {(h.delta || 0) >= 0 ? `+${h.delta || 0}` : (h.delta || 0)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Daily Check-in Modal */}
      {showDailyCheckinModal && (
        <div className="modal-overlay fade-in" onClick={() => setShowDailyCheckinModal(false)}>
          <div className="video-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Daily Check-in</h3>
              <button className="close-button" onClick={() => setShowDailyCheckinModal(false)}><FaTimes /></button>
            </div>
            <div className="modal-content">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <FaFire color="#f97316" />
                <strong style={{ fontSize: 18 }}>Streak: {streakCount} day(s)</strong>
              </div>

              {/* Dynamic calendar */}
              <CalendarGrid dailyTimeMap={dailyTimeMap} />

              <div style={{ marginTop: 16 }}>
                <h4>Today's Time</h4>
                <p>{formatDuration(todaySeconds)} spent today</p>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn secondary-btn" onClick={() => setShowDailyCheckinModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* "What are these coins?" Modal */}
      {showWhatAreCoinsModal && (
        <div className="modal-overlay fade-in" onClick={() => setShowWhatAreCoinsModal(false)}>
          <div className="video-modal" onClick={(e) => e.stopPropagation()}> {/* Reusing video-modal styling, can be customized */}
            <div className="modal-header">
              <h3>What are these coins?</h3>
              <button className="close-button" onClick={() => setShowWhatAreCoinsModal(false)}><FaTimes /></button>
            </div>
            <div className="modal-content">
            <p>1. Learning Games & Challenges(70)</p>
              <p>Unlock interactive games or challenges using AI, like word games, puzzle quizzes, or memory games.</p>
              
              <p>2. Quiz & Practice Generation(150)</p>
              <p>Unlock AI-generated custom quizzes for Math, Science, or English.</p>
              {/* <p>Include multiple difficulty levels so students can practice progressively.</p> */}

                <p>3. Notes & Summaries(200)</p>
              <p>Unlock AI-generated study notes, chapter summaries, and key points.</p>
              {/* <p>Can include diagrams, tables, or visual highlights.</p> */}

            
              <p>4. Step-by-Step Problem Solving(250)</p>
              <p>Unlock AI explanations for Math problems or science experiments, showing each step clearly.</p>

              {/* <p>Earn rewards or badges for completing them.</p> */}
            </div>
            <div className="modal-actions">
              <button className="btn secondary-btn" onClick={() => setShowWhatAreCoinsModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Badges Modal */}
      {showBadgesModal && (
        <div className="modal-overlay fade-in" onClick={() => setShowBadgesModal(false)}>
          <div className="video-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Streak Badges & Rank</h3>
              <button className="close-button" onClick={() => setShowBadgesModal(false)}><FaTimes /></button>
            </div>
            <div className="modal-content">
              <div style={{ marginBottom: 12 }}>
                <strong>Your Rank:</strong> {rank ? `#${rank}` : '—'} {totalStudents ? `(of ${totalStudents})` : ''}
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                {BADGE_THRESHOLDS.map((t) => {
                  const unlocked = streakCount >= t
                  return (
                    <div key={t} className={`badge-chip ${unlocked ? 'unlocked animate-bounce-soft' : 'locked'}`} style={{
                      padding: '10px 14px', borderRadius: 9999, border: '1px solid var(--border-color, #e5e7eb)',
                      background: unlocked ? 'linear-gradient(90deg,#22c55e,#4ade80)' : 'var(--bg-elev,rgb(114, 194, 34))',
                      color: unlocked ? '#0f172a' : 'black', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8
                    }}>
                      <FaFire color={unlocked ? '#ef4444' : '#9ca3af'} />
                      {t}-day
                    </div>
                  )
                })}
              </div>
              <p style={{ marginTop: 10, color: '#6b7280' }}>Earn badges at 10, 100, 200, 300, 400, 500-day streaks.</p>
            </div>
            <div className="modal-actions">
              <button className="btn secondary-btn" onClick={() => setShowBadgesModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function startOfMonth(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1)
  d.setHours(0,0,0,0)
  return d
}
function endOfMonth(date) {
  const d = new Date(date.getFullYear(), date.getMonth()+1, 0)
  d.setHours(23,59,59,999)
  return d
}
function getMonthMatrix(date) {
  const start = startOfMonth(date)
  const end = endOfMonth(date)
  const startDay = start.getDay() // 0 Sun .. 6 Sat
  const daysInMonth = end.getDate()
  const weeks = []
  let week = new Array(7).fill(null)
  // fill leading blanks
  for (let i=0;i<startDay;i++) week[i] = null
  let day = 1
  for (let i=startDay;i<7;i++) { week[i] = day++; }
  weeks.push(week)
  while (day <= daysInMonth) {
    week = new Array(7).fill(null)
    for (let i=0;i<7 && day <= daysInMonth;i++) { week[i] = day++; }
    weeks.push(week)
  }
  return weeks
}

function CalendarGrid({ dailyTimeMap }) {
  const [refDate, setRefDate] = useState(new Date())
  const weeks = getMonthMatrix(refDate)
  const monthLabel = refDate.toLocaleString(undefined, { month: 'long', year: 'numeric' })
  const isToday = (d) => {
    const t = new Date();
    return d && d === t.getDate() && refDate.getMonth() === t.getMonth() && refDate.getFullYear() === t.getFullYear();
  }
  const getSecondsForDay = (day) => {
    if (!day) return 0
    const key = new Date(refDate.getFullYear(), refDate.getMonth(), day).toISOString().slice(0,10)
    return Number(dailyTimeMap?.[key] || 0)
  }
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <button className="icon-btn" onClick={() => setRefDate(new Date(refDate.getFullYear(), refDate.getMonth()-1, 1))}>{'<'}</button>
        <strong>{monthLabel}</strong>
        <button className="icon-btn" onClick={() => setRefDate(new Date(refDate.getFullYear(), refDate.getMonth()+1, 1))}>{'>'}</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 6, color: '#9ca3af', fontWeight: 600 }}>
        {['S','M','T','W','T','F','S'].map(d => <div key={d} style={{ textAlign: 'center' }}>{d}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {weeks.flat().map((day, idx) => {
          const secs = getSecondsForDay(day)
          const achieved = secs >= 3600
          const hasAny = secs > 0
          return (
            <div key={idx} className="card-item" style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: isToday(day) ? 'rgba(34,197,94,0.2)' : undefined }}>
              {day && <span style={{ fontWeight: 600 }}>{String(day).padStart(2,'0')}</span>}
              {achieved && <FaCheckCircle color="#22c55e" style={{ position: 'absolute', right: 6, bottom: 6 }} />}
              {!achieved && hasAny && <span style={{ position: 'absolute', right: 10, bottom: 10, width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
