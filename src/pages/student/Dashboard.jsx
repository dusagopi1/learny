import { useState, useEffect } from 'react'
import { db, auth } from '../../firebase-config'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { Link, useOutletContext } from 'react-router-dom' // Import useOutletContext
import { FaChalkboardTeacher, FaChartLine, FaBookOpen } from 'react-icons/fa'; // Import icons
import UnlockableCourses from './UnlockableCourses'; // Import the new component

export default function StudentDashboard() {
  const [enrolledClasses, setEnrolledClasses] = useState([])
  const [user, setUser] = useState(null)
  // const [loading, setLoading] = useState(true) // Removed local loading state
  const [displayName, setDisplayName] = useState('');
  const [userPoints, setUserPoints] = useState(0);
  const [unlockedCourses, setUnlockedCourses] = useState([]);
  const { setIsPageLoading } = useOutletContext(); // Get setIsPageLoading from context

  useEffect(() => {
    // Set global loading true when starting fetch, false when done
    setIsPageLoading(true);
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setDisplayName(userData.displayName || '');
          setUserPoints(userData.totalPoints || 0);
          setUnlockedCourses(userData.unlockedCourses || []);
        }
      }
      setIsPageLoading(false); // Hide loader after auth check
    });

    return () => unsubscribeAuth();
  }, [setIsPageLoading]);

  useEffect(() => {
    if (user) { // Only fetch classes if user is logged in
      setIsPageLoading(true); // Show loader when fetching classes
      const userRef = doc(db, 'users', user.uid);
      const unsubscribeSnapshot = onSnapshot(userRef, async (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          const enrolledClassIds = userData.enrolledClasses || [];

          const classPromises = enrolledClassIds.map(async (classId) => {
            const classRef = doc(db, 'classes', classId);
            const classSnap = await getDoc(classRef);
            if (classSnap.exists()) {
              const classData = classSnap.data();
              const progress = Math.floor(Math.random() * 100);
              return { id: classSnap.id, ...classData, progress };
            }
            return null;
          });

          const classes = (await Promise.all(classPromises)).filter(Boolean);
          setEnrolledClasses(classes);
        } else {
          setEnrolledClasses([]);
        }
        setIsPageLoading(false); // Hide loader after fetching classes
      }, (error) => {
        console.error("Error fetching enrolled classes:", error);
        setEnrolledClasses([]);
        setIsPageLoading(false); // Hide loader on error
      });

      return () => unsubscribeSnapshot();
    } else if (!user) { // If no user and not loading, hide loader
      setIsPageLoading(false);
    }
  }, [user, setIsPageLoading]); // Depend on user and setIsPageLoading

  // Removed if (loading) block

  if (!user) {
    return (
      <div className="student-main-content">
        <p>Please log in to view your enrolled classes.</p>
        <Link to="/login">Login</Link>
      </div>
    );
  }

  return (
    <div className="student-main-content fade-in">
      <div className="welcome-banner">
        <h2 className="gradient-text">Welcome, {displayName || 'Student'}!</h2>
        <p>Continue your learning journey and achieve your goals!</p>
      </div>

      <h3 className="gradient-text">My Enrolled Classes</h3>
      {enrolledClasses.length === 0 ? (
        <p className="content-placeholder">You are not enrolled in any classes yet. Join a class using an invitation link!</p>
      ) : (
        <div className="enrolled-classes-grid">
          {enrolledClasses.map((classItem) => (
            <Link to={`/student/class/${classItem.id}`} key={classItem.id} className="student-dashboard-card">
              <FaBookOpen className="card-icon" />
              <div>
                <h2>{classItem.name}</h2>
                <div className="class-teacher-info">
                  <FaChalkboardTeacher /> <span>{classItem.teacherName}</span>
                </div>
              </div>
              <div className="card-progress-container">
                <div className="card-progress-fill" style={{ width: `${classItem.progress}%` }}></div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <UnlockableCourses userPoints={userPoints} unlockedCourses={unlockedCourses} />
    </div>
  );
}


