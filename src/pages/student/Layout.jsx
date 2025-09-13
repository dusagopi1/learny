import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react'; // Import useState and useEffect
import './Student.css'; // Import student-specific CSS
import { FaTrophy, FaHome, FaBookOpen, FaUsers, FaBars, FaTimes, FaUserCircle, FaRobot } from 'react-icons/fa'; // Import FaBars, FaTimes, and FaRobot
import AIChatPopup from '../../components/AIChatPopup'; // Import AIChatPopup
import StudentDataLoader from '../../components/StudentDataLoader'; // Import StudentDataLoader

export default function StudentLayout() {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State for sidebar visibility
  const [showStudentChat, setShowStudentChat] = useState(false); // State for student chatbot visibility
  const [isPageLoading, setIsPageLoading] = useState(false); // New state for page loading

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
        </div>
      </header>
      <nav className={`student-sidebar ${isSidebarOpen ? '' : 'sidebar-closed'}`}>
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
    </div>
  );
}
