/*
 * Telegram Emergency Alert System for Driver Drowsiness Detection
 * 
 * Setup Instructions:
 * 1. Create Telegram Bot:
 *    - Message @BotFather on Telegram
 *    - Send /newbot command
 *    - Follow instructions to get BOT_TOKEN
 * 
 * 2. Get Chat ID:
 *    - Add your bot to a chat or message it directly
 *    - Send a message to the bot
 *    - Visit: https://api.telegram.org/bot<BOT_TOKEN>/getUpdates
 *    - Find "chat":{"id": YOUR_CHAT_ID}
 * 
 * 3. Environment Variables (.env):
 *    TELEGRAM_BOT_TOKEN=your_bot_token_here
 *    TELEGRAM_CHAT_ID=your_chat_id_here
 * 
 * 4. MongoDB Connection:
 *    - Use existing MONGODB_URI or set up MongoDB Atlas
 *    - Alerts are logged to 'alerts' collection
 */

const TelegramBot = require('node-telegram-bot-api');
const Alert = require('../models/Alert');

class TelegramAlertSystem {
  constructor() {
    this.bot = null;
    this.chatId = process.env.TELEGRAM_CHAT_ID;
    this.drowsyTimers = new Map(); // Track drowsy timers per driver
    this.initializeBot();
  }

  initializeBot() {
    try {
      if (process.env.TELEGRAM_BOT_TOKEN) {
        this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
        console.log('📱 Telegram bot initialized successfully');
      } else {
        console.log('⚠️ Telegram bot token not found - alerts disabled');
      }
    } catch (error) {
      console.error('❌ Telegram bot initialization failed:', error.message);
    }
  }

  /**
   * Monitor driver drowsiness and send alerts after 15 seconds
   * @param {string} driverName - Name of the driver
   * @param {string} driverId - Driver's MongoDB ObjectId
   * @param {string} state - Current state: 'drowsy', 'normal', 'no_face'
   * @param {Date} timestamp - Current timestamp
   */
  monitorDrowsiness(driverName, driverId, state, timestamp) {
    const driverKey = driverId || driverName;
    
    try {
      if (state === 'drowsy') {
        // Start or continue drowsy timer
        if (!this.drowsyTimers.has(driverKey)) {
          console.log(`⏱️ Starting 15-second drowsy timer for ${driverName}`);
          
          const timer = setTimeout(async () => {
            await this.sendEmergencyAlert(driverName, driverId);
            this.drowsyTimers.delete(driverKey);
          }, 15000); // 15 seconds
          
          this.drowsyTimers.set(driverKey, {
            timer,
            startTime: Date.now(),
            driverName
          });
        }
      } else if (state === 'normal') {
        // Reset timer if driver becomes normal
        if (this.drowsyTimers.has(driverKey)) {
          const timerData = this.drowsyTimers.get(driverKey);
          const elapsedTime = (Date.now() - timerData.startTime) / 1000;
          
          clearTimeout(timerData.timer);
          this.drowsyTimers.delete(driverKey);
          
          console.log(`✅ Drowsy timer reset for ${driverName} after ${elapsedTime.toFixed(1)}s`);
        }
      }
      // Note: 'no_face' state doesn't reset timer - driver might still be drowsy
      
    } catch (error) {
      console.error('❌ Error in drowsiness monitoring:', error.message);
    }
  }

  /**
   * Send emergency alert via Telegram and log to MongoDB
   * @param {string} driverName - Name of the driver
   * @param {string} driverId - Driver's MongoDB ObjectId
   */
  async sendEmergencyAlert(driverName, driverId) {
    try {
      const alertMessage = `🚨 URGENT: Driver ${driverName} has been drowsy for over 15 seconds. Please contact them immediately!`;
      
      // Send Telegram alert
      if (this.bot && this.chatId) {
        await this.bot.sendMessage(this.chatId, alertMessage);
        console.log(`📱 Emergency alert sent via Telegram for ${driverName}`);
      } else {
        console.log(`⚠️ Telegram not configured - Alert: ${alertMessage}`);
      }

      // Log alert to MongoDB
      const alert = new Alert({
        driverName,
        driverId,
        status: 'alert_sent',
        timestamp: new Date(),
        alertType: 'drowsiness_15s'
      });

      await alert.save();
      console.log(`💾 Alert logged to MongoDB for ${driverName}`);

    } catch (error) {
      console.error('❌ Error sending emergency alert:', error.message);
    }
  }

  /**
   * Get alert history for a specific driver (for dashboard queries)
   * @param {string} driverId - Driver's MongoDB ObjectId
   * @param {number} limit - Number of alerts to retrieve
   * @returns {Array} Array of alert documents
   */
  async getDriverAlerts(driverId, limit = 10) {
    try {
      return await Alert.find({ driverId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .populate('driverId', 'name email');
    } catch (error) {
      console.error('❌ Error fetching driver alerts:', error.message);
      return [];
    }
  }

  /**
   * Get all recent alerts (for admin dashboard)
   * @param {number} limit - Number of alerts to retrieve
   * @returns {Array} Array of alert documents
   */
  async getAllRecentAlerts(limit = 50) {
    try {
      return await Alert.find()
        .sort({ timestamp: -1 })
        .limit(limit)
        .populate('driverId', 'name email');
    } catch (error) {
      console.error('❌ Error fetching recent alerts:', error.message);
      return [];
    }
  }
}

module.exports = new TelegramAlertSystem();