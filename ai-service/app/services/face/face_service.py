# ========================================
# Face Recognition Service
# ========================================
# Uses face_recognition library (dlib-based) for face encoding and matching

import face_recognition
import numpy as np
from typing import Optional, List, Tuple
from io import BytesIO
from PIL import Image
import base64
import logging

from app.models.face_recognition import (
    FaceVerificationResult,
    FaceRegistrationResult,
    FaceDetectionResult
)

logger = logging.getLogger(__name__)


class FaceRecognitionService:
    """
    Service for face recognition operations.
    Uses face_recognition library (dlib) for encoding and matching.
    """
    
    # Default matching threshold (lower = stricter)
    DEFAULT_TOLERANCE = 0.6
    
    def __init__(self, tolerance: float = DEFAULT_TOLERANCE):
        """
        Initialize the face recognition service.
        
        Args:
            tolerance: Maximum distance for face matching (0.0 - 1.0)
                      Lower values = stricter matching
        """
        self.tolerance = tolerance
        logger.info(f"FaceRecognitionService initialized with tolerance={tolerance}")
    
    def decode_base64_image(self, base64_string: str) -> Optional[np.ndarray]:
        """
        Decode a base64-encoded image to numpy array.
        
        Args:
            base64_string: Base64-encoded image string (with or without data URL prefix)
            
        Returns:
            numpy array of the image or None if failed
        """
        try:
            logger.info(f"Decoding base64 image, length: {len(base64_string)}")
            # Remove data URL prefix if present
            if ',' in base64_string:
                base64_string = base64_string.split(',')[1]
                logger.info("Removed data URL prefix")
            
            image_bytes = base64.b64decode(base64_string)
            logger.info(f"Decoded to {len(image_bytes)} bytes")
            
            image = Image.open(BytesIO(image_bytes))
            logger.info(f"Opened image: mode={image.mode}, size={image.size}")
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
                logger.info("Converted to RGB")
            
            return np.array(image)
        except Exception as e:
            logger.error(f"Failed to decode base64 image: {e}")
            return None
    
    def detect_face(self, image: np.ndarray) -> FaceDetectionResult:
        """
        Detect face(s) in an image.
        
        Args:
            image: numpy array of the image (RGB)
            
        Returns:
            FaceDetectionResult with face location and encoding
        """
        try:
            logger.info(f"Detecting face in image shape: {image.shape}")
            # Find all face locations in the image
            face_locations = face_recognition.face_locations(image, model='hog')
            logger.info(f"Face locations found: {len(face_locations)}")
            
            if not face_locations:
                logger.warning("No face detected in image")
                return FaceDetectionResult(
                    face_found=False,
                    face_count=0,
                    error_message="No face detected in image"
                )
            
            if len(face_locations) > 1:
                return FaceDetectionResult(
                    face_found=True,
                    face_count=len(face_locations),
                    error_message="Multiple faces detected. Please ensure only one face is visible."
                )
            
            # Get face encoding for the single face
            face_encodings = face_recognition.face_encodings(image, face_locations)
            
            if not face_encodings:
                return FaceDetectionResult(
                    face_found=True,
                    face_count=1,
                    face_location=face_locations[0],
                    error_message="Could not generate face encoding"
                )
            
            return FaceDetectionResult(
                face_found=True,
                face_count=1,
                face_location=face_locations[0],
                face_encoding=face_encodings[0].tolist()
            )
            
        except Exception as e:
            logger.error(f"Face detection failed: {e}")
            return FaceDetectionResult(
                face_found=False,
                error_message=f"Face detection error: {str(e)}"
            )
    
    def encode_face(self, image_base64: str) -> Tuple[Optional[List[float]], Optional[str]]:
        """
        Extract face encoding from a base64 image.
        
        Args:
            image_base64: Base64-encoded image
            
        Returns:
            Tuple of (encoding list, error message)
        """
        image = self.decode_base64_image(image_base64)
        if image is None:
            return None, "Invalid image data"
        
        result = self.detect_face(image)
        
        if not result.face_found:
            return None, result.error_message
        
        if result.face_encoding is None:
            return None, result.error_message or "Could not extract face encoding"
        
        return result.face_encoding, None
    
    def verify_face(
        self,
        captured_image_base64: str,
        reference_encodings: List[List[float]], # Changed to List of Lists
        tolerance: float = None
    ) -> FaceVerificationResult:
        """
        Verify if a captured face matches ANY of the reference encodings.
        
        Args:
            captured_image_base64: Base64-encoded image of the face to verify
            reference_encodings: List of pre-computed encodings (1:N matching for same user)
            tolerance: Optional custom tolerance (default: self.tolerance)
            
        Returns:
            FaceVerificationResult with best match status and confidence
        """
        tolerance = tolerance or self.tolerance
        
        # Decode and detect face in captured image
        image = self.decode_base64_image(captured_image_base64)
        if image is None:
            return FaceVerificationResult.failure("Invalid captured image")
        
        detection = self.detect_face(image)
        if not detection.face_found:
            return FaceVerificationResult.failure(detection.error_message)
        
        if detection.face_encoding is None:
            return FaceVerificationResult.failure("Could not extract face from captured image")
        
        # Compare faces
        try:
            captured_encoding = np.array(detection.face_encoding)
            
            # Handle both single List (legacy) and List of Lists (new)
            # If reference_encodings is simple list [0.1, 0.2...], wrap it in list
            if isinstance(reference_encodings[0], (float, int)):
                 reference_encodings = [reference_encodings]

            reference_encodings_np = [np.array(e) for e in reference_encodings]
            
            # Calculate face distances using vectorized operation (compare 1 vs N)
            face_distances = face_recognition.face_distance(
                reference_encodings_np,
                captured_encoding
            )
            
            # Find the best match (minimum distance)
            best_match_index = np.argmin(face_distances)
            min_distance = face_distances[best_match_index]
            
            # Convert distance to confidence (higher = better match)
            confidence = max(0.0, 1.0 - min_distance)
            
            is_match = min_distance <= tolerance
            
            logger.info(f"Verified against {len(reference_encodings)} angles. Best dist: {min_distance:.3f}, Conf: {confidence:.3f}")

            if is_match:
                return FaceVerificationResult.success(
                    confidence=confidence,
                    encoding=detection.face_encoding
                )
            else:
                return FaceVerificationResult.failure(
                    f"Face does not match (Best confidence: {confidence:.2f})"
                )
                
        except Exception as e:
            logger.error(f"Face verification failed: {e}")
            return FaceVerificationResult.failure(f"Verification error: {str(e)}")
    
    def compare_encodings(
        self,
        encoding1: List[float],
        encoding2: List[float],
        tolerance: float = None
    ) -> Tuple[bool, float]:
        """
        Compare two face encodings directly.
        
        Args:
            encoding1: First face encoding
            encoding2: Second face encoding
            tolerance: Optional custom tolerance
            
        Returns:
            Tuple of (is_match, confidence)
        """
        tolerance = tolerance or self.tolerance
        
        try:
            enc1 = np.array(encoding1)
            enc2 = np.array(encoding2)
            
            face_distance = face_recognition.face_distance([enc1], enc2)[0]
            confidence = max(0.0, 1.0 - face_distance)
            is_match = face_distance <= tolerance
            
            return is_match, confidence
            
        except Exception as e:
            logger.error(f"Encoding comparison failed: {e}")
            return False, 0.0


# Singleton instance
_face_service: Optional[FaceRecognitionService] = None


def get_face_service() -> FaceRecognitionService:
    """Get the singleton FaceRecognitionService instance."""
    global _face_service
    if _face_service is None:
        _face_service = FaceRecognitionService()
    return _face_service
