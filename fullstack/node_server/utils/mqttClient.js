const mqtt = require('mqtt');

class MQTTClient {
  constructor() {
    this.client = null;
    this.connected = false;
    this.brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://broker.hivemq.com:1883';
    this.topic = 'status/driver';  // Standard topic for all components

  }

  connect() {
    try {
      this.client = mqtt.connect(this.brokerUrl);
      
      this.client.on('connect', () => {
        this.connected = true;
        console.log('📡 MQTT Client connected to broker');
      });

      this.client.on('error', (error) => {
        console.error('❌ MQTT Connection error:', error.message);
        this.connected = false;
      });

      this.client.on('close', () => {
        this.connected = false;
        console.log('🔌 MQTT Client disconnected');
      });

    } catch (error) {
      console.error('❌ MQTT Client initialization error:', error.message);
    }
  }

  publishAlert(state, driverId = null) {
    if (!this.connected || !this.client) {
      console.log('⚠️ MQTT not connected, skipping alert');
      return false;
    }

    const message = {
      state: state,
      timestamp: new Date().toISOString(),
      driverId: driverId
    };

    try {
      this.client.publish(this.topic, JSON.stringify(message));
      console.log(`📤 MQTT Alert sent: ${state}`);
      return true;
    } catch (error) {
      console.error('❌ MQTT Publish error:', error.message);
      return false;
    }
  }

  disconnect() {
    if (this.client) {
      this.client.end();
      this.connected = false;
    }
  }
}

module.exports = new MQTTClient();