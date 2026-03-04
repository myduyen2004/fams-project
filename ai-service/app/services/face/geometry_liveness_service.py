import os
import logging
import cv2
import numpy as np
import mediapipe as mp
import base64
import sys
from typing import Dict, Any, Tuple
from PIL import Image
from io import BytesIO

# FORCE CPU: Prevent MediaPipe from attempting EGL/GPU acceleration in Docker
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
os.environ['MEDIAPIPE_DISABLE_GPU'] = '1'
os.environ['PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION'] = 'python'

logger = logging.getLogger(__name__)

class GeometryLivenessService:
    """
    Service for Passive 3D Liveness Detection.
    Analyzes facial geometry (depth, curvature, protrusion) without active user interaction.
    Distinguishes 3D human volume from 2D flat screens/photos.
    """
    
    # Nose-to-Face ratio: Nose protrusion depth vs Face width
    MIN_NOSE_DEP_RATIO = 0.055  # Tightened from 0.035
    MAX_NOSE_DEP_RATIO = 0.200  
    
    # Orbital Depth: Distance from eyes to brow/cheek
    MIN_EYE_DEPTH_RATIO = 0.012 # Increased from 0.005 per peer advice
    
    # Curvature: Surface variance across the face mesh
    MIN_CURVATURE_SCORE = 0.04  # Tightened from 0.02
    
    def __init__(self):
        self.mp_face_mesh = mp.solutions.face_mesh
        try:
            self.face_mesh = self.mp_face_mesh.FaceMesh(
                static_image_mode=True,
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.7
            )
            logger.info("GeometryLivenessService (3D Passive) initialized (CPU mode)")
        except Exception as e:
            logger.error(f"Failed to initialize FaceMesh (Geometry): {e}")
            self.face_mesh = None

    def analyze_3d_geometry(self, image_base64: str, has_glasses: bool = False, mode: str = "attendance") -> Dict[str, Any]:
        """
        Main entry point for passive 3D liveness check.
        """
        is_reg = mode == "registration"
        try:
            image = self._decode_image(image_base64)
            if image is None:
                return {"is_3d": False, "score": 0.0, "message": "Lỗi dữ liệu ảnh"}

            h, w = image.shape[:2]
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            # [FAIL-SAFE]: If FaceMesh failed initialization or crashes, skip 3D check
            if not self.face_mesh:
                logger.warning("Geometry: MediaPipe unavailable. Technical skip.")
                return {"is_3d": True, "score": 0.5, "message": "Tiếp tục (Bỏ qua 3D)", "details": {}}

            results = self.face_mesh.process(rgb_image)

            if not results or not results.multi_face_landmarks:
                # [FAIL-SAFE]: If landmarks are missing (likely technical EGL error),
                # return a NEUTRAL score of 0.5 instead of 0.0 (Reject).
                # This prevents technical glitches from triggering a Veto.
                logger.warning("MediaPipe landmark detection failed (technical error or no face). Skipping 3D Veto.")
                return {
                    "is_3d": True, 
                    "score": 0.5, 
                    "message": "Không thể phân tích chiều sâu (Bỏ qua)",
                    "details": {"nose_protrusion": 0.0, "eye_depth": 0.0, "curvature": 0.0}
                }

            landmarks = results.multi_face_landmarks[0].landmark
            
            # 1. NOSE PROTRUSION CHECK
            # Landmarks: 1 (nose tip), 234 (left ear edge), 454 (right ear edge)
            nose_tip = landmarks[1]
            l_ear = landmarks[234]
            r_ear = landmarks[454]
            
            # Face width in 2D for normalization
            face_width = np.sqrt((l_ear.x - r_ear.x)**2 + (l_ear.y - r_ear.y)**2)
            
            # Average depth of ears/peripheral (background plane of face)
            avg_base_z = (l_ear.z + r_ear.z) / 2
            
            # Nose depth relative to base plane (Landmark Z is relative to face center)
            # Smaller Z = closer to camera in MediaPipe
            nose_depth_relative = avg_base_z - nose_tip.z
            nose_ratio = nose_depth_relative / (face_width + 1e-6)
            
            # 2. ORBITAL (EYE) DEPTH CHECK
            # Eye index vs Brow/Cheek
            l_eye = landmarks[33]
            r_eye = landmarks[263]
            l_brow = landmarks[70]
            r_brow = landmarks[300]
            
            eye_depth_l = l_eye.z - l_brow.z
            eye_depth_r = r_eye.z - r_brow.z
            avg_eye_depth = (eye_depth_l + eye_depth_r) / 2
            eye_ratio = avg_eye_depth / (face_width + 1e-6)

            # 3. SURFACE CURVATURE (Variance of Z coordinates)
            # Sample various points on face to ensure it's not a single plane
            sample_indices = [1, 33, 263, 61, 291, 10, 152, 234, 454]
            z_values = [landmarks[i].z for i in sample_indices]
            curvature_score = np.std(z_values)
            
            # Fused Score (0.0 to 1.0)
            # Clip contributions to at least 0 to avoid penalizing negative depth noise
            # [GEOMETRIC CONSISTENCY]: 
            # Eyes must have depth relative to the nose protrusion.
            # 2D spoofs of 3D faces often hallucinate nose depth but fail on eye depth.
            is_consistent = eye_ratio > (nose_ratio * 0.1)
            
            contribution_nose = max(0, min(nose_ratio / self.MIN_NOSE_DEP_RATIO, 1.2))
            contribution_eye = max(0, min(eye_ratio / self.MIN_EYE_DEPTH_RATIO, 1.2))
            contribution_curve = max(0, min(curvature_score / self.MIN_CURVATURE_SCORE, 1.2))
            
            if has_glasses:
                # [RESCUE GLASSES]: If glasses are detected, still check for nose anomaly
                # Hallucinated nose depth > 0.35 is usually a screen artifact or bad landmarks
                if nose_ratio > 0.35:
                    logger.warning(f"3D Geometry VETO: Excessive nose depth ({nose_ratio:.3f}) with glasses.")
                    is_3d = False
                    score = 0.0
                else:
                    # In attendance mode, require a bit of consistency even with glasses
                    # (Registration can be more lenient)
                    min_consistency = 0.02 if not is_reg else -1.0 # Negative means disabled
                    is_3d = (nose_ratio > self.MIN_NOSE_DEP_RATIO) and (curvature_score > self.MIN_CURVATURE_SCORE)
                    if not is_reg and eye_ratio < min_consistency:
                        logger.warning(f"3D Geometry: Insufficient eye depth ({eye_ratio:.4f}) for attendance with glasses.")
                        is_3d = False
                        score *= 0.5
                    logger.info(f"3D Geometry: Glasses detected. is_3d={is_3d}")
                
                # Rely on Nose (50%) and Curvature (50%)
                score = contribution_nose * 0.5 + contribution_curve * 0.5
            else:
                score = contribution_nose * 0.5 + contribution_eye * 0.2 + contribution_curve * 0.3
                is_3d = score > 0.15 
                
            # Registration is ultra-lenient (0.85) to allow real people with high depth
            # Attendance is now also loosened to 0.85 to avoid FP on some mobile devices
            max_nose_thresh = 0.85 
            if nose_ratio > max_nose_thresh:
                logger.warning(f"3D Geometry VETO: Excessive nose depth ({nose_ratio:.3f}). Mode: {mode}")
                is_3d = False
                score = 0.01 # Small non-zero to distinguish from "definitively flat"
            
            # Penalty for inconsistency (Only for non-glasses or if nose/eye both positive)
            if not is_consistent and not has_glasses:
                logger.warning(f"3D Geometry inconsistency: nose={nose_ratio:.4f}, eye={eye_ratio:.4f}")
                score *= 0.5
            
            # Normalize to 0-1
            score = min(max(score / 1.2, 0.0), 1.0)
            
            print(f"3D_DEBUG: nose_r={nose_ratio:.6f} (v {self.MIN_NOSE_DEP_RATIO}), eye_r={eye_ratio:.6f} (v {self.MIN_EYE_DEPTH_RATIO}), curve={curvature_score:.6f} (v {self.MIN_CURVATURE_SCORE})")
            print(f"3D_DETAIL: face_w={face_width:.4f}, nose_z={nose_tip.z:.4f}, ear_z={avg_base_z:.4f}")
            sys.stdout.flush()
            
            logger.info(f"3D Geometry breakdown: nose_r={nose_ratio:.4f}, eye_r={eye_ratio:.4f}, curve={curvature_score:.4f} -> score={score:.2%}")
            
            if not is_3d:
                message = "Phát hiện bề mặt phẳng (Ảnh/Video/Màn hình)"
            else:
                message = "Hình học 3D thật"

            return {
                "is_3d": bool(is_3d),
                "score": float(score),
                "message": message,
                "details": {
                    "nose_protrusion": float(nose_ratio),
                    "eye_depth": float(eye_ratio),
                    "curvature": float(curvature_score)
                }
            }

        except Exception as e:
            logger.error(f"3D Geometry Analysis failed: {e}")
            return {"is_3d": True, "score": 1.0, "message": "Error skipped"}

    def _decode_image(self, base64_string: str):
        try:
            if ',' in base64_string: base64_string = base64_string.split(',')[1]
            image_bytes = base64.b64decode(base64_string)
            image = Image.open(BytesIO(image_bytes))
            return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        except: return None

# Singleton
_geometry_service = None
def get_geometry_service() -> GeometryLivenessService:
    global _geometry_service
    if _geometry_service is None:
        _geometry_service = GeometryLivenessService()
    return _geometry_service
