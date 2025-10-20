const mongoose = require('mongoose');

const statusSchema = new mongoose.Schema({
  state: {
    type: String,
    enum: ['normal', 'drowsy', 'yawn'],
    required: true
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Status', statusSchema);