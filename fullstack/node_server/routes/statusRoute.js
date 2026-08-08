const express = require('express');
const stateManager = require('../utils/stateManager');

const router = express.Router();

router.get('/status', async (req, res) => {
  try {
    const currentState = await stateManager.getCurrentState({ state: "drowsy" });
    res.json(currentState);
    console.log(`📊 Status requested: ${currentState.state}`);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const history = await stateManager.getStatusHistory(limit);
    res.json(history);
    console.log(`📊 History requested: ${history.length} records`);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});
// Add this to statusRoute.js
router.post('/update_status', async (req, res) => {
  try {
    const { state, confidence, timestamp } = req.body;
    await stateManager.setCurrentState({ state, confidence, timestamp });
    res.json({ success: true });
    console.log(`🔄 State updated: ${state} (${confidence}) @ ${timestamp}`);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});


module.exports = router;