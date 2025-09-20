import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, collection, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase-config';
import { useToast } from '../../components/Toast';
import { FaCheckCircle, FaTimesCircle, FaClock } from 'react-icons/fa';
import { onAuthStateChanged } from 'firebase/auth'; // Import onAuthStateChanged

export default function StudentDailyQuizzesView() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [dailyQuizzes, setDailyQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [totalPossiblePoints, setTotalPossiblePoints] = useState(0);
  const [hasAttempted, setHasAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentId, setStudentId] = useState(null); // New state for student UID

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setStudentId(user.uid);
      } else {
        setStudentId(null); // User logged out
        setLoading(false); // Stop loading if no user
      }
    });

    const fetchDailyQuizzes = () => {
      const q = query(collection(db, 'dailyQuizzes'));
      const unsubscribeFirestore = onSnapshot(q, (snapshot) => {
        const fetchedQuizzes = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setDailyQuizzes(fetchedQuizzes);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching daily quizzes for student:", error);
        setLoading(false);
      });
      return unsubscribeFirestore;
    };

    if (studentId !== null) { // Only fetch quizzes if studentId is available
      return fetchDailyQuizzes();
    }

    return () => unsubscribeAuth(); // Cleanup auth listener
  }, [studentId]); // Rerun effect when studentId changes

  const handleQuizSelect = async (quiz) => {
    if (!studentId) {
      showToast('You must be logged in to view quizzes.', 'error');
      return;
    }
    setSelectedQuiz(quiz);
    setSubmitted(false);
    setScore(0);
    setSelectedAnswers({});
    let totalPoints = 0;
    if (quiz.questions) {
      totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);
    }
    setTotalPossiblePoints(totalPoints);

    const userRef = doc(db, 'users', studentId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const attempted = userData.attemptedDailyQuizzes?.some(
        (q) => q.quizId === quiz.id
      );
      if (attempted) {
        setHasAttempted(true);
        setSubmitted(true);
        const previousAttempt = userData.attemptedDailyQuizzes.find(
          (q) => q.quizId === quiz.id
        );
        setScore(previousAttempt?.score || 0);
        setSelectedAnswers(previousAttempt?.selectedAnswers || {});
      } else {
        setHasAttempted(false);
      }
    }
  };

  const handleAnswerChange = (questionId, optionId, type) => {
    if (submitted || hasAttempted) return;

    setSelectedAnswers(prev => {
      if (type === 'single-answer') {
        return {
          ...prev,
          [questionId]: optionId,
        };
      } else if (type === 'multiple-answer') {
        const currentSelections = prev[questionId] || [];
        if (currentSelections.includes(optionId)) {
          return {
            ...prev,
            [questionId]: currentSelections.filter(id => id !== optionId),
          };
        } else {
          return {
            ...prev,
            [questionId]: [...currentSelections, optionId],
          };
        }
      }
      return prev;
    });
  };

  const calculateScore = () => {
    let currentScore = 0;
    selectedQuiz.questions.forEach(question => {
      const selected = selectedAnswers[question.id];
      if (question.type === 'single-answer') {
        const correctOption = question.options.find(opt => opt.isCorrect);
        if (correctOption && selected === correctOption.id) {
          currentScore += question.points;
        }
      } // Add multiple-answer logic if needed later
    });
    return currentScore;
  };

  const handleSubmitQuiz = async () => {
    if (!studentId) {
      showToast('You must be logged in to submit the quiz.', 'error');
      return;
    }
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const finalScore = calculateScore();
      setScore(finalScore);
      setSubmitted(true);

      const userRef = doc(db, 'users', studentId);
      const userSnap = await getDoc(userRef); // Fetch user data here
      if (!userSnap.exists()) {
        throw new Error("Student user document not found.");
      }
      
      const newAttempt = {
        quizId: selectedQuiz.id,
        score: finalScore,
        totalPoints: totalPossiblePoints,
        attemptedAt: new Date(), // Use client-side timestamp for array element
        selectedAnswers: selectedAnswers, // Store selected answers for review
      };

      await updateDoc(userRef, {
        attemptedDailyQuizzes: arrayUnion(newAttempt),
        totalPoints: (userSnap.data().totalPoints || 0) + finalScore, // Update student's total points
      });
      showToast('Quiz submitted successfully.', 'success');
    } catch (error) {
      console.error("Error submitting quiz:", error);
      showToast('Failed to submit quiz.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="page-loading">Loading quizzes...</div>;
  }

  return (
    <div className="daily-quizzes-page page fade-in">
      <div className="page-header">
        <h2>Daily Quizzes</h2>
      </div>

      {!selectedQuiz ? (
        dailyQuizzes.length === 0 ? (
          <p className="content-placeholder">No quizzes available at the moment. Check back later!</p>
        ) : (
          <div className="quizzes-grid">
            {dailyQuizzes.map(quiz => (
              <div key={quiz.id} className="quiz-card" onClick={() => handleQuizSelect(quiz)}>
                <h3>{quiz.title}</h3>
                <p>{quiz.description}</p>
                <p>Questions: {quiz.questions?.length || 0}</p>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="selected-quiz-view">
          <div className="page-header-alt">
            <button onClick={() => setSelectedQuiz(null)} className="btn secondary-btn-alt">
              Back to Quizzes
            </button>
            <h3>{selectedQuiz.title}</h3>
          </div>
          
          <div className="card-item">
            <p>{selectedQuiz.description}</p>
            <p>Total Possible Points: {totalPossiblePoints}</p>
          </div>

          {hasAttempted && submitted ? (
            <div className="quiz-result-card fade-in">
              <h3>Your Result</h3>
              <p className="score-display">You Scored: <span className="actual-score">{score}</span> / {totalPossiblePoints} points</p>
              <p className="result-message">{score === totalPossiblePoints ? 'Excellent! Perfect score!' : score > (totalPossiblePoints / 2) ? 'Great job! Keep learning!' : 'Review the topic and try again!'}</p>
              <div className="review-questions questions-list">
                <h4>Review Questions:</h4>
                {selectedQuiz.questions.map((question, qIndex) => (
                  <div key={question.id} className="question-card">
                    <p><strong>{qIndex + 1}. {question.questionText}</strong> ({question.points} points)</p>
                    <div className="options-list">
                      {question.options.map(option => {
                        const isSelected = (Array.isArray(selectedAnswers[question.id]) && selectedAnswers[question.id].includes(option.id)) ||
                                         (!Array.isArray(selectedAnswers[question.id]) && selectedAnswers[question.id] === option.id);
                        const isCorrect = option.isCorrect;
                        let optionClass = '';
                        if (isSelected && isCorrect) optionClass = 'correct-answer';
                        else if (isSelected && !isCorrect) optionClass = 'incorrect-answer';
                        else if (isCorrect) optionClass = 'correct-answer';

                        return (
                          <div key={option.id} className={`option-item ${optionClass}`}>
                            {isCorrect && <FaCheckCircle className="correct-icon" />}
                            {!isCorrect && isSelected && <FaTimesCircle className="incorrect-icon" />}
                            <span>{option.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="quiz-questions-section questions-list">
              {selectedQuiz.questions.map((question, qIndex) => (
                <div key={question.id} className="question-card">
                  <p><strong>{qIndex + 1}. {question.questionText}</strong> ({question.points} points)</p>
                  <div className="options-list">
                    {question.options.map(option => (
                      <div key={option.id} className="option-item">
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          checked={selectedAnswers[question.id] === option.id}
                          onChange={() => handleAnswerChange(question.id, option.id, question.type)}
                          disabled={isSubmitting}
                          className="form-radio"
                        />
                        <span>{option.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button onClick={handleSubmitQuiz} disabled={isSubmitting || submitted} className="btn primary-btn">
                {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
