import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react'; // Import useState and useEffect
import { auth, db } from '../../firebase-config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import './Student.css'; // Import student-specific CSS
import { FaTrophy, FaHome, FaBookOpen, FaUsers, FaBars, FaTimes, FaUserCircle, FaRobot, FaCoins } from 'react-icons/fa'; // Import icons
import AIChatPopup from '../../components/AIChatPopup'; // Import AIChatPopup
import StudentDataLoader from '../../components/StudentDataLoader'; // Import StudentDataLoader

export default function StudentLayout() {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State for sidebar visibility
  const [showStudentChat, setShowStudentChat] = useState(false); // State for student chatbot visibility
  const [isPageLoading, setIsPageLoading] = useState(false); // New state for page loading
  const [points, setPoints] = useState(0);
  const [pointsHistory, setPointsHistory] = useState([]); // {delta, reason, at}
  const [showPointsModal, setShowPointsModal] = useState(false);

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

  // Load current user's points and history
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setPoints(0);
        setPointsHistory([]);
        return;
      }
      const userRef = doc(db, 'users', user.uid);
      const unsubUser = onSnapshot(userRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setPoints(Number(data.totalPoints || 0));
          setPointsHistory(Array.isArray(data.pointsHistory) ? data.pointsHistory : []);
        }
      });
      return () => unsubUser();
    });
    return () => unsubAuth();
  }, []);

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
            <button
              className="icon-btn"
              title={`Your Points: ${points}`}
              onClick={() => setShowPointsModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 12 }}
            >
              <FaCoins color="#fbbf24" />
              <span>{points}</span>
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
          <FaBookOpen /> <span>AI Suggestion</span>
        </Link>
        {/* AI Chatbot Link */}
        <button className={`student-sidebar-link ${showStudentChat ? 'active' : ''}`} onClick={toggleStudentChat}>
            <FaRobot /> <span>AI Chatbot</span>
        </button>
        {/* Potentially add more student links here later */}
      </nav>
      <main className="student-main-content">
        <Outlet context={{ setIsPageLoading }} /> {/* Pass setIsPageLoading via context */}
      </main>
      <footer className="student-footer">
        <p>&copy; 2025 Learning App - Student View</p>
      </footer>
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
                <strong style={{ fontSize: 18 }}>{points} points</strong>
              </div>
              <h4>History</h4>
              {(!pointsHistory || pointsHistory.length === 0) ? (
                <p className="content-placeholder">No score history yet.</p>
              ) : (
                <div style={{ maxHeight: 280, overflow: 'auto' }}>
                  {pointsHistory.slice().reverse().map((h, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-color, #e5e7eb)' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{h.reason || 'Activity'}</div>
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
    </div>
  );
}
