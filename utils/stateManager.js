const Status = require('../models/Status');

class StateManager {
  constructor() {
    this.currentState = 'normal';
    this.lastUpdated = new Date();
  }

  async updateState(newState, confidence = null) {
    this.currentState = newState;
    this.lastUpdated = new Date();
    
    try {
      // Save to MongoDB
      const statusRecord = new Status({
        state: newState,
        confidence: confidence,
        timestamp: this.lastUpdated
      });
      await statusRecord.save();
      console.log(`🔄 State updated: ${newState} at ${this.lastUpdated.toLocaleTimeString()} - Saved to DB`);
    } catch (error) {
      console.error('❌ Error saving to database:', error.message);
    }
  }

  async getCurrentState() {
    try {
      // Get latest from MongoDB
      const latestStatus = await Status.findOne().sort({ timestamp: -1 });
      if (latestStatus) {
        this.currentState = latestStatus.state;
        this.lastUpdated = latestStatus.timestamp;
      }
    } catch (error) {
      console.error('❌ Error fetching from database:', error.message);
    }
    
    return {
      state: this.currentState,
      lastUpdated: this.lastUpdated
    };
  }

  async getStatusHistory(limit = 10) {
    try {
      return await Status.find().sort({ timestamp: -1 }).limit(limit);
    } catch (error) {
      console.error('❌ Error fetching history:', error.message);
      return [];
    }
  }
}

module.exports = new StateManager();