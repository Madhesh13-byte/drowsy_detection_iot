const express = require('express');
const Status = require('../models/Status');
const Alert = require('../models/Alert');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const router = express.Router();

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.userId = user.userId;
    next();
  });
};

// Get real-time analytics for driver
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const driverId = req.userId;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    // Get today's session data
    const todayStats = await Status.find({
      driverId: new mongoose.Types.ObjectId(driverId),
      timestamp: { $gte: today }
    }).sort({ timestamp: 1 });

    // Calculate session duration (first to last record today)
    let sessionDuration = 0;
    if (todayStats.length > 0) {
      const firstRecord = todayStats[0].timestamp;
      const lastRecord = todayStats[todayStats.length - 1].timestamp;
      sessionDuration = Math.floor((lastRecord - firstRecord) / 1000 / 60); // minutes
    }

    // Count drowsy incidents today
    const drowsyToday = todayStats.filter(s => s.state === 'drowsy').length;

    // Count alerts today
    console.log('Checking alerts for driver:', driverId, 'since:', today);
    const alertsToday = await Alert.countDocuments({
      driverId: new mongoose.Types.ObjectId(driverId),
      timestamp: { $gte: today }
    });
    console.log('Alerts found today:', alertsToday);
    
    // Debug: Check all alerts for this driver
    const allAlerts = await Alert.find({ driverId: new mongoose.Types.ObjectId(driverId) });
    console.log('Total alerts for driver:', allAlerts.length, allAlerts);

    // Calculate drowsiness score (0-100, higher is better)
    const totalRecords = todayStats.length;
    const normalRecords = todayStats.filter(s => s.state === 'normal').length;
    const drowsinessScore = totalRecords > 0 ? Math.round((normalRecords / totalRecords) * 100) : 100;

    // Calculate safety streak (days without alerts)
    const lastAlert = await Alert.findOne({
      driverId: new mongoose.Types.ObjectId(driverId)
    }).sort({ timestamp: -1 });

    let safetyStreak = 0;
    if (!lastAlert) {
      safetyStreak = 30; // Default for new users
    } else {
      const daysSinceAlert = Math.floor((now - lastAlert.timestamp) / (1000 * 60 * 60 * 24));
      safetyStreak = daysSinceAlert;
    }

    // Get current state
    const currentState = todayStats.length > 0 ? todayStats[todayStats.length - 1].state : 'normal';

    res.json({
      drowsinessScore,
      sessionDuration,
      alertsToday,
      drowsyIncidents: drowsyToday,
      safetyStreak,
      currentState,
      isActive: todayStats.length > 0,
      lastUpdate: todayStats.length > 0 ? todayStats[todayStats.length - 1].timestamp : null
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get 24-hour timeline data
router.get('/timeline', authenticateToken, async (req, res) => {
  try {
    const driverId = req.userId;
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const timelineData = await Status.aggregate([
      {
        $match: {
          driverId: new mongoose.Types.ObjectId(driverId),
          timestamp: { $gte: last24Hours }
        }
      },
      {
        $group: {
          _id: {
            hour: { $hour: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' }
          },
          drowsyCount: { $sum: { $cond: [{ $eq: ['$state', 'drowsy'] }, 1, 0] } },
          normalCount: { $sum: { $cond: [{ $eq: ['$state', 'normal'] }, 1, 0] } },
          yawnCount: { $sum: { $cond: [{ $eq: ['$state', 'yawn'] }, 1, 0] } },
          totalCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.day': 1, '_id.hour': 1 } }
    ]);

    res.json(timelineData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get weekly trends
router.get('/weekly', authenticateToken, async (req, res) => {
  try {
    const driverId = req.userId;
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const weeklyData = await Status.aggregate([
      {
        $match: {
          driverId: new mongoose.Types.ObjectId(driverId),
          timestamp: { $gte: lastWeek }
        }
      },
      {
        $group: {
          _id: { $dayOfWeek: '$timestamp' },
          drowsyCount: { $sum: { $cond: [{ $eq: ['$state', 'drowsy'] }, 1, 0] } },
          totalCount: { $sum: 1 },
          avgScore: { $avg: { $cond: [{ $eq: ['$state', 'normal'] }, 100, 0] } }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    res.json(weeklyData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get heatmap data (hour vs day)
router.get('/heatmap', authenticateToken, async (req, res) => {
  try {
    const driverId = req.userId;
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const heatmapData = await Status.aggregate([
      {
        $match: {
          driverId: new mongoose.Types.ObjectId(driverId),
          timestamp: { $gte: lastWeek }
        }
      },
      {
        $group: {
          _id: {
            hour: { $hour: '$timestamp' },
            dayOfWeek: { $dayOfWeek: '$timestamp' }
          },
          drowsyPercentage: {
            $avg: { $cond: [{ $eq: ['$state', 'drowsy'] }, 1, 0] }
          },
          totalCount: { $sum: 1 }
        }
      }
    ]);

    res.json(heatmapData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;