const WebSocket = require('ws');
const stateManager = require('../utils/stateManager');
const mqttClient = require('../utils/mqttClient');
const telegramAlert = require('../utils/telegramAlert');

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
          if (driverState && ['normal', 'drowsy', 'yawn', 'no_face'].includes(driverState)) {
            if (['normal', 'drowsy', 'yawn'].includes(driverState)) {
              await stateManager.updateState(driverState, data.confidence, data.driverId);
            }
            
            // Send MQTT alert for ESP32
            mqttClient.publishAlert(driverState, data.driverId);
            
            // Monitor drowsiness for Telegram alerts
            if (data.driverId) {
              // Get driver name from database
              const User = require('../models/User');
              try {
                const user = await User.findById(data.driverId).select('name');
                const driverName = user ? user.name : 'Unknown Driver';
                telegramAlert.monitorDrowsiness(driverName, data.driverId, driverState, new Date());
              } catch (error) {
                console.error('Error fetching driver name:', error.message);
              }
            }
            
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