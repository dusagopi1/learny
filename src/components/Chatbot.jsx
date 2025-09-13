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
        <div className="chatbot-container gemini-style">
            <div className="chatbot-header">
                <FaRobot size={20} className="chatbot-icon" />
                <h3>AI Assistant (Class: {classId})</h3>
                <button onClick={onClose} className="chatbot-close-btn">
                    <FaTimes />
                </button>
            </div>
            <div className="chatbot-messages">
                {messages.length === 0 ? (
                    <p className="chatbot-placeholder">Ask me anything about this class content, exercises, or quizzes!</p>
                ) : (
                    messages.map((msg, index) => (
                        <div key={index} className={`message-bubble ${msg.sender === 'user' ? 'user-message' : 'ai-message'}`}>
                            {msg.text}
                        </div>
                    ))
                )}
                {isLoading && <div className="message-bubble ai-message loading-message">...</div>}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="chatbot-input-form">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Message AI Assistant..."
                    disabled={isLoading}
                />
                <button type="submit" className="send-btn" disabled={isLoading}>
                    <FaPaperPlane />
                </button>
            </form>
        </div>
    );
}
