import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { auth } from '../../firebase-config';
import { onAuthStateChanged } from 'firebase/auth';
import { generateContentWithGemini } from '../../utils/geminiApi';
import { useToast } from '../../components/Toast';
import Chatbot from '../../components/Chatbot';
import AIQuizView from './AIQuizView';
import FinalExamView from './FinalExamView';

export default function StudentCourseDetails() {
  const { courseId } = useParams();
  const { showToast } = useToast();
  const [modules, setModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState(null);
  const [moduleContent, setModuleContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showExam, setShowExam] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const courseName = courseId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  useEffect(() => {
    const fetchModules = async () => {
      setIsLoading(true);
      try {
        const prompt = `Generate a list of 5-7 module titles for a course on "${courseName}". The titles should represent a logical progression through the subject. Format the output as a simple JSON array of strings. Example: ["Module 1: Title", "Module 2: Title"]`;
        const response = await generateContentWithGemini(prompt);
        const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
        const cleanedResponse = jsonMatch ? jsonMatch[1] : response;
        const moduleTitles = JSON.parse(cleanedResponse);
        setModules(moduleTitles);
      } catch (error) {
        console.error("Error fetching modules:", error);
        showToast("Failed to load course modules.", 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchModules();
  }, [courseName, showToast]);

  const handleModuleClick = async (moduleTitle) => {
    if (selectedModule === moduleTitle) {
      setSelectedModule(null); // Toggle off if the same module is clicked
      setModuleContent('');
      return;
    }
    setSelectedModule(moduleTitle);
    setModuleContent('');
    setIsContentLoading(true);
    try {
      const prompt = `Generate detailed educational content for the module "${moduleTitle}" in the course "${courseName}". Include explanations, examples, and finish with 3 multiple-choice questions to test understanding. Format the entire output as clean HTML.`;
      const content = await generateContentWithGemini(prompt);
      setModuleContent(content);
    } catch (error) {
      console.error("Error fetching module content:", error);
      showToast("Failed to load module content.", 'error');
    } finally {
      setIsContentLoading(false);
    }
  };

  return (
    <div className="student-main-content fade-in">
      <div className="welcome-banner">
        <h2 className="gradient-text">{courseName}</h2>
        <p>Your learning journey into the world of AI continues here.</p>
      </div>

      {showQuiz ? (
        <AIQuizView courseName={courseName} onBack={() => setShowQuiz(false)} />
      ) : showExam ? (
        <FinalExamView courseName={courseName} user={user} onBack={() => setShowExam(false)} />
      ) : (
        <>
          <div className="course-actions">
            <button onClick={() => setShowQuiz(true)} className="btn primary-btn">
              Practice Quiz
            </button>
            <button onClick={() => setShowExam(true)} className="btn secondary-btn">
              Final Exam
            </button>
          </div>
          <div className="course-content-container">
            <div className="modules-section">
              <h3 className="gradient-text">Course Modules</h3>
              <div className="modules-grid">
                {isLoading ? (
                  <p>Loading modules...</p>
                ) : (
                  modules.map((title, index) => (
                    <button key={index} className={`module-button ${selectedModule === title ? 'active' : ''}`} onClick={() => handleModuleClick(title)}>
                      {title}
                    </button>
                  ))
                )}
              </div>
            </div>

            {selectedModule && (
              <div className="module-content-section">
                <h3 className="gradient-text">{selectedModule}</h3>
                {isContentLoading ? (
                  <p>Loading content...</p>
                ) : (
                  <div className="module-content" dangerouslySetInnerHTML={{ __html: moduleContent }} />
                )}
              </div>
            )}

            <div className="ai-assistant-section">
              <h3 className="gradient-text">AI Assistant</h3>
              <div className="ai-assistant-container">
                <Chatbot context={`This chat is for the course: ${courseName}. Please answer questions related to this topic.`} />
              </div>
            </div>
          </div>
        </>
      )}

      <Link to="/student/dashboard" className="btn secondary-btn mt-4">{'< Back to Dashboard'}</Link>
    </div>
  );
}
