import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase-config';
import { Editor } from '@tinymce/tinymce-react';
import { FaTrash, FaCheckCircle, FaPlus, FaCalendarAlt } from 'react-icons/fa'; // Import FaCalendarAlt
import { generateContentWithGemini } from '../../utils/geminiApi'; // Import Gemini API util
import { marked } from 'marked'; // Import marked library
import { useToast } from '../../components/Toast'; // Import useToast hook

export default function TeacherExerciseDetails() {
  const { classId, chapterId, topicId, exerciseId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast(); // Use the toast hook

  const [exercise, setExercise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState(''); // New state for due time
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState([]);
  const editorRef = useRef(null);
  const [isSaving, setIsSaving] = useState(false);

  // State for AI Quiz Generation
  const [aiQuizTopic, setAiQuizTopic] = useState('');
  const [aiQuizNumQuestions, setAiQuizNumQuestions] = useState(5); // Default to 5 questions
  const [aiQuizDifficulty, setAiQuizDifficulty] = useState('medium'); // Default difficulty
  const [isGeneratingAiQuiz, setIsGeneratingAiQuiz] = useState(false);
  const [forceRerenderKey, setForceRerenderKey] = useState(0); // State to force re-render of questions list

  useEffect(() => {
    // If no exerciseId is present, it means we are creating a new exercise.
    if (!exerciseId) {
      setLoading(false);
      setExercise({}); // Initialize exercise to an empty object for new creation
      setTitle('');
      setDueDate('');
      setDueTime(''); // Initialize dueTime for new creation
      setDescription('');
      setQuestions([]);
      return;
    }

    if (!classId || !chapterId || !topicId) return;

    const fetchExercise = async () => {
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
          setExercise(currentExercise);
          setTitle(currentExercise.title || '');
          
          // Split the dueDate string into date and time parts if it exists
          if (currentExercise.dueDate) {
            const [datePart, timePart] = currentExercise.dueDate.split('T');
            setDueDate(datePart || '');
            setDueTime(timePart || '');
          } else {
            setDueDate('');
            setDueTime('');
          }
          
          setDescription(currentExercise.description || '');
          setQuestions(currentExercise.questions || []);
        } else {
          console.error("Exercise not found!");
          // If exerciseId is present but exercise not found, still set to empty for new creation possibility
          setTitle('');
          setDueDate('');
          setDueTime(''); // Initialize dueTime for new creation
          setDescription('');
          setQuestions([]);
        }
      } catch (error) {
        console.error("Error fetching exercise details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchExercise();
  }, [classId, chapterId, topicId, exerciseId]);

  const generateUniqueId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

  const handleDescriptionChange = (content, editor) => {
    setDescription(content);
  };

  const handleAddQuestion = () => {
    setQuestions(prev => [...prev, {
      id: generateUniqueId(),
      questionText: '',
      type: 'single-answer', // Default type
      options: [{
        id: generateUniqueId(),
        text: '',
        isCorrect: false
      }],
      points: 0,
    }]);
  };

  const handleDeleteQuestion = (questionId) => {
    setQuestions(prev => prev.filter(q => q.id !== questionId));
  };

  const handleQuestionTextChange = (questionId, text) => {
    setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, questionText: text } : q));
  };

  const handleQuestionTypeChange = (questionId, type) => {
    setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, type } : q));
  };

  const handleAddOption = (questionId) => {
    setQuestions(prev => prev.map(q =>
      q.id === questionId
        ? { ...q, options: [...(q.options || []), { id: generateUniqueId(), text: '', isCorrect: false }] }
        : q
    ));
  };

  const handleDeleteOption = (questionId, optionId) => {
    setQuestions(prev => prev.map(q =>
      q.id === questionId
        ? { ...q, options: q.options.filter(opt => opt.id !== optionId) }
        : q
    ));
  };

  const handleOptionTextChange = (questionId, optionId, text) => {
    setQuestions(prev => prev.map(q =>
      q.id === questionId
        ? { ...q, options: q.options.map(opt => opt.id === optionId ? { ...opt, text } : opt) }
        : q
    ));
  };

  const handleCorrectOptionChange = (questionId, optionId) => {
    setQuestions(prev => prev.map(q =>
      q.id === questionId
        ? { ...q, options: q.options.map(opt => ({ ...opt, isCorrect: opt.id === optionId })) } // For single answer
        : q
    ));
  };

  const handlePointsChange = (questionId, points) => {
    setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, points: Number(points) } : q));
  };

  const handleGenerateAiQuiz = async () => {
    if (!aiQuizTopic) {
      showToast("Please enter a topic for the AI quiz.", 'error'); // Use toast
      return;
    }

    setIsGeneratingAiQuiz(true);
    try {
      const prompt = `Generate ${aiQuizNumQuestions} multiple-choice quiz questions about "${aiQuizTopic}" with ${aiQuizDifficulty} difficulty. For each question, provide 3 options (A, B, C) and clearly indicate the correct option. Format the output as a JSON array of objects, where each object has 'questionText', 'options' (an array of objects with 'text' and 'isCorrect'), and 'points'. Example: [{ "questionText": "What is X?", "options": [{"text": "A", "isCorrect": true}, {"text": "B", "isCorrect": false}, {"text": "C", "isCorrect": false}], "points": 10 }]`;

      const aiResponse = await generateContentWithGemini(prompt);
      console.log("Raw AI response before parsing:", aiResponse); // Add this line for debugging

      if (aiResponse.startsWith("Failed to generate content")) {
        showToast("Failed to generate AI quiz. Please try again.", 'error'); // Use toast
        return;
      }

      let generatedQuestionsData;
      try {
        // Remove markdown code block fences if present
        const cleanedResponse = aiResponse.replace(/^```json\n|\n```$/g, '');
        generatedQuestionsData = JSON.parse(cleanedResponse);
        if (!Array.isArray(generatedQuestionsData)) {
          throw new Error("AI response is not a JSON array.");
        }
      } catch (parseError) {
        console.error("Failed to parse AI response as JSON:", parseError);
        showToast("AI generated an unparseable response. Please try again.", 'error'); // Use toast
        return;
      }

      const formattedQuestions = generatedQuestionsData.map(q => ({
        id: generateUniqueId(),
        questionText: q.questionText,
        type: 'single-answer', // Assuming single-answer for simplicity from AI for now
        options: q.options.map(opt => ({
          id: generateUniqueId(),
          text: opt.text,
          isCorrect: opt.isCorrect,
        })),
        points: q.points || 10,
      }));

      setQuestions(formattedQuestions);
      setForceRerenderKey(prev => prev + 1); // Increment key to force re-render
      showToast("AI Quiz generated successfully!", 'success'); // Use toast
    } catch (error) {
      console.error("Error generating AI quiz:", error);
      showToast("Failed to generate AI quiz. Please try again.", 'error'); // Use toast
    } finally {
      setIsGeneratingAiQuiz(false);
    }
  };

  const handleSaveExercise = async () => {
    setIsSaving(true);
    try {
      const classRef = doc(db, 'classes', classId);
      const classSnap = await getDoc(classRef);

      if (!classSnap.exists()) {
        throw new Error("Class document not found.");
      }

      const classData = classSnap.data();
      let newExerciseId = exerciseId;
      let updatedExercisesArray = [];

      if (!exerciseId) { // Creating a new exercise
        newExerciseId = generateUniqueId(); // Use generateUniqueId for new exercise ID
        const newExercise = {
          id: newExerciseId,
          createdAt: new Date().toISOString(),
          title,
          dueDate: `${dueDate}T${dueTime}`, // Combine date and time
          description,
          questions,
        };
        // Find the topic and add the new exercise to its exercises array
        const currentChapter = classData.chapters?.find(ch => ch.id === chapterId);
        const currentTopic = currentChapter?.topics?.find(t => t.id === topicId);
        updatedExercisesArray = [...(currentTopic?.exercises || []), newExercise];
      } else { // Updating an existing exercise
        updatedExercisesArray = (classData.chapters
          .find(ch => ch.id === chapterId)?.topics
          .find(t => t.id === topicId)?.exercises || [])
          .map(ex => {
            if (ex.id === exerciseId) {
              return {
                ...ex,
                title,
                dueDate: `${dueDate}T${dueTime}`, // Combine date and time
                description,
                questions,
              };
            }
            return ex;
          });
      }

      const updatedChapters = classData.chapters.map(chapter => {
        if (chapter.id === chapterId) {
          const updatedTopics = chapter.topics.map(topic => {
            if (topic.id === topicId) {
              return { ...topic, exercises: updatedExercisesArray };
            }
            return topic;
          });
          return { ...chapter, topics: updatedTopics };
        }
        return chapter;
      });

      await updateDoc(classRef, { chapters: updatedChapters });
      showToast('Exercise saved successfully!', 'success'); // Use toast

      if (!exerciseId) {
        // If it was a new exercise, navigate to its detail page
        navigate(`/teacher/class/${classId}/content/chapter/${chapterId}/topic/${topicId}/exercise/${newExerciseId}`);
      }

    } catch (error) {
      console.error("Error saving exercise:", error);
      showToast('Failed to save exercise. Please try again.', 'error'); // Use toast
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div className="class-main-content">Loading exercise details...</div>;
  }

  if (!exercise) {
    return <div className="class-main-content">Exercise not found.</div>;
  }

  return (
    <div className="class-main-content fade-in">
      <div className="exercise-details-header">
        <h2>{title || 'New Exercise'}</h2>
        <button onClick={handleSaveExercise} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="exercise-form-section">
        <div className="form-group">
          <label htmlFor="exercise-title">Title</label>
          <input
            type="text"
            id="exercise-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="exercise-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="due-date">Due by</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}> {/* Wrapper for date and time inputs */}
            <input
              type="date"
              id="due-date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="exercise-input"
              style={{ flex: 1 }} /* Allow date input to grow */
            />
            <input
              type="time"
              id="due-time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              className="exercise-input"
              style={{ width: 'fit-content' }} /* Keep time input compact */
            />
            <FaCalendarAlt size={20} color="var(--primary-color)" /> {/* Calendar icon */}
          </div>
        </div>

        <div className="form-group">
          <label>Description</label>
          <Editor
            apiKey="6p6cbu4c699ktkthiihry73to6zxgvpa0vz5at3u35quep4q"
            onInit={(evt, editor) => editorRef.current = editor}
            init={{
              plugins: 'anchor autolink charmap codesample emoticons link lists media searchreplace table visualblocks wordcount',
              toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | link media table mergetags | align lineheight | numlist bullist indent outdent | emoticons charmap | removeformat',
              menubar: 'file edit view insert format tools help',
              height: 300,
              content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
            }}
            onEditorChange={handleDescriptionChange}
            value={description}
          />
        </div>

        <div className="ai-quiz-generation-section">
          <h3>Generate AI Quiz</h3>
          <div className="form-group">
            <label htmlFor="ai-quiz-topic">Topic</label>
            <input
              type="text"
              id="ai-quiz-topic"
              value={aiQuizTopic}
              onChange={(e) => setAiQuizTopic(e.target.value)}
              className="exercise-input"
              placeholder="e.g., Photosynthesis, Algebra"
            />
          </div>
          <div className="form-group">
            <label htmlFor="ai-quiz-num-questions">Number of Questions</label>
            <input
              type="number"
              id="ai-quiz-num-questions"
              value={aiQuizNumQuestions}
              onChange={(e) => setAiQuizNumQuestions(Number(e.target.value))}
              className="exercise-input"
              min="1"
              max="20"
            />
          </div>
          <div className="form-group">
            <label htmlFor="ai-quiz-difficulty">Difficulty</label>
            <select
              id="ai-quiz-difficulty"
              value={aiQuizDifficulty}
              onChange={(e) => setAiQuizDifficulty(e.target.value)}
              className="exercise-input"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <button onClick={handleGenerateAiQuiz} disabled={isGeneratingAiQuiz} className="add-question-btn">
            {isGeneratingAiQuiz ? 'Generating...' : '<FaPlus /> Generate AI Quiz'}
          </button>
        </div>

        <h3 >Questions ({questions.length})</h3>
        <button className="add-question-btn" onClick={handleAddQuestion}><FaPlus /> Add Question</button>

        <div key={forceRerenderKey} className="questions-list">
          {questions.map((question, qIndex) => (
            <div key={question.id} className="question-card fade-in">
              <div className="question-header">
                <input
                  type="text"
                  placeholder="Question text"
                  value={question.questionText}
                  onChange={(e) => handleQuestionTextChange(question.id, e.target.value)}
                  className="question-text-input"
                />
                <select
                  value={question.type}
                  onChange={(e) => handleQuestionTypeChange(question.id, e.target.value)}
                  className="question-type-select"
                >
                  <option value="single-answer">Single answer</option>
                  <option value="multiple-answer">Multiple answer</option>
                  <option value="short-answer">Short answer</option>
                </select>
                <button onClick={() => handleDeleteQuestion(question.id)} className="icon-btn delete-icon"><FaTrash /></button>
              </div>

              <div className="options-list">
                {question.options.map((option, oIndex) => (
                  <div key={option.id} className="option-item">
                    <input
                      type={question.type === 'single-answer' ? 'radio' : 'checkbox'}
                      name={`question-${question.id}`}
                      checked={option.isCorrect}
                      onChange={() => handleCorrectOptionChange(question.id, option.id)}
                    />
                    <input
                      type="text"
                      placeholder="Your option"
                      value={option.text}
                      onChange={(e) => handleOptionTextChange(question.id, option.id, e.target.value)}
                      className="option-text-input"
                    />
                    <button onClick={() => handleDeleteOption(question.id, option.id)} className="icon-btn delete-icon"><FaTrash /></button>
                  </div>
                ))}
                <button className="add-option-btn" onClick={() => handleAddOption(question.id)}><FaPlus /> Add option</button>
              </div>

              <div className="points-input">
                <label>Points:</label>
                <input
                  type="number"
                  value={question.points}
                  onChange={(e) => handlePointsChange(question.id, e.target.value)}
                  min="0"
                />
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
