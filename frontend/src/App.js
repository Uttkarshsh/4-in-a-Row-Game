import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Login from './components/Login';
import Game from './components/Game';
import Leaderboard from './components/Leaderboard';

// Connect to your backend server
const SOCKET_SERVER_URL = "https://four-in-a-row-game-1-e34s.onrender.com";
const socket = io(SOCKET_SERVER_URL);

function App() {
  const [username, setUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [status, setStatus] = useState('');
  const [playerNum, setPlayerNum] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  const [showLeaderboard, setShowLeaderboard] = useState(true);

  useEffect(() => {
    // --- Socket Event Listeners ---
    
    socket.on('connect', () => {
      console.log('Connected to server with socket ID:', socket.id);
    });

    socket.on('waitingForOpponent', () => {
      setStatus('Waiting for an opponent...');
    });

    socket.on('gameStart', (data) => {
      console.log('Game starting:', data);
      setGameState(data);
      setPlayerNum(data.playerNum);
      setStatus(`Game vs. ${data.opponent}. You are Player ${data.playerNum}.`);
      setGameResult(null);
    });
    
    // This is a separate event just for Player 2
    socket.on('playerNum', (num) => {
       setPlayerNum(num);
       setStatus((prevStatus) => `${prevStatus} You are Player ${num}.`);
    });

    socket.on('gameStateUpdate', (data) => {
      setGameState((prev) => ({ ...prev, ...data }));
    });

    socket.on('gameEnd', (data) => {
      setGameResult(data); // { result: 'win'/'draw', winner: 'username' }
      setGameState((prev) => ({ ...prev, board: data.board, turn: null })); // Update board one last time
    });
    
    socket.on('reconnected', (data) => {
      console.log('Reconnected to game:', data);
      setGameState(data);
      setPlayerNum(data.playerNum);
      setStatus(`Reconnected! Game vs. ${data.opponent}.`);
      setGameResult(null);
    });
    
    socket.on('playerDisconnected', (message) => {
      setStatus(message);
    });
    
    socket.on('opponentReconnected', () => {
       setStatus('Opponent reconnected.');
    });

    socket.on('error', (message) => {
      console.error('Server Error:', message);
      setStatus(message); // Display error to user
    });

    // Clean up on component unmount
    return () => {
      socket.off('connect');
      socket.off('waitingForOpponent');
      socket.off('gameStart');
      socket.off('playerNum');
      socket.off('gameStateUpdate');
      socket.off('gameEnd');
      socket.off('reconnected');
      socket.off('playerDisconnected');
      socket.off('opponentReconnected');
      socket.off('error');
    };
  }, []);

  const handleLogin = (user) => {
    if (user.trim()) {
      setUsername(user);
      setIsLoggedIn(true);
      socket.emit('joinGame', user); // Send username to server
      setShowLeaderboard(false); // Hide leaderboard on login
    }
  };

  const handleMakeMove = (col) => {
    if (!gameState) return;
    socket.emit('makeMove', { gameId: gameState.gameId, column: col });
  };
  
  const findNewGame = () => {
    setGameState(null);
    setGameResult(null);
    setStatus('');
    setPlayerNum(null);
    socket.emit('joinGame', username);
    setShowLeaderboard(true);
  }

  // --- THIS IS THE FUNCTION TO TEST ---
  const handlePlayWithBot = () => {
    // THIS IS THE TEST LINE:
    console.log("--- FRONTEND: Emitting 'playWithBot' ---"); 
    
    // Tell the server we want to stop waiting and play a bot
    socket.emit('playWithBot');
  };
  // ------------------------------------

  return (
    <div className="App">
      {!isLoggedIn ? (
        <Login onLogin={handleLogin} />
      ) : (
        <div className="game-container">
          <Game
            gameState={gameState}
            playerNum={playerNum}
            status={status}
            gameResult={gameResult}
            onMakeMove={handleMakeMove}
            onFindNewGame={findNewGame}
            onPlayWithBot={handlePlayWithBot} // <-- This prop is correct
          />
          <Leaderboard 
            show={showLeaderboard} 
            toggleShow={() => setShowLeaderboard(!showLeaderboard)} 
            gameResult={gameResult} // To trigger refresh
          />
        </div>
      )}
    </div>
  );
}

export default App;
