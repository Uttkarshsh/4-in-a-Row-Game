const mongoose = require('mongoose');

const AnalyticsEventSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
  },
  eventName: {
    type: String,
    required: true,
    index: true,
  },
  gameId: {
    type: String,
    index: true,
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
  },
});

module.exports = mongoose.model('AnalyticsEvent', AnalyticsEventSchema);