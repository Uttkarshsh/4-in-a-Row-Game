import React from 'react';

function Cell({ value }) {
  // value: 0 = empty, 1 = player1 (red), 2 = player2 (yellow)
  const getCellClass = () => {
    if (value === 1) return 'player1';
    if (value === 2) return 'player2';
    return 'empty';
  };

  return (
    <div className={`cell ${getCellClass()}`}>
    </div>
  );
}

export default Cell;