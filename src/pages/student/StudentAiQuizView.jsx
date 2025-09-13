import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore'
import { db, auth } from '../../firebase-config'
import { useToast } from '../../components/Toast' // Import useToast hook

export default function StudentAiQuizView() {
  const { classId, chapterId, topicId, exerciseId } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast(); // Use the toast hook
  const [quiz, setQuiz] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedAnswers, setSelectedAnswers] = useState({}) // { questionId: optionId/array of optionIds }
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [hasAttempted, setHasAttempted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!classId || !chapterId || !topicId || !exerciseId) return

    const fetchQuiz = async () => {
      try {
        const classRef = doc(db, 'classes', classId)
        const classSnap = await getDoc(classRef)

        if (!classSnap.exists()) {
          console.error("Class not found!")
          setLoading(false)
          return
        }

        const classData = classSnap.data()
        const currentChapter = classData.chapters?.find(ch => ch.id === chapterId)
        const currentTopic = currentChapter?.topics?.find(t => t.id === topicId)
        const currentExercise = currentTopic?.exercises?.find(ex => ex.id === exerciseId)

        console.log("Fetched current exercise for student view:", currentExercise); // Add this line

        if (currentExercise) {
          setQuiz(currentExercise)

          if (auth.currentUser) {
            const userRef = doc(db, 'users', auth.currentUser.uid)
            const userSnap = await getDoc(userRef)

            if (userSnap.exists()) {
              const userData = userSnap.data()
              const attempted = userData.attemptedQuizzes?.some(
                (q) => q.exerciseId === exerciseId && q.classId === classId
              )
              if (attempted) {
                setHasAttempted(true)
                setSubmitted(true) // Show results if already attempted
                const previousAttempt = userData.attemptedQuizzes.find(
                  (q) => q.exerciseId === exerciseId && q.classId === classId
                )
                setScore(previousAttempt?.score || 0)
                // Optionally, load previous answers if stored in `attemptedQuizzes`
              }
            }
          }
        } else {
          console.error("Exercise not found!")
        }
      } catch (error) {
        console.error("Error fetching quiz details for student:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchQuiz()
  }, [classId, chapterId, topicId, exerciseId, auth.currentUser])

  const handleAnswerChange = (questionId, optionId, type) => {
    if (submitted || hasAttempted) return

    setSelectedAnswers(prev => {
      if (type === 'single-answer') {
        return {
          ...prev,
          [questionId]: optionId,
        }
      } else if (type === 'multiple-answer') {
        const currentSelections = prev[questionId] || []
        if (currentSelections.includes(optionId)) {
          return {
            ...prev,
            [questionId]: currentSelections.filter(id => id !== optionId),
          }
        } else {
          return {
            ...prev,
            [questionId]: [...currentSelections, optionId],
          }
        }
      }
      return prev
    })
  }

  const calculateScore = () => {
    let currentScore = 0
    quiz.questions.forEach(question => {
      if (question.type === 'single-answer') {
        const correctOption = question.options.find(opt => opt.isCorrect)
        if (correctOption && selectedAnswers[question.id] === correctOption.id) {
          currentScore += question.points
        }
      } else if (question.type === 'multiple-answer') {
        const correctOptions = question.options.filter(opt => opt.isCorrect).map(opt => opt.id)
        const studentSelected = selectedAnswers[question.id] || []
        const isCorrect =
          correctOptions.length === studentSelected.length &&
          correctOptions.every(optId => studentSelected.includes(optId))
        if (isCorrect) {
          currentScore += question.points
        }
      }
    })
    return currentScore
  }

  const handleSubmitQuiz = async () => {
    if (!auth.currentUser || submitted || hasAttempted || isSubmitting) return

    setIsSubmitting(true)
    try {
      const finalScore = calculateScore()
      setScore(finalScore)

      const userRef = doc(db, 'users', auth.currentUser.uid)
      const userSnap = await getDoc(userRef)

      if (userSnap.exists()) {
        const userData = userSnap.data()
        const currentPoints = userData.totalPoints || 0
        const newPoints = currentPoints + finalScore

        const newAttempt = {
          classId,
          chapterId,
          topicId,
          exerciseId,
          score: finalScore,
          timestamp: new Date().toISOString(),
        }

        let currentStreak = userData.streak || 0
        let lastQuizDate = userData.lastQuizDate ? new Date(userData.lastQuizDate) : null
        const today = new Date()
        today.setHours(0,0,0,0)

        if (finalScore > 0) {
            if (lastQuizDate) {
                const diffTime = Math.abs(today - lastQuizDate)
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

                if (diffDays === 1) {
                    currentStreak += 1
                } else if (diffDays > 1) {
                    currentStreak = 1
                }
            } else {
                currentStreak = 1
            }
        } else {
            currentStreak = 0
        }

        await updateDoc(userRef, {
          totalPoints: newPoints,
          attemptedQuizzes: arrayUnion(newAttempt),
          streak: currentStreak,
          lastQuizDate: today.toISOString(),
        })

        showToast(`Quiz submitted! You scored ${finalScore} points.`, 'success'); // Use toast
        setSubmitted(true)
        setHasAttempted(true)
      } else {
        console.error("Student profile not found. Cannot submit quiz.")
        showToast('Student profile not found. Cannot submit quiz.', 'error'); // Use toast
      }
    } catch (error) {
      console.error("Error submitting quiz:", error)
      showToast('Failed to submit quiz. Please try again.', 'error'); // Use toast
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return <div className="page fade-in">Loading quiz...</div>
  }

  if (!quiz) {
    return <div className="page fade-in">Quiz not found.</div>
  }

  return (
    <div className="page fade-in">
      <h2>{quiz.title}</h2>
      <p>Due: {new Date(quiz.dueDate).toLocaleString()}</p>
      <div dangerouslySetInnerHTML={{ __html: quiz.description }} />

      <div className="quiz-questions">
        {quiz.questions.map((question, qIndex) => (
          <div key={question.id} className="question-item">
            <p><strong>{qIndex + 1}. {question.questionText}</strong></p>
            <div className="options-list">
              {question.options.map(option => (
                <label key={option.id} className="option-label">
                  <input
                    type={question.type === 'single-answer' ? 'radio' : 'checkbox'}
                    name={`question-${question.id}`}
                    value={option.id}
                    checked={question.type === 'single-answer'
                      ? selectedAnswers[question.id] === option.id
                      : (selectedAnswers[question.id] || []).includes(option.id)}
                    onChange={() => handleAnswerChange(question.id, option.id, question.type)}
                    disabled={submitted || hasAttempted}
                  />
                  {option.text}
                  {submitted && option.isCorrect && <span className="correct-answer-indicator"> (Correct)</span>}
                  {submitted && !option.isCorrect && selectedAnswers[question.id] === option.id && <span className="incorrect-answer-indicator"> (Your Answer)</span>}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSubmitQuiz}
        disabled={submitted || hasAttempted || isSubmitting}
        className="submit-quiz-btn"
      >
        {isSubmitting ? 'Submitting...' : submitted ? 'Attempted' : 'Submit Quiz'}
      </button>

      {(submitted || hasAttempted) && (
        <div className="quiz-results fade-in">
          <h3>Your Score: {score} / {quiz.questions.reduce((sum, q) => sum + q.points, 0)}</h3>
          {/* Optionally show detailed feedback or correct answers here */}
        </div>
      )}
    </div>
  )
}
