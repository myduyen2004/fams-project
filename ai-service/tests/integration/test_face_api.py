# ========================================
# Integration Tests for Face API
# ========================================

import pytest
import json
import base64
from io import BytesIO
from PIL import Image

import sys
import os

# Add app to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from app.main import app


@pytest.fixture
def client():
    """Create a test client for the Flask app"""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


def create_test_image_base64(width=200, height=200, color=(255, 200, 150)):
    """Create a simple test image as base64"""
    img = Image.new('RGB', (width, height), color=color)
    buffer = BytesIO()
    img.save(buffer, format='JPEG')
    return base64.b64encode(buffer.getvalue()).decode('utf-8')


class TestHealthEndpoint:
    """Tests for health check endpoint"""
    
    def test_health_check(self, client):
        """Test health endpoint returns correct data"""
        response = client.get('/health')
        data = json.loads(response.data)
        
        assert response.status_code == 200
        assert data['status'] == 'healthy'
        assert data['service'] == 'FAMS AI Service'
        assert data['features']['face_recognition'] is True
        assert data['features']['liveness_detection'] is True


class TestFaceDetectEndpoint:
    """Tests for face detection endpoint"""
    
    def test_detect_missing_image(self, client):
        """Test detect endpoint with missing image"""
        response = client.post(
            '/api/face/detect',
            data=json.dumps({}),
            content_type='application/json'
        )
        data = json.loads(response.data)
        
        assert response.status_code == 400
        assert data['success'] is False
        assert 'image' in data['message'].lower()
    
    def test_detect_with_image_no_face(self, client):
        """Test detect endpoint with image but no face"""
        image_b64 = create_test_image_base64()
        
        response = client.post(
            '/api/face/detect',
            data=json.dumps({'image': image_b64}),
            content_type='application/json'
        )
        data = json.loads(response.data)
        
        # Should return 400 because no face in plain color image
        assert response.status_code == 400
        assert data['success'] is False


class TestFaceVerifyEndpoint:
    """Tests for face verification endpoint"""
    
    def test_verify_missing_fields(self, client):
        """Test verify endpoint with missing fields"""
        response = client.post(
            '/api/face/verify',
            data=json.dumps({'captured_image': 'test'}),
            content_type='application/json'
        )
        data = json.loads(response.data)
        
        assert response.status_code == 400
        assert data['success'] is False
        assert 'reference_encoding' in data['message'].lower()


class TestFaceRegisterEndpoint:
    """Tests for face registration endpoint"""
    
    def test_register_missing_user_id(self, client):
        """Test register endpoint with missing user_id"""
        response = client.post(
            '/api/face/register',
            data=json.dumps({'image': 'test'}),
            content_type='application/json'
        )
        data = json.loads(response.data)
        
        assert response.status_code == 400
        assert data['success'] is False
        assert 'user_id' in data['message'].lower()
    
    def test_register_missing_liveness_proof(self, client):
        """Test register endpoint fails without valid liveness proof"""
        image_b64 = create_test_image_base64()
        
        response = client.post(
            '/api/face/register',
            data=json.dumps({
                'user_id': 123,
                'image': image_b64,
                'liveness_proof': {}  # Empty liveness proof
            }),
            content_type='application/json'
        )
        data = json.loads(response.data)
        
        assert response.status_code == 400
        assert data['success'] is False
        assert 'liveness' in data['message'].lower()


class TestLivenessEndpoints:
    """Tests for liveness detection endpoints"""
    
    def test_passive_liveness_missing_image(self, client):
        """Test passive liveness with missing image"""
        response = client.post(
            '/api/face/liveness/passive',
            data=json.dumps({}),
            content_type='application/json'
        )
        data = json.loads(response.data)
        
        assert response.status_code == 400
        assert data['success'] is False
    
    def test_passive_liveness_with_image(self, client):
        """Test passive liveness with valid image"""
        image_b64 = create_test_image_base64()
        
        response = client.post(
            '/api/face/liveness/passive',
            data=json.dumps({'image': image_b64}),
            content_type='application/json'
        )
        data = json.loads(response.data)
        
        assert response.status_code == 200
        assert data['success'] is True
        assert 'score' in data
    
    def test_blink_detection_with_image(self, client):
        """Test blink detection endpoint"""
        image_b64 = create_test_image_base64()
        
        response = client.post(
            '/api/face/liveness/blink',
            data=json.dumps({'image': image_b64}),
            content_type='application/json'
        )
        data = json.loads(response.data)
        
        # Should succeed even if no face found (just returns False)
        assert response.status_code == 200
        assert data['success'] is True
    
    def test_head_pose_with_image(self, client):
        """Test head pose endpoint"""
        image_b64 = create_test_image_base64()
        
        response = client.post(
            '/api/face/liveness/head-pose',
            data=json.dumps({'image': image_b64}),
            content_type='application/json'
        )
        data = json.loads(response.data)
        
        assert response.status_code == 200
        assert data['success'] is True
        assert 'yaw' in data


class TestFaceStatusEndpoint:
    """Tests for face status endpoint"""
    
    def test_face_status(self, client):
        """Test face status endpoint"""
        response = client.get('/api/face/status/123')
        data = json.loads(response.data)
        
        assert response.status_code == 200
        assert data['user_id'] == 123


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
