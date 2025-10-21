"""
Drowsiness and yawning detection using MediaPipe and OpenCV.
"""
import cv2
import mediapipe as mp
import time
from utils import calculate_ear, calculate_mar, get_current_timestamp, calculate_confidence


class DrowsinessDetector:
    """Real-time drowsiness and yawning detector using MediaPipe Face Mesh."""
    
    def __init__(self):
        """Initialize the detector with MediaPipe Face Mesh."""
        # MediaPipe setup
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        
        # Eye landmark indices for EAR calculation
        self.left_eye_indices = [33, 160, 158, 133, 153, 144]
        self.right_eye_indices = [362, 385, 387, 263, 373, 380]
        
        # Full mouth landmark indices for comprehensive MAR calculation
        self.mouth_indices = [
            # Top lip: center to corners
            13, 82, 81, 80, 78,  # Upper lip left side
            # Top lip right side  
            308, 324, 318, 312, 14,
            # Bottom lip: corners to center
            17, 18, 200, 199, 175  # Lower lip
        ]
        
        # Complete outer mouth contour (full lip boundary)
        self.mouth_outer = [
            # Upper lip outer boundary
            61, 84, 17, 314, 405, 320, 307, 375, 321, 308, 324, 318,
            # Lower lip outer boundary  
            78, 95, 88, 178, 87, 14, 317, 402, 318
        ]
        
        # Inner mouth contour (teeth/inner lip line)
        self.mouth_inner = [
            # Inner upper lip
            12, 15, 16, 17, 18, 200, 199, 175,
            # Inner lower lip
            0, 11, 12, 13, 14, 269, 270, 267
        ]
        
        # Detection thresholds
        self.EAR_THRESHOLD = 0.23
        self.MAR_THRESHOLD_HIGH = 0.3  # Lowered threshold to start yawn detection
        self.MAR_THRESHOLD_LOW = 0.25  # Lowered threshold to end yawn detection (hysteresis)
        self.DROWSY_TIME_THRESHOLD = 2.0  # seconds
        self.YAWN_TIME_THRESHOLD = 1.5    # seconds
        
        # Head pose thresholds
        self.MAX_HEAD_TURN_ANGLE = 50  # degrees - allowing more head movement
        self.nose_tip_idx = 1
        self.left_cheek_idx = 234
        self.right_cheek_idx = 454
        self.left_eye_corner_idx = 33
        self.right_eye_corner_idx = 362
        
        # Mouth consistency tracking
        self.mouth_width_history = []
        self.mouth_width_samples = 10
        
        # State tracking
        self.drowsy_start_time = None
        self.yawn_start_time = None
        self.last_status = "normal"
        self.current_mar = None
        self.yawn_detected_time = None
        self.yawn_cooldown = 2.0  # seconds
        self.last_landmarks = None
        self.current_ear = None
        self.max_drowsy_duration = 0.0
        
        # Visualization data
        self.ear_history = []
        self.mar_history = []
        self.max_history = 100  # Keep last 100 values
        self.blink_count = 0
        self.yawn_count = 0
        self.last_ear_below_threshold = False
        self.alert_flash_time = None
        self.alert_flash_duration = 1.0  # seconds
        self.current_head_angle = 0.0
        
    def process_frame(self, frame):
        """
        Process a single frame for drowsiness and yawning detection.
        
        Args:
            frame: OpenCV frame from camera
            
        Returns:
            tuple: (status, confidence, timestamp) or None if no face detected
        """
        # Convert BGR to RGB
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.face_mesh.process(rgb_frame)
        
        if not results.multi_face_landmarks:
            # Reset timers when no face detected
            self.drowsy_start_time = None
            self.yawn_start_time = None
            self.last_landmarks = None
            return None
            
        # Process first detected face
        face_landmarks = results.multi_face_landmarks[0]
        landmarks = face_landmarks.landmark
        
        # Store results and landmarks for drawing
        self.last_results = results
        self.last_landmarks = landmarks
        
        # Calculate EAR for both eyes
        left_ear = calculate_ear(landmarks, self.left_eye_indices)
        right_ear = calculate_ear(landmarks, self.right_eye_indices)
        avg_ear = (left_ear + right_ear) / 2.0
        self.current_ear = avg_ear
        
        # Update EAR history for plotting
        self.ear_history.append(avg_ear)
        if len(self.ear_history) > self.max_history:
            self.ear_history.pop(0)
            
        # Detect blinks
        if not self.last_ear_below_threshold and avg_ear < self.EAR_THRESHOLD:
            self.blink_count += 1
        self.last_ear_below_threshold = avg_ear < self.EAR_THRESHOLD
        
        # Calculate head pose angle
        head_angle = self.calculate_head_pose_angle(landmarks)
        self.current_head_angle = head_angle
        
        # Calculate MAR for mouth
        mar = calculate_mar(landmarks, self.mouth_indices)
        self.current_mar = mar
        
        # Calculate mouth width for consistency check
        mouth_width = self.calculate_mouth_width(landmarks)
        self.mouth_width_history.append(mouth_width)
        if len(self.mouth_width_history) > self.mouth_width_samples:
            self.mouth_width_history.pop(0)
        
        # Update MAR history for plotting
        self.mar_history.append(mar)
        if len(self.mar_history) > self.max_history:
            self.mar_history.pop(0)
        

        
        current_time = time.time()
        timestamp = get_current_timestamp()
        
        # Check for drowsiness (eyes closed)
        if avg_ear < self.EAR_THRESHOLD:
            if self.drowsy_start_time is None:
                self.drowsy_start_time = current_time
            else:
                current_duration = current_time - self.drowsy_start_time
                self.max_drowsy_duration = max(self.max_drowsy_duration, current_duration)
                if current_duration >= self.DROWSY_TIME_THRESHOLD:
                    confidence = calculate_confidence(avg_ear, self.EAR_THRESHOLD, False)
                    self.alert_flash_time = current_time
                    return ("drowsy", confidence, timestamp, current_duration)
        else:
            if self.drowsy_start_time is not None:
                # Reset max duration when drowsiness ends
                self.max_drowsy_duration = 0.0
            self.drowsy_start_time = None
            
        # Check for yawning with multiple filters
        is_frontal_face = head_angle < self.MAX_HEAD_TURN_ANGLE
        is_mouth_stable = self.is_mouth_width_stable()
        

        
        if is_frontal_face and is_mouth_stable:  # Only detect yawns when face is frontal and mouth is stable
            if self.yawn_start_time is None:
                # Not currently tracking a yawn, check if we should start
                if mar > self.MAR_THRESHOLD_HIGH and (not self.yawn_detected_time or current_time - self.yawn_detected_time >= self.yawn_cooldown):
                    self.yawn_start_time = current_time
            else:
                # Currently tracking a yawn
                if mar < self.MAR_THRESHOLD_LOW:
                    # Mouth closed, end yawn tracking
                    self.yawn_start_time = None
                elif current_time - self.yawn_start_time >= self.YAWN_TIME_THRESHOLD:
                    # Yawn duration met, trigger detection
                    confidence = calculate_confidence(mar, self.MAR_THRESHOLD_HIGH, True)
                    self.yawn_detected_time = current_time
                    self.yawn_start_time = None
                    self.yawn_count += 1
                    self.alert_flash_time = current_time
                    return ("yawn", confidence, timestamp, None)
        else:
            # Face turned too much or mouth unstable, reset yawn tracking
            self.yawn_start_time = None
            
        # Normal state
        return ("normal", None, None, None)
    
    def draw_landmarks(self, frame):
        """
        Draw face landmarks on frame with real-time detection.
        
        Args:
            frame: OpenCV frame
        """
        # Process current frame for real-time landmark tracking
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.face_mesh.process(rgb_frame)
        
        if results.multi_face_landmarks:
            landmarks = results.multi_face_landmarks[0].landmark
            h, w, _ = frame.shape
            
            # Draw eye landmarks
            for idx in self.left_eye_indices + self.right_eye_indices:
                x = int(landmarks[idx].x * w)
                y = int(landmarks[idx].y * h)
                cv2.circle(frame, (x, y), 2, (0, 255, 0), -1)
                
            # Draw outer mouth contour
            outer_points = []
            for idx in self.mouth_outer:
                x = int(landmarks[idx].x * w)
                y = int(landmarks[idx].y * h)
                outer_points.append((x, y))
                cv2.circle(frame, (x, y), 2, (255, 0, 0), -1)
            
            # Draw inner mouth contour
            inner_points = []
            for idx in self.mouth_inner:
                x = int(landmarks[idx].x * w)
                y = int(landmarks[idx].y * h)
                inner_points.append((x, y))
                cv2.circle(frame, (x, y), 1, (0, 255, 0), -1)
            
            # Draw mouth boundary lines
            if len(outer_points) > 1:
                for i in range(len(outer_points)):
                    cv2.line(frame, outer_points[i], outer_points[(i + 1) % len(outer_points)], (0, 255, 255), 2)
            
            if len(inner_points) > 1:
                for i in range(len(inner_points)):
                    cv2.line(frame, inner_points[i], inner_points[(i + 1) % len(inner_points)], (255, 255, 0), 1)
    
    def get_current_mar(self):
        """Get the current MAR value for debugging."""
        return self.current_mar
    
    def is_tracking_yawn(self):
        """Check if currently tracking a potential yawn."""
        return self.yawn_start_time is not None
    
    def get_current_ear(self):
        """Get the current EAR value for display."""
        return self.current_ear
    
    def get_drowsy_timer(self):
        """Get the current drowsy timer value."""
        if self.drowsy_start_time is not None:
            return time.time() - self.drowsy_start_time
        return 0.0
    
    def get_max_drowsy_duration(self):
        """Get the maximum drowsy duration recorded."""
        return self.max_drowsy_duration
    
    def draw_ear_plot(self, frame, x, y, width, height):
        """Draw EAR line plot."""
        if len(self.ear_history) < 2:
            return
            
        # Background
        cv2.rectangle(frame, (x, y), (x + width, y + height), (0, 0, 0), -1)
        cv2.rectangle(frame, (x, y), (x + width, y + height), (255, 255, 255), 1)
        
        # Plot line
        points = []
        for i, ear in enumerate(self.ear_history):
            px = x + int((i / len(self.ear_history)) * width)
            py = y + height - int((ear / 0.5) * height)  # Scale to 0.5 max
            points.append((px, py))
        
        for i in range(len(points) - 1):
            color = (0, 255, 0) if self.ear_history[i] > self.EAR_THRESHOLD else (0, 0, 255)
            cv2.line(frame, points[i], points[i + 1], color, 2)
        
        # Threshold line
        threshold_y = y + height - int((self.EAR_THRESHOLD / 0.5) * height)
        cv2.line(frame, (x, threshold_y), (x + width, threshold_y), (255, 0, 0), 1)
        
        # Label
        cv2.putText(frame, "EAR", (x, y - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
    
    def draw_mar_plot(self, frame, x, y, width, height):
        """Draw MAR line plot."""
        if len(self.mar_history) < 2:
            return
            
        # Background
        cv2.rectangle(frame, (x, y), (x + width, y + height), (0, 0, 0), -1)
        cv2.rectangle(frame, (x, y), (x + width, y + height), (255, 255, 255), 1)
        
        # Plot line
        points = []
        for i, mar in enumerate(self.mar_history):
            px = x + int((i / len(self.mar_history)) * width)
            py = y + height - int((mar / 1.0) * height)  # Scale to 1.0 max
            points.append((px, py))
        
        for i in range(len(points) - 1):
            color = (0, 255, 255) if self.mar_history[i] > self.MAR_THRESHOLD_HIGH else (0, 255, 0)
            cv2.line(frame, points[i], points[i + 1], color, 2)
        
        # Threshold line
        threshold_y = y + height - int((self.MAR_THRESHOLD_HIGH / 1.0) * height)
        cv2.line(frame, (x, threshold_y), (x + width, threshold_y), (0, 255, 255), 1)
        
        # Label
        cv2.putText(frame, "MAR", (x, y - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
    
    def draw_counters(self, frame, x, y):
        """Draw blink and yawn counters."""
        cv2.putText(frame, f"Blinks: {self.blink_count}", (x, y), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        cv2.putText(frame, f"Yawns: {self.yawn_count}", (x, y + 25), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
    
    def calculate_head_pose_angle(self, landmarks):
        """Calculate horizontal head pose angle using multiple reference points."""
        # Get key face points
        nose_tip = landmarks[self.nose_tip_idx]
        left_cheek = landmarks[self.left_cheek_idx]
        right_cheek = landmarks[self.right_cheek_idx]
        left_eye = landmarks[self.left_eye_corner_idx]
        right_eye = landmarks[self.right_eye_corner_idx]
        
        # Calculate face symmetry using eye distances
        eye_center_x = (left_eye.x + right_eye.x) / 2
        cheek_center_x = (left_cheek.x + right_cheek.x) / 2
        
        # Calculate asymmetry indicators
        nose_to_eye_center = abs(nose_tip.x - eye_center_x)
        nose_to_cheek_center = abs(nose_tip.x - cheek_center_x)
        
        # Calculate relative distances to detect turning
        left_eye_to_nose = abs(left_eye.x - nose_tip.x)
        right_eye_to_nose = abs(right_eye.x - nose_tip.x)
        
        # Asymmetry ratio (should be close to 1.0 for frontal face)
        if min(left_eye_to_nose, right_eye_to_nose) > 0:
            asymmetry_ratio = max(left_eye_to_nose, right_eye_to_nose) / min(left_eye_to_nose, right_eye_to_nose)
            # Convert ratio to approximate angle
            angle = (asymmetry_ratio - 1.0) * 30  # Scale factor
            return min(45, angle)  # Clamp to reasonable range
        return 0
    
    def get_head_angle(self):
        """Get current head pose angle."""
        return self.current_head_angle
    
    def draw_head_pose_indicator(self, frame):
        """Draw head pose symmetry indicator."""
        if not hasattr(self, 'last_landmarks') or self.last_landmarks is None:
            return
            
        landmarks = self.last_landmarks
        h, w, _ = frame.shape
        
        # Get key points
        nose_tip = landmarks[self.nose_tip_idx]
        left_eye = landmarks[self.left_eye_corner_idx]
        right_eye = landmarks[self.right_eye_corner_idx]
        
        # Convert to pixel coordinates
        nose_x = int(nose_tip.x * w)
        nose_y = int(nose_tip.y * h)
        left_eye_x = int(left_eye.x * w)
        left_eye_y = int(left_eye.y * h)
        right_eye_x = int(right_eye.x * w)
        right_eye_y = int(right_eye.y * h)
        
        # Draw symmetry lines
        eye_center_x = (left_eye_x + right_eye_x) // 2
        eye_center_y = (left_eye_y + right_eye_y) // 2
        
        # Draw center line (should align with nose when frontal)
        cv2.line(frame, (eye_center_x, eye_center_y - 20), (eye_center_x, eye_center_y + 100), (255, 255, 0), 2)
        
        # Draw nose position indicator
        nose_color = (0, 255, 0) if abs(nose_x - eye_center_x) < 10 else (0, 0, 255)
        cv2.circle(frame, (nose_x, nose_y), 5, nose_color, -1)
        
        # Draw eye-to-nose distance lines
        cv2.line(frame, (left_eye_x, left_eye_y), (nose_x, nose_y), (0, 255, 255), 1)
        cv2.line(frame, (right_eye_x, right_eye_y), (nose_x, nose_y), (0, 255, 255), 1)
    
    def draw_mar_measurement_diagram(self, frame):
        """Draw MAR calculation visualization with measurement lines."""
        if not hasattr(self, 'last_landmarks') or self.last_landmarks is None:
            return
            
        landmarks = self.last_landmarks
        h, w, _ = frame.shape
        
        # Get mouth measurement points (same as used in MAR calculation)
        mouth_points = []
        for idx in self.mouth_indices:
            x = int(landmarks[idx].x * w)
            y = int(landmarks[idx].y * h)
            mouth_points.append((x, y))
        
        # Draw measurement points with labels
        point_labels = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8']
        for i, (point, label) in enumerate(zip(mouth_points, point_labels)):
            color = (0, 255, 255) if i < 4 else (255, 0, 255)
            cv2.circle(frame, point, 4, color, -1)
            cv2.putText(frame, label, (point[0]+5, point[1]-5), cv2.FONT_HERSHEY_SIMPLEX, 0.3, color, 1)
        
        # Draw measurement lines used in MAR calculation
        if len(mouth_points) >= 8:
            # Vertical distances (mouth height)
            cv2.line(frame, mouth_points[1], mouth_points[7], (0, 255, 0), 2)  # V1
            cv2.line(frame, mouth_points[2], mouth_points[6], (0, 255, 0), 2)  # V2
            cv2.line(frame, mouth_points[3], mouth_points[5], (0, 255, 0), 2)  # V3
            
            # Horizontal distance (mouth width)
            cv2.line(frame, mouth_points[0], mouth_points[4], (255, 0, 0), 2)  # H
            
            # Add distance labels
            cv2.putText(frame, 'V1', (mouth_points[1][0]-15, mouth_points[1][1]), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 0), 1)
            cv2.putText(frame, 'V2', (mouth_points[2][0]-15, mouth_points[2][1]), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 0), 1)
            cv2.putText(frame, 'V3', (mouth_points[3][0]-15, mouth_points[3][1]), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 0), 1)
            cv2.putText(frame, 'H', (mouth_points[0][0], mouth_points[0][1]-10), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 0, 0), 1)
            
            # Show MAR formula result
            if hasattr(self, 'current_mar') and self.current_mar is not None:
                formula_text = f"MAR = (V1+V2+V3)/(3*H) = {self.current_mar:.3f}"
                cv2.putText(frame, formula_text, (10, h-120), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    
    def calculate_mouth_width(self, landmarks):
        """Calculate mouth width for stability check."""
        left_corner = landmarks[61]   # Left mouth corner
        right_corner = landmarks[291] # Right mouth corner
        return abs(right_corner.x - left_corner.x)
    
    def is_mouth_width_stable(self):
        """Check if mouth width is stable (not distorted by head turning)."""
        if len(self.mouth_width_history) < self.mouth_width_samples:
            return True  # Not enough data yet
        
        # Calculate coefficient of variation (std/mean)
        import statistics
        mean_width = statistics.mean(self.mouth_width_history)
        if mean_width == 0:
            return False
        
        std_width = statistics.stdev(self.mouth_width_history)
        cv = std_width / mean_width
        
        # If variation is too high, mouth is unstable (likely due to head turning)
        return cv < 0.15  # 15% variation threshold
    
    def should_flash_alert(self):
        """Check if alert should flash."""
        if self.alert_flash_time is None:
            return False
        return time.time() - self.alert_flash_time < self.alert_flash_duration