
import pytest
import sys
import os
from unittest.mock import MagicMock

# Robust path handling
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, '../../'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from app.services.face.geometry_liveness_service import GeometryLivenessService

class TestGeometryLivenessVeto:
    def setup_method(self):
        self.service = GeometryLivenessService()
        # Mock the FaceMesh process to return a valid landmark list
        self.service.face_mesh = MagicMock()
        
    def _create_mock_landmarks(self, nose_ratio, face_width=0.6):
        """Helper to create mock landmarks that yield a specific nose_ratio"""
        # nose_ratio = (avg_base_z - nose_tip.z) / face_width
        # Let avg_base_z = 0.3
        # nose_tip.z = 0.3 - (nose_ratio * face_width)
        
        avg_base_z = 0.3
        nose_z = avg_base_z - (nose_ratio * face_width)
        
        mock_landmark = MagicMock()
        mock_landmark.x = 0.5
        mock_landmark.y = 0.5
        mock_landmark.z = 0.0 # Default
        
        landmarks = [MagicMock() for _ in range(468)]
        for lm in landmarks:
            lm.x = 0.5
            lm.y = 0.5
            lm.z = avg_base_z
            
        landmarks[1].z = nose_z # Nose tip
        landmarks[234].x = 0.2  # Left ear
        landmarks[234].z = avg_base_z
        landmarks[454].x = 0.8  # Right ear (width = 0.6)
        landmarks[454].z = avg_base_z
        
        # Eyes for consistency check: is_consistent = eye_ratio > (nose_ratio * 0.1)
        # Let's make it consistent
        eye_z = avg_base_z - (nose_ratio * 0.2 * face_width)
        landmarks[33].z = landmarks[263].z = eye_z
        landmarks[70].z = landmarks[300].z = avg_base_z
        
        return landmarks

    def test_registration_lenience(self):
        """Verify that 0.72 nose ratio passes (is not vetoed to 0.0) in registration"""
        mock_results = MagicMock()
        mock_results.multi_face_landmarks = [MagicMock(landmark=self._create_mock_landmarks(0.72))]
        self.service.face_mesh.process.return_value = mock_results
        
        # We need to mock _decode_image because we pass a dummy string
        self.service._decode_image = MagicMock(return_value=import_cv2_image())
        
        result = self.service.analyze_3d_geometry("dummy_base64", mode="registration")
        
        # Should NOT be vetoed to 0.0 or 0.01 in the sense of being "is_3d=False"
        # Wait, the logic says if nose_ratio > 0.85, then is_3d=False.
        # So 0.72 should have is_3d=True.
        assert result['is_3d'] is True
        assert result['score'] > 0.5
        assert result['details']['nose_protrusion'] == pytest.approx(0.72, abs=0.01)

    def test_registration_veto_extreme(self):
        """Verify that extreme (>0.85) nose ratio is vetoed even in registration"""
        mock_results = MagicMock()
        mock_results.multi_face_landmarks = [MagicMock(landmark=self._create_mock_landmarks(0.90))]
        self.service.face_mesh.process.return_value = mock_results
        self.service._decode_image = MagicMock(return_value=import_cv2_image())
        
        result = self.service.analyze_3d_geometry("dummy_base64", mode="registration")
        
        assert result['is_3d'] is False
        assert result['score'] == pytest.approx(0.01 / 1.2, abs=0.001) # score = score / 1.2 normalization

    def test_attendance_strictness(self):
        """Verify that 0.72 nose ratio IS vetoed in attendance mode (threshold 0.50)"""
        mock_results = MagicMock()
        mock_results.multi_face_landmarks = [MagicMock(landmark=self._create_mock_landmarks(0.72))]
        self.service.face_mesh.process.return_value = mock_results
        self.service._decode_image = MagicMock(return_value=import_cv2_image())
        
        result = self.service.analyze_3d_geometry("dummy_base64", mode="attendance")
        
        assert result['is_3d'] is False
        assert result['score'] == pytest.approx(0.01 / 1.2, abs=0.001)

def import_cv2_image():
    import numpy as np
    return np.zeros((100, 100, 3), dtype=np.uint8)
