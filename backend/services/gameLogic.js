const ROWS = 6;
const COLS = 7;
const EMPTY = 0;
const PLAYER_1 = 1;
const PLAYER_2 = 2;

/**
 * Creates a new empty game board.
 * @returns {Array<Array<number>>} A 6x7 2D array filled with 0s.
 */
function createBoard() {
  return Array(ROWS)
    .fill(null)
    .map(() => Array(COLS).fill(EMPTY));
}

/**
 * Checks if a move is valid (i.e., the top-most cell in the column is empty).
 * @param {Array<Array<number>>} board - The game board.
 * @param {number} col - The column index.
 * @returns {boolean} True if the move is valid, false otherwise.
 */
function isValidMove(board, col) {
  return col >= 0 && col < COLS && board[0][col] === EMPTY;
}

/**
 * Drops a disc into the board. Assumes move is valid.
 * @param {Array<Array<number>>} board - The game board.
 * @param {number} col - The column index.
 * @param {number} player - The player number (1 or 2).
 * @returns {Array<Array<number>>} A new board state.
 */
function dropDisc(board, col, player) {
  // Create a deep copy of the board to maintain immutability
  const newBoard = board.map(row => [...row]);
  
  // Find the lowest empty row
  for (let r = ROWS - 1; r >= 0; r--) {
    if (newBoard[r][col] === EMPTY) {
      newBoard[r][col] = player;
      return newBoard;
    }
  }
  return newBoard; // Should not happen if isValidMove is checked
}

/**
 * Checks for a win for the given player.
 * @param {Array<Array<number>>} board - The game board.
 * @param {number} player - The player number (1 or 2).
 * @returns {boolean} True if the player has won.
 */
function checkWin(board, player) {
  // Check horizontal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      if (
        board[r][c] === player &&
        board[r][c + 1] === player &&
        board[r][c + 2] === player &&
        board[r][c + 3] === player
      ) {
        return true;
      }
    }
  }

  // Check vertical
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r <= ROWS - 4; r++) {
      if (
        board[r][c] === player &&
        board[r + 1][c] === player &&
        board[r + 2][c] === player &&
        board[r + 3][c] === player
      ) {
        return true;
      }
    }
  }

  // Check positive diagonal (bottom-left to top-right)
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      if (
        board[r][c] === player &&
        board[r - 1][c + 1] === player &&
        board[r - 2][c + 2] === player &&
        board[r - 3][c + 3] === player
      ) {
        return true;
      }
    }
  }

  // Check negative diagonal (top-left to bottom-right)
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      if (
        board[r][c] === player &&
        board[r + 1][c + 1] === player &&
        board[r + 2][c + 2] === player &&
        board[r + 3][c + 3] === player
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks if the game is a draw (board is full).
 * @param {Array<Array<number>>} board - The game board.
 *Type {boolean} True if the game is a draw.
 */
function checkDraw(board) {
  // Check if the top row is full
  for (let c = 0; c < COLS; c++) {
    if (board[0][c] === EMPTY) {
      return false; // Found an empty spot, not a draw
    }
  }
  return true; // Top row is full, so board is full
}

/**
 * Gets a list of all valid (non-full) columns.
 * @param {Array<Array<number>>} board
 * @returns {Array<number>} An array of valid column indices.
 */
function getValidMoves(board) {
  const validMoves = [];
  for (let c = 0; c < COLS; c++) {
    if (isValidMove(board, c)) {
      validMoves.push(c);
    }
  }
  return validMoves;
}

module.exports = {
  ROWS,
  COLS,
  EMPTY,
  PLAYER_1,
  PLAYER_2,
  createBoard,
  isValidMove,
  dropDisc,
  checkWin,
  checkDraw,
  getValidMoves,
};