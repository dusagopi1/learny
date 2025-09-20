import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function StudentJoinClass() {
  const [classLink, setClassLink] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false); // New loading state
  const navigate = useNavigate();

  const handleJoinClass = async () => {
    setMessage(''); // Clear previous messages
    if (classLink.trim() === '') {
      setMessage('Please paste a class link.');
      return;
    }

    setLoading(true); // Start loading
    try {
      // Simulate API call or backend interaction
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second delay
      
      console.log('Attempting to join class with link:', classLink);
      setMessage('Successfully joined class: ' + classLink + '!');
      // After successful join, you might navigate to a class dashboard or similar
      // navigate(`/student/class/${classId}`); // Example navigation
    } catch (error) {
      console.error('Error joining class:', error);
      setMessage('Failed to join class.');
    } finally {
      setLoading(false); // End loading
    }
  };

  return (
    <div className="student-main-content fade-in">
      <div className="welcome-banner">
        <h2 className="gradient-text">Join a Class</h2>
        <p>Enter the class link provided by your teacher to join a live session or access class materials.</p>
      </div>

      <div style={{
        textAlign: 'center', padding: '40px 20px', background: '#fff', borderRadius: 10, boxShadow: '0 4px 18px rgba(0,0,0,0.08)',
        maxWidth: '600px', margin: '0 auto'
      }}>
        <h3 style={{ marginBottom: 20, color: '#333' }}>Paste Class Link to Join</h3>
        <input
          type="text"
          placeholder="Paste Class Link Here"
          value={classLink}
          onChange={(e) => setClassLink(e.target.value)}
          style={{
            width: '100%', padding: '12px 18px', borderRadius: 25, border: '1px solid #ddd',
            fontSize: 16, outline: 'none', marginBottom: 20,
            transition: 'border-color 0.2s, box-shadow 0.2s',
            '&:focus': { borderColor: 'var(--primary-color, #6d28d9)', boxShadow: '0 0 0 2px rgba(109, 40, 217, 0.2)' }
          }}
          disabled={loading} // Disable input during loading
        />
        <button
          onClick={handleJoinClass}
          disabled={loading || classLink.trim() === ''} // Disable button during loading or if link is empty
          style={{
            padding: '12px 30px', borderRadius: 25, border: 0,
            background: 'linear-gradient(90deg, #2563eb, #7c3aed)', color: '#fff',
            fontSize: 16, fontWeight: 600, cursor: 'pointer', boxShadow: '0 3px 10px rgba(0,0,0,0.1)',
            transition: 'background 0.3s ease, transform 0.2s ease',
            '&:hover': { transform: 'translateY(-1px)' },
            '&:disabled': { background: '#ccc', cursor: 'not-allowed' } // Style for disabled state
          }}
        >
          {loading ? 'Joining...' : 'Join Class'} {/* Show loading text */}
        </button>
        {message && <p style={{ marginTop: 20, color: 'var(--primary-color)', fontWeight: 500 }}>{message}</p>}
      </div>
    </div>
  );
}
