# ========================================
# Liveness Detection Service
# ========================================
# Provides passive and active liveness checks to prevent spoofing attacks

import numpy as np
from typing import Optional, Dict, Any
from dataclasses import dataclass
import logging
import cv2
from PIL import Image
from io import BytesIO
import base64

import os

# [STABILITY]: Force CPU for MediaPipe to avoid EGL errors in Docker
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
os.environ['MEDIAPIPE_DISABLE_GPU'] = '1'
os.environ['PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION'] = 'python'

# For face landmark detection
import mediapipe as mp

from app.models.face_recognition import LivenessProof, LivenessCheckType

logger = logging.getLogger(__name__)


@dataclass
class BlinkDetectionResult:
    """Result of blink detection"""
    blink_detected: bool
    left_eye_ratio: float = 0.0
    right_eye_ratio: float = 0.0
    message: str = ""


@dataclass 
class HeadPoseResult:
    """Result of head pose estimation"""
    yaw: float = 0.0    # Left-right rotation
    pitch: float = 0.0  # Up-down rotation
    roll: float = 0.0   # Tilt


class LivenessDetectionService:
    """
    Service for liveness detection to prevent photo/video spoofing.
    Uses MediaPipe for face mesh and landmark detection.
    """
    
    # Eye aspect ratio threshold for blink detection
    EYE_AR_THRESH = 0.21
    
    # Head movement thresholds (degrees)
    HEAD_TURN_THRESH = 15.0
    
    def __init__(self):
        """Initialize the liveness detection service."""
        self.mp_face_mesh = mp.solutions.face_mesh
        try:
            self.face_mesh = self.mp_face_mesh.FaceMesh(
                static_image_mode=True,
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.5
            )
            logger.info("LivenessDetectionService initialized (CPU mode)")
        except Exception as e:
            logger.error(f"Failed to initialize FaceMesh (Liveness): {e}")
            self.face_mesh = None
    
    def decode_base64_image(self, base64_string: str) -> Optional[np.ndarray]:
        """Decode a base64-encoded image to numpy array (BGR for OpenCV)."""
        try:
            if ',' in base64_string:
                base64_string = base64_string.split(',')[1]
            
            image_bytes = base64.b64decode(base64_string)
            image = Image.open(BytesIO(image_bytes))
            
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Convert RGB to BGR for OpenCV
            return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        except Exception as e:
            logger.error(f"Failed to decode image: {e}")
            return None
    
    def _calculate_eye_aspect_ratio(self, eye_landmarks: list) -> float:
        """
        Calculate the Eye Aspect Ratio (EAR) for blink detection.
        
        EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
        
        When eye is open, EAR is relatively constant.
        When eye is closed, EAR drops rapidly.
        """
        # Eye landmarks: 6 points per eye
        # p1-p4: horizontal points, p2-p6 and p3-p5: vertical points
        
        # Calculate distances
        A = np.linalg.norm(np.array(eye_landmarks[1]) - np.array(eye_landmarks[5]))
        B = np.linalg.norm(np.array(eye_landmarks[2]) - np.array(eye_landmarks[4]))
        C = np.linalg.norm(np.array(eye_landmarks[0]) - np.array(eye_landmarks[3]))
        
        if C == 0:
            return 0.0
        
        ear = (A + B) / (2.0 * C)
        return ear
    
    def detect_blink(self, image_base64: str) -> BlinkDetectionResult:
        """
        Detect if eyes are closed (blink) in the image.
        
        Args:
            image_base64: Base64-encoded image
            
        Returns:
            BlinkDetectionResult with blink status
        """
        image = self.decode_base64_image(image_base64)
        if image is None:
            return BlinkDetectionResult(False, message="Invalid image")
        
        try:
            # Convert to RGB for MediaPipe
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # [FAIL-SAFE]: Handle technical EGL glitches
            if not self.face_mesh:
                return BlinkDetectionResult(False, message="System Busy (Bỏ qua nháy mắt)")
                
            results = self.face_mesh.process(rgb_image)
            
            if not results or not results.multi_face_landmarks:
                return BlinkDetectionResult(False, message="No face detected (Technical Skip)")
            
            landmarks = results.multi_face_landmarks[0].landmark
            h, w = image.shape[:2]
            
            # Left eye landmarks (indices from MediaPipe face mesh)
            LEFT_EYE = [362, 385, 387, 263, 373, 380]
            # Right eye landmarks
            RIGHT_EYE = [33, 160, 158, 133, 153, 144]
            
            left_eye = [(landmarks[i].x * w, landmarks[i].y * h) for i in LEFT_EYE]
            right_eye = [(landmarks[i].x * w, landmarks[i].y * h) for i in RIGHT_EYE]
            
            left_ear = self._calculate_eye_aspect_ratio(left_eye)
            right_ear = self._calculate_eye_aspect_ratio(right_eye)
            
            # Blink detected if EAR is below threshold
            blink_detected = (left_ear < self.EYE_AR_THRESH) and (right_ear < self.EYE_AR_THRESH)
            
            return BlinkDetectionResult(
                blink_detected=blink_detected,
                left_eye_ratio=left_ear,
                right_eye_ratio=right_ear,
                message="Blink detected" if blink_detected else "Eyes open"
            )
            
        except Exception as e:
            logger.error(f"Blink detection failed: {e}")
            return BlinkDetectionResult(False, message=f"Error: {str(e)}")
    
    def estimate_head_pose(self, image_base64: str) -> HeadPoseResult:
        """
        Estimate head pose (yaw, pitch, roll) from face landmarks.
        
        Args:
            image_base64: Base64-encoded image
            
        Returns:
            HeadPoseResult with rotation angles
        """
        image = self.decode_base64_image(image_base64)
        if image is None:
            return HeadPoseResult()
        
        try:
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # [FAIL-SAFE]: Handle technical EGL glitches
            if not self.face_mesh:
                 return HeadPoseResult()
                 
            results = self.face_mesh.process(rgb_image)
            
            if not results or not results.multi_face_landmarks:
                return HeadPoseResult()
            
            landmarks = results.multi_face_landmarks[0].landmark
            h, w = image.shape[:2]
            
            # Key facial points for pose estimation
            # Nose tip, chin, left eye corner, right eye corner, left mouth, right mouth
            FACE_INDICES = [1, 152, 33, 263, 61, 291]
            
            face_2d = []
            face_3d = []
            
            for idx in FACE_INDICES:
                lm = landmarks[idx]
                x, y = int(lm.x * w), int(lm.y * h)
                face_2d.append([x, y])
                face_3d.append([x, y, lm.z * 3000])  # Scale z for better estimation
            
            face_2d = np.array(face_2d, dtype=np.float64)
            face_3d = np.array(face_3d, dtype=np.float64)
            
            # Camera matrix (approximate)
            focal_length = w
            cam_matrix = np.array([
                [focal_length, 0, w / 2],
                [0, focal_length, h / 2],
                [0, 0, 1]
            ], dtype=np.float64)
            
            dist_coeffs = np.zeros((4, 1), dtype=np.float64)
            
            # Solve PnP
            success, rot_vec, trans_vec = cv2.solvePnP(
                face_3d, face_2d, cam_matrix, dist_coeffs
            )
            
            if not success:
                return HeadPoseResult()
            
            # Convert rotation vector to rotation matrix
            rmat, _ = cv2.Rodrigues(rot_vec)
            
            # Get angles
            angles, _, _, _, _, _ = cv2.RQDecomp3x3(rmat)
            
            return HeadPoseResult(
                yaw=angles[1],   # Left-right
                pitch=angles[0], # Up-down
                roll=angles[2]   # Tilt
            )
            
        except Exception as e:
            logger.error(f"Head pose estimation failed: {e}")
            return HeadPoseResult()
    
    def detect_head_turn(
        self,
        image_base64: str,
        direction: str = "any"
    ) -> bool:
        """
        Detect if head is turned in a specific direction.
        
        Args:
            image_base64: Base64-encoded image
            direction: "left", "right", or "any"
            
        Returns:
            True if head turn detected in specified direction
        """
        pose = self.estimate_head_pose(image_base64)
        
        if direction == "left":
            return pose.yaw > self.HEAD_TURN_THRESH
        elif direction == "right":
            return pose.yaw < -self.HEAD_TURN_THRESH
        else:  # any
            return abs(pose.yaw) > self.HEAD_TURN_THRESH
    
    def passive_liveness_check(self, image_base64: str) -> Dict[str, Any]:
        """
        Perform passive liveness check using texture/quality analysis.
        
        This is a simplified version. In production, you'd use a 
        trained deep learning model for anti-spoofing.
        
        Args:
            image_base64: Base64-encoded image
            
        Returns:
            Dict with check results
        """
        image = self.decode_base64_image(image_base64)
        if image is None:
            return {"passed": False, "reason": "Invalid image", "score": 0.0}
        
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Check 1: Laplacian variance (blur detection)
            # Real faces have more texture detail than printed photos
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            
            # Check 2: Edge density
            edges = cv2.Canny(gray, 100, 200)
            edge_density = np.sum(edges > 0) / edges.size
            
            # Re-scaled scoring:
            # If laplacian_var > 50, we want a score >= 0.8
            # If laplacian_var < 50, score drops rapidly
            normalized_var = min(laplacian_var / 100.0, 1.0) # 100 as new reference max
            if laplacian_var > 50:
                # Map 50-100+ to 0.8-1.0 range
                blur_score = 0.8 + 0.2 * ((laplacian_var - 50) / 200.0)
                blur_score = min(blur_score, 1.0)
            else:
                # Map 0-50 to 0.0-0.7 range
                blur_score = 0.7 * (laplacian_var / 50.0)
                
            edge_score = min(edge_density * 10, 1.0)
            
            combined_score = (blur_score + edge_score) / 2
            
            # Threshold (tunable)
            # Lowered threshold to 50 to accommodate mobile front cameras in various lighting
            passed = bool(combined_score > 0.4 and laplacian_var > 50)
            
            return {
                "passed": passed,
                "score": float(combined_score),
                "blur_score": float(blur_score),
                "edge_score": float(edge_score),
                "laplacian_var": float(laplacian_var),
                "reason": "Đạt yêu cầu" if passed else "Chất lượng ảnh quá thấp (có thể là ảnh chụp)"
            }
            
        except Exception as e:
            logger.error(f"Passive liveness check failed: {e}")
            return {"passed": False, "reason": f"Lỗi: {str(e)}", "score": 0.0}
    
    def verify_liveness_proof(self, proof: LivenessProof) -> bool:
        """
        Verify that a liveness proof meets minimum requirements.
        
        Args:
            proof: LivenessProof object with check results
            
        Returns:
            True if proof is valid
        """
        return proof.is_valid
    
    def cleanup(self):
        """Release resources."""
        if self.face_mesh:
            self.face_mesh.close()


# Singleton instance
_liveness_service: Optional[LivenessDetectionService] = None


def get_liveness_service() -> LivenessDetectionService:
    """Get the singleton LivenessDetectionService instance."""
    global _liveness_service
    if _liveness_service is None:
        _liveness_service = LivenessDetectionService()
    return _liveness_service
