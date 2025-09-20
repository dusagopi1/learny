import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { generateContentWithGemini } from '../../utils/geminiApi';
import { useToast } from '../../components/Toast';

export default function AIQuizView({ courseName, onBack }) {
  const { showToast } = useToast();
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null); // This will be deprecated but kept for button selection styling
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);

  useEffect(() => {
    const generateQuiz = async () => {
      setIsLoading(true);
      try {
        const prompt = `Generate a 5-question multiple-choice quiz on the topic of "${courseName}". Each question should have 4 options, and one correct answer. Format the output as a JSON array of objects. Each object should have a "question", "options" (an array of 4 strings), and "correctAnswer" (the string of the correct option).`;
        const response = await generateContentWithGemini(prompt);
        const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
        const cleanedResponse = jsonMatch ? jsonMatch[1] : response;
        const quizQuestions = JSON.parse(cleanedResponse);
        setQuestions(quizQuestions);
      } catch (error) {
        console.error("Error generating quiz:", error);
        showToast("Failed to generate quiz.", 'error');
      } finally {
        setIsLoading(false);
      }
    };
    generateQuiz();
  }, [courseName, showToast]);

  const handleAnswerSelect = (option) => {
    setSelectedAnswer(option);
    setSelectedAnswers(prev => ({ ...prev, [currentQuestionIndex]: option }));
  };

  const handleNextQuestion = () => {
    if (selectedAnswers[currentQuestionIndex] === questions[currentQuestionIndex].correctAnswer) {
      setScore(prev => prev + 1);
    }
    setSelectedAnswer(null); // Reset for the next question's visual selection
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setQuizCompleted(true);
    }
  };

  if (isLoading) {
    return <p>Generating your quiz...</p>;
  }

  if (!questions || questions.length === 0) {
    return (
      <div>
        <p>Could not load quiz questions. Please try again.</p>
        <button onClick={onBack} className="btn primary-btn">Back to Course</button>
      </div>
    );
  }

  if (quizCompleted) {
    return (
      <div className="quiz-completed-view">
        <h3>Quiz Completed!</h3>
        <p>Your score: {score} / {questions.length}</p>
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

  const currentQuestion = questions[currentQuestionIndex];

  if (!currentQuestion || !Array.isArray(currentQuestion.options)) {
    return (
      <div>
        <p>There was an error loading this question. Please try again.</p>
        <button onClick={onBack} className="btn primary-btn">Back to Course</button>
      </div>
    );
  }

  return (
    <div className="ai-quiz-view">
      <h4>{currentQuestion.question}</h4>
      <div className="quiz-options">
        {currentQuestion.options.map((option, index) => (
          <button 
            key={index} 
            className={`quiz-option-btn ${selectedAnswer === option ? 'selected' : ''}`}
            onClick={() => handleAnswerSelect(option)}
          >
            {option}
          </button>
        ))}
      </div>
      <button onClick={handleNextQuestion} disabled={!selectedAnswer} className="btn primary-btn mt-4">
        {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
      </button>
    </div>
  );
}

AIQuizView.propTypes = {
  courseName: PropTypes.string.isRequired,
  onBack: PropTypes.func.isRequired,
};
