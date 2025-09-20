import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FaCoins, FaBrain, FaBook, FaFileAlt } from 'react-icons/fa';
import { db } from '../../firebase-config';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { generateContentWithGemini } from '../../utils/geminiApi';
import { useToast } from '../../components/Toast';

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export default function MemoryGame({ user, userPoints, onBack }) {
  const { showToast } = useToast();
  const [isGeneratingGame, setIsGeneratingGame] = useState(false);
  const [gameSettings, setGameSettings] = useState({
    subject: '',
    course: '',
    classLevel: '',
  });

  const [cards, setCards] = useState([]);
  const [flippedCards, setFlippedCards] = useState([]);
  const [matchedCards, setMatchedCards] = useState([]);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [chancesRemaining, setChancesRemaining] = useState(10);

  const handleSettingChange = (e) => {
    const { name, value } = e.target;
    setGameSettings(prev => ({ ...prev, [name]: value }));
  };

  const generateMemoryGame = async () => {
    if (!user) {
      showToast("You must be logged in to generate a game.", 'error');
      return;
    }

    const { subject, course, classLevel } = gameSettings;
    if (!subject.trim() || !course.trim() || !classLevel.trim()) {
      showToast("Please fill in all game settings (Subject, Course, Class Level).", 'error');
      return;
    }

    setIsGeneratingGame(true);
    setCards([]);
    setFlippedCards([]);
    setMatchedCards([]);
    setScore(0);
    setMoves(0);
    setGameStarted(false);
    setGameCompleted(false);
    setChancesRemaining(10);

    try {
      const prompt = `Generate 6 pairs of matching terms for a memory game based on the following criteria: Subject: ${subject}, Course: ${course}, Class Level: ${classLevel}. Each pair should consist of a term and its corresponding definition/formula/concept. Format the output as a JSON array of objects, where each object has a 'term' and a 'match'. Ensure the JSON is perfectly parseable and there is only JSON in the response. Example for Physics, Units and Dimensions: [{ "term": "Force", "match": "MLT^-2" }, { "term": "Energy", "match": "ML^2T^-2" }]`;
      const aiResponse = await generateContentWithGemini(prompt);

      if (aiResponse.startsWith("Failed to generate content")) {
        showToast("Failed to generate memory game content. Please try again.", 'error');
        return;
      }

      let generatedPairs;
      try {
        const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/);
        const cleanedResponse = jsonMatch ? jsonMatch[1] : aiResponse;
        generatedPairs = JSON.parse(cleanedResponse);
        if (!Array.isArray(generatedPairs) || generatedPairs.length < 4 || generatedPairs.some(p => !p.term || !p.match)) {
          throw new Error("AI response is not a valid pair format.");
        }
      } catch (parseError) {
        console.error("Failed to parse AI response as JSON:", parseError);
        showToast("AI generated unparseable content. Please try again or refine your settings.", 'error');
        return;
      }

      const initialCards = [];
      generatedPairs.forEach((pair, index) => {
        initialCards.push({ id: `term-${index}`, content: pair.term, matchId: `match-${index}`, isFlipped: false, isMatched: false });
        initialCards.push({ id: `match-${index}`, content: pair.match, matchId: `term-${index}`, isFlipped: false, isMatched: false });
      });

      setCards(shuffleArray(initialCards));
      setGameStarted(true);
      showToast("Memory game generated successfully!", 'success');
    } catch (error) {
      console.error("Error generating memory game:", error);
      showToast("Failed to generate memory game. Please try again.", 'error');
    } finally {
      setIsGeneratingGame(false);
    }
  };

  const handleCardClick = (clickedCard) => {
    if (!gameStarted || gameCompleted || flippedCards.length === 2 || matchedCards.includes(clickedCard.id) || clickedCard.isFlipped) {
      return;
    }

    setFlippedCards(prev => [...prev, clickedCard]);
    setCards(prevCards => 
      prevCards.map(card => 
        card.id === clickedCard.id ? { ...card, isFlipped: true } : card
      )
    );
    setMoves(prev => prev + 1);
  };

  useEffect(() => {
    if (flippedCards.length === 2) {
      const [card1, card2] = flippedCards;
      setChancesRemaining(prev => prev - 1);

      if (card1.matchId === card2.id) {
        setMatchedCards(prev => [...prev, card1.id, card2.id]);
        setScore(prev => prev + 2);
        showToast("Match! +2 Points!", 'success');
        if (user) {
          const userRef = doc(db, 'users', user.uid);
          updateDoc(userRef, { 
            totalPoints: userPoints + 2,
            pointsHistory: arrayUnion({ delta: 2, reason: `Memory Game Match`, at: new Date() })
          });
        }
        setTimeout(() => setFlippedCards([]), 700);
      } else {
        setTimeout(() => {
          setCards(prevCards => 
            prevCards.map(card => 
              (card.id === card1.id || card.id === card2.id) ? { ...card, isFlipped: false } : card
            )
          );
          setFlippedCards([]);
        }, 1000);
      }
    }
  }, [flippedCards, user, userPoints, showToast]);

  useEffect(() => {
    if (!gameStarted) return;
    const allCardsMatched = cards.length > 0 && matchedCards.length === cards.length;
    const outOfChances = chancesRemaining <= 0;

    if (allCardsMatched || outOfChances) {
      setGameCompleted(true);
      if (allCardsMatched) {
        showToast(`Memory game completed in ${moves} moves! Total points: ${score}`, 'success', { duration: 5000 });
      } else {
        showToast(`Game over! You ran out of chances. Your score: ${score}`, 'error', { duration: 5000 });
      }
    }
  }, [matchedCards, cards, moves, score, gameStarted, chancesRemaining, showToast]);

  const renderGameArea = () => {
    if (cards.length === 0 && !isGeneratingGame) {
      return (
        <p className="content-placeholder">Configure your game settings and click 'Generate Memory Game' to start!</p>
      );
    }

    if (isGeneratingGame) {
      return (
        <div className="loading-message fade-in">
          <p>Generating your memory game... Please wait.</p>
        </div>
      );
    }

    return (
      <div className="memory-game-board">
        {cards.map((card) => (
          <div
            key={card.id}
            className={`memory-card ${card.isFlipped || matchedCards.includes(card.id) ? 'flipped' : ''} ${matchedCards.includes(card.id) ? 'matched' : ''}`}
            onClick={() => handleCardClick(card)}
          >
            <div className="card-inner">
              <div className="card-front">?</div>
              <div className="card-back">{card.content}</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fade-in">
      <button onClick={onBack} className="btn secondary-btn mb-4">{"< Back to Games"}</button>
      
      <div className="game-settings-form">
        <h3>Game Settings</h3>
        <div className="input-group">
          <label htmlFor="subject"><FaBrain /> Subject:</label>
          <input
            type="text"
            id="subject"
            name="subject"
            value={gameSettings.subject}
            onChange={handleSettingChange}
            placeholder="e.g., Physics"
            required
          />
        </div>
        <div className="input-group">
          <label htmlFor="course"><FaBook /> Course/Topic:</label>
          <input
            type="text"
            id="course"
            name="course"
            value={gameSettings.course}
            onChange={handleSettingChange}
            placeholder="e.g., Units and Dimensions"
            required
          />
        </div>
        <div className="input-group">
          <label htmlFor="classLevel"><FaFileAlt /> Class Level:</label>
          <input
            type="text"
            id="classLevel"
            name="classLevel"
            value={gameSettings.classLevel}
            onChange={handleSettingChange}
            placeholder="e.g., 11th Grade"
            required
          />
        </div>
        <button onClick={generateMemoryGame} disabled={isGeneratingGame} className="btn primary-btn large-btn">
          {isGeneratingGame ? 'Generating Game...' : 'Generate Memory Game'}
        </button>
      </div>

      <div className="game-area">
        {gameStarted && !gameCompleted && (
          <div className="game-info">
            <p>Moves: {moves} | Score: {score} | Chances: {chancesRemaining}</p>
          </div>
        )}
        {renderGameArea()}
        {gameCompleted && (
          <div className="game-completion-message">
            <h3>Game Completed!</h3>
            <p>You finished in {moves} moves and earned {score} points!</p>
            <button onClick={() => {
              setCards([]);
              setGameStarted(false);
              setGameCompleted(false);
              setGameSettings({ subject: '', course: '', classLevel: '' });
              setChancesRemaining(10);
            }} className="btn primary-btn mt-3">Play Again</button>
          </div>
        )}
      </div>
    </div>
  );
}

MemoryGame.propTypes = {
  user: PropTypes.object,
  userPoints: PropTypes.number.isRequired,
  onBack: PropTypes.func.isRequired,
};