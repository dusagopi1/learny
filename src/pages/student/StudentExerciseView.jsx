import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../../firebase-config';
import { FaCheckCircle, FaTimesCircle, FaClock, FaBookOpen } from 'react-icons/fa'; // Import additional icons
import { marked } from 'marked'; // Import marked

export default function StudentExerciseView() {
  const { classId, chapterId, topicId, exerciseId } = useParams();
  const navigate = useNavigate();
  const [exercise, setExercise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [totalPossiblePoints, setTotalPossiblePoints] = useState(0);
  const [hasAttempted, setHasAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false); // New state for confetti animation
  const [currentTopicName, setCurrentTopicName] = useState(''); // Add state for topic name

  // Disable text selection and copying (consider if this is always desirable for UX)
  useEffect(() => {
    const disableSelection = (e) => {
      e.preventDefault();
      return false;
    };
    document.addEventListener('selectstart', disableSelection);
    document.addEventListener('copy', disableSelection);
    // document.addEventListener('contextmenu', disableSelection); // Often annoying for users

    return () => {
      document.removeEventListener('selectstart', disableSelection);
      document.removeEventListener('copy', disableSelection);
      // document.removeEventListener('contextmenu', disableSelection);
    };
  }, []);

  useEffect(() => {
    if (!classId || !chapterId || !topicId || !exerciseId || !auth.currentUser) return;

    const fetchExerciseAndStudentProgress = async () => {
      setLoading(true);
      try {
        const classRef = doc(db, 'classes', classId);
        const classSnap = await getDoc(classRef);

        if (!classSnap.exists()) {
          console.error("Class not found!");
          setLoading(false);
          return;
        }

        const classData = classSnap.data();
        const currentChapter = classData.chapters?.find(ch => ch.id === chapterId);
        const currentTopic = currentChapter?.topics?.find(t => t.id === topicId);
        const currentExercise = currentTopic?.exercises?.find(ex => ex.id === exerciseId);

        if (currentExercise) {
          // Set the topic name
          setCurrentTopicName(currentTopic?.name || 'Unknown Topic');
          
          // Parse exercise description with marked
          setExercise({ ...currentExercise, description: marked.parse(currentExercise.description || '') });

          const totalPoints = currentExercise.questions.reduce((sum, q) => sum + q.points, 0);
          setTotalPossiblePoints(totalPoints);

          const userRef = doc(db, 'users', auth.currentUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = userSnap.data();
            const previousAttempt = userData.attemptedQuizzes?.find(
              (quiz) => quiz.exerciseId === exerciseId
            );

            if (previousAttempt) {
              setHasAttempted(true);
              setSubmitted(true); // Show results if already attempted
              setScore(previousAttempt.score || 0);
              // If selected answers were stored, populate them here to show student's choices
              // setSelectedAnswers(previousAttempt.selectedAnswers || {});
            }
          }
        } else {
          console.error("Exercise not found!");
        }
      } catch (error) {
        console.error("Error fetching exercise details for student:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchExerciseAndStudentProgress();
  }, [classId, chapterId, topicId, exerciseId, auth.currentUser]);

  const handleAnswerChange = (questionId, optionId, type) => {
    if (submitted || hasAttempted) return; // Prevent changing answers after submission or if already attempted

    setSelectedAnswers((prev) => {
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
            [questionId]: currentSelections.filter((id) => id !== optionId),
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
    exercise.questions.forEach((question) => {
      if (question.type === 'single-answer') {
        const correctOption = question.options.find((opt) => opt.isCorrect);
        if (correctOption && selectedAnswers[question.id] === correctOption.id) {
          currentScore += question.points;
        }
      } else if (question.type === 'multiple-answer') {
        const correctOptions = question.options.filter((opt) => opt.isCorrect).map((opt) => opt.id);
        const studentSelected = selectedAnswers[question.id] || [];
        const isCorrect =
          correctOptions.length === studentSelected.length &&
          correctOptions.every((optId) => studentSelected.includes(optId));
        if (isCorrect) {
          currentScore += question.points;
        }
      }
      // Short answer type is not scored automatically here, would require manual grading or AI
    });
    return currentScore;
  };

  const handleSubmitQuiz = async () => {
    if (!auth.currentUser || submitted || hasAttempted || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const finalScore = calculateScore();
      setScore(finalScore);

      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        const currentPoints = userData.totalPoints || 0;
        const newPoints = currentPoints + finalScore;

        // Update attempted quizzes
        const newAttempt = {
          classId,
          chapterId,
          topicId,
          exerciseId,
          score: finalScore,
          timestamp: new Date().toISOString(),
          // Optionally store selectedAnswers here if you want to show student's choices later
          // selectedAnswers: selectedAnswers, // Uncomment to store student answers
        };

        // Streak logic (basic for now, can be enhanced)
        let currentStreak = userData.streak || 0;
        let lastQuizDate = userData.lastQuizDate ? new Date(userData.lastQuizDate) : null;
        const today = new Date();
        today.setHours(0,0,0,0);

        if (finalScore > 0) { // Only count correct attempts for streaks
            if (lastQuizDate) {
                const diffTime = Math.abs(today - lastQuizDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays === 1) { // If last quiz was yesterday
                    currentStreak += 1;
                } else if (diffDays > 1) { // If there's a gap
                    currentStreak = 1;
                }
                // else if diffDays === 0, means multiple quizzes today, streak doesn't increase, streak stays same
            } else {
                currentStreak = 1; // First quiz
            }
        } else {
            currentStreak = 0; // Break streak if score is 0
        }

        await updateDoc(userRef, {
          totalPoints: newPoints,
          attemptedQuizzes: arrayUnion(newAttempt),
          streak: currentStreak,
          lastQuizDate: today.toISOString(),
        });

        // No longer using alert, will display results in UI
        setSubmitted(true);
        setHasAttempted(true); // Mark as attempted
        if (finalScore > 0) { // Only show confetti for non-zero scores
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 5000); // Hide after 5 seconds
        }
      } else {
        console.error("Student profile not found. Cannot submit quiz.");
        // alert("Failed to submit quiz: Student profile not found.");
      }
    } catch (error) {
      console.error("Error submitting quiz:", error);
      // alert("Failed to submit quiz. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="student-main-content">Loading quiz...</div>;
  }

  if (!exercise) {
    return <div className="student-main-content">Quiz not found.</div>;
  }

  const CompletionAnimation = () => {
    const generateRandomParticles = (type, count) => {
      return Array.from({ length: count }).map((_, i) => {
        const size = Math.random() * 8 + 5; // Size between 5px and 13px
        const xStart = Math.random() * window.innerWidth;
        const yStart = -Math.random() * 200;
        const xEnd = Math.random() * window.innerWidth - window.innerWidth / 2; // Spread across x-axis
        const yEnd = window.innerHeight + Math.random() * 200;
        const rotation = Math.random() * 360;
        const duration = 1.5 + Math.random() * 1;
        const delay = Math.random() * 0.8;
        const spin = Math.random() * 720 + 360;
        const color = `hsl(${Math.random() * 360}, 70%, 60%)`; // Random vibrant color

        return (
          <div
            key={i}
            className={type}
            style={{
              width: `${size}px`,
              height: `${size}px`,
              backgroundColor: type === 'confetti' ? color : 'gold',
              left: `${xStart}px`,
              top: `${yStart}px`,
              animation: `${type}-fall ${duration}s ease-out ${delay}s forwards`,
              '--x-start': `0px`,
              '--y-start': `0px`,
              '--x-end': `${xEnd}px`,
              '--y-end': `${yEnd}px`,
              // For confetti, use the CSS keyframes directly
              // For stars, use the CSS keyframes directly
            }}
          />
        );
      });
    };

    return (
      <div className="completion-animation-container">
        {generateRandomParticles('confetti', 50)} {/* Generate 50 confetti pieces */}
        {generateRandomParticles('star', 15)} {/* Generate 15 stars */}
      </div>
    );
  };

  return (
    <div className="student-exercise-view-container fade-in" style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none' }}>
      <div className="exercise-header-section card-item">
        <h2 className="exercise-title">{exercise.title}</h2>
        <div className="exercise-meta-info">
            <p><FaBookOpen /> Topic: {currentTopicName}</p>
            <p><FaClock /> Due Date: {exercise.dueDate ? new Date(exercise.dueDate).toLocaleDateString() : 'N/A'}</p>
            <p>Total Points: {totalPossiblePoints}</p>
        </div>
      </div>

      {hasAttempted && submitted && (
        <div className="quiz-result-card card-item fade-in">
          <h3>Your Result</h3>
          <p className="score-display">You scored: <span className="actual-score">{score}</span> / {totalPossiblePoints} points</p>
          <p className="result-message">{score === totalPossiblePoints ? 'Excellent! Perfect score!' : score > (totalPossiblePoints / 2) ? 'Great job, keep learning!' : 'Review the topic and try again!'}</p>
          <button onClick={() => navigate(-1)} className="back-to-topic-btn">Back to Topic</button>
        </div>
      )}

      <div className="exercise-question-section">
        <div className="exercise-description" dangerouslySetInnerHTML={{ __html: exercise.description }}></div>

        <div className="questions-list">
          {exercise.questions.length === 0 ? (
            <p className="content-placeholder">No questions available for this quiz.</p>
          ) : (
            exercise.questions.map((question, qIndex) => (
              <div key={question.id} className="question-card card-item fade-in">
                <div className="question-header">
                  <h4>{qIndex + 1}. {question.questionText} <span className="question-points">({question.points} points)</span></h4>
                  {submitted && (
                    question.type === 'single-answer' &&
                    question.options.find(opt => opt.isCorrect)?.id === selectedAnswers[question.id] ?
                    <FaCheckCircle className="correct-answer-indicator" title="Correct Answer" /> :
                    <FaTimesCircle className="incorrect-answer-indicator" title="Incorrect Answer" />
                  )}
                   {submitted && (
                      question.type === 'multiple-answer' && (() => {
                          const correctOptions = question.options.filter(opt => opt.isCorrect).map(opt => opt.id);
                          const studentSelected = selectedAnswers[question.id] || [];
                          const isCorrect = correctOptions.length === studentSelected.length &&
                                            correctOptions.every(optId => studentSelected.includes(optId));
                          return isCorrect ? <FaCheckCircle className="correct-answer-indicator" /> : <FaTimesCircle className="incorrect-answer-indicator" />;
                      })()
                   )}
                </div>

                <div className="options-list">
                  {question.options.map((option) => (
                    <div key={option.id} className={`option-item ${submitted && option.isCorrect ? 'option-correct' : ''} ${submitted && !option.isCorrect && (selectedAnswers[question.id] === option.id || (Array.isArray(selectedAnswers[question.id]) && selectedAnswers[question.id].includes(option.id))) ? 'option-incorrect' : ''}`}>
                      <input
                        type={question.type === 'single-answer' ? 'radio' : 'checkbox'}
                        name={`question-${question.id}`}
                        id={`option-${option.id}`}
                        checked={
                          question.type === 'single-answer'
                            ? selectedAnswers[question.id] === option.id
                            : (selectedAnswers[question.id] || []).includes(option.id)
                        }
                        onChange={() =>
                          handleAnswerChange(question.id, option.id, question.type)
                        }
                        disabled={submitted || hasAttempted}
                      />
                      <label htmlFor={`option-${option.id}`}>{option.text}</label>
                      {submitted && option.isCorrect && (
                        <FaCheckCircle className="correct-option-text-indicator" title="Correct Answer" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {!submitted && !hasAttempted && (
          <button onClick={handleSubmitQuiz} disabled={isSubmitting} className="submit-quiz-btn primary-btn">
            {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
          </button>
        )}
      </div>
      {showConfetti && <CompletionAnimation />} {/* Conditionally render animation */}
    </div>
  );
}
