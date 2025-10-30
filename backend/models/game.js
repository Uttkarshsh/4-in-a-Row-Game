const mongoose = require('mongoose');

const GameSchema = new mongoose.Schema({
  gameId: {
    type: String,
    required: true,
    unique: true,
  },
  player1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true,
  },
  // player2 can be null if it's a bot game
  player2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
  },
  player2Username: {
    type: String, // "BOT" or the second player's username
    required: true,
  },
  winner: {
    type: String, // 'player1', 'player2', or 'draw'
  },
  moveHistory: [
    {
      player: Number, // 1 or 2
      column: Number,
    },
  ],
  startedAt: {
    type: Date,
    default: Date.now,
  },
  endedAt: {
    type: Date,
  },
  isForfeit: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model('Game', GameSchema);