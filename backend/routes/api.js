const express = require('express');
const router = express.Router();
const Player = require('../models/player');

// @route   GET /api/leaderboard
// @desc    Get top 10 players
// @access  Public
router.get('/leaderboard', async (req, res) => {
  try {
    const leaderboard = await Player.find()
      .sort({ wins: -1 }) // Sort by wins descending
      .limit(10)
      .select('username wins'); // Only send username and wins

    res.json(leaderboard);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;