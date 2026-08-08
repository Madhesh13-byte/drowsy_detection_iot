const mongoose = require('mongoose');

const driverProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  age: {
    type: Number,
    min: 16,
    max: 100
  },
  emergencyContacts: [{
    name: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    relationship: {
      type: String,
      enum: ['spouse', 'parent', 'sibling', 'friend', 'colleague', 'other'],
      default: 'other'
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  medicalInfo: {
    conditions: [String],
    medications: [String],
    allergies: [String]
  },
  alertSettings: {
    drowsyThreshold: {
      type: Number,
      default: 30 // seconds
    },
    criticalThreshold: {
      type: Number,
      default: 120 // seconds
    },
    enableSMS: {
      type: Boolean,
      default: true
    },
    enableCall: {
      type: Boolean,
      default: false
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('DriverProfile', driverProfileSchema);