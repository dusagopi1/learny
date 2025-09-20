import React, { useState, useEffect } from 'react';
import { FaCoins, FaGamepad } from 'react-icons/fa';
import { auth, db } from '../../firebase-config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import MemoryGame from './MemoryGame';
// import CrosswordGame from './CrosswordGame'; // Will be added later

export default function StudentGames() {
  const [user, setUser] = useState(null);
  const [userPoints, setUserPoints] = useState(0);
  const [activeGame, setActiveGame] = useState(null); // 'memory' or 'crossword'

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        const unsubUser = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            setUserPoints(Number(snap.data().totalPoints || 0));
          }
        });
        return () => unsubUser();
      } else {
        setUserPoints(0);
      }
    });
    return () => unsubAuth();
  }, []);

  const renderGameContent = () => {
    if (activeGame === 'memory') {
      return <MemoryGame user={user} userPoints={userPoints} onBack={() => setActiveGame(null)} />;
    }
    // if (activeGame === 'crossword') {
    //   return <CrosswordGame user={user} userPoints={userPoints} onBack={() => setActiveGame(null)} />;
    // }

    // Game selection menu
    return (
      <div className="game-selection-menu">
        <h2>Choose a Game</h2>
        <div className="game-options">
          <button onClick={() => setActiveGame('memory')} className="btn primary-btn large-btn">
            Memory Game
          </button>
          <button className="btn primary-btn large-btn disabled" disabled>
            Crossword (Coming Soon)
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="student-main-content fade-in">
      <div className="welcome-banner" style={{ marginBottom: 20 }}>
        <h2 className="gradient-text"><FaGamepad /> STEM Games</h2>
        <p>Enhance your knowledge with fun and interactive games!</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <FaCoins color="#fbbf24" size={24} />
          <strong style={{ fontSize: 20 }}>{userPoints} Total Points</strong>
        </div>
      </div>
      {renderGameContent()}
    </div>
  );
}
