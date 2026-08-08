"""
Utility functions for drowsiness and yawning detection.
"""
import numpy as np
from datetime import datetime


def calculate_ear(landmarks, eye_indices):
    """
    Calculate Eye Aspect Ratio (EAR) for drowsiness detection.
    
    Args:
        landmarks: MediaPipe face landmarks
        eye_indices: List of 6 landmark indices for eye points
        
    Returns:
        float: Eye Aspect Ratio value
    """
    # Get eye landmark points
    points = []
    for idx in eye_indices:
        points.append([landmarks[idx].x, landmarks[idx].y])
    
    # Calculate distances
    vertical1 = np.linalg.norm(np.array(points[1]) - np.array(points[5]))
    vertical2 = np.linalg.norm(np.array(points[2]) - np.array(points[4]))
    horizontal = np.linalg.norm(np.array(points[0]) - np.array(points[3]))
    
    if horizontal == 0:
        return 0.0
    
    ear = (vertical1 + vertical2) / (2.0 * horizontal)
    return ear


def calculate_mar(landmarks, mouth_indices):
    """
    Calculate Mouth Aspect Ratio (MAR) for yawning detection using full mouth.
    
    Args:
        landmarks: MediaPipe face landmarks
        mouth_indices: List of mouth landmark indices
        
    Returns:
        float: Mouth Aspect Ratio value
    """
    # Key mouth points for MAR calculation
    # Use specific indices for consistent measurement
    top_lip = landmarks[13]      # Top lip center
    bottom_lip = landmarks[14]   # Bottom lip center
    left_corner = landmarks[61]  # Left mouth corner
    right_corner = landmarks[291] # Right mouth corner
    
    # Additional vertical measurement points
    upper_inner = landmarks[12]  # Upper inner lip
    lower_inner = landmarks[15]  # Lower inner lip
    
    # Calculate vertical distances (mouth height)
    vertical1 = np.linalg.norm(np.array([top_lip.x, top_lip.y]) - np.array([bottom_lip.x, bottom_lip.y]))
    vertical2 = np.linalg.norm(np.array([upper_inner.x, upper_inner.y]) - np.array([lower_inner.x, lower_inner.y]))
    
    # Calculate horizontal distance (mouth width)
    horizontal = np.linalg.norm(np.array([left_corner.x, left_corner.y]) - np.array([right_corner.x, right_corner.y]))
    
    if horizontal == 0:
        return 0.0
    
    # MAR calculation with improved formula
    mar = (vertical1 + vertical2) / (2.0 * horizontal)
    return mar


def get_current_timestamp():
    """
    Get current timestamp in ISO format.
    
    Returns:
        str: Current timestamp
    """
    return datetime.now().isoformat()


def calculate_confidence(ratio, threshold, is_above_threshold=True):
    """
    Calculate confidence score based on ratio and threshold.
    
    Args:
        ratio: Current ratio value
        threshold: Threshold value
        is_above_threshold: True if detection occurs when ratio > threshold
        
    Returns:
        float: Confidence score between 0 and 1
    """
    if is_above_threshold:
        if ratio > threshold:
            return min(1.0, (ratio - threshold) / threshold + 0.5)
        else:
            return 0.0
    else:
        if ratio < threshold:
            return min(1.0, (threshold - ratio) / threshold + 0.5)
        else:
            return 0.0