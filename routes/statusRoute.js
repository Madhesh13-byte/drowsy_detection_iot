const express = require('express');
const stateManager = require('../utils/stateManager');

const router = express.Router();

router.get('/status', (req, res) => {
  const currentState = stateManager.getCurrentState();
  res.json(currentState);
  console.log(`📊 Status requested: ${currentState.state}`);
});

module.exports = router;