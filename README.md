# Drowsy Detection WebSocket Server

Real-time WebSocket server for drowsiness detection system.

## Setup

```bash
npm install
npm start
```

## Development

```bash
npm install -g nodemon
npm run dev
```

## Endpoints

- **WebSocket**: `ws://localhost:5000`
- **Status API**: `http://localhost:5000/api/status`

## Usage

### From Python AI Service
```python
import websocket
import json

ws = websocket.WebSocket()
ws.connect("ws://localhost:5000")
ws.send(json.dumps({"state": "drowsy"}))
```

### From Frontend Client
```javascript
const ws = new WebSocket('ws://localhost:5000');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Driver state:', data.state);
};
```

## States
- `normal` - Driver is alert
- `drowsy` - Driver shows signs of drowsiness  
- `yawn` - Driver is yawning