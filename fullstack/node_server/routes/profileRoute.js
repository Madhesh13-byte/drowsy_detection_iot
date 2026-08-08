const express = require('express');
const DriverProfile = require('../models/DriverProfile');
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

// Get driver profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const profile = await DriverProfile.findOne({ userId: req.userId });
    res.json(profile || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get driver by ID (for camera module)
router.get('/:id', async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.params.id).select('name email');
    if (!user) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update driver profile
router.post('/profile', authenticateToken, async (req, res) => {
  try {
    console.log('Profile save request:', req.body);
    console.log('User ID:', req.userId);
    
    const profile = await DriverProfile.findOneAndUpdate(
      { userId: req.userId },
      { ...req.body, userId: req.userId },
      { new: true, upsert: true }
    );
    res.json(profile);
    console.log(`👤 Profile updated for user: ${req.userId}`);
  } catch (error) {
    console.error('Profile save error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;