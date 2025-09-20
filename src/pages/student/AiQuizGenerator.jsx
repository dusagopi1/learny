import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../../firebase-config';
import { collection, addDoc, serverTimestamp, query, where, orderBy, getDocs, doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import { FaBrain, FaClock, FaQuestionCircle, FaStar, FaLevelUpAlt, FaLanguage, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { generateContentWithGemini } from '../../utils/geminiApi';

const QUIZ_UNLOCK_POINTS = 150;

export default function AiQuizGenerator() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [userPoints, setUserPoints] = useState(0);
  const [studentId, setStudentId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizSettings, setQuizSettings] = useState({
    topic: '',
    language: 'English',
    difficulty: 'medium',
    numQuestions: 5,
    timeLimit: 10, // minutes
  });
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // New state for current question index
  const [userAnswers, setUserAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [totalPossiblePoints, setTotalPossiblePoints] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef(null);
  const [chartData, setChartData] = useState({ scoreDistributionData: [], questionsBreakdownData: [] });

  // Auth state and points fetching
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setStudentId(user.uid);
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserPoints(Number(userSnap.data().totalPoints || 0));
        }
      } else {
        setStudentId(null);
        setUserPoints(0);
        navigate('/login', { state: { message: "Please log in to use the AI Quiz Generator." } });
      }
      setLoading(false);
    });
    return () => unsub();
  }, [navigate]);

  // Timer logic
  useEffect(() => {
    if (timerActive && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prevTime => prevTime - 1);
      }, 1000);
    } else if (timeRemaining === 0 && timerActive) {
      handleSubmitQuiz();
    }
    return () => clearInterval(timerRef.current);
  }, [timerActive, timeRemaining]);

  const handleSettingChange = (e) => {
    const { name, value } = e.target;
    setQuizSettings(prev => ({
      ...prev,
      [name]: name === 'numQuestions' || name === 'timeLimit' ? Number(value) : value,
    }));
  };

  const generateQuiz = async () => {
    if (!studentId) {
      showToast("You must be logged in to generate a quiz.", 'error');
      return;
    }
    if (userPoints < QUIZ_UNLOCK_POINTS) {
      showToast(`You need ${QUIZ_UNLOCK_POINTS} points to unlock the AI Quiz Generator. You currently have ${userPoints} points.`, 'error');
      return;
    }
    if (!quizSettings.topic.trim()) {
      showToast("Please enter a topic for the quiz.", 'error');
      return;
    }

    setIsGeneratingQuiz(true);
    setCurrentQuiz(null);
    setUserAnswers({});
    setQuizSubmitted(false);
    setScore(0);
    setTotalPossiblePoints(0);
    setTimeRemaining(0);
    setTimerActive(false);
    clearInterval(timerRef.current);
    setCurrentQuestionIndex(0); // Reset to first question on new quiz generation

    try {
      const prompt = `Generate a ${quizSettings.difficulty} difficulty, ${quizSettings.numQuestions}-question multiple-choice quiz about "${quizSettings.topic}" in ${quizSettings.language}. Each question should have 4 options (A, B, C, D) and clearly indicate the correct option. Assign 2 points per question. Format the output as a JSON array of objects, where each object has 'questionText', 'options' (an array of objects with 'text' and 'isCorrect'), and 'points'. Ensure the JSON is perfectly parseable and there is only JSON in the response.`;
      const aiResponse = await generateContentWithGemini(prompt);

      if (aiResponse.startsWith("Failed to generate content")) {
        showToast("Failed to generate AI quiz. Please try again.", 'error');
        return;
      }

      let generatedQuizData;
      try {
        // Attempt to extract JSON from potentially messy AI response
        const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/);
        const cleanedResponse = jsonMatch ? jsonMatch[1] : aiResponse;
        generatedQuizData = JSON.parse(cleanedResponse);
        if (!Array.isArray(generatedQuizData) || generatedQuizData.some(q => !q.questionText || !Array.isArray(q.options) || q.options.length < 2)) {
          throw new Error("AI response is not a valid quiz format.");
        }
      } catch (parseError) {
        console.error("Failed to parse AI response as JSON:", parseError);
        showToast("AI generated an unparseable response. Please try again or refine your topic.", 'error');
        return;
      }

      const formattedQuiz = {
        id: Date.now().toString(), // Unique ID for this quiz attempt
        ...quizSettings,
        questions: generatedQuizData.map(q => ({
          ...q,
          options: q.options.map(opt => ({ ...opt, text: String(opt.text) })), // Ensure text is string
          points: q.points || 10,
        })),
        createdAt: serverTimestamp(),
      };

      const totalPoints = formattedQuiz.questions.reduce((sum, q) => sum + q.points, 0);
      setCurrentQuiz(formattedQuiz);
      setTotalPossiblePoints(totalPoints);
      setTimeRemaining(quizSettings.timeLimit * 60); // Convert minutes to seconds
      setTimerActive(true);

      showToast("AI Quiz generated successfully!", 'success');
    } catch (error) {
      console.error("Error generating AI quiz:", error);
      showToast("Failed to generate AI quiz. Please try again.", 'error');
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleAnswerChange = (questionId, selectedOptionText) => {
    setUserAnswers(prev => ({ ...prev, [questionId]: selectedOptionText }));
  };

  const handleNextQuestion = () => {
    if (currentQuiz && currentQuestionIndex < currentQuiz.questions.length - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prevIndex => prevIndex - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!currentQuiz || quizSubmitted) return;
    clearInterval(timerRef.current);
    setTimerActive(false);

    let currentScore = 0;
    const attemptedQuestions = currentQuiz.questions.map(q => {
      const userAnswer = userAnswers[q.id];
      const correctAnswer = q.options.find(opt => opt.isCorrect);
      const isCorrect = userAnswer === correctAnswer?.text;
      if (isCorrect) {
        currentScore += 2; // Each correct question carries 2 points
      }
      return { ...q, userAnswer, isCorrect, correctAnswer: correctAnswer?.text };
    });

    setScore(currentScore);
    setQuizSubmitted(true);
    showToast("Quiz submitted successfully!", 'success');

    const correctAnswersCount = attemptedQuestions.filter(q => q.isCorrect).length;
    const incorrectAnswersCount = attemptedQuestions.length - correctAnswersCount;

    const scoreDistributionData = [
      { name: 'Correct', value: correctAnswersCount, color: '#4CAF50' },
      { name: 'Incorrect', value: incorrectAnswersCount, color: '#F44336' },
    ];
    
    const questionsBreakdownData = attemptedQuestions.map((q, index) => ({
      name: `Q${index + 1}`,
      correct: q.isCorrect ? 2 : 0,
      incorrect: q.isCorrect ? 0 : 2,
      total: 2
    }));

    // New state to store chart data
    setChartData({ scoreDistributionData, questionsBreakdownData });

    // Save quiz attempt to Firestore
    try {
      const userRef = doc(db, 'users', studentId);
      await updateDoc(userRef, {
        aiQuizAttempts: arrayUnion({
          quizId: currentQuiz.id,
          topic: currentQuiz.topic,
          difficulty: currentQuiz.difficulty,
          score: currentScore,
          totalPossiblePoints: currentQuiz.questions.length * 2, // Total possible points are 2 per question
          attemptedAt: new Date(),
          questions: attemptedQuestions.map(q => ({ // Save details of questions and user answers
            questionText: q.questionText,
            userAnswer: q.userAnswer,
            correctAnswer: q.correctAnswer,
            isCorrect: q.isCorrect,
            points: 2 // Each question is 2 points
          }))
        }),
        totalPoints: userPoints + currentScore, // Add earned points to user's total points
      });
      showToast("Quiz results saved!", 'success');
      setUserPoints(prevPoints => prevPoints + currentScore); // Update local state for user points
    } catch (error) {
      console.error("Error saving AI quiz attempt:", error);
      showToast("Failed to save quiz results.", 'error');
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const scorePercentage = totalPossiblePoints > 0 ? (score / totalPossiblePoints) * 100 : 0;

  return (
    <div className="page fade-in">
      <div className="ai-quiz-generator-container">
        <h2><FaBrain /> AI Quiz Generator</h2>
        <p className="description">Generate custom quizzes on any topic, language, and difficulty level.</p>

        {loading ? (
          <p>Loading user data...</p>
        ) : userPoints < QUIZ_UNLOCK_POINTS ? (
          <div className="unlock-message">
            <p>You need {QUIZ_UNLOCK_POINTS} points to unlock the AI Quiz Generator.</p>
            <p>You currently have {userPoints} points. Keep learning to earn more!</p>
          </div>
        ) : (
          <div className="quiz-settings-form">
            <h3>Quiz Settings</h3>
            <div className="input-group">
              <label htmlFor="topic"><FaStar /> Topic:</label>
              <input
                type="text"
                id="topic"
                name="topic"
                value={quizSettings.topic}
                onChange={handleSettingChange}
                placeholder="e.g., Photosynthesis, Pythagorean Theorem"
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="language"><FaLanguage /> Language:</label>
              <select id="language" name="language" value={quizSettings.language} onChange={handleSettingChange}>
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Telugu">Telugu</option>
                <option value="Odia">Odia</option>
                <option value="Tamil">Tamil</option>
              </select>
            </div>
            <div className="input-group">
              <label htmlFor="difficulty"><FaLevelUpAlt /> Difficulty:</label>
              <select id="difficulty" name="difficulty" value={quizSettings.difficulty} onChange={handleSettingChange}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div className="input-group">
              <label htmlFor="numQuestions"><FaQuestionCircle /> Number of Questions:</label>
              <input
                type="number"
                id="numQuestions"
                name="numQuestions"
                value={quizSettings.numQuestions}
                onChange={handleSettingChange}
                min="1"
                max="5"
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="timeLimit"><FaClock /> Time Limit (minutes):</label>
              <input
                type="number"
                id="timeLimit"
                name="timeLimit"
                value={quizSettings.timeLimit}
                onChange={handleSettingChange}
                min="1"
                max="60"
                required
              />
            </div>
            <button onClick={generateQuiz} disabled={isGeneratingQuiz} className="btn primary-btn large-btn">
              {isGeneratingQuiz ? 'Generating Quiz...' : 'Generate AI Quiz'}
            </button>
          </div>
        )}

        {isGeneratingQuiz && (
          <div className="loading-message fade-in">
            <p>Generating your AI Quiz... Please wait.</p>
            {/* You can add a spinner or more elaborate loading animation here */}
          </div>
        )}

        {currentQuiz && !quizSubmitted && userPoints >= QUIZ_UNLOCK_POINTS && (
          <div className="current-quiz-section quiz-active">
            <h3>{currentQuiz.title || 'Generated AI Quiz'}</h3>
            <p className="quiz-meta">Topic: {currentQuiz.topic} | Difficulty: {currentQuiz.difficulty} | Time Left: <span style={{ fontWeight: 'bold', color: timeRemaining <= 60 ? 'red' : 'inherit' }}>{formatTime(timeRemaining)}</span></p>

            <div className="question-navigation">
              <p>Question {currentQuestionIndex + 1} of {currentQuiz.questions.length}</p>
              <progress value={currentQuestionIndex + 1} max={currentQuiz.questions.length}></progress>
            </div>

            {currentQuiz.questions[currentQuestionIndex] && (
              <div className="question-card active-question">
                <p className="question-text">{currentQuestionIndex + 1}. {currentQuiz.questions[currentQuestionIndex].questionText}</p>
                <div className="options-grid">
                  {currentQuiz.questions[currentQuestionIndex].options.map((option, oIndex) => (
                    <label key={oIndex} className="option-item">
                      <input
                        type="radio"
                        name={`question-${currentQuestionIndex}`}
                        value={option.text}
                        checked={userAnswers[currentQuiz.questions[currentQuestionIndex].id] === option.text}
                        onChange={() => handleAnswerChange(currentQuiz.questions[currentQuestionIndex].id, option.text)}
                      />
                      {option.text}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="quiz-navigation-controls">
              <button
                onClick={handlePreviousQuestion}
                disabled={currentQuestionIndex === 0}
                className="btn secondary-btn"
              >
                Previous
              </button>
              {currentQuestionIndex < currentQuiz.questions.length - 1 ? (
                <button onClick={handleNextQuestion} className="btn primary-btn">
                  Next
                </button>
              ) : (
                <button onClick={handleSubmitQuiz} className="btn primary-btn submit-quiz-btn" disabled={quizSubmitted}>
                  Submit Quiz
                </button>
              )}
            </div>
          </div>
        )}

        {quizSubmitted && userPoints >= QUIZ_UNLOCK_POINTS && (
          <div className="quiz-results-section">
            <h3>Quiz Results: {currentQuiz?.title || 'AI Quiz'}</h3>
            <p className="score-display">You scored: <strong>{score}</strong> out of <strong>{totalPossiblePoints}</strong> points ({scorePercentage.toFixed(2)}%)</p>
            <p className="result-message">
              {scorePercentage === 100 ? 'Excellent! Perfect score!'
                : scorePercentage >= 70 ? 'Great job! You did very well.'
                : scorePercentage >= 40 ? 'Good effort! Review the topic and try again.'
                : 'Keep practicing! You will get there.'
              }
            </p>

            <div className="results-charts-grid">
                      <div className="chart-card">
                        <h4>Score Distribution</h4>
                        <div className="pie-chart-container">
                          <div className="pie-chart" style={{ background: `conic-gradient(${chartData.scoreDistributionData.map((d, i) => `${d.color} 0 ${d.value / (d.value + (chartData.scoreDistributionData[i - 1]?.value || 0)) * 100}%`).join(', ')})` }}></div>
                          <div className="pie-chart-legend">
                            {chartData.scoreDistributionData.map((d, i) => (
                              <div key={i} className="legend-item">
                                <span className="legend-color" style={{ backgroundColor: d.color }}></span>
                                <span>{d.name}: {d.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="chart-card">
                        <h4>Questions Breakdown</h4>
                        <div className="bar-chart-container">
                          {chartData.questionsBreakdownData.map((q, index) => (
                            <div key={index} className="bar-chart-item">
                              <span className="bar-label">{q.name}</span>
                              <div className="bar-visual">
                                <div className="bar correct-bar" style={{ width: `${(q.correct / q.total) * 100}%` }}></div>
                                <div className="bar incorrect-bar" style={{ width: `${(q.incorrect / q.total) * 100}%` }}></div>
                              </div>
                              <span className="bar-value">{((q.correct / q.total) * 100).toFixed(0)}%</span>
                            </div>
                          ))}
                        </div>
                        <div className="bar-chart-legend">
                            <div className="legend-item"><span className="legend-color" style={{backgroundColor: '#4CAF50'}}></span><span>Correct</span></div>
                            <div className="legend-item"><span className="legend-color" style={{backgroundColor: '#F44336'}}></span><span>Incorrect</span></div>
                        </div>
                      </div>
                    </div>

            <div className="review-questions-list">
              <h4>Review Your Answers:</h4>
              {currentQuiz?.questions.map((question, qIndex) => (
                <div key={qIndex} className={`question-review-card ${question.isCorrect ? 'correct' : 'incorrect'}`}>
                  <p className="question-text">{qIndex + 1}. {question.questionText} ({question.points} points)</p>
                  <div className="options-review">
                    {question.options.map((option, oIndex) => (
                      <div key={oIndex} className={`option-review-item ${option.text === question.userAnswer ? (question.isCorrect ? 'user-correct' : 'user-incorrect') : (option.isCorrect ? 'correct-missed' : '')} ${option.isCorrect ? 'correct-answer-highlight' : ''}`}> {/* Added new class for highlighting correct answer */}
                        {option.text === question.userAnswer && (question.isCorrect ? <FaCheckCircle className="icon-status correct" /> : <FaTimesCircle className="icon-status incorrect" />)}
                        {/* Always display correct answer icon if this option is the correct one */}
                        {option.isCorrect && !question.isCorrect && option.text !== question.userAnswer && <FaCheckCircle className="icon-status correct-answer" />}
                        <span>{option.text} {option.text === question.userAnswer && <span className="your-answer-text">(Your Answer)</span>}</span>
                      </div>
                    ))}
                  </div>
                  {!question.isCorrect && question.correctAnswer && (
                    <p className="feedback">Correct Answer was: <strong>{question.correctAnswer}</strong></p>
                  )}
                  {question.userAnswer && (
                    <p className="feedback">Your Selected Answer: <strong>{question.userAnswer}</strong></p>
                  )}
                  <p className="feedback">Actual Answer: <strong>{question.correctAnswer}</strong></p>
                </div>
              ))}
            </div>
            <button onClick={() => { setCurrentQuiz(null); setQuizSubmitted(false); setCurrentQuestionIndex(0); }} className="btn primary-btn large-btn reset-btn">
              Generate New Quiz
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
