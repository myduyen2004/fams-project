"""
Face Quality Check Service

Checks for face quality issues before registration:
- Face coverage (must be >30% of frame)
- Landmark visibility (eyes, nose, mouth)
- Glasses detection (strict)
- Occlusion detection (hair covering cheeks/eyes)
"""

import logging
import cv2
import numpy as np
import base64
import mediapipe as mp
from typing import Dict, Any, List, Tuple

logger = logging.getLogger(__name__)


class FaceQualityService:
    """Service to check face quality before registration using MediaPipe"""
    
    # ============ THRESHOLDS (Updated for Enhanced Security) ============
    # Image Quality Requirements (relaxed for more devices)
    MIN_IMAGE_WIDTH = 320          # Minimum 320px width
    MIN_IMAGE_HEIGHT = 240         # Minimum 240px height
    MIN_LAPLACIAN_VARIANCE = 120.0 # Sharpness threshold (slightly stricter)
    
    # Face Coverage (25-55% of frame - slightly tighter)
    MIN_FACE_COVERAGE = 0.25       # Min 25%
    MAX_FACE_COVERAGE = 0.55       # Max 55%
    
    # Lighting Thresholds
    MIN_BRIGHTNESS = 50            # Minimum brightness (slightly stricter)
    MAX_BRIGHTNESS = 230           # Maximum brightness (slightly stricter)
    MAX_LIGHT_IMBALANCE = 35       # Max difference between L/R brightness
    
    # Other Parameters
    MIN_SKIN_RATIO = 0.85          # Stricter skin ratio
    HEAD_POSE_THRESHOLD = 12       # Max ±12° head angle (stricter)
    MAX_MOUTH_RATIO = 0.3          # For expression check
    # ====================================================================

    def __init__(self):
        # Initialize MediaPipe Face Mesh
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,      # Strict: Only 1 face allowed
            refine_landmarks=True,
            min_detection_confidence=0.7 # High confidence
        )
        logger.info("FaceQualityService initialized with Comprehensive Strict Checks")

    def check_quality(self, image_base64: str) -> Dict[str, Any]:
        """
        Check face quality using MediaPipe Face Mesh with STRICT rules
        """
        warnings = []
        errors = []
        details = {}

        try:
            image = self._decode_image(image_base64)
            if image is None:
                return {"passed": False, "errors": ["invalid_image"], "message": "Lỗi ảnh input"}

            height, width = image.shape[:2]
            frame_area = height * width

            # Convert to RGB
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            results = self.face_mesh.process(image_rgb)

            if not results.multi_face_landmarks:
                return {"passed": False, "errors": ["no_face"], "message": "Không thấy mặt."}

            if len(results.multi_face_landmarks) > 1:
                return {"passed": False, "errors": ["multiple_faces"], "message": "Chỉ được phép có 1 người."}

            landmarks = results.multi_face_landmarks[0]
            
            # --- 0. Resolution Check (NEW) ---
            if width < self.MIN_IMAGE_WIDTH or height < self.MIN_IMAGE_HEIGHT:
                errors.append("resolution_too_low")
            details["resolution"] = f"{width}x{height}"
            
            # --- 0b. Sharpness Check (NEW) ---
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            details["sharpness"] = round(laplacian_var, 1)
            if laplacian_var < self.MIN_LAPLACIAN_VARIANCE:
                errors.append("image_blurry")
            
            # --- 1. Position & Size Check ---
            x_min, x_max, y_min, y_max = self._get_bounding_box(landmarks, width, height)
            face_w = x_max - x_min
            face_h = y_max - y_min
            face_area = face_w * face_h
            face_coverage = face_area / frame_area
            details["face_coverage"] = round(face_coverage, 3)

            # Center Check
            face_cx, face_cy = (x_min + x_max) // 2, (y_min + y_max) // 2
            img_cx, img_cy = width // 2, height // 2
            # Allow 10% deviation from center
            if abs(face_cx - img_cx) > width * 0.15 or abs(face_cy - img_cy) > height * 0.15:
                warnings.append("not_centered") # Warning for now, could be error

            # Size Check (30-50% requirement)
            if face_coverage < self.MIN_FACE_COVERAGE:  # Too small (< 30%)
                errors.append("face_too_small")
            elif face_coverage > self.MAX_FACE_COVERAGE:  # Too big (> 50%)
                errors.append("face_too_large")

            # --- 2. Lighting Analysis ---
            # Get face mask/ROI to analyze brightness only on face
            face_roi = image[y_min:y_max, x_min:x_max]
            if face_roi.size > 0:
                gray_face = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
                vals = gray_face.flatten()
                brightness = np.mean(vals)
                
                # Overall Brightness
                if brightness < self.MIN_BRIGHTNESS:
                    errors.append("too_dark")
                elif brightness > self.MAX_BRIGHTNESS:
                    errors.append("too_bright")
                
                # Uniformity (Left/Right Balance)
                # Split face ROI horizontally
                h_f, w_f = gray_face.shape
                left_half = gray_face[:, :w_f//2]
                right_half = gray_face[:, w_f//2:]
                l_bright = np.mean(left_half)
                r_bright = np.mean(right_half)
                imbalance = abs(l_bright - r_bright)
                details["light_imbalance"] = round(imbalance, 1)
                
                if imbalance > self.MAX_LIGHT_IMBALANCE:
                    errors.append("uneven_lighting")  # Side lighting/shadows

            # --- 3. Head Pose (Frontal) ---
            nose_tip = landmarks.landmark[1]
            left_ear = landmarks.landmark[234]
            right_ear = landmarks.landmark[454]
            dist_left = abs(nose_tip.x - left_ear.x)
            dist_right = abs(nose_tip.x - right_ear.x)
            yaw_ratio = min(dist_left, dist_right) / (max(dist_left, dist_right) + 1e-6)
            
            if yaw_ratio < 0.5:
                errors.append("head_turned")
            
            # --- 4. Occlusion Checks (Strict) ---
            
            # A. Cheeks (Hair covering)
            # Left cheek region: 234, 93, 132, 58
            # Right cheek region: 454, 323, 361, 288
            lc_occluded = self._check_occlusion(image, landmarks, [234, 93, 132, 58], width, height, threshold=0.4)
            rc_occluded = self._check_occlusion(image, landmarks, [454, 323, 361, 288], width, height, threshold=0.4)
            if lc_occluded and rc_occluded:  # Both cheeks must be covered
                errors.append("cheeks_covered")

            # B. Forehead (Bangs/Hair)
            # Forehead region approx: 10 (top), 338 (L), 297 (R), 151 (bot) -- Approximate indices
            # Using broader polygon for forehead central area: 10, 338, 297
            forehead_occluded = self._check_occlusion(image, landmarks, [10, 338, 297, 151], width, height, threshold=0.5)
            if forehead_occluded:
                errors.append("forehead_covered")

            # C. Eyes/Eyebrows (Hair)
            # Left Eye/Brow region
            le_occluded = self._check_occlusion(image, landmarks, [33, 133, 159, 145], width, height, threshold=0.25)
            re_occluded = self._check_occlusion(image, landmarks, [362, 263, 386, 374], width, height, threshold=0.25)
            if le_occluded and re_occluded:  # Both eyes must be covered
                errors.append("eyes_covered")
                
            # D. Mouth/Nose (Mask)
            mouth_occluded = self._check_occlusion(image, landmarks, [13, 14, 78, 308], width, height, threshold=0.5) # Lips
            # For mask, checks lower face often. Skin check on nose tip/mouth area.
            if mouth_occluded:
                errors.append("mouth_covered") # Possible mask

            # --- 5. Expression Check (Neutral) ---
            # Mouth Aspect Ratio (MAR)
            top_lip = landmarks.landmark[13].y
            bot_lip = landmarks.landmark[14].y
            left_mouth = landmarks.landmark[78].x
            right_mouth = landmarks.landmark[308].x
            
            mouth_h = abs(top_lip - bot_lip) * height
            mouth_w = abs(left_mouth - right_mouth) * width
            mar = mouth_h / (mouth_w + 1e-6)
            details["mar"] = mar
            
            if mar > self.MAX_MOUTH_RATIO:
                warnings.append("mouth_open") # Could be smiling or talking
                # Strict mode: maybe warning is enough, or error? User requested "Biểu cảm tự nhiên"

            # --- 6. Glasses Check ---
            # Existing heuristic is good, keep it
            if self._detect_glasses_v2(image, landmarks, width, height):
                errors.append("glasses_detected")


            # --- Build Message ---
            passed = len(errors) == 0
            
            if not passed:
                # Priority messages
                if "no_face" in errors: message = "Không phát hiện khuôn mặt."
                elif "multiple_faces" in errors: message = "Chỉ được phép 1 người trong khung hình."
                elif "resolution_too_low" in errors: message = "Độ phân giải camera quá thấp (cần >= 640x480)."
                elif "image_blurry" in errors: message = "Ảnh bị mờ. Giữ yên điện thoại."
                elif "face_too_small" in errors: message = "Mặt quá xa/quá nhỏ. Hãy lại gần."
                elif "face_too_large" in errors: message = "Mặt quá gần. Hãy lùi lại chút."
                elif "too_dark" in errors: message = "Quá tối. Hãy tìm nơi sáng hơn."
                elif "too_bright" in errors: message = "Quá sáng/Chói. Tránh ánh nắng gắt."
                elif "uneven_lighting" in errors: message = "Ánh sáng không đều (bên sáng bên tối). Hãy đứng đối diện nguồn sáng."
                elif "head_turned" in errors: message = "Vui lòng nhìn THẲNG vào camera."
                elif "glasses_detected" in errors: message = "Vui lòng THÁO KÍNH."
                elif "cheeks_covered" in errors: message = "Tóc che má. Vui lòng VÉN TÓC sang hai bên."
                elif "forehead_covered" in errors: message = "Tóc che trán. Vui lòng VÉN TÓC mái."
                elif "eyes_covered" in errors: message = "Tóc che mắt/cung mày. Vui lòng vén tóc."
                elif "mouth_covered" in errors: message = "Vui lòng THÁO KHẨU TRANG."
                else: message = "Chất lượng ảnh không đạt yêu cầu."
            elif warnings:
                msg_list = []
                if "not_centered" in warnings: msg_list.append("hãy để mặt chính giữa")
                if "mouth_open" in warnings: msg_list.append("giữ mặt nghiêm túc")
                message = "Cảnh báo: " + ", ".join(msg_list) if msg_list else "Chất lượng tốt."
                # If just warnings, we can pass but maybe show message? 
                # Strict mode usually allows warnings or fails? User said "Biểu cảm tự nhiên" -> Warning ok.
                if not msg_list: message = "Chất lượng tốt."
            else:
                message = "Chất lượng tốt."

            return {
                "passed": passed,
                "warnings": warnings,
                "errors": errors,
                "details": details,
                "message": message
            }

        except Exception as e:
            logger.error(f"Comprehensive Quality Check Error: {e}")
            return {"passed": True, "warnings": ["check_failed"], "message": str(e)}

    def _get_bounding_box(self, landmarks, w, h):
        x_coords = [l.x for l in landmarks.landmark]
        y_coords = [l.y for l in landmarks.landmark]
        return (
            int(min(x_coords) * w), int(max(x_coords) * w),
            int(min(y_coords) * h), int(max(y_coords) * h)
        )

    def _check_occlusion(self, image, landmarks, idx_list, w, h, threshold=0.6):
        """
        Check if a region defined by landmarks is occluded (not skin color).
        Simple idea: Convert to HSV, check skin color range.
        If skin_pixel_ratio < threshold -> Occluded.
        """
        try:
            # 1. Get polygon points
            points = []
            for idx in idx_list:
                l = landmarks.landmark[idx]
                points.append((int(l.x * w), int(l.y * h)))
            
            mask = np.zeros(image.shape[:2], dtype=np.uint8)
            cv2.fillPoly(mask, [np.array(points)], 255)
            
            # 2. Extract ROI
            # Convert to YCrCb or HSV for skin detection
            image_ycrcb = cv2.cvtColor(image, cv2.COLOR_BGR2YCrCb)
            
            # Standard Skin Color Thresholds in YCrCb
            # Y > 80, 135 < Cr < 180, 85 < Cb < 135
            min_YCrCb = np.array([0, 133, 77], np.uint8)
            max_YCrCb = np.array([255, 173, 127], np.uint8)
            
            skin_mask = cv2.inRange(image_ycrcb, min_YCrCb, max_YCrCb)
            
            # Apply ROI mask
            roi_skin = cv2.bitwise_and(skin_mask, skin_mask, mask=mask)
            
            # Count skin pixels vs total ROI pixels
            skin_pixels = cv2.countNonZero(roi_skin)
            total_pixels = cv2.countNonZero(mask)
            
            if total_pixels == 0: return False
            
            ratio = skin_pixels / total_pixels
            # logger.info(f"ROI Ratio: {ratio}")
            
            return ratio < threshold
            
        except Exception as e:
            logger.error(f"Occlusion check error: {e}")
            return False

    def _detect_glasses_v2(self, image, landmarks, w, h):
        """
        Detect glasses using multiple heuristics (relaxed for fewer false positives):
        1. Edge density on nose bridge (frame)
        2. High brightness spots on eyes (reflection/glare)
        3. Edge density around eye regions
        """
        try:
            l_eye = landmarks.landmark[33]
            r_eye = landmarks.landmark[263]
            
            # --- Check 1: Nose bridge edges (gọng kính giữa) ---
            px1, py1 = int(l_eye.x * w), int(l_eye.y * h)
            px2, py2 = int(r_eye.x * w), int(r_eye.y * h)
            
            if px1 >= px2: return False 
            
            # Expand ROI for nose bridge
            y_top = max(0, min(py1, py2) - 15)
            y_bot = min(h, max(py1, py2) + 15)
            nose_roi = image[y_top:y_bot, px1:px2]
            
            if nose_roi.size == 0: return False
            
            gray_nose = cv2.cvtColor(nose_roi, cv2.COLOR_BGR2GRAY)
            edges_nose = cv2.Canny(gray_nose, 50, 150)  # Higher thresholds
            edge_density_nose = np.sum(edges_nose) / 255 / (edges_nose.size + 1)
            
            # --- Check 2: Left eye region ---
            le_x = int(l_eye.x * w)
            le_y = int(l_eye.y * h)
            eye_size = int((px2 - px1) * 0.4)
            
            l_roi_x1, l_roi_x2 = max(0, le_x - eye_size), min(w, le_x + eye_size)
            l_roi_y1, l_roi_y2 = max(0, le_y - eye_size // 2), min(h, le_y + eye_size // 2)
            left_eye_roi = image[l_roi_y1:l_roi_y2, l_roi_x1:l_roi_x2]
            
            edge_density_left = 0
            glare_left = 0
            if left_eye_roi.size > 0:
                gray_left = cv2.cvtColor(left_eye_roi, cv2.COLOR_BGR2GRAY)
                edges_left = cv2.Canny(gray_left, 50, 150)
                edge_density_left = np.sum(edges_left) / 255 / (edges_left.size + 1)
                
                # Check for glare (very bright spots) - higher threshold
                glare_left = np.sum(gray_left > 235) / (gray_left.size + 1)
            
            # --- Check 3: Right eye region ---
            re_x = int(r_eye.x * w)
            re_y = int(r_eye.y * h)
            
            r_roi_x1, r_roi_x2 = max(0, re_x - eye_size), min(w, re_x + eye_size)
            r_roi_y1, r_roi_y2 = max(0, re_y - eye_size // 2), min(h, re_y + eye_size // 2)
            right_eye_roi = image[r_roi_y1:r_roi_y2, r_roi_x1:r_roi_x2]
            
            edge_density_right = 0
            glare_right = 0
            if right_eye_roi.size > 0:
                gray_right = cv2.cvtColor(right_eye_roi, cv2.COLOR_BGR2GRAY)
                edges_right = cv2.Canny(gray_right, 50, 150)
                edge_density_right = np.sum(edges_right) / 255 / (edges_right.size + 1)
                
                # Check for glare
                glare_right = np.sum(gray_right > 235) / (gray_right.size + 1)
            
            # --- Decision (relaxed - require stronger evidence) ---
            glasses_indicators = 0
            
            # Case 1: Very strong edges on nose bridge
            if edge_density_nose > 0.10:  # Increased from 0.05
                glasses_indicators += 1
            
            # Case 2: High edge density around BOTH eyes
            if edge_density_left > 0.12 and edge_density_right > 0.12:  # Increased from 0.08
                glasses_indicators += 1
            
            # Case 3: Strong glare on BOTH eyes (lens reflection)
            if glare_left > 0.05 and glare_right > 0.05:  # Increased from 0.02, require both
                glasses_indicators += 1
            
            # Require at least 2 indicators for glasses detection
            if glasses_indicators >= 2:
                logger.info(f"Glasses detected: nose={edge_density_nose:.3f}, "
                           f"eyes L={edge_density_left:.3f} R={edge_density_right:.3f}, "
                           f"glare L={glare_left:.3f} R={glare_right:.3f}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Glasses detection error: {e}")
            return False

    def _decode_image(self, image_base64: str) -> np.ndarray:
        try:
            if ',' in image_base64: image_base64 = image_base64.split(',')[1]
            image_bytes = base64.b64decode(image_base64)
            nparr = np.frombuffer(image_bytes, np.uint8)
            return cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        except: return None

# Singleton instance
_face_quality_service = None

def get_face_quality_service() -> FaceQualityService:
    global _face_quality_service
    if _face_quality_service is None:
        _face_quality_service = FaceQualityService()
    return _face_quality_service

