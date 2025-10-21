"""
WebSocket client for sending detection results to Node.js server.
"""
import json
import websocket
import threading
import time
from queue import Queue


class WebSocketClient:
    """WebSocket client for real-time communication with Node.js server."""
    
    def __init__(self, url="ws://localhost:5000"):
        """
        Initialize WebSocket client.
        
        Args:
            url: WebSocket server URL
        """
        self.url = url
        self.ws = None
        self.connected = False
        self.message_queue = Queue()
        self.running = False
        
    def connect(self):
        """Establish WebSocket connection."""
        try:
            self.ws = websocket.WebSocketApp(
                self.url,
                on_open=self._on_open,
                on_message=self._on_message,
                on_error=self._on_error,
                on_close=self._on_close
            )
            
            # Start WebSocket in separate thread
            self.ws_thread = threading.Thread(target=self.ws.run_forever)
            self.ws_thread.daemon = True
            self.ws_thread.start()
            
            # Wait for connection
            timeout = 5
            while not self.connected and timeout > 0:
                time.sleep(0.1)
                timeout -= 0.1
                
            return self.connected
            
        except Exception as e:
            print(f"WebSocket connection error: {e}")
            return False
    
    def _on_open(self, ws):
        """Handle WebSocket connection open."""
        self.connected = True
        print("WebSocket connected to Node.js server")
    
    def _on_message(self, ws, message):
        """Handle incoming WebSocket messages."""
        pass
    
    def _on_error(self, ws, error):
        """Handle WebSocket errors."""
        print(f"WebSocket error: {error}")
    
    def _on_close(self, ws, close_status_code, close_msg):
        """Handle WebSocket connection close."""
        self.connected = False
        print("WebSocket connection closed")
    
    def send_detection_result(self, status, confidence=None, timestamp=None, driver_id=None):
        """
        Send detection result to Node.js server.
        
        Args:
            status: Detection status ('drowsy', 'yawn', 'normal')
            confidence: Confidence score (0-1)
            timestamp: Current timestamp
            driver_id: Driver/user ID
        """
        if not self.connected:
            return False
            
        try:
            message = {"status": status}
            
            if confidence is not None:
                message["confidence"] = confidence
            if timestamp is not None:
                message["timestamp"] = timestamp
            if driver_id is not None:
                message["driverId"] = driver_id
                
            json_message = json.dumps(message)
            self.ws.send(json_message)
            return True
            
        except Exception as e:
            print(f"Error sending message: {e}")
            return False
    
    def disconnect(self):
        """Close WebSocket connection."""
        if self.ws:
            self.connected = False
            self.ws.close()