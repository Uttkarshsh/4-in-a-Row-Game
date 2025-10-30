// Stores active games. Key: gameId, Value: game object
const activeGames = new Map();

// Stores timers for disconnected players. Key: gameId, Value: { timer, username }
const disconnectTimers = new Map();

// Stores the waiting player
const waitingPlayer = {
  socket: null,
  timer: null,
};

/**
 * Finds the game a socket is currently in.
 * @param {string} socketId - The socket.id of the player.
 * @returns {object | null} The game object or null if not found.
 */
function findGameBySocketId(socketId) {
  for (const game of activeGames.values()) {
    if (game.player1.socketId === socketId || game.player2?.socketId === socketId) {
      return game;
    }
  }
  return null;
}

module.exports = {
  activeGames,
  disconnectTimers,
  waitingPlayer,
  findGameBySocketId,
};