import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase-config';

export default function ClassSubmissions() {
  const { classId } = useParams();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!classId) return;

      setLoading(true);
      setError(null);

      try {
        // Fetch all users (students)
        const usersRef = collection(db, 'users');
        const studentQuery = query(usersRef, where('role', '==', 'student'));
        const studentSnapshots = await getDocs(studentQuery);

        const allSubmissions = [];

        for (const studentDoc of studentSnapshots.docs) {
          const studentData = studentDoc.data();
          const studentId = studentDoc.id;
          const studentName = studentData.displayName || `Student ${studentId.substring(0, 5)}`;

          // Filter attempted quizzes relevant to this class
          const classAttempts = (studentData.attemptedQuizzes || []).filter(
            (attempt) => attempt.classId === classId
          );

          for (const attempt of classAttempts) {
            // Fetch exercise details for each attempted quiz
            const classRef = doc(db, 'classes', classId);
            const classSnap = await getDoc(classRef);
            if (!classSnap.exists()) continue;

            const classData = classSnap.data();
            let exerciseTitle = 'Unknown Exercise';
            let topicTitle = 'Unknown Topic';
            let chapterTitle = 'Unknown Chapter';

            classData.chapters?.forEach(chapter => {
              chapter.topics?.forEach(topic => {
                topic.exercises?.forEach(exercise => {
                  if (exercise.id === attempt.exerciseId) {
                    exerciseTitle = exercise.title;
                    topicTitle = topic.title;
                    chapterTitle = chapter.title;
                  }
                });
              });
            });

            allSubmissions.push({
              studentId,
              studentName,
              chapterTitle,
              topicTitle,
              exerciseTitle,
              score: attempt.score,
              timestamp: attempt.timestamp,
            });
          }
        }
        setSubmissions(allSubmissions);
      } catch (err) {
        console.error("Error fetching submissions:", err);
        setError("Failed to load submissions.");
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [classId]);

  if (loading) {
    return <div className="class-main-content">Loading submissions...</div>;
  }

  if (error) {
    return <div className="class-main-content error-message">{error}</div>;
  }

  return (
    <div className="class-main-content fade-in">
      <h2>Class Submissions</h2>
      {submissions.length === 0 ? (
        <p>No submissions found for this class yet.</p>
      ) : (
        <div className="submissions-list">
          {submissions.map((submission, index) => (
            <div key={index} className="submission-item">
              <h3>{submission.exerciseTitle}</h3>
              <p><strong>Student:</strong> {submission.studentName}</p>
              <p><strong>Chapter:</strong> {submission.chapterTitle}</p>
              <p><strong>Topic:</strong> {submission.topicTitle}</p>
              <p><strong>Score:</strong> {submission.score}</p>
              <p><strong>Date:</strong> {new Date(submission.timestamp).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

