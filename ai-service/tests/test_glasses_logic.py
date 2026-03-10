import sys
import os
import json
import pytest
from unittest.mock import MagicMock, patch

# Add app directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app
from app.services.face.face_service import FaceVerificationResult

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_verify_glasses_smart_tolerance(client):
    """
    Test that verify_face endpoint applies smart tolerance when glasses are detected.
    """
    # 1. Mock the liveness check to return has_glasses=True and not a spoof
    mock_debug_data = {
        "has_glasses": True,
        "geo_score": 0.9,
        "fas_real": True,
        "fas_score": 0.95,
        "fft_peak": 1.0,
        "laplacian": 100.0,
        "is_replay": False,
        "replay_score": 0.1,
        "decision": "PASS"
    }
    
    # 2. Mock face_service.verify_face
    # First call (original tolerance) returns is_match=False
    # Second call (lenient tolerance) returns is_match=True
    mock_face_service = MagicMock()
    
    def side_effect(captured_image, reference_encodings, tolerance):
        if tolerance < 0.40: # Assume original is 0.35
            return FaceVerificationResult(success=True, is_match=False, confidence=0.58, error_message="Face does not match")
        else:
            return FaceVerificationResult(success=True, is_match=True, confidence=0.72)

    mock_face_service.verify_face.side_effect = side_effect

    with patch('app.api.v1.face_routes._perform_unified_liveness_check', return_value=(False, "Passed", mock_debug_data)), \
         patch('app.api.v1.face_routes.get_face_service', return_value=mock_face_service):
        
        response = client.post('/api/face/verify', 
                               data=json.dumps({
                                   "captured_image": "base64_data",
                                   "reference_encodings": [[0.1]*128],
                                   "tolerance": 0.35
                               }),
                               content_type='application/json')
        
        data = json.loads(response.data)
        
        assert response.status_code == 200
        assert data['is_match'] is True
        assert "Glasses similarity boost applied" in data['message']
        assert mock_face_service.verify_face.call_count == 2

def test_verify_glasses_still_no_match(client):
    """
    Test that verify_face endpoint returns specific message when glasses detected but still no match.
    """
    mock_debug_data = {"has_glasses": True, "decision": "PASS"}
    
    mock_face_service = MagicMock()
    # Both calls return False
    mock_face_service.verify_face.return_value = FaceVerificationResult(success=True, is_match=False, confidence=0.2, error_message="Face does not match")

    with patch('app.api.v1.face_routes._perform_unified_liveness_check', return_value=(False, "Passed", mock_debug_data)), \
         patch('app.api.v1.face_routes.get_face_service', return_value=mock_face_service):
        
        response = client.post('/api/face/verify', 
                               data=json.dumps({
                                   "captured_image": "base64_data",
                                   "reference_encodings": [[0.1]*128],
                                   "tolerance": 0.35
                               }),
                               content_type='application/json')
        
        data = json.loads(response.data)
        
        assert data['is_match'] is False
        assert "tháo kính" in data['message']
        assert mock_face_service.verify_face.call_count == 2
