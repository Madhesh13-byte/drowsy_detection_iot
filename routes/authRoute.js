const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create user
    const user = new User({ name, email, password });
    await user.save();

    // Generate JWT
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });

    console.log(`👤 New user registered: ${email}`);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Store current user info for camera module
    const fs = require('fs');
    const path = require('path');
    const { spawn } = require('child_process');
    
    const userInfo = {
      id: user._id,
      name: user.name,
      email: user.email
    };
    fs.writeFileSync(path.join(__dirname, '../current_user.json'), JSON.stringify(userInfo));



    res.json({
      message: 'Login successful',
      token,
      user: userInfo
    });

    console.log(`🔐 User logged in: ${email}`);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;