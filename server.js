require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const connectDB = require('./config/database');
const WSServer = require('./websocket/wsServer');
const statusRoute = require('./routes/statusRoute');
const authRoute = require('./routes/authRoute');
const profileRoute = require('./routes/profileRoute');

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Routes
app.use('/api', statusRoute);
app.use('/api/auth', authRoute);
app.use('/api/driver', profileRoute);

// Initialize WebSocket server
const wsServer = new WSServer(server);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket server ready for connections`);
  console.log(`📊 Status endpoint: http://localhost:${PORT}/api/status`);
});