import React from 'react';
import Cell from './Cell';

const ROWS = 6;
const COLS = 7;

function Board({ board, onMakeMove, isMyTurn }) {
  // Create a default empty board if none is provided
  const currentBoard =
    board ||
    Array(ROWS)
      .fill(null)
      .map(() => Array(COLS).fill(0));
      
  const handleColumnClick = (col) => {
    if (isMyTurn) {
      onMakeMove(col);
    }
  };

  // Check if a column is full
  const isColumnFull = (col) => {
    return currentBoard[0][col] !== 0;
  };

  return (
    <div className="board-container">
      <div className="column-buttons">
        {Array(COLS).fill(null).map((_, col) => (
          <button
            key={col}
            className="column-button"
            onClick={() => handleColumnClick(col)}
            disabled={!isMyTurn || isColumnFull(col)}
          >
            ↓
          </button>
        ))}
      </div>
      <div className="board-grid">
        {currentBoard.map((row, r) =>
          row.map((cell, c) => <Cell key={`${r}-${c}`} value={cell} />)
        )}
      </div>
    </div>
  );
}

export default Board;