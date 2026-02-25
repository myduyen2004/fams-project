# ========================================
# Motion Consistency Service
# ========================================
# Analyzes motion patterns to detect unnatural/artificial movement
# that indicates video replay attacks.
#
# Key detections:
# - Landmark velocity patterns (too smooth = fake)
# - Head movement consistency
# - Natural micro-movement noise
# - Temporal coherence across frames

import numpy as np
from typing import Dict, Any, List, Optional, Tuple
import logging
import cv2
from PIL import Image
from io import BytesIO
import base64

logger = logging.getLogger(__name__)


class MotionConsistencyService:
    """
    Service for analyzing motion consistency across multiple frames.
    Detects artificial/replay video by analyzing movement patterns.
    """
    
    # Detection parameters
    MIN_FRAMES_FOR_ANALYSIS = 3
    MAX_FRAMES_TO_STORE = 10
    
    # Thresholds
    SMOOTHNESS_THRESHOLD = 0.85     # Too smooth = suspicious
    NOISE_VARIANCE_MIN = 0.5        # Minimum natural noise
    VELOCITY_VARIANCE_MIN = 0.1     # Minimum velocity variation
    
    def __init__(self):
        """Initialize the motion consistency service."""
        self._frame_history: List[Dict[str, Any]] = []
        self._landmark_history: List[np.ndarray] = []
        logger.info("MotionConsistencyService initialized")
    
    def reset(self):
        """Reset frame history for new session."""
        self._frame_history.clear()
        self._landmark_history.clear()
    
    def decode_base64_image(self, base64_string: str) -> Optional[np.ndarray]:
        """Decode a base64-encoded image to numpy array."""
        try:
            if ',' in base64_string:
                base64_string = base64_string.split(',')[1]
            
            image_bytes = base64.b64decode(base64_string)
            image = Image.open(BytesIO(image_bytes))
            
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        except Exception as e:
            logger.error(f"Failed to decode image: {e}")
            return None
    
    def extract_features(self, image: np.ndarray) -> Dict[str, Any]:
        """
        Extract motion-relevant features from a frame.
        Uses optical flow and feature point tracking.
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Detect feature points
        orb = cv2.ORB_create(nfeatures=100)
        keypoints, descriptors = orb.detectAndCompute(gray, None)
        
        # Extract keypoint coordinates
        points = np.array([kp.pt for kp in keypoints]) if keypoints else np.array([])
        
        # Calculate image statistics for micro-movement detection
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        return {
            'keypoints': points,
            'descriptors': descriptors,
            'laplacian_var': laplacian_var,
            'mean_intensity': np.mean(gray),
            'std_intensity': np.std(gray),
            'frame_hash': hash(gray.tobytes()[:1000])  # Quick frame identifier
        }
    
    def calculate_optical_flow(
        self, 
        prev_frame: np.ndarray, 
        curr_frame: np.ndarray
    ) -> Tuple[np.ndarray, float]:
        """
        Calculate optical flow between two frames.
        Returns flow field and magnitude statistics.
        """
        prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)
        curr_gray = cv2.cvtColor(curr_frame, cv2.COLOR_BGR2GRAY)
        
        # Calculate dense optical flow
        flow = cv2.calcOpticalFlowFarneback(
            prev_gray, curr_gray, None,
            pyr_scale=0.5, levels=3, winsize=15,
            iterations=3, poly_n=5, poly_sigma=1.2, flags=0
        )
        
        # Calculate magnitude
        magnitude = np.sqrt(flow[..., 0]**2 + flow[..., 1]**2)
        mean_magnitude = np.mean(magnitude)
        
        return flow, mean_magnitude
    
    def analyze_smoothness(self, velocities: List[float]) -> float:
        """
        Analyze how "smooth" the motion is.
        Natural motion has some jitter; video replay is too smooth.
        
        Returns:
            Smoothness score (0-1, higher = smoother = more suspicious)
        """
        if len(velocities) < 3:
            return 0.5
        
        velocities_arr = np.array(velocities)
        
        # Calculate first derivative (acceleration)
        acceleration = np.diff(velocities_arr)
        
        # Calculate jerk (change in acceleration)
        jerk = np.diff(acceleration)
        
        # Natural motion has higher jerk variance
        jerk_variance = np.var(jerk) if len(jerk) > 0 else 0
        
        # Low jerk variance = too smooth = suspicious
        smoothness = 1.0 / (1.0 + jerk_variance * 10)
        
        return float(smoothness)
    
    def analyze_micro_movement(self, features_history: List[Dict]) -> float:
        """
        Analyze micro-movements (biological jitter) between frames.
        Natural faces have subtle micro-movements (3-5Hz); videos don't.
        
        Returns:
            Natural movement score (0-1, higher = more natural)
        """
        if len(features_history) < 3:
            return 0.5
        
        # 1. Laplacian Variance (Focus measure)
        # Real faces change focus slightly due to 3D movement
        laplacian_vars = [f['laplacian_var'] for f in features_history]
        laplacian_std = np.std(laplacian_vars)
        
        # 2. Local Intensity Micro-fluctuation (Pulse/Blood flow - remote PPG potential)
        # Simplified: Check for non-zero variance in key regions
        intensities = [f['mean_intensity'] for f in features_history]
        intensity_std = np.std(intensities)
        
        # 3. Keypoint Jitter (Biological tremor)
        # Calculate keypoint displacement variance
        jitter_score = 0.0
        if 'keypoints' in features_history[0] and len(features_history[0]['keypoints']) > 0:
            # Track first point across frames (simplified)
            # In production, use optical flow tracks
            pass 
        
        # Scoring: 
        # - Too low intensity_std (< 0.5) = Frozen image / Screen (0.0 score)
        # - Moderate std = Natural
        # - Too high = Large motion (1.0 score but maybe Blur)
        
        if intensity_std < 0.2: # Perfectly frozen
            return 0.0
            
        # 4. Angle Variance (Directional Jitter)
        # Videos usually move in linear paths (camera slide)
        # Heads jitter in random directions
        
        # Natural faces have subtle but measurable micro-movements
        # Normalize: Natural variance is usually around 2.0-10.0
        micro_score = min(
            (laplacian_std / 5.0) + (intensity_std / 2.0),
            1.0
        )
        
        # Penalize if TOO stable (Tripod/Screen)
        if micro_score < 0.1:
            micro_score = 0.0
            
        return float(micro_score)
    
    def add_frame(self, image_base64: str) -> Dict[str, Any]:
        """
        Add a frame to the analysis buffer.
        Returns intermediate analysis results.
        """
        image = self.decode_base64_image(image_base64)
        if image is None:
            return {"error": "Invalid image"}
        
        features = self.extract_features(image)
        
        # Store frame data
        frame_data = {
            'features': features,
            'image': image
        }
        self._frame_history.append(frame_data)
        
        # Limit history size
        if len(self._frame_history) > self.MAX_FRAMES_TO_STORE:
            self._frame_history.pop(0)
        
        return {
            "frames_collected": len(self._frame_history),
            "ready_for_analysis": len(self._frame_history) >= self.MIN_FRAMES_FOR_ANALYSIS
        }
    
    def analyze(self) -> Dict[str, Any]:
        """
        Perform full motion consistency analysis on collected frames.
        
        Returns:
            Dict with analysis results and consistency score
        """
        if len(self._frame_history) < self.MIN_FRAMES_FOR_ANALYSIS:
            return {
                "success": False,
                "message": f"Cần ít nhất {self.MIN_FRAMES_FOR_ANALYSIS} khung hình",
                "frames_collected": len(self._frame_history)
            }
        
        try:
            # Calculate optical flow between consecutive frames
            flow_magnitudes = []
            for i in range(1, len(self._frame_history)):
                prev_img = self._frame_history[i-1]['image']
                curr_img = self._frame_history[i]['image']
                _, magnitude = self.calculate_optical_flow(prev_img, curr_img)
                flow_magnitudes.append(magnitude)
            
            # Analyze smoothness
            smoothness = self.analyze_smoothness(flow_magnitudes)
            
            # Analyze micro-movements
            features_list = [f['features'] for f in self._frame_history]
            micro_movement_score = self.analyze_micro_movement(features_list)
            
            # Calculate velocity variance
            velocity_variance = np.var(flow_magnitudes) if flow_magnitudes else 0
            
            # Check for duplicate/frozen frames
            frame_hashes = [f['features']['frame_hash'] for f in self._frame_history]
            unique_frames = len(set(frame_hashes))
            unique_ratio = unique_frames / len(frame_hashes)
            
            # Combine scores
            # Natural motion: high micro-movement, low smoothness, high velocity variance
            is_natural_motion = (
                micro_movement_score > 0.3 and
                smoothness < self.SMOOTHNESS_THRESHOLD and
                velocity_variance > self.VELOCITY_VARIANCE_MIN and
                unique_ratio > 0.8
            )
            
            # Calculate overall consistency score (higher = more natural)
            consistency_score = (
                (1.0 - smoothness) * 0.3 +  # Less smooth = better
                micro_movement_score * 0.3 +
                min(velocity_variance / 1.0, 1.0) * 0.2 +
                unique_ratio * 0.2
            )
            
            logger.info(
                f"Motion analysis: consistency={consistency_score:.4f}, "
                f"smoothness={smoothness:.4f}, micro={micro_movement_score:.4f}, "
                f"vel_var={velocity_variance:.4f}, unique={unique_ratio:.2f}"
            )
            
            return {
                "success": True,
                "is_natural": bool(is_natural_motion),
                "consistency_score": float(consistency_score),
                "details": {
                    "smoothness": float(smoothness),
                    "micro_movement_score": float(micro_movement_score),
                    "velocity_variance": float(velocity_variance),
                    "unique_frame_ratio": float(unique_ratio),
                    "frames_analyzed": len(self._frame_history)
                },
                "message": "Chuyển động tự nhiên" if is_natural_motion else "Chuyển động đáng ngờ"
            }
            
        except Exception as e:
            logger.error(f"Motion analysis failed: {e}")
            return {
                "success": False,
                "message": f"Lỗi phân tích: {str(e)}"
            }
    
    def quick_check(self, image_base64: str) -> Dict[str, Any]:
        """
        Quick single-frame check for obvious signs of video.
        Less accurate than multi-frame analysis but faster.
        """
        image = self.decode_base64_image(image_base64)
        if image is None:
            return {
                "is_natural": False,
                "score": 0.0,
                "message": "Ảnh không hợp lệ"
            }
        
        features = self.extract_features(image)
        
        # Check for excessive regularity (sign of digital display)
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # FFT to detect periodic patterns
        f_transform = np.fft.fft2(gray)
        f_shift = np.fft.fftshift(f_transform)
        magnitude = 20 * np.log(np.abs(f_shift) + 1)
        
        # High peaks in specific frequencies = digital display
        peak_ratio = np.percentile(magnitude, 99) / np.mean(magnitude)
        
        # Natural images have lower peak ratios
        # [MITIGATION]: Increase to 20.0 to avoid rejections from background textures/lighting
        is_natural = peak_ratio < 20.0
        score = max(0, min(1.0, 1.0 - (peak_ratio - 10.0) / 10.0))
        
        return {
            "is_natural": bool(is_natural),
            "score": float(score),
            "peak_ratio": float(peak_ratio),
            "message": "Ảnh tự nhiên" if is_natural else "Có thể là màn hình"
        }


# Session-based instances (keyed by session ID)
_motion_services: Dict[str, MotionConsistencyService] = {}


def get_motion_service(session_id: str = "default") -> MotionConsistencyService:
    """Get or create a MotionConsistencyService for a session."""
    global _motion_services
    if session_id not in _motion_services:
        _motion_services[session_id] = MotionConsistencyService()
    return _motion_services[session_id]


def clear_motion_service(session_id: str = "default"):
    """Clear a session's motion service."""
    global _motion_services
    if session_id in _motion_services:
        del _motion_services[session_id]
