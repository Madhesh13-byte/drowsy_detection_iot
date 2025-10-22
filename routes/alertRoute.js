const express = require('express');
const telegramAlert = require('../utils/telegramAlert');
const jwt = require('jsonwebtoken');

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

// Get alerts for current driver
router.get('/my-alerts', authenticateToken, async (req, res) => {
  try {
    const alerts = await telegramAlert.getDriverAlerts(req.userId, 20);
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all recent alerts (admin view)
router.get('/recent', authenticateToken, async (req, res) => {
  try {
    const alerts = await telegramAlert.getAllRecentAlerts(50);
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;