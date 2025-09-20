import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase-config';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { FaTrashAlt, FaEdit, FaPlusCircle, FaTimesCircle, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { useToast } from '../../components/Toast';
import { generateContentWithGemini } from '../../utils/geminiApi'; // Import AI utility

export default function TeacherDailyQuizzes() {
  const { showToast } = useToast();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [quizDifficulty, setQuizDifficulty] = useState('easy');
  const [questions, setQuestions] = useState([{ questionText: '', options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }], points: 1 }]);
  // Removed: const [teacherClasses, setTeacherClasses] = useState([]);
  // Removed: const [loadingClasses, setLoadingClasses] = useState(true);

  // AI Quiz Generation States
  const [showAiQuizGeneratorModal, setShowAiQuizGeneratorModal] = useState(false);
  const [aiQuizTopic, setAiQuizTopic] = useState('');
  const [aiQuizLanguage, setAiQuizLanguage] = useState('English');
  const [aiQuizDifficulty, setAiQuizDifficulty] = useState('medium');
  const [aiQuizNumQuestions, setAiQuizNumQuestions] = useState(5);
  const [isGeneratingAiQuiz, setIsGeneratingAiQuiz] = useState(false);

  const teacherId = auth.currentUser?.uid;

  // Fetch quizzes
  useEffect(() => {
    if (!teacherId) return;

    const fetchQuizzes = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'dailyQuizzes'), where('teacherId', '==', teacherId));
        const querySnapshot = await getDocs(q);
        const quizzesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setQuizzes(quizzesData);
      } catch (error) {
        console.error("Error fetching quizzes:", error);
        showToast("Failed to load quizzes.", 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, [teacherId, showToast, showCreateModal]); // Refetch when modal closes

  const handleAddQuestion = () => {
    setQuestions([...questions, { questionText: '', options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }], points: 1 }]);
  };

  const handleQuestionChange = (index, field, value) => {
    const newQuestions = [...questions];
    newQuestions[index][field] = value;
    setQuestions(newQuestions);
  };

  const handleOptionChange = (qIndex, oIndex, field, value) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[oIndex][field] = value;
    setQuestions(newQuestions);
  };

  const handleAddOption = (qIndex) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options.push({ text: '', isCorrect: false });
    setQuestions(newQuestions);
  };

  const handleRemoveQuestion = (index) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions);
  };

  const handleRemoveOption = (qIndex, oIndex) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options = newQuestions[qIndex].options.filter((_, i) => i !== oIndex);
    setQuestions(newQuestions);
  };

  const resetForm = () => {
    setQuizTitle('');
    setQuizDescription('');
    setQuizDifficulty('easy');
    setQuestions([{ questionText: '', options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }], points: 1 }]);
    setCurrentQuiz(null);
  };

  const generateAiQuiz = async () => {
    if (!aiQuizTopic.trim()) {
      showToast("Please enter a topic for the AI quiz.", 'error');
      return;
    }

    setIsGeneratingAiQuiz(true);
    try {
      const prompt = `Generate a ${aiQuizDifficulty} difficulty, ${aiQuizNumQuestions}-question multiple-choice quiz about "${aiQuizTopic}" in ${aiQuizLanguage}. Each question should have 4 options (A, B, C, D) and clearly indicate the correct option. Assign 10 points per question. Format the output as a JSON array of objects, where each object has 'questionText', 'options' (an array of objects with 'text' and 'isCorrect'), and 'points'. Ensure the JSON is perfectly parseable and there is only JSON in the response.`;
      const aiResponse = await generateContentWithGemini(prompt);

      if (aiResponse.startsWith("Failed to generate content")) {
        showToast("Failed to generate AI quiz. Please try again.", 'error');
        return;
      }

      let generatedQuizData;
      try {
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

      // Format AI-generated questions to match existing state structure
      const formattedQuestions = generatedQuizData.map(q => ({
        questionText: q.questionText,
        options: q.options.map(opt => ({ text: String(opt.text), isCorrect: opt.isCorrect === true })),
        points: q.points || 10,
      }));

      setQuestions(formattedQuestions);
      setQuizTitle(aiQuizTopic); // Pre-fill quiz title with AI topic
      setShowAiQuizGeneratorModal(false); // Close AI modal
      setShowCreateModal(true); // Open regular create quiz modal with AI questions
      showToast("AI Quiz questions generated successfully!", 'success');

    } catch (error) {
      console.error("Error generating AI quiz:", error);
      showToast("Failed to generate AI quiz. Please try again.", 'error');
    } finally {
      setIsGeneratingAiQuiz(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!teacherId) {
      showToast("You must be logged in to create a quiz.", 'error');
      return;
    }

    console.log('Quiz Title:', quizTitle);
    console.log('Questions:', questions);

    const isQuestionsValid = !questions.some(q => 
      !q.questionText.trim() || 
      q.options.filter(o => o.text.trim()).length < 2 || 
      q.options.every(o => !o.isCorrect)
    );

    console.log('Are questions valid?', isQuestionsValid);

    if (!quizTitle.trim() || !isQuestionsValid) {
      showToast("Please fill in all required fields and ensure each question has at least two options and one correct answer.", 'error');
        return;
      }

    setLoading(true);
    try {
      const quizData = {
        teacherId,
        title: quizTitle,
        description: quizDescription,
        difficulty: quizDifficulty,
        questions,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      let notificationMessage = '';

      if (currentQuiz) {
        await updateDoc(doc(db, 'dailyQuizzes', currentQuiz.id), quizData);
        showToast("Quiz updated successfully!", 'success');
        notificationMessage = `Teacher ${auth.currentUser.displayName || 'Unknown Teacher'} updated a quiz: ${quizTitle}.`;
      } else {
        const docRef = await addDoc(collection(db, 'dailyQuizzes'), quizData);
        showToast("Quiz created successfully!", 'success');
        notificationMessage = `Teacher ${auth.currentUser.displayName || 'Unknown Teacher'} created a new quiz: ${quizTitle}.`; // Updated message
      }

      // Log the notification payload before adding to Firestore
      console.log('Notification Payload:', {
        recipientId: 'ALL_STUDENTS',
        senderId: teacherId,
        type: currentQuiz ? 'quiz_updated' : 'quiz_created',
        message: notificationMessage,
        link: `/student/daily-quizzes`,
        read: false,
        createdAt: serverTimestamp(),
      });

      // Create notification for students (no longer class-specific)
      await addDoc(collection(db, 'notifications'), {
        recipientId: 'ALL_STUDENTS',
        senderId: teacherId,
        type: currentQuiz ? 'quiz_updated' : 'quiz_created',
        message: notificationMessage,
        link: `/student/daily-quizzes`,
        read: false,
        createdAt: serverTimestamp(),
      });

      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      console.error("Error creating/updating quiz:", error);
      showToast("Failed to save quiz. Please try again.", 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditQuiz = (quiz) => {
    setCurrentQuiz(quiz);
    setQuizTitle(quiz.title);
    setQuizDescription(quiz.description);
    setQuizDifficulty(quiz.difficulty || 'easy');
    setQuestions(quiz.questions);
    setShowCreateModal(true);
  };

  const handleDeleteQuiz = async (quizId) => {
    if (window.confirm("Are you sure you want to delete this quiz?")) {
      try {
        await deleteDoc(doc(db, 'dailyQuizzes', quizId));
        setQuizzes(quizzes.filter(q => q.id !== quizId));
        showToast("Quiz deleted successfully!", 'success');
      } catch (error) {
        console.error("Error deleting quiz:", error);
        showToast("Failed to delete quiz. Please try again.", 'error');
      }
    }
  };

  return (
    <div className="daily-quizzes-page page fade-in">
      <div className="page-header">
        <h2>Daily Quizzes</h2>
        <button className="btn primary-btn" onClick={() => { resetForm(); setShowCreateModal(true); }}>
          <FaPlusCircle /> Create New Quiz
        </button>
        <button className="btn primary-btn-alt" onClick={() => { resetForm(); setShowAiQuizGeneratorModal(true); }} style={{ marginLeft: 10 }}>
          <FaPlusCircle /> Generate with AI
        </button>
      </div>

      {loading ? (
        <p>Loading quizzes...</p>
      ) : quizzes.length === 0 ? (
        <p className="content-placeholder">No daily quizzes created yet. Click "Create New Quiz" to get started!</p>
      ) : (
        <div className="quizzes-grid">
          {quizzes.map(quiz => (
            <div key={quiz.id} className="quiz-card">
              <h3>{quiz.title}</h3>
              <p>{quiz.description}</p>
              <p>Difficulty: {quiz.difficulty}</p>
              <p>Questions: {quiz.questions?.length || 0}</p>
              <div className="quiz-actions">
                <button onClick={() => handleEditQuiz(quiz)} className="icon-btn edit-btn" title="Edit Quiz"><FaEdit /></button>
                <button onClick={() => handleDeleteQuiz(quiz.id)} className="icon-btn delete-btn" title="Delete Quiz"><FaTrashAlt /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Quiz Generator Modal */}
      {showAiQuizGeneratorModal && (
        <div className="modal-overlay fade-in" onClick={() => setShowAiQuizGeneratorModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Generate AI Quiz</h3>
              <button className="close-button" onClick={() => setShowAiQuizGeneratorModal(false)}><FaTimesCircle /></button>
            </div>
            <div className="modal-form">
              <div className="input-group">
                <label htmlFor="aiQuizTopic">Topic:</label>
                <input
                  type="text"
                  id="aiQuizTopic"
                  value={aiQuizTopic}
                  onChange={(e) => setAiQuizTopic(e.target.value)}
                  placeholder="e.g., Photosynthesis, Pythagorean Theorem"
                  required
                />
              </div>
              <div className="input-group">
                <label htmlFor="aiQuizLanguage">Language:</label>
                <select id="aiQuizLanguage" value={aiQuizLanguage} onChange={(e) => setAiQuizLanguage(e.target.value)}>
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Telugu">Telugu</option>
                  <option value="Odia">Odia</option>
                  <option value="Tamil">Tamil</option>
                </select>
              </div>
              <div className="input-group">
                <label htmlFor="aiQuizDifficulty">Difficulty:</label>
                <select id="aiQuizDifficulty" value={aiQuizDifficulty} onChange={(e) => setAiQuizDifficulty(e.target.value)}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div className="input-group">
                <label htmlFor="aiQuizNumQuestions">Number of Questions:</label>
                <input
                  type="number"
                  id="aiQuizNumQuestions"
                  value={aiQuizNumQuestions}
                  onChange={(e) => setAiQuizNumQuestions(Number(e.target.value) || 1)}
                  min="1"
                  max="20"
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn secondary-btn" onClick={() => setShowAiQuizGeneratorModal(false)}>Cancel</button>
                <button type="button" className="btn primary-btn" onClick={generateAiQuiz} disabled={isGeneratingAiQuiz}>
                  {isGeneratingAiQuiz ? 'Generating...' : 'Generate AI Quiz'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay fade-in" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{currentQuiz ? 'Edit Quiz' : 'Create New Quiz'}</h3>
              <button className="close-button" onClick={() => setShowCreateModal(false)}><FaTimesCircle /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="input-group">
                <label htmlFor="quizTitle">Quiz Title</label>
                <input type="text" id="quizTitle" value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} required />
              </div>
              <div className="input-group">
                <label htmlFor="quizDescription">Description (Optional)</label>
                <textarea id="quizDescription" value={quizDescription} onChange={(e) => setQuizDescription(e.target.value)} rows="3"></textarea>
              </div>
              <div className="input-group">
                <label htmlFor="quizDifficulty">Difficulty</label>
                <select id="quizDifficulty" value={quizDifficulty} onChange={(e) => setQuizDifficulty(e.target.value)}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <h4>Questions</h4>
              {questions.map((question, qIndex) => (
                <div key={qIndex} className="question-block card-item">
                  <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <label style={{ flexShrink: 0 }}>Question {qIndex + 1}</label>
                    <input
                      type="text"
                      placeholder="Question text"
                      value={question.questionText}
                      onChange={(e) => handleQuestionChange(qIndex, 'questionText', e.target.value)}
                      required
                      style={{ flexGrow: 1 }}
                    />
                    <input
                      type="number"
                      placeholder="Points"
                      value={question.points}
                      onChange={(e) => handleQuestionChange(qIndex, 'points', parseInt(e.target.value) || 0)}
                      min="0"
                      required
                      style={{ width: 80, flexShrink: 0 }}
                    />
                    <button type="button" onClick={() => handleRemoveQuestion(qIndex)} className="icon-btn delete-btn" title="Remove Question"><FaTrashAlt /></button>
                  </div>
                  
                  <h5>Options (Select one correct)</h5>
                  {question.options.map((option, oIndex) => (
                    <div key={oIndex} className="input-group option-group">
                      <input
                        type="text"
                        placeholder={`Option ${oIndex + 1} text`}
                        value={option.text}
                        onChange={(e) => handleOptionChange(qIndex, oIndex, 'text', e.target.value)}
                        required
                      />
                      <input
                        type="checkbox"
                        checked={option.isCorrect}
                        onChange={(e) => handleOptionChange(qIndex, oIndex, 'isCorrect', e.target.checked)}
                        title="Correct Answer"
                      />
                      <button type="button" onClick={() => handleRemoveOption(qIndex, oIndex)} className="icon-btn delete-btn" title="Remove Option"><FaTimesCircle /></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => handleAddOption(qIndex)} className="btn secondary-btn-alt" style={{ marginTop: 10 }}>Add Option</button>
                </div>
              ))}
              <button type="button" onClick={handleAddQuestion} className="btn primary-btn-alt" style={{ marginTop: 20 }}>Add Question</button>

              <div className="modal-actions">
                <button type="button" className="btn secondary-btn" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn primary-btn" disabled={loading}>{currentQuiz ? 'Update Quiz' : 'Create Quiz'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
