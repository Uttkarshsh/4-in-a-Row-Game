const { v4: uuidv4 } = require('uuid');
const Player = require('../models/player');
const Game = require('../models/game');
const AnalyticsEvent = require('../models/analyticsEvent');
const { findBestMove } = require('./bot');
const {
  activeGames,
  disconnectTimers,
  waitingPlayer,
  findGameBySocketId,
} = require('../utils/gameManager');
const {
  createBoard,
  isValidMove,
  dropDisc,
  checkWin,
  checkDraw,
  PLAYER_1,
  PLAYER_2,
} = require('./gameLogic');

// --- Helper Functions ---

/**
 * Logs an analytics event to the database.
 */
async function logAnalytics(eventName, gameId, data = {}) {
  try {
    const event = new AnalyticsEvent({
      eventName,
      gameId,
      data,
    });
    await event.save();
  } catch (err) {
    console.error('Analytics logging error:', err);
  }
}

/**
 * Ends a game, saves it to DB, and cleans up.
 */
async function endGame(io, gameId, winnerNum, isForfeit = false) {
  const game = activeGames.get(gameId);
  if (!game) return; // Game already ended or doesn't exist

  console.log(`Ending game ${gameId}. Winner: ${winnerNum}`);

  // 1. Determine winner and send result
  let winnerString;
  if (winnerNum === 'draw') {
    winnerString = 'draw';
    io.to(gameId).emit('gameEnd', { result: 'draw', board: game.board });
  } else {
    const winnerUsername =
      winnerNum === PLAYER_1
        ? game.player1.username
        : game.player2.username;
    winnerString = winnerNum === PLAYER_1 ? 'player1' : 'player2';
    
    io.to(gameId).emit('gameEnd', {
      result: 'win',
      winner: winnerUsername,
      board: game.board,
      isForfeit,
    });
  }

  // 2. Save completed game to MongoDB
  try {
    if (winnerString !== 'draw') {
      const winnerDbId =
        winnerString === 'player1'
          ? game.player1.dbId
          : game.player2.dbId;
      
      // Update winner's win count (only if not a bot)
      if (winnerDbId) {
        await Player.findByIdAndUpdate(winnerDbId, { $inc: { wins: 1 } });
      }
    }

    const completedGame = new Game({
      gameId: game.gameId,
      player1: game.player1.dbId,
      player2: game.player2.dbId, // This is null for bot games, which is fine
      player2Username: game.player2.username,
      winner: winnerString,
      moveHistory: game.moveHistory,
      startedAt: game.startedAt,
      endedAt: Date.now(),
      isForfeit,
    });
    await completedGame.save();
    
    logAnalytics('GAME_ENDED', game.gameId, {
       winner: winnerString,
       player1: game.player1.username,
       player2: game.player2.username,
       duration: (Date.now() - game.startedAt) / 1000,
       isForfeit,
    });

  } catch (err) {
    console.error('Error saving game:', err);
  }

  // 3. Clean up
  activeGames.delete(gameId);
  disconnectTimers.delete(gameId); // Clear any pending disconnect timers
}

/**
 * Starts a new 1v1 player game.
 */
function startGame(io, player1Socket, player2Socket) {
  const gameId = uuidv4();
  const board = createBoard();
  const game = {
    gameId,
    board,
    player1: {
      username: player1Socket.player.username,
      socketId: player1Socket.id,
      dbId: player1Socket.player._id,
    },
    player2: {
      username: player2Socket.player.username,
      socketId: player2Socket.id,
      dbId: player2Socket.player._id,
    },
    turn: PLAYER_1,
    playerNum: {
      [player1Socket.id]: PLAYER_1,
      [player2Socket.id]: PLAYER_2,
    },
    moveHistory: [],
    startedAt: Date.now(),
  };

  activeGames.set(gameId, game);
  player1Socket.join(gameId);
  player2Socket.join(gameId);

  // Emit 'gameStart' to both players
  io.to(gameId).emit('gameStart', {
    gameId,
    board: game.board,
    turn: game.turn,
    opponent: {
      [player1Socket.id]: game.player2.username,
      [player2Socket.id]: game.player1.username,
    },
    playerNum: game.playerNum[player1Socket.id], // Send player 1 their number
  });
  
  // Need to send player 2 their number separately
  player2Socket.emit('playerNum', game.playerNum[player2Socket.id]);

  logAnalytics('GAME_STARTED', gameId, {
    type: '1v1',
    player1: game.player1.username,
    player2: game.player2.username,
  });
}

/**
 * Starts a new player vs. bot game.
 */
function startBotGame(io, playerSocket) {
  const gameId = uuidv4();
  const board = createBoard();
  const game = {
    gameId,
    board,
    player1: {
      username: playerSocket.player.username,
      socketId: playerSocket.id,
      dbId: playerSocket.player._id,
    },
    player2: {
      username: 'BOT',
      socketId: null, // Bot has no socket
      dbId: null, // Bot has no DB entry
    },
    turn: PLAYER_1,
    playerNum: {
      [playerSocket.id]: PLAYER_1,
    },
    moveHistory: [],
    startedAt: Date.now(),
  };

  activeGames.set(gameId, game);
  playerSocket.join(gameId);

  io.to(gameId).emit('gameStart', {
    gameId,
    board: game.board,
    turn: game.turn,
    opponent: 'BOT',
    playerNum: PLAYER_1,
  });
  
  logAnalytics('GAME_STARTED', gameId, {
      type: 'bot',
      player1: game.player1.username
  });
}

// --- Main Handler Registration ---

module.exports = (io, socket) => {
  /**
   * Handle: 'joinGame'
   * A player provides a username and wants to join a game.
   */
  socket.on('joinGame', async (username) => {
    try {
      // 1. Find or create player in DB
      let player = await Player.findOne({ username });
      if (!player) {
        player = new Player({ username });
        await player.save();
        logAnalytics('PLAYER_CREATED', null, { username });
      }
      socket.player = player; // Attach player info to the socket object

      // 2. Check for Reconnection
      for (const [gameId, timerData] of disconnectTimers.entries()) {
        if (timerData.username === username) {
          const game = activeGames.get(gameId);
          if (game) {
            clearTimeout(timerData.timer); // Cancel forfeit timer
            disconnectTimers.delete(gameId);

            // Update socket ID in the game object
            const playerKey = game.player1.username === username ? 'player1' : 'player2';
            game[playerKey].socketId = socket.id;
            game.playerNum[socket.id] = playerKey === 'player1' ? PLAYER_1 : PLAYER_2;

            socket.join(gameId);
            socket.emit('reconnected', {
              gameId,
              board: game.board,
              turn: game.turn,
              opponent: playerKey === 'player1' ? game.player2.username : game.player1.username,
              playerNum: game.playerNum[socket.id],
            });
            
            // Notify opponent
            const opponentSocketId = playerKey === 'player1' ? game.player2.socketId : game.player1.socketId;
            if(opponentSocketId) {
                io.to(opponentSocketId).emit('opponentReconnected');
            }
            
            console.log(`Player ${username} reconnected to game ${gameId}`);
            return;
          }
        }
      }

      // 3. Handle Matchmaking
      if (!waitingPlayer.socket) {
        // This is the first player
        waitingPlayer.socket = socket;
        socket.emit('waitingForOpponent');
        console.log(`Player ${username} is waiting.`);

        // Start 30-second timer (was 10000)
        waitingPlayer.timer = setTimeout(() => {
          if (waitingPlayer.socket === socket) {
            // Timer expired, no one joined. Start bot game.
            console.log(`Timer expired for ${username}. Starting bot game.`);
            startBotGame(io, socket);
            waitingPlayer.socket = null;
            waitingPlayer.timer = null;
          }
        }, 30000); // 30 seconds
      } else {
        // This is the second player
        console.log(`Found match: ${waitingPlayer.socket.player.username} vs ${username}`);
        clearTimeout(waitingPlayer.timer); // Cancel the timer
        const player1Socket = waitingPlayer.socket;
        const player2Socket = socket;

        waitingPlayer.socket = null; // Reset waiting room
        waitingPlayer.timer = null;

        startGame(io, player1Socket, player2Socket);
      }
    } catch (err) {
      console.error('Join game error:', err);
      socket.emit('error', 'Error joining game. Please try again.');
    }
  });

  /**
   * Handle: 'makeMove'
   * A player makes a move in a game.
   */
  socket.on('makeMove', ({ gameId, column }) => {
    const game = activeGames.get(gameId);
    if (!game) return;
    
    const playerNum = game.playerNum[socket.id];
    
    // 1. Validate Move
    if (playerNum !== game.turn) {
      return socket.emit('error', 'Not your turn.');
    }
    if (!isValidMove(game.board, column)) {
      return socket.emit('error', 'Invalid move.');
    }

    // 2. Apply Move
    game.board = dropDisc(game.board, column, playerNum);
    game.moveHistory.push({ player: playerNum, column });

    // 3. Check for Win/Draw
    if (checkWin(game.board, playerNum)) {
      endGame(io, gameId, playerNum);
      return;
    }
    if (checkDraw(game.board)) {
      endGame(io, gameId, 'draw');
      return;
    }

    // 4. Switch Turn
    game.turn = playerNum === PLAYER_1 ? PLAYER_2 : PLAYER_1;
    io.to(gameId).emit('gameStateUpdate', {
      board: game.board,
      turn: game.turn,
    });

    // 5. Trigger Bot Move (if applicable)
    if (game.player2.username === 'BOT' && game.turn === PLAYER_2) {
      // Add a small delay for realism
      setTimeout(() => {
        const botMove = findBestMove(game.board);
        game.board = dropDisc(game.board, botMove, PLAYER_2);
        game.moveHistory.push({ player: PLAYER_2, column: botMove });

        // Check for Bot Win/Draw
        if (checkWin(game.board, PLAYER_2)) {
          endGame(io, gameId, PLAYER_2);
          return;
        }
        if (checkDraw(game.board)) {
          endGame(io, gameId, 'draw');
          return;
        }

        // Switch turn back to player
        game.turn = PLAYER_1;
        io.to(gameId).emit('gameStateUpdate', {
          board: game.board,
          turn: game.turn,
        });
      }, 500); // 0.5 second delay
    }
  });

  // --- THIS IS THE CORRECT LOCATION ---
  /**
   * Handle: 'playWithBot'
   * A waiting player manually opts to play against a bot.
   */
  socket.on('playWithBot', () => {
    // Add this log for debugging
    console.log(`--- 'playWithBot' EVENT RECEIVED from ${socket.player?.username} ---`);

    // Check if this socket is actually the one waiting
    if (waitingPlayer.socket === socket) {
      console.log(`Player ${socket.player.username} opted to play with bot.`);
      
      // 1. Clear the matchmaking timer
      clearTimeout(waitingPlayer.timer);

      // 2. Start the bot game
      startBotGame(io, socket);

      // 3. Clear the waiting room
      waitingPlayer.socket = null;
      waitingPlayer.timer = null;

    } else {
      console.log(`--- 'playWithBot' FAILED: Socket is not the waiting player.`);
      socket.emit('error', 'You are not in the waiting room.');
    }
  });

  /**
   * Handle: 'disconnect'
   * A player's socket disconnects.
   */
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);

    // Check if player was the waiting player
    if (waitingPlayer.socket === socket) {
      console.log('Waiting player disconnected.');
      clearTimeout(waitingPlayer.timer);
      waitingPlayer.socket = null;
      waitingPlayer.timer = null;
      return;
    }

    // Check if player was in an active game
    const game = findGameBySocketId(socket.id);
    if (game && socket.player) {
      const username = socket.player.username;
      const gameId = game.gameId;

      // Don't start a timer if the game is over
      if (!activeGames.has(gameId)) return;

      console.log(`Player ${username} disconnected from game ${gameId}. Starting 30s timer.`);
      io.to(gameId).emit('playerDisconnected', `${username} disconnected. They have 30 seconds to rejoin.`);

      // Start 30-second forfeit timer
      const timer = setTimeout(() => {
        const gameOnTimer = activeGames.get(gameId);
        if (!gameOnTimer) return; // Game already ended

        console.log(`Forfeit timer expired for ${username} in game ${gameId}.`);
        const disconnectedPlayerNum = game.playerNum[socket.id];
        const winnerNum =
          disconnectedPlayerNum === PLAYER_1 ? PLAYER_2 : PLAYER_1;
        
        endGame(io, gameId, winnerNum, true); // true = forfeit
        disconnectTimers.delete(gameId);
        
      }, 30000); // 30 seconds

      disconnectTimers.set(gameId, { timer, username });
    }
  });
};
