import React, { useState, useEffect } from 'react';
import { FaCoins } from 'react-icons/fa';
import { auth, db } from '../../firebase-config'; // Import auth and db
import { onAuthStateChanged } from 'firebase/auth'; // Import onAuthStateChanged
import { doc, onSnapshot, updateDoc, arrayUnion } from 'firebase/firestore'; // Import firestore functions

export default function StudentGames() {
  const [user, setUser] = useState(null); // Track logged-in user
  const [gameCoins, setGameCoins] = useState(0);
  const [completedGames, setCompletedGames] = useState([]); // Track completed games
  const scratchGames = [
    {
      id: '276527063', // The Legend of Zelda: A Link to the Past (Remake)
      title: 'Zelda: A Link to the Past',
      description: 'An epic adventure game.'
    },
    {
      id: '10128407', // Paper Minecraft
      title: 'Paper Minecraft',
      description: 'A 2D version of Minecraft.'
    },
    {
      id: '152220147', // Geometry Dash Remix
      title: 'Geometry Dash Remix',
      description: 'A rhythm-based platformer.'
    },
    {
      id: '133465432', // Scratcharia
      title: 'Scratcharia',
      description: 'A Terraria-inspired sandbox game.'
    },
    {
      id: '29713600', // Super Mario Bros.
      title: 'Super Mario Bros.',
      description: 'A recreation of the classic Mario game.'
    },
    {
      id: '224329244', // Among Us in Scratch
      title: 'Among Us in Scratch',
      description: 'A simplified social deduction game.'
    },
    {
      id: '130472497', // The Ultimate Scratch Game
      title: 'The Ultimate Scratch Game',
      description: 'A collection of mini-games.'
    },
    {
      id: '284820645', // Agar.io Remix
      title: 'Agar.io Remix',
      description: 'A multiplayer cell-eating game.'
    },
    {
      id: '208031268', // Slither.io in Scratch
      title: 'Slither.io in Scratch',
      description: 'A snake-like game.'
    },
    {
      id: '121503952', // Undertale Battle Engine
      title: 'Undertale Battle Engine',
      description: 'A fan-made battle engine.'
    },
    {
      id: '137597140', // FNaF: Sister Location Scratch Edition
      title: 'FNaF: Sister Location',
      description: 'A horror game.'
    },
    {
      id: '248386850', // Fall Guys: Ultimate Knockout
      title: 'Fall Guys: Ultimate Knockout',
      description: 'A party battle royale game.'
    },
    {
      id: '350645396', // Pokémon Emerald Version (Demo)
      title: 'Pokémon Emerald Version (Demo)',
      description: 'A Pokémon RPG demo.'
    },
    {
      id: '100650942', // Cuphead (Scratch Edition)
      title: 'Cuphead (Scratch Edition)',
      description: 'A run-and-gun platformer.'
    },
    {
      id: '128267233', // Stardew Valley in Scratch
      title: 'Stardew Valley in Scratch',
      description: 'A farming simulation game.'
    },
    {
      id: '109673321', // The Impossible Game
      title: 'The Impossible Game',
      description: 'A difficult platformer.'
    },
    {
      id: '291932685', // Portal (Scratch Edition)
      title: 'Portal (Scratch Edition)',
      description: 'A puzzle-platformer.'
    },
    {
      id: '131234567', // Pac-Man
      title: 'Pac-Man',
      description: 'The classic arcade game.'
    },
    {
      id: '138765432', // Crossy Road
      title: 'Crossy Road',
      description: 'A frogger-like arcade game.'
    },
    {
      id: '140000000', // Doodle Jump
      title: 'Doodle Jump',
      description: 'A simple jumping game.'
    }
  ];

  const handleCompleteGame = async (gameId) => {
    if (!user) {
      alert("Please log in to earn coins!");
      return;
    }

    if (completedGames.includes(gameId)) {
      alert("You've already completed this game!");
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        gameCoins: (gameCoins || 0) + 1,
        completedGames: arrayUnion(gameId),
      });
      alert("You earned 1 game coin!");
    } catch (error) {
      console.error("Error completing game:", error);
      alert("Failed to record game completion. Please try again.");
    }
  };

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        const unsubSnapshot = onSnapshot(userRef, (snapshot) => {
          if (snapshot.exists()) {
            const userData = snapshot.data();
            setGameCoins(userData.gameCoins || 0);
            setCompletedGames(userData.completedGames || []);
          }
        });
        return () => unsubSnapshot();
      } else {
        setGameCoins(0);
        setCompletedGames([]);
      }
    });
    return () => unsubAuth();
  }, []);

  const requestFullscreen = (gameId) => {
    const iframe = document.getElementById(`game-${gameId}`);
    if (iframe) {
      if (iframe.requestFullscreen) {
        iframe.requestFullscreen();
      } else if (iframe.mozRequestFullScreen) { // Firefox
        iframe.mozRequestFullScreen();
      } else if (iframe.webkitRequestFullscreen) { // Chrome, Safari and Opera
        iframe.webkitRequestFullscreen();
      } else if (iframe.msRequestFullscreen) { // IE/Edge
        iframe.msRequestFullscreen();
      }
    }
  };

  return (
    <div className="student-main-content fade-in">
      <div className="welcome-banner" style={{ marginBottom: 20 }}>
        <h2 className="gradient-text">Games</h2>
        <p>Play fun games and earn coins!</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <FaCoins color="#fbbf24" size={24} />
          <strong style={{ fontSize: 20 }}>{gameCoins} Game Coins</strong>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
        {scratchGames.map((game) => (
          <div key={game.id} style={{ background: '#fff', borderRadius: 10, boxShadow: '0 4px 18px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            <h3 style={{ padding: '15px', marginBottom: 0, borderBottom: '1px solid #eee' }}>{game.title}</h3>
            <p style={{ padding: '0 15px', fontSize: 14, color: '#666' }}>{game.description}</p>
            <div style={{ position: 'relative', width: '100%', paddingTop: '75%' }}> {/* 4:3 aspect ratio */} 
              <iframe
                id={`game-${game.id}`}
                src={`https://scratch.mit.edu/projects/${game.id}/embed`}
                allowTransparency="true"
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                allowFullScreen
                style={{ position: 'absolute', top: 0, left: 0, border: 'none' }}
                title={game.title}
              ></iframe>
            </div>
            <div style={{ padding: '15px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={() => handleCompleteGame(game.id)} style={{
                padding: '10px 20px', borderRadius: 20, border: 0,
                background: (!user || completedGames.includes(game.id)) ? '#ccc' : 'linear-gradient(90deg, #4CAF50, #81C784)', color: '#fff',
                cursor: (!user || completedGames.includes(game.id)) ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, boxShadow: '0 3px 10px rgba(0,0,0,0.1)',
                transition: 'background 0.3s ease'
              }}>
                {completedGames.includes(game.id) ? 'Game Completed!' : 'Complete Game & Earn Coin'}
              </button>
              <button onClick={() => requestFullscreen(game.id)} style={{
                padding: '8px 16px', borderRadius: 20, border: '1px solid #007bff',
                background: '#007bff', color: '#fff', fontSize: 14, cursor: 'pointer',
                transition: 'background 0.3s ease'
              }}>
                Maximize
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
