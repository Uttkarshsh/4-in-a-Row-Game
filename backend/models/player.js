const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  wins: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model('Player', PlayerSchema);