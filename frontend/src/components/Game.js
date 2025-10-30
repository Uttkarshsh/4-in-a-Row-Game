import React from 'react';
import Board from './Board';

// --- 1. RECEIVE THE NEW PROP 'onPlayWithBot' ---
function Game({ gameState, playerNum, status, gameResult, onMakeMove, onFindNewGame, onPlayWithBot }) {
  
  const getStatusMessage = () => {
    if (gameResult) {
      if (gameResult.result === 'draw') {
        return <span className="status-message draw">It's a Draw!</span>;
      }
      
      const isWinner = gameResult.winner === (playerNum === 1 ? gameState?.player1?.username : gameState?.player2?.username);
      
      if (gameResult.isForfeit) {
         return isWinner ? 
           <span className="status-message win">You Win! (Opponent Forfeited)</span> :
           <span className="status-message error">You Forfeited</span>;
      }
      
      return isWinner ? 
        <span className="status-message win">You Win!</span> : 
        <span className="status-message error">You Lose. {gameResult.winner} wins.</span>;
    }
    
    if (!gameState) {
      return <span className="status-message">{status || 'Connecting...'}</span>;
    }

    if (gameState.turn === playerNum) {
      return <span className="status-message win">Your Turn</span>;
    } else if (gameState.turn) {
      return <span className="status-message">Opponent's Turn</span>;
    }

    return <span className="status-message">{status}</span>;
  };

  return (
    <div className="game-area">
      <Board
        board={gameState?.board}
        onMakeMove={onMakeMove}
        isMyTurn={gameState?.turn === playerNum && !gameResult}
      />
      <div className="game-info">
        <h2>Game Status</h2>
        {getStatusMessage()}

        {/* --- 2. ADD THIS NEW BLOCK --- */}
        {/* Show this button ONLY if we are waiting */}
        {!gameState && status === 'Waiting for an opponent...' && (
          <button onClick={onPlayWithBot} style={{marginTop: '1rem', width: '100%'}}>
            Play with Bot Now
          </button>
        )}
        {/* --------------------------- */}

        {gameResult && (
           <button onClick={onFindNewGame} style={{marginTop: '1rem', width: '100%'}}>
             Find New Game
           </button>
        )}
      </div>
    </div>
  );
}

export default Game;