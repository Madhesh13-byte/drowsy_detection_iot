const express = require('express');
const http = require('http');
const cors = require('cors');
const WSServer = require('./websocket/wsServer');
const statusRoute = require('./routes/statusRoute');

const app = express();
const server = http.createServer(app);
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', statusRoute);

// Initialize WebSocket server
const wsServer = new WSServer(server);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket server ready for connections`);
  console.log(`📊 Status endpoint: http://localhost:${PORT}/api/status`);
});