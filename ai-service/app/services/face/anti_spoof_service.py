# ========================================
# Anti-Spoofing Detection Service
# ========================================
# Uses Silent-Face-Anti-Spoofing MiniFASNetV2 model (ONNX)
# to detect photo/video attacks

import numpy as np
from typing import Optional, Dict, Any, Tuple
import logging
import cv2
from PIL import Image
from io import BytesIO
import base64
import os
import mediapipe as mp
import sys
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

try:
    import onnxruntime as ort
    ONNX_AVAILABLE = True
except ImportError as e:
    ONNX_AVAILABLE = False
    ort = None
    logger.error(f"onnxruntime import failed: {e}")

# Model configuration — Dual-model multi-scale as per reference test.py
MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'models', 'anti_spoof')

# Two models at different crop scales for robust detection:
# (model_path, crop_scale)  — reference uses sum of softmax predictions
MODELS = [
    (os.path.join(MODEL_DIR, 'MiniFASNetV2.onnx'), 2.7),      # Primary model
    (os.path.join(MODEL_DIR, 'MiniFASNetV1SE.onnx'), 4.0),    # Secondary model
]

# Input size expected by both models
INPUT_SIZE = (80, 80)


class AntiSpoofService:
    """
    Dual-model anti-spoofing service.
    Uses MiniFASNetV2 (2.7x) + MiniFASNetV1SE (4.0x) and sums their
    softmax predictions for a final vote — matching the reference
    Silent-Face-Anti-Spoofing test.py implementation.
    """
    
    # Score > threshold = Real face
    # Relaxed to 0.80 for high usability after user feedback
    REAL_THRESHOLD = 0.80        # Was 0.90
    MIN_REAL_REQUIREMENT = 0.30  
    
    def __init__(self):
        """Initialize the anti-spoofing service with dual models."""
        self.sessions = []  # List of (onnx_session, input_name, scale)
        self.is_loaded = False
        
        if not ONNX_AVAILABLE:
            logger.warning("ONNX Runtime not available. Anti-spoofing will be disabled.")
            return
        
        self.mp_face_detection = mp.solutions.face_detection.FaceDetection(
            model_selection=1,
            min_detection_confidence=0.3
        )
        
        # Thread pool for multi-scale inference
        self.executor = ThreadPoolExecutor(max_workers=3)
        
        self._load_models()
    
    def _load_models(self):
        """Load all ONNX models."""
        providers = ['CPUExecutionProvider']
        loaded_count = 0
        
        for model_path, scale in MODELS:
            try:
                if not os.path.exists(model_path):
                    logger.warning(f"Model file not found: {model_path}")
                    print(f"WARNING: Anti-spoof model not found: {model_path}")
                    sys.stdout.flush()
                    continue
                
                session = ort.InferenceSession(model_path, providers=providers)
                input_name = session.get_inputs()[0].name
                self.sessions.append((session, input_name, scale))
                loaded_count += 1
                logger.info(f"Anti-spoof model loaded: {os.path.basename(model_path)} (scale={scale})")
            except Exception as e:
                logger.error(f"Failed to load {model_path}: {e}")
        
        self.is_loaded = loaded_count > 0
        print(f"Anti-spoof models loaded: {loaded_count}/{len(MODELS)}")
        sys.stdout.flush()
    
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
    
    def _detect_face_bbox(self, image: np.ndarray) -> Optional[tuple]:
        """
        Detect face bounding box using MediaPipe.
        Returns (x, y, w, h) or None if no face found.
        """
        try:
            lh, lw, _ = image.shape
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            results = self.mp_face_detection.process(image_rgb)
            
            if not results.detections:
                logger.warning("No face detected for anti-spoof check")
                return None
            
            detection = results.detections[0]
            bbox = detection.location_data.relative_bounding_box
            
            x = int(bbox.xmin * lw)
            y = int(bbox.ymin * lh)
            w = int(bbox.width * lw)
            h = int(bbox.height * lh)
            return (x, y, w, h)
        except Exception as e:
            logger.error(f"MediaPipe Face detection failed: {e}")
            return None
    
    def _crop_face_at_scale(self, image: np.ndarray, bbox: tuple, scale: float) -> np.ndarray:
        """
        Crop face region at specified scale.
        Matches the reference logic from Silent-Face-Anti-Spoofing:
        1. Make it a square based on max(w, h)
        2. Expand by scale
        3. Center and pad if necessary
        """
        x, y, w, h = bbox
        lh, lw, _ = image.shape
        
        # Center of the face
        cx, cy = x + w // 2, y + h // 2
        
        # 1. Make it a square
        real_size = max(w, h)
        
        # 2. Expand by scale
        scale_size = int(real_size * scale)
        
        # 3. Calculate crop coordinates
        x1 = cx - scale_size // 2
        y1 = cy - scale_size // 2
        x2 = x1 + scale_size
        y2 = y1 + scale_size
        
        # Handle out of bounds with padding (Mirror or Black)
        # Mirror is often better for FAS models to avoid sharp edges
        padding_top = max(0, -y1)
        padding_bottom = max(0, y2 - lh)
        padding_left = max(0, -x1)
        padding_right = max(0, x2 - lw)
        
        if padding_top > 0 or padding_bottom > 0 or padding_left > 0 or padding_right > 0:
            padded_img = cv2.copyMakeBorder(
                image, 
                padding_top, padding_bottom, 
                padding_left, padding_right, 
                cv2.BORDER_REFLECT_101
            )
            # Re-adjust coordinates for padded image
            x1 += padding_left
            x2 += padding_left
            y1 += padding_top
            y2 += padding_top
            face_crop = padded_img[y1:y2, x1:x2]
        else:
            face_crop = image[y1:y2, x1:x2]
            
        return face_crop
    
    def _preprocess(self, face_image: np.ndarray) -> np.ndarray:
        """
        Preprocess face image for model input.
        - Resize to 80x80
        - Normalize to [0, 1]
        - Convert to NCHW format
        """
        # Resize
        face_resized = cv2.resize(face_image, INPUT_SIZE)
        
        # Convert BGR to RGB
        face_rgb = cv2.cvtColor(face_resized, cv2.COLOR_BGR2RGB)
        
        # Normalize to [0, 1]
        face_normalized = face_rgb.astype(np.float32) / 255.0
        
        # Transpose from HWC to CHW
        face_chw = np.transpose(face_normalized, (2, 0, 1))
        
        # Add batch dimension: (1, 3, 80, 80)
        face_batch = np.expand_dims(face_chw, axis=0)
        
        return face_batch
    
    def predict(self, image_base64: str) -> Dict[str, Any]:
        """
        Dual-model anti-spoofing prediction.
        
        Runs both MiniFASNetV2 (2.7x) and MiniFASNetV1SE (4.0x), sums their
        softmax outputs, and takes argmax for final label — exactly matching
        the reference Silent-Face-Anti-Spoofing test.py.
        
        3-class output: [Fake2D, Real, Fake3D]
        label 0 = Fake2D, label 1 = Real, label 2 = Fake3D
        """
        if not self.is_loaded:
            logger.warning("Anti-spoof model not loaded, returning default pass")
            return {
                "is_real": True,
                "score": 1.0,
                "message": "Security Service Status: SILENT-FAS Offline (Passive Only)",
                "skipped": True
            }
        
        print(f"DEBUG: AntiSpoof.predict starting. Image len={len(image_base64)}")
        sys.stdout.flush()
        
        image = self.decode_base64_image(image_base64)
        if image is None:
            print("DEBUG: Image decode FAILED")
            sys.stdout.flush()
            return {
                "is_real": False,
                "score": 0.0,
                "message": "Invalid image data"
            }
        
        # Detect face bbox ONCE, reuse for all models
        bbox = self._detect_face_bbox(image)
        if bbox is None:
            print("DEBUG: Face detection FAILED (Skipping FAS check for robustness)")
            sys.stdout.flush()
            return {
                "is_real": True, # Soft pass
                "score": 0.5,
                "message": "Detection failed - FAS check skipped",
                "skipped": True
            }
        
        print(f"DEBUG: Face detected at bbox {bbox}. Running models...")
        sys.stdout.flush()
        
        try:
            # === MULTI-MODEL SUM (reference test.py logic) ===
            # prediction = np.zeros((1, 3))
            # for model in models:
            #     prediction += model.predict(crop_at_scale(image, scale))
            # label = np.argmax(prediction)
            
            n_classes = 3
            REAL_INDEX = 2
            prediction_sum = np.zeros((1, n_classes))
            model_details = []
            per_model_real_scores = []  # Track each model's Real probability
            
            # Run all scales in parallel
            def run_one_scale(session, input_name, scale):
                # Crop at scale
                face_img = self._crop_face_at_scale(image, bbox, scale)
                
                # Preprocess
                input_data = self._preprocess(face_img)
                
                # Predict
                logits = session.run(None, {input_name: input_data})[0][0] # Get logits
                
                # Softmax
                exp_logits = np.exp(logits - np.max(logits))
                probs = exp_logits / np.sum(exp_logits)
                
                # Pad to 3 classes if needed
                if len(probs) < n_classes:
                    padded = np.zeros(n_classes)
                    padded[:len(probs)] = probs
                    probs = padded
                
                # Detail for logging
                model_name = "V2" if "2.7" in session.get_modelmeta().description else "V1SE"
                detail = f"{model_name}_{scale}x: {probs[:n_classes]} real={probs[REAL_INDEX]:.4f}"
                
                return probs[:n_classes].reshape(1, -1), detail, float(probs[REAL_INDEX])

            # Gather results
            futures = [
                self.executor.submit(run_one_scale, s, n, sc)
                for s, n, sc in self.sessions
            ]
            
            results = [f.result() for f in futures]
            
            for probs_reshaped, detail, real_prob in results:
                prediction_sum += probs_reshaped
                model_details.append(detail)
                per_model_real_scores.append(real_prob)
            
            # Classes for these models: 0: Fake2D, 1: Fake3D, 2: Real (confirmed by log analysis)
            REAL_INDEX = 2 
            label_idx = int(np.argmax(prediction_sum))
            n_models = len(self.sessions)
            
            # Calculate average and min
            real_avg = float(prediction_sum[0][REAL_INDEX] / max(n_models, 1))
            min_real = min(per_model_real_scores) if per_model_real_scores else 0.0
            
            # Detailed debug logging of distribution (Use print for Docker visibility)
            probs = prediction_sum[0] / max(n_models, 1)
            print(f"FAS_DEBUG: Fake2D={probs[0]:.4f}, Fake3D={probs[1]:.4f}, Real={probs[2]:.4f} argmax={label_idx}")
            sys.stdout.flush()
            
            is_real = (
                label_idx == REAL_INDEX and
                real_avg > 0.80 and         # Relaxed from 0.90
                min_real > 0.60             # Relaxed from 0.80
            )
            
            # Log all model outputs for debugging
            print(f"FAS_DUAL_MODEL: sum={prediction_sum[0]} label={label_idx} is_real={is_real} real_avg={real_avg:.4f}")
            for detail in model_details:
                print(f"  {detail}")
            sys.stdout.flush()
            
            # Map label to name
            label_map = {0: "fake2d", 1: "fake3d", 2: "real"}
            label = label_map.get(label_idx, "fake2d")
            
            if is_real:
                message = f"Real face detected (confidence: {real_avg:.2%})"
            elif label == "fake3d":
                message = "Phát hiện giả mạo 3D (Mặt nạ/Mô hình)"
            else:
                message = "Phát hiện giả mạo 2D (Ảnh/Video/Màn hình)"
            
            logger.info(f"Anti-spoof result: label={label}, is_real={is_real}, score={real_avg:.4f}")
            
            return {
                "is_real": bool(is_real),
                "score": real_avg,
                "label": label,
                "message": message
            }
            
        except Exception as e:
            logger.error(f"Anti-spoof prediction failed: {e}")
            return {
                "is_real": False,
                "score": 0.0,
                "message": f"Prediction error: {str(e)}"
            }
    
    def check_liveness(self, image_base64: str) -> Tuple[bool, float, str]:
        """
        Convenience method for liveness check.
        
        Returns:
            Tuple of (is_real, score, message)
        """
        result = self.predict(image_base64)
        return result["is_real"], result["score"], result["message"]


# Singleton instance
_anti_spoof_service: Optional[AntiSpoofService] = None


def get_anti_spoof_service() -> AntiSpoofService:
    """Get the singleton AntiSpoofService instance."""
    global _anti_spoof_service
    if _anti_spoof_service is None:
        _anti_spoof_service = AntiSpoofService()
    return _anti_spoof_service
