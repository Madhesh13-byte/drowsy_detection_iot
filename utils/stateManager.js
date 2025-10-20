class StateManager {
  constructor() {
    this.currentState = 'normal';
    this.lastUpdated = new Date();
  }

  updateState(newState) {
    this.currentState = newState;
    this.lastUpdated = new Date();
    console.log(`🔄 State updated: ${newState} at ${this.lastUpdated.toLocaleTimeString()}`);
  }

  getCurrentState() {
    return {
      state: this.currentState,
      lastUpdated: this.lastUpdated
    };
  }
}

module.exports = new StateManager();