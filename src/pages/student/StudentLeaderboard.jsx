import { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase-config';
import { FaTrophy, FaUserCircle } from 'react-icons/fa';

export default function StudentLeaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const usersRef = collection(db, 'users');
        const q = query(usersRef, orderBy('totalPoints', 'desc'));
        const querySnapshot = await getDocs(q);

        const studentData = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.role === 'student') { // Only include students in the leaderboard
            studentData.push({
              id: doc.id,
              displayName: data.displayName || 'Anonymous Student',
              totalPoints: data.totalPoints || 0,
              // Add other relevant fields like profile picture, streak if desired
            });
          }
        });

        setLeaderboard(studentData);
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
        setError("Failed to load leaderboard. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  if (loading) {
    return <div className="student-main-content leaderboard-container">Loading leaderboard...</div>;
  }

  if (error) {
    return <div className="student-main-content leaderboard-container error">Error: {error}</div>;
  }

  return (
    <div className="student-main-content leaderboard-container fade-in">
      <h2 className="leaderboard-header">Leaderboard</h2>
      {leaderboard.length === 0 ? (
        <p className="content-placeholder">No students on the leaderboard yet. Start earning points!</p>
      ) : (
        <div className="leaderboard-list">
          {leaderboard.map((student, index) => (
            <div key={student.id} className="leaderboard-item">
              <span className="rank">{index + 1}</span>
              <div className="student-info">
                <FaUserCircle className="student-avatar" />
                <span className="student-name">{student.displayName}</span>
              </div>
              <span className="student-points">{student.totalPoints} XP</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
