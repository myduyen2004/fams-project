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

try:
    import onnxruntime as ort
    ONNX_AVAILABLE = True
except ImportError:
    ONNX_AVAILABLE = False
    ort = None

logger = logging.getLogger(__name__)

# Model configuration
MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'models', 'anti_spoof')
MODEL_PATH = os.path.join(MODEL_DIR, 'MiniFASNetV2.onnx')

# Input size expected by the model
INPUT_SIZE = (80, 80)


class AntiSpoofService:
    """
    Service for face anti-spoofing detection.
    Uses MiniFASNetV2 model to detect if face is real or fake (photo/video/mask).
    """
    
    # Threshold for real face classification
    # Score > threshold = Real face
    REAL_THRESHOLD = 0.5
    
    def __init__(self):
        """Initialize the anti-spoofing service."""
        self.session = None
        self.is_loaded = False
        
        if not ONNX_AVAILABLE:
            logger.warning("ONNX Runtime not available. Anti-spoofing will be disabled.")
            return
        
        self._load_model()
    
    def _load_model(self):
        """Load the ONNX model."""
        if not os.path.exists(MODEL_PATH):
            logger.warning(f"Anti-spoof model not found at {MODEL_PATH}. Please download the model.")
            logger.info("Download from: https://github.com/yakhyo/face-anti-spoofing")
            return
        
        try:
            # Use CPU provider for compatibility
            providers = ['CPUExecutionProvider']
            self.session = ort.InferenceSession(MODEL_PATH, providers=providers)
            self.input_name = self.session.get_inputs()[0].name
            self.is_loaded = True
            logger.info(f"Anti-spoof model loaded successfully from {MODEL_PATH}")
        except Exception as e:
            logger.error(f"Failed to load anti-spoof model: {e}")
            self.is_loaded = False
    
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
    
    def _detect_and_crop_face(self, image: np.ndarray) -> Optional[np.ndarray]:
        """
        Detect face and crop to bounding box.
        Uses OpenCV's Haar Cascade for face detection.
        """
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Load Haar Cascade
            face_cascade = cv2.CascadeClassifier(
                cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            )
            
            faces = face_cascade.detectMultiScale(
                gray, 
                scaleFactor=1.1, 
                minNeighbors=5, 
                minSize=(80, 80)
            )
            
            if len(faces) == 0:
                logger.warning("No face detected for anti-spoof check")
                return None
            
            # Get the largest face
            x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
            
            # Add margin
            margin = int(min(w, h) * 0.2)
            x1 = max(0, x - margin)
            y1 = max(0, y - margin)
            x2 = min(image.shape[1], x + w + margin)
            y2 = min(image.shape[0], y + h + margin)
            
            face_crop = image[y1:y2, x1:x2]
            
            return face_crop
            
        except Exception as e:
            logger.error(f"Face detection failed: {e}")
            return None
    
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
        Predict if face is real or fake.
        
        Args:
            image_base64: Base64-encoded image
            
        Returns:
            Dict with:
                - is_real: Boolean indicating if face is real
                - score: Confidence score (0.0 - 1.0, higher = more likely real)
                - message: Description of result
        """
        # Check if model is loaded
        if not self.is_loaded:
            logger.warning("Anti-spoof model not loaded, returning default pass")
            return {
                "is_real": True,
                "score": 1.0,
                "message": "Anti-spoof check skipped (model not loaded)",
                "skipped": True
            }
        
        # Decode image
        image = self.decode_base64_image(image_base64)
        if image is None:
            return {
                "is_real": False,
                "score": 0.0,
                "message": "Invalid image data"
            }
        
        # Detect and crop face
        face_crop = self._detect_and_crop_face(image)
        if face_crop is None:
            return {
                "is_real": False,
                "score": 0.0,
                "message": "No face detected for anti-spoof check"
            }
        
        try:
            # Preprocess
            input_tensor = self._preprocess(face_crop)
            
            # Run inference
            outputs = self.session.run(None, {self.input_name: input_tensor})
            
            # Parse output
            # Model outputs classification logits [fake, real]
            logits = outputs[0][0]
            
            # Apply softmax
            exp_logits = np.exp(logits - np.max(logits))
            probs = exp_logits / np.sum(exp_logits)
            
            # Score for "real" class (index 1)
            real_score = float(probs[1]) if len(probs) > 1 else float(probs[0])
            
            is_real = real_score > self.REAL_THRESHOLD
            
            if is_real:
                message = f"Real face detected (confidence: {real_score:.2%})"
            else:
                message = f"Possible spoofing attack detected (confidence: {(1-real_score):.2%})"
            
            logger.info(f"Anti-spoof result: is_real={is_real}, score={real_score:.4f}")
            
            return {
                "is_real": is_real,
                "score": real_score,
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
