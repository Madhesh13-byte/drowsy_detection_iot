"""
Main entry point for the AI drowsiness detection service.
"""
import cv2
import time
import sys
from detector import DrowsinessDetector
from websocket_client import WebSocketClient


def main():
    """Main function to run the drowsiness detection service."""
    import sys
    
    # Get current user info from file
    import json
    import os
    
    user_file = "e:\\drowsy_detection\\fullstack\\node_server\\current_user.json"
    driver_id = None
    driver_name = "Unknown Driver"
    
    try:
        if os.path.exists(user_file):
            with open(user_file, 'r') as f:
                user_data = json.load(f)
                driver_id = user_data.get('id')
                driver_name = user_data.get('name', 'Unknown Driver')
        else:
            print("Error: No user logged in. Please login first in React app.")
            return
    except Exception as e:
        print(f"Error reading user info: {e}")
        return
    
    print(f"Starting AI Drowsiness Detection Service for Driver: {driver_name}...")
    
    # Initialize detector
    detector = DrowsinessDetector()
    
    # Initialize WebSocket client
    ws_client = WebSocketClient()
    
    # Try to connect to WebSocket server
    if not ws_client.connect():
        print("Warning: Could not connect to WebSocket server. Continuing without WebSocket...")
        ws_client = None
    
    # Initialize camera
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Error: Could not open camera")
        return
    
    print("Camera initialized. Press 'q' to quit.")
    
    last_status = None
    last_sent_status = None
    frame_count = 0
    
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("Error: Could not read frame from camera")
                break
            
            frame_count += 1
            
            # Process every frame for real-time detection
            result = detector.process_frame(frame)
            
            # Add comprehensive visual dashboard to frame
            display_frame = frame.copy()
            h, w = display_frame.shape[:2]
            
            # Draw alert flash border if needed
            if detector.should_flash_alert():
                cv2.rectangle(display_frame, (0, 0), (w-1, h-1), (0, 0, 255), 8)
            
            if result is not None:
                status, confidence, timestamp, duration = result
                
                # Draw driver name at top center
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
                
                # Draw landmarks with enhanced eye/mouth polygons
                detector.draw_landmarks(display_frame)
                
                # Draw EAR plot (top-right)
                detector.draw_ear_plot(display_frame, w-150, 10, 140, 80)
                
                # Draw MAR plot (top-left)
                detector.draw_mar_plot(display_frame, 10, 10, 140, 80)
                
                # Draw counters (bottom-left)
                detector.draw_counters(display_frame, 10, h-60)
                
                # Draw real-time values (right side)
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
                
                # Show yawn tracking status
                if detector.is_tracking_yawn():
                    cv2.putText(display_frame, "TRACKING YAWN...", (w//2-80, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
                
                # Show head pose info
                head_angle = detector.get_head_angle()
                if head_angle is not None:
                    pose_color = (0, 255, 0) if head_angle < 15 else (0, 0, 255)
                    cv2.putText(display_frame, f"Head Angle: {head_angle:.1f}°", (10, h-90), cv2.FONT_HERSHEY_SIMPLEX, 0.6, pose_color, 2)
                    
                    # Draw head pose indicator
                    detector.draw_head_pose_indicator(display_frame)
                    
                    # Draw MAR measurement diagram
                    detector.draw_mar_measurement_diagram(display_frame)
                
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
                
                # Send to WebSocket only on state changes
                if ws_client and status != last_sent_status:
                    if status in ["drowsy", "yawn"]:
                        # If coming from no_face, send normal first
                        if last_sent_status == "no_face":
                            ws_client.send_detection_result("normal", driver_id=driver_id)
                        ws_client.send_detection_result(status, confidence, timestamp, driver_id)
                        last_sent_status = status
                    elif status == "normal":
                        ws_client.send_detection_result("normal", driver_id=driver_id)
                        last_sent_status = status
            else:
                # No face detected
                cv2.putText(display_frame, "👤 NO FACE DETECTED", (w//2-150, h//2), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 165, 0), 2)
                if last_status != "no_face":
                    print("👤 No face detected")
                    last_status = "no_face"
                    
                    # Send no_face state change to WebSocket
                    if ws_client and last_sent_status != "no_face":
                        ws_client.send_detection_result("no_face", driver_id=driver_id)
                        last_sent_status = "no_face"
            
            # Display frame with visual feedback
            cv2.imshow('Drowsiness Detection', display_frame)
            
            # Check for quit key
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                print("Quit key pressed. Stopping service...")
                break
                
    except KeyboardInterrupt:
        print("\nKeyboard interrupt received. Stopping service...")
    
    except Exception as e:
        print(f"Error occurred: {e}")
    
    finally:
        # Cleanup
        print("Cleaning up resources...")
        cap.release()
        cv2.destroyAllWindows()
        
        if ws_client:
            ws_client.disconnect()
        
        print("Service stopped successfully.")


if __name__ == "__main__":
    main()