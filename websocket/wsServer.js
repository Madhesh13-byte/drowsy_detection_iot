const WebSocket = require('ws');
const stateManager = require('../utils/stateManager');

class WSServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Set();
    this.setupWebSocket();
  }

  setupWebSocket() {
    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      console.log(`🔗 New client connected. Total clients: ${this.clients.size}`);

      // Send current state to new client
      ws.send(JSON.stringify(stateManager.getCurrentState()));

      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);
          console.log(`📨 Received from AI service:`, data);
          
          const driverState = data.state || data.status;
          if (driverState && ['normal', 'drowsy', 'yawn'].includes(driverState)) {
            await stateManager.updateState(driverState, data.confidence);
            const currentState = await stateManager.getCurrentState();
            this.broadcast(currentState);
          }
        } catch (error) {
          console.error('❌ Invalid message format:', error.message);
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`🔌 Client disconnected. Total clients: ${this.clients.size}`);
      });
    });
  }

  broadcast(data) {
    const message = JSON.stringify(data);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
    console.log(`📡 Broadcasted to ${this.clients.size} clients:`, data);
  }
}

module.exports = WSServer;