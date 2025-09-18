import React, { useState, useEffect, useRef } from 'react';
import { FaPaperPlane, FaTimes, FaRobot } from 'react-icons/fa';
import { generateContentWithGemini } from '../utils/geminiApi'; // Import the Gemini API utility
import '../App.css'

export default function Chatbot({ onClose, classId }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false); // New state for loading indicator
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSendMessage = async (e) => { // Made async
        e.preventDefault();
        if (input.trim() === '') return;

        const userMessage = { sender: 'user', text: input };
        setMessages((prevMessages) => [...prevMessages, userMessage]);
        setInput('');
        setIsLoading(true); // Set loading to true

        try {
            const aiResponse = await generateContentWithGemini(input); // Call Gemini API
            setMessages((prevMessages) => [...prevMessages, { sender: 'ai', text: aiResponse }]);
        } catch (error) {
            console.error("Error sending message to Gemini API:", error);
            setMessages((prevMessages) => [...prevMessages, { sender: 'ai', text: "Sorry, I couldn't get a response from the AI." }]);
        } finally {
            setIsLoading(false); // Set loading to false
        }
    };

    return (
        <div style={{
          display: 'flex', flexDirection: 'column', height: '100%', borderRadius: '15px',
          background: 'var(--student-surface-color)', boxShadow: 'var(--student-shadow-lg)',
          overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)'
        }} className="chatbot-container gemini-style">
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '15px', background: 'linear-gradient(90deg, #6d28d9, #9a68eb)', color: '#fff',
              borderBottom: '1px solid #ddd', boxShadow: 'var(--student-shadow-sm)'
            }} className="chatbot-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FaRobot size={20} className="chatbot-icon" />
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>AI Assistant (Class: {classId})</h3>
                </div>
                <button onClick={onClose} style={{
                  background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem',
                  cursor: 'pointer', padding: '5px', borderRadius: '50%', transition: 'background 0.2s ease'
                }} className="chatbot-close-btn">
                    <FaTimes />
                </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px', background: '#f9f9f9' }} className="chatbot-messages">
                {messages.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#777', fontStyle: 'italic' }} className="chatbot-placeholder">Ask me anything about this class content, exercises, or quizzes!</p>
                ) : (
                    messages.map((msg, index) => (
                        <div
                          key={index}
                          style={{
                            display: 'flex',
                            justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                          }}
                        >
                          {msg.sender === 'ai' && (
                            <img src="/src/assets/chatbot-icon.png" alt="AI Avatar" style={{ width: 24, height: 24, borderRadius: '50%', marginRight: 8, alignSelf: 'flex-start' }} />
                          )}
                          <div
                            style={{
                              maxWidth: '75%', padding: '10px 15px', borderRadius: '18px',
                              background: msg.sender === 'user' ? '#e3f2fd' : '#e8eaf6',
                              color: '#333', boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                              borderBottomLeftRadius: msg.sender === 'user' ? '18px' : '2px',
                              borderBottomRightRadius: msg.sender === 'user' ? '2px' : '18px',
                            }}
                            className={`message-bubble ${msg.sender === 'user' ? 'user-message' : 'ai-message'}`}>
                            {msg.text}
                          </div>
                        </div>
                    ))
                )}
                {isLoading && messages.length > 0 && messages[messages.length - 1].sender === 'user' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 10 }}>
                    <img src="/assets/chatbot-icon.png" alt="AI Avatar" style={{ width: 24, height: 24, borderRadius: '50%', marginRight: 8, alignSelf: 'flex-start' }} />
                    <div style={{ maxWidth: '70%', padding: '8px 12px', borderRadius: 16, background: '#f5f5f5', color: '#333', fontSize: 14 }}>
                      AI is thinking...
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} style={{
              display: 'flex', padding: '15px', borderTop: '1px solid #eee', gap: '10px',
              background: '#fff', boxShadow: '0 -2px 10px rgba(0,0,0,0.03)'
            }} className="chatbot-input-form">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Message AI Assistant..."
                    disabled={isLoading}
                    style={{
                      flex: 1, padding: '12px 18px', borderRadius: 25, border: '1px solid #ddd',
                      fontSize: 15, outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
                      '&:focus': { borderColor: 'var(--primary-color, #6d28d9)', boxShadow: '0 0 0 2px rgba(109, 40, 217, 0.2)' }
                    }}
                />
                <button type="submit" className="send-btn" disabled={isLoading || !input.trim()}
                  style={{
                    padding: '12px 20px', borderRadius: 25, border: 0,
                    background: 'linear-gradient(90deg, #6d28d9, #9a68eb)', color: '#fff',
                    fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 3px 10px rgba(0,0,0,0.1)',
                    transition: 'background 0.3s ease, transform 0.2s ease',
                    '&:hover': { transform: 'translateY(-1px)' },
                    '&:disabled': { background: '#ccc', cursor: 'not-allowed' }
                  }}
                >
                    <FaPaperPlane />
                </button>
            </form>
        </div>
    );
}
