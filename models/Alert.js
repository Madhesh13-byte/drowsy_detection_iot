const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  driverName: { type: String, required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, default: 'alert_sent' },
  timestamp: { type: Date, default: Date.now },
  alertType: { type: String, default: 'drowsiness_15s' }
});

module.exports = mongoose.model('Alert', alertSchema);