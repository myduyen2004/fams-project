# ========================================
# Unit Tests for Face Recognition Service
# ========================================

import pytest
import numpy as np
import base64
from io import BytesIO
from PIL import Image
from unittest.mock import patch, MagicMock

import sys
import os

# Add app to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from app.models.face_recognition import (
    LivenessProof,
    FaceVerificationResult,
    FaceDetectionResult
)


class TestLivenessProof:
    """Tests for LivenessProof model"""
    
    def test_is_valid_with_passive_and_blink(self):
        """Valid when passive + blink are passed"""
        proof = LivenessProof(
            passed_passive=True,
            passed_blink=True,
            passed_head_movement=False
        )
        assert proof.is_valid is True
    
    def test_is_valid_with_passive_and_head_movement(self):
        """Valid when passive + head movement are passed"""
        proof = LivenessProof(
            passed_passive=True,
            passed_blink=False,
            passed_head_movement=True
        )
        assert proof.is_valid is True
    
    def test_is_invalid_without_passive(self):
        """Invalid when passive is not passed"""
        proof = LivenessProof(
            passed_passive=False,
            passed_blink=True,
            passed_head_movement=True
        )
        assert proof.is_valid is False
    
    def test_is_invalid_without_active_checks(self):
        """Invalid when no active check is passed"""
        proof = LivenessProof(
            passed_passive=True,
            passed_blink=False,
            passed_head_movement=False
        )
        assert proof.is_valid is False


class TestFaceVerificationResult:
    """Tests for FaceVerificationResult model"""
    
    def test_success_factory(self):
        """Test success factory method"""
        result = FaceVerificationResult.success(confidence=0.85)
        assert result.is_match is True
        assert result.confidence == 0.85
        assert result.error_message is None
    
    def test_failure_factory(self):
        """Test failure factory method"""
        result = FaceVerificationResult.failure("No face detected")
        assert result.is_match is False
        assert result.confidence == 0.0
        assert result.error_message == "No face detected"


class TestFaceDetectionResult:
    """Tests for FaceDetectionResult model"""
    
    def test_no_face_found(self):
        """Test when no face is found"""
        result = FaceDetectionResult(
            face_found=False,
            face_count=0,
            error_message="No face detected"
        )
        assert result.face_found is False
        assert result.face_count == 0
    
    def test_face_found_with_encoding(self):
        """Test when face is found with encoding"""
        encoding = [0.1] * 128  # Simplified encoding
        result = FaceDetectionResult(
            face_found=True,
            face_count=1,
            face_encoding=encoding
        )
        assert result.face_found is True
        assert result.face_count == 1
        assert len(result.face_encoding) == 128


# Helper function to create test image
def create_test_image_base64(width=100, height=100, color=(255, 0, 0)):
    """Create a simple test image as base64"""
    img = Image.new('RGB', (width, height), color=color)
    buffer = BytesIO()
    img.save(buffer, format='JPEG')
    return base64.b64encode(buffer.getvalue()).decode('utf-8')


class TestFaceRecognitionServiceMocked:
    """Tests for FaceRecognitionService with mocked dependencies"""
    
    @patch('face_recognition.face_locations')
    @patch('face_recognition.face_encodings')
    def test_detect_face_success(self, mock_encodings, mock_locations):
        """Test successful face detection"""
        from app.services.face import FaceRecognitionService
        
        # Mock face detection
        mock_locations.return_value = [(10, 100, 100, 10)]  # (top, right, bottom, left)
        mock_encodings.return_value = [np.array([0.1] * 128)]
        
        service = FaceRecognitionService()
        
        # Create a simple test image
        img = np.zeros((100, 100, 3), dtype=np.uint8)
        result = service.detect_face(img)
        
        assert result.face_found is True
        assert result.face_count == 1
        assert result.face_encoding is not None
        assert len(result.face_encoding) == 128
    
    @patch('face_recognition.face_locations')
    def test_detect_face_no_face(self, mock_locations):
        """Test when no face is detected"""
        from app.services.face import FaceRecognitionService
        
        mock_locations.return_value = []
        
        service = FaceRecognitionService()
        img = np.zeros((100, 100, 3), dtype=np.uint8)
        result = service.detect_face(img)
        
        assert result.face_found is False
        assert "No face detected" in result.error_message
    
    @patch('face_recognition.face_locations')
    def test_detect_face_multiple_faces(self, mock_locations):
        """Test when multiple faces are detected"""
        from app.services.face import FaceRecognitionService
        
        mock_locations.return_value = [
            (10, 100, 100, 10),
            (10, 200, 100, 110)
        ]
        
        service = FaceRecognitionService()
        img = np.zeros((100, 200, 3), dtype=np.uint8)
        result = service.detect_face(img)
        
        assert result.face_found is True
        assert result.face_count == 2
        assert "Multiple faces" in result.error_message
    
    @patch('face_recognition.face_distance')
    def test_compare_encodings_match(self, mock_distance):
        """Test encoding comparison when faces match"""
        from app.services.face import FaceRecognitionService
        
        mock_distance.return_value = np.array([0.3])  # Distance < 0.6 = match
        
        service = FaceRecognitionService()
        encoding1 = [0.1] * 128
        encoding2 = [0.1] * 128
        
        is_match, confidence = service.compare_encodings(encoding1, encoding2)
        
        assert is_match is True
        assert confidence == 0.7  # 1 - 0.3
    
    @patch('face_recognition.face_distance')
    def test_compare_encodings_no_match(self, mock_distance):
        """Test encoding comparison when faces don't match"""
        from app.services.face import FaceRecognitionService
        
        mock_distance.return_value = np.array([0.8])  # Distance > 0.6 = no match
        
        service = FaceRecognitionService()
        encoding1 = [0.1] * 128
        encoding2 = [0.5] * 128
        
        is_match, confidence = service.compare_encodings(encoding1, encoding2)
        
        assert is_match is False
        assert confidence == 0.2  # 1 - 0.8


class TestLivenessDetectionServiceMocked:
    """Tests for LivenessDetectionService with mocked dependencies"""
    
    def test_passive_liveness_check_valid_image(self):
        """Test passive liveness with a valid image"""
        from app.services.face import LivenessDetectionService
        
        # Create a textured image (not a flat color)
        img = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        
        # Convert to base64
        pil_img = Image.fromarray(img)
        buffer = BytesIO()
        pil_img.save(buffer, format='JPEG')
        base64_img = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        service = LivenessDetectionService()
        result = service.passive_liveness_check(base64_img)
        
        assert 'passed' in result
        assert 'score' in result
        
        service.cleanup()
    
    def test_verify_liveness_proof_valid(self):
        """Test liveness proof verification with valid proof"""
        from app.services.face import LivenessDetectionService
        
        proof = LivenessProof(
            passed_passive=True,
            passed_blink=True,
            passed_head_movement=False
        )
        
        service = LivenessDetectionService()
        assert service.verify_liveness_proof(proof) is True
        service.cleanup()
    
    def test_verify_liveness_proof_invalid(self):
        """Test liveness proof verification with invalid proof"""
        from app.services.face import LivenessDetectionService
        
        proof = LivenessProof(
            passed_passive=False,
            passed_blink=True,
            passed_head_movement=True
        )
        
        service = LivenessDetectionService()
        assert service.verify_liveness_proof(proof) is False
        service.cleanup()


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
