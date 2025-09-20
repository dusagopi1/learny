import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { generateContentWithGemini } from '../../utils/geminiApi';
import { useToast } from '../../components/Toast';
import { db } from '../../firebase-config';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { courses } from '../../utils/courses'; // Import the centralized course data

const MIN_PASS_SCORE = 75; // 75% to pass

export default function FinalExamView({ courseName, user, onBack }) {
  const { showToast } = useToast();
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [score, setScore] = useState(0);
  const [examCompleted, setExamCompleted] = useState(false);

  useEffect(() => {
    const generateExam = async () => {
      setIsLoading(true);
      try {
        const prompt = `Generate a 10-question multiple-choice final exam for the course "${courseName}". Each question should have 4 options and one correct answer. Format as a JSON array of objects with "question", "options", and "correctAnswer".`;
        const response = await generateContentWithGemini(prompt);
        const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
        const cleanedResponse = jsonMatch ? jsonMatch[1] : response;
        setQuestions(JSON.parse(cleanedResponse));
      } catch (error) {
        showToast("Failed to generate exam.", 'error');
      } finally {
        setIsLoading(false);
      }
    };
    generateExam();
  }, [courseName, showToast]);

  const handleAnswerSelect = (questionIndex, answer) => {
    setSelectedAnswers(prev => ({ ...prev, [questionIndex]: answer }));
  };

  const handleSubmitExam = () => {
    let correctAnswers = 0;
    questions.forEach((q, index) => {
      if (selectedAnswers[index] === q.correctAnswer) {
        correctAnswers++;
      }
    });
    const finalScore = (correctAnswers / questions.length) * 100;
    setScore(finalScore);
    setExamCompleted(true);

    if (finalScore >= MIN_PASS_SCORE) {
      showToast(`Congratulations! You passed with a score of ${finalScore.toFixed(0)}%.`, 'success');
      
      const currentCourseId = courseName.toLowerCase().replace(/\s+/g, '-');
      const currentCourseIndex = courses.findIndex(c => c.id === currentCourseId);
      
      if (currentCourseIndex !== -1 && currentCourseIndex < courses.length - 1) {
        const nextCourse = courses[currentCourseIndex + 1];
        if (user) {
          const userRef = doc(db, 'users', user.uid);
          updateDoc(userRef, {
            unlockedCourses: arrayUnion(nextCourse.id)
          }).then(() => {
            showToast(`You have unlocked the next course: ${nextCourse.name}!`, 'success');
          }).catch(err => console.error("Error unlocking course:", err));
        }
      }
    } else {
      showToast(`You did not pass. Your score was ${finalScore.toFixed(0)}%. Please review the material and try again.`, 'error');
    }
  };

  if (isLoading) return <p>Generating Final Exam...</p>;

  if (examCompleted) {
    return (
      <div className="quiz-completed-view">
        <h3>Exam Completed!</h3>
        <p>Your score: {score.toFixed(0)}%</p>
        <div className="quiz-review">
          {questions.map((q, index) => (
            <div key={index} className="question-review-card">
              <h4>{index + 1}. {q.question}</h4>
              <p className={selectedAnswers[index] === q.correctAnswer ? 'correct' : 'incorrect'}>
                Your answer: {selectedAnswers[index] || 'Not answered'}
              </p>
              {selectedAnswers[index] !== q.correctAnswer && (
                <p className="correct-answer">Correct answer: {q.correctAnswer}</p>
              )}
            </div>
          ))}
        </div>
        <button onClick={onBack} className="btn primary-btn mt-4">Back to Course</button>
      </div>
    );
  }

  return (
    <div className="ai-quiz-view">
      <h3>Final Exam: {courseName}</h3>
      {questions.map((q, index) => (
        <div key={index} className="exam-question-card">
          <h4>{index + 1}. {q.question}</h4>
          <div className="quiz-options">
            {q.options.map((option, i) => (
              <button 
                key={i} 
                className={`quiz-option-btn ${selectedAnswers[index] === option ? 'selected' : ''}`}
                onClick={() => handleAnswerSelect(index, option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ))}
      <button onClick={handleSubmitExam} className="btn primary-btn large-btn mt-4">Submit Exam</button>
    </div>
  );
}

FinalExamView.propTypes = {
  courseName: PropTypes.string.isRequired,
  user: PropTypes.object,
  onBack: PropTypes.func.isRequired,
};
