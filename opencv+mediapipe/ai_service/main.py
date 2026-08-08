import cv2
import time
import sys
import json
import os
import paho.mqtt.client as mqtt

from detector import DrowsinessDetector
from websocket_client import WebSocketClient

# --- MQTT CONFIG ---
MQTT_BROKER = "broker.hivemq.com"
MQTT_PORT = 1883
MQTT_TOPIC = "status/driver"
MQTT_CLIENT_ID = "PythonAIService"
MQTT_RECONNECT_DELAY = 5

def on_mqtt_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"📡 MQTT Connected to {MQTT_BROKER}")
    else:
        print(f"❌ MQTT Connection failed with code {rc}")

def on_mqtt_disconnect(client, userdata, rc):
    print("🔌 MQTT Disconnected. Will auto-reconnect...")

mqtt_client = mqtt.Client(client_id=MQTT_CLIENT_ID)
mqtt_client.on_connect = on_mqtt_connect
mqtt_client.on_disconnect = on_mqtt_disconnect
mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
mqtt_client.loop_start()

def main():
    user_file = "../../fullstack/node_server/current_user.json"
    driver_id = None
    driver_name = "Unknown Driver"

    try:
        if user_file:
            with open(user_file, 'r') as f:
                user_data = json.load(f)
                driver_id = user_data.get('id')
                driver_name = user_data.get('name', 'Unknown Driver')
        else:
            if os.environ.get('ALLOW_NO_LOGIN', '').lower() in ('1', 'true', 'yes'):
                print('Warning: No user file found but ALLOW_NO_LOGIN set — continuing with Unknown Driver')
            else:
                print('Error: No user logged in. Please login first in React app or set CURRENT_USER_FILE to the path of current_user.json')
                return
    except Exception as e:
        print(f"Error reading user info: {e}")
        return

    print(f"Starting AI Drowsiness Detection Service for Driver: {driver_name}...")

    detector = DrowsinessDetector()
    ws_client = WebSocketClient()
    if not ws_client.connect():
        print("Warning: Could not connect to WebSocket server. Continuing without WebSocket...")
        ws_client = None

    # Initialize camera with optimized settings
    cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)  # DirectShow API for faster access on Windows
    
    # Optimize camera settings for performance
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cap.set(cv2.CAP_PROP_FPS, 30)
    cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*'MJPG'))  # Use MJPG for faster processing
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Minimize frame buffer to reduce latency
    
    if not cap.isOpened():
        print("Error: Could not open camera")
        return

    print("Camera initialized with optimized settings. Press 'q' to quit.")

    last_status = None
    last_sent_status = None
    frame_count = 0

    try:
        while True:
            # Read frame with minimal copying
            ret, frame = cap.read()
            if not ret:
                print("Error: Could not read frame from camera")
                break

            frame_count += 1
            
            # Skip frames if processing is falling behind (every 2nd frame)
            if frame_count % 2 != 0:
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    print("Quit key pressed. Stopping service...")
                    break
                continue

            # Process frame without copying unless needed for display
            h, w = frame.shape[:2]
            result = detector.process_frame(frame)
            display_frame = frame  # Reference the same frame initially

            # Always show overlays with enhanced visualization
            # Draw colored facial landmarks with color-coded features
            detector.draw_landmarks(display_frame)
            
            # Draw head pose visualization with angle
            detector.draw_head_pose_indicator(display_frame)
            head_angle = detector.get_head_angle()
            if head_angle is not None:
                angle_text = f"Head Angle: {head_angle:.1f}°"
                cv2.putText(display_frame, angle_text, (w-200, h-20), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 165, 255), 2)

            # Show MAR measurement lines for yawn detection
            detector.draw_mar_measurement_diagram(display_frame)
            
            # Draw metrics plots
            detector.draw_ear_plot(display_frame, w-150, 10, 140, 80)
            detector.draw_mar_plot(display_frame, 10, 10, 140, 80)
            detector.draw_counters(display_frame, 10, h-60)

            # Draw real-time values
            mar_value = detector.get_current_mar()
            ear_value = detector.get_current_ear()
            drowsy_timer = detector.get_drowsy_timer()
            
            if ear_value is not None:
                ear_color = (0, 0, 255) if ear_value < 0.23 else (0, 255, 0)
                cv2.putText(display_frame, f"EAR: {ear_value:.3f}", (w-150, h-100), cv2.FONT_HERSHEY_SIMPLEX, 0.6, ear_color, 2)
            
            if mar_value is not None:
                mar_color = (0, 255, 255) if mar_value > 0.7 else (0, 255, 0)
                cv2.putText(display_frame, f"MAR: {mar_value:.3f}", (w-150, h-75), cv2.FONT_HERSHEY_SIMPLEX, 0.6, mar_color, 2)
            
            # Show drowsy timer with progress bar
            if drowsy_timer > 0:
                timer_text = f"Drowsy: {drowsy_timer:.1f}s"
                cv2.putText(display_frame, timer_text, (w-150, h-50), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
                
                # Progress bar
                bar_width = 100
                bar_progress = min(1.0, drowsy_timer / 2.0)
                cv2.rectangle(display_frame, (w-150, h-40), (w-150+bar_width, h-30), (128, 128, 128), -1)
                cv2.rectangle(display_frame, (w-150, h-40), (w-150+int(bar_width*bar_progress), h-30), (0, 0, 255), -1)

            # Draw full overlays and frame info
            if result is not None:
                status, confidence, timestamp, duration = result
                driver_text = f"Driver: {driver_name}"
                text_size = cv2.getTextSize(driver_text, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)[0]
                text_x = (w - text_size[0]) // 2
                cv2.putText(display_frame, driver_text, (text_x, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

                # Draw main status with enhanced styling
                if status == "drowsy":
                    color = (0, 0, 255)  # Red
                    text = f"🚨 DROWSY! ({confidence:.2f})"
                elif status == "yawn":
                    color = (0, 165, 255)  # Orange
                    text = f"🥱 YAWN! ({confidence:.2f})"
                else:
                    color = (0, 255, 0)  # Green
                    text = "✅ NORMAL"
                
                # Center bottom alert text with background
                text_size = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 1.2, 3)[0]
                text_x = (w - text_size[0]) // 2
                text_y = h - 50
                cv2.rectangle(display_frame, (text_x-10, text_y-35), (text_x+text_size[0]+10, text_y+10), (0, 0, 0), -1)
                cv2.putText(display_frame, text, (text_x, text_y), cv2.FONT_HERSHEY_SIMPLEX, 1.2, color, 3)

                if detector.should_flash_alert():
                    cv2.rectangle(display_frame, (0, 0), (w-1, h-1), (0, 0, 255), 8)

                # Print status changes or periodic updates
                if status != last_status or (status == "normal" and frame_count % 30 == 0) or (status == "drowsy" and frame_count % 15 == 0):
                    if status == "drowsy":
                        current_duration = detector.get_drowsy_timer()
                        print(f"🚨 Drowsy Detected! Confidence: {confidence:.2f}, Duration: {current_duration:.1f}s")
                    elif status == "yawn":
                        print(f"🥱 Yawn Detected! Confidence: {confidence:.2f}")
                    elif status == "normal":
                        print("✅ Normal state")
                    last_status = status

                # === SINGLE BLOCK FOR STATE CHANGE ===
                if status != last_sent_status:
                    if ws_client:
                        if status in ["drowsy", "yawn"]:
                            if last_sent_status == "no_face":
                                ws_client.send_detection_result("normal", driver_id=driver_id)
                            ws_client.send_detection_result(status, confidence, timestamp, driver_id)
                        elif status == "normal":
                            ws_client.send_detection_result("normal", driver_id=driver_id)

                    # (MQTT untouched)
                    mqtt_payload = {
                        "state": status,
                        "confidence": confidence,
                        "timestamp": timestamp,
                        "driver_id": driver_id
                    }
                    payload_str = json.dumps(mqtt_payload)
                    if mqtt_client.is_connected():
                        result = mqtt_client.publish(MQTT_TOPIC, payload_str)
                        if result.rc == mqtt.MQTT_ERR_SUCCESS:
                            print(f"📤 MQTT published: {status}")
                        else:
                            print(f"❌ MQTT publish failed: {result.rc}")
                    else:
                        print("⚠️ MQTT not connected, message queued")
                    last_sent_status = status

            else:
                cv2.putText(display_frame, "👤 NO FACE DETECTED", (w//2-150, h//2), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 165, 0), 2)
                if last_status != "no_face":
                    print("👤 No face detected")
                    last_status = "no_face"
                    if ws_client and last_sent_status != "no_face":
                        ws_client.send_detection_result("no_face", driver_id=driver_id)
                        last_sent_status = "no_face"
                mqtt_payload = {
                    "state": "no_face",
                    "confidence": None,
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
                    "driver_id": driver_id
                }
                payload_str = json.dumps(mqtt_payload)
                if mqtt_client.is_connected():
                    result = mqtt_client.publish(MQTT_TOPIC, payload_str)
                    if result.rc == mqtt.MQTT_ERR_SUCCESS:
                        print("📤 MQTT published: no_face")
                    else:
                        print(f"❌ MQTT publish failed: {result.rc}")
                else:
                    print("⚠️ MQTT not connected, message queued")

            # Only copy frame if we need to draw on it
            if result is not None or detector.should_flash_alert():
                display_frame = frame.copy()
            
            # Use smaller window size for faster display
            display_frame_small = cv2.resize(display_frame, (int(w*0.8), int(h*0.8)))
            cv2.imshow('Drowsiness Detection', display_frame_small)
            
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                print("Quit key pressed. Stopping service...")
                break

    except KeyboardInterrupt:
        print("\nKeyboard interrupt received. Stopping service...")
    except Exception as e:
        print(f"Error occurred: {e}")
    finally:
        print("Cleaning up resources...")
        cap.release()
        cv2.destroyAllWindows()
        mqtt_client.loop_stop()
        if ws_client:
            ws_client.disconnect()
        print("Service stopped successfully.")

if __name__ == "__main__":
    main()
