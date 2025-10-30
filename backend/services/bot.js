const {
  ROWS,
  COLS,
  EMPTY,
  PLAYER_1,
  PLAYER_2,
  dropDisc,
  checkWin,
  getValidMoves,
  isValidMove,
  checkDraw,
} = require('./gameLogic');

const BOT_PLAYER = PLAYER_2;
const HUMAN_PLAYER = PLAYER_1;
const MAX_DEPTH = 5; // Adjust for difficulty (higher = smarter but slower)

// --- Heuristic Scoring ---

/**
 * Evaluates a 4-cell "window" for scoring.
 * @param {Array<number>} window - An array of 4 cells.
 * @param {number} player - The player to score for (BOT_PLAYER).
 * @returns {number} The heuristic score for this window.
 */
function evaluateWindow(window, player) {
  let score = 0;
  const oppPlayer = player === PLAYER_1 ? PLAYER_2 : PLAYER_1;

  const playerCount = window.filter(p => p === player).length;
  const oppCount = window.filter(p => p === oppPlayer).length;
  const emptyCount = window.filter(p => p === EMPTY).length;

  if (playerCount === 4) {
    score += 10000; // Winning move
  } else if (playerCount === 3 && emptyCount === 1) {
    score += 50; // Potential win
  } else if (playerCount === 2 && emptyCount === 2) {
    score += 10;
  }

  if (oppCount === 3 && emptyCount === 1) {
    score -= 75; // Block opponent's potential win
  } else if (oppCount === 4) {
    score -= 10000; // Opponent wins
  }

  return score;
}

/**
 * Scores the entire board state from the perspective of the bot.
 * @param {Array<Array<number>>} board - The game board.
 * @param {number} player - The player to score for (BOT_PLAYER).
 * @returns {number} The total heuristic score.
 */
function scorePosition(board, player) {
  let score = 0;

  // Score center column (slight preference)
  const centerArray = board.map(row => row[Math.floor(COLS / 2)]);
  const centerCount = centerArray.filter(p => p === player).length;
  score += centerCount * 3;

  // Score Horizontal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const window = board[r].slice(c, c + 4);
      score += evaluateWindow(window, player);
    }
  }

  // Score Vertical
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r <= ROWS - 4; r++) {
      const window = [
        board[r][c],
        board[r + 1][c],
        board[r + 2][c],
        board[r + 3][c],
      ];
      score += evaluateWindow(window, player);
    }
  }

  // Score Positive Diagonal
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const window = [
        board[r][c],
        board[r - 1][c + 1],
        board[r - 2][c + 2],
        board[r - 3][c + 3],
      ];
      score += evaluateWindow(window, player);
    }
  }

  // Score Negative Diagonal
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const window = [
        board[r][c],
        board[r + 1][c + 1],
        board[r + 2][c + 2],
        board[r + 3][c + 3],
      ];
      score += evaluateWindow(window, player);
    }
  }

  return score;
}

// --- Minimax Algorithm ---

/**
 * The main minimax function with alpha-beta pruning.
 * @param {Array<Array<number>>} board
 * @param {number} depth - How many moves to look ahead.
 * @param {number} alpha - Alpha value for pruning.
 * @param {number} beta - Beta value for pruning.
 * @param {boolean} isMaximizingPlayer - True if it's the bot's turn.
 * @returns {Array} [score, best_column]
 */
function minimax(board, depth, alpha, beta, isMaximizingPlayer) {
  const validMoves = getValidMoves(board);
  const isTerminalNode =
    checkWin(board, HUMAN_PLAYER) ||
    checkWin(board, BOT_PLAYER) ||
    checkDraw(board) ||
    depth === 0;

  if (isTerminalNode) {
    if (depth === 0) {
      return [scorePosition(board, BOT_PLAYER), null];
    }
    if (checkWin(board, BOT_PLAYER)) {
      return [10000000, null];
    }
    if (checkWin(board, HUMAN_PLAYER)) {
      return [-10000000, null];
    }
    if (checkDraw(board)) {
      return [0, null];
    }
  }

  // Prioritize center columns for move ordering (better pruning)
  const moveOrder = [3, 2, 4, 1, 5, 0, 6];
  const orderedValidMoves = moveOrder.filter(col => validMoves.includes(col));

  if (isMaximizingPlayer) {
    // Bot's turn
    let value = -Infinity;
    let bestCol = orderedValidMoves[0];
    for (const col of orderedValidMoves) {
      const newBoard = dropDisc(board, col, BOT_PLAYER);
      const [newScore, _] = minimax(newBoard, depth - 1, alpha, beta, false);
      if (newScore > value) {
        value = newScore;
        bestCol = col;
      }
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break; // Beta cut-off
    }
    return [value, bestCol];
  } else {
    // Human's turn
    let value = Infinity;
    let bestCol = orderedValidMoves[0];
    for (const col of orderedValidMoves) {
      const newBoard = dropDisc(board, col, HUMAN_PLAYER);
      const [newScore, _] = minimax(newBoard, depth - 1, alpha, beta, true);
      if (newScore < value) {
        value = newScore;
        bestCol = col;
      }
      beta = Math.min(beta, value);
      if (alpha >= beta) break; // Alpha cut-off
    }
    return [value, bestCol];
  }
}

/**
 * Finds the best move for the bot.
 * @param {Array<Array<number>>} board - The current game board.
 * @returns {number} The column index for the best move.
 */
function findBestMove(board) {
  console.log('Bot is thinking...');
  const [score, bestCol] = minimax(
    board,
    MAX_DEPTH,
    -Infinity,
    Infinity,
    true
  );
  console.log(`Bot chose column ${bestCol} with score ${score}`);
  
  // As a fallback if minimax returns null (e.g., in a weird state)
  if (bestCol === null) {
      const validMoves = getValidMoves(board);
      return validMoves[Math.floor(Math.random() * validMoves.length)];
  }
  
  return bestCol;
}

module.exports = { findBestMove };