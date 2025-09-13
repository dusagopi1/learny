import React, { useState } from 'react';
import { FaTimes, FaRobot } from 'react-icons/fa'; // Re-import FaRobot
import Chatbot from './Chatbot';
// Removed import botImage from '../assets/chatbot-icon.png';

export default function AIChatPopup({ classId }) {
    const [isOpen, setIsOpen] = useState(false);

    const toggleChat = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div className="ai-chat-popup-container">
            {isOpen && (
                <div className={`ai-chat-window ${isOpen ? 'open' : ''}`}>
                    <Chatbot onClose={toggleChat} classId={classId} />
                </div>
            )}
            <button onClick={toggleChat} className="ai-chat-toggle-btn">
                {isOpen ? <FaTimes /> : <FaRobot />}
            </button>
        </div>
    );
}
