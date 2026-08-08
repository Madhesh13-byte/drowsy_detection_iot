# AI Drowsiness Detection Service

Real-time drowsiness and yawning detection using MediaPipe and OpenCV with WebSocket communication.

## Features

- Real-time eye closure detection (EAR - Eye Aspect Ratio)
- Yawning detection (MAR - Mouth Aspect Ratio)
- WebSocket communication with Node.js server
- Modular architecture
- Graceful shutdown with 'q' key

## Installation

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

## Usage

1. Start the AI service:
```bash
cd ai_service
python main.py
```

2. The service will:
   - Access your default webcam
   - Detect drowsiness and yawning in real-time
   - Print alerts to console
   - Send JSON messages to WebSocket server at ws://localhost:5000

3. Press 'q' to quit gracefully

## WebSocket Messages

### Drowsiness/Yawning Detected:
```json
{
  "status": "drowsy" | "yawn",
  "confidence": 0.75,
  "timestamp": "2024-01-01T12:00:00.000000"
}
```

### Normal State:
```json
{
  "status": "normal"
}
```

## Configuration

Adjust detection thresholds in `detector.py`:
- `EAR_THRESHOLD`: Eye closure threshold (default: 0.23)
- `MAR_THRESHOLD`: Mouth opening threshold (default: 0.6)
- `DROWSY_TIME_THRESHOLD`: Time before drowsy alert (default: 2.0s)
- `YAWN_TIME_THRESHOLD`: Time before yawn alert (default: 1.5s)

## Requirements

- Python 3.9+
- Webcam
- Node.js WebSocket server running on localhost:5000 (optional)