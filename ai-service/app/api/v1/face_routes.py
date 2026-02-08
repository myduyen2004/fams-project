# ========================================
# Face Recognition API Routes
# ========================================

from flask import Blueprint, request, jsonify
import logging
from typing import Optional

from app.services.face import get_face_service, get_liveness_service, get_anti_spoof_service, get_face_quality_service, get_face_duplicate_service
from app.models.face_recognition import LivenessProof

logger = logging.getLogger(__name__)

face_bp = Blueprint('face', __name__, url_prefix='/api/face')


@face_bp.route('/detect', methods=['POST'])
def detect_face():
    """
    Detect face in an image and return face encoding.
    
    Request Body:
        {
            "image": "base64-encoded-image"
        }
        
    Response:
        {
            "success": true,
            "face_found": true,
            "face_count": 1,
            "encoding": [...],  # 128-dim face encoding
            "message": "Face detected successfully"
        }
    """
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({
                "success": False,
                "message": "Missing 'image' field in request"
            }), 400
        
        image_base64 = data['image']
        face_service = get_face_service()
        
        encoding, error = face_service.encode_face(image_base64)
        
        if error:
            return jsonify({
                "success": False,
                "face_found": False,
                "message": error
            }), 400
        
        return jsonify({
            "success": True,
            "face_found": True,
            "face_count": 1,
            "encoding": encoding,
            "message": "Face detected successfully"
        })
        
    except Exception as e:
        logger.error(f"Face detection error: {e}")
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500


@face_bp.route('/verify', methods=['POST'])
def verify_face():
    """
    Verify if a captured face matches a reference encoding.
    
    Request Body:
        {
            "captured_image": "base64-encoded-image",
            "reference_encoding": [...],  # 128-dim array
            "tolerance": 0.6  # Optional, default 0.6
        }
        
    Response:
        {
            "success": true,
            "is_match": true,
            "confidence": 0.85,
            "message": "Face verified successfully"
        }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "message": "Missing request body"
            }), 400
        
        captured_image = data.get('captured_image')
        # Support both new (plural) and old (singular) keys
        reference_encodings = data.get('reference_encodings')
        if not reference_encodings:
             reference_encoding = data.get('reference_encoding')
             if reference_encoding:
                 reference_encodings = [reference_encoding]

        tolerance = data.get('tolerance', 0.6)
        
        if not captured_image:
            return jsonify({
                "success": False,
                "message": "Missing 'captured_image' field"
            }), 400
        
        if not reference_encodings:
            return jsonify({
                "success": False,
                "message": "Missing 'reference_encodings' field"
            }), 400
        
        face_service = get_face_service()
        result = face_service.verify_face(captured_image, reference_encodings, tolerance)
        
        return jsonify({
            "success": True,
            "is_match": result.is_match,
            "confidence": result.confidence,
            "message": "Match!" if result.is_match else result.error_message
        })
        
    except Exception as e:
        logger.error(f"Face verification error: {e}")
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500


@face_bp.route('/register', methods=['POST'])
def register_face():
    """
    Register a new face (extract and return encoding).
    
    Request Body:
        {
            "user_id": 123,
            "image": "base64-encoded-image",
            "liveness_proof": {
                "passed_passive": true,
                "passed_blink": true,
                "passed_head_movement": true,
                "timestamp": 1234567890
            }
        }
        
    Response:
        {
            "success": true,
            "user_id": 123,
            "encoding": [...],
            "message": "Face registered successfully"
        }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "message": "Missing request body"
            }), 400
        
        user_id = data.get('user_id')
        image = data.get('image')
        liveness_data = data.get('liveness_proof', {})
        
        if not user_id:
            return jsonify({
                "success": False,
                "message": "Missing 'user_id' field"
            }), 400
        
        if not image:
            return jsonify({
                "success": False,
                "message": "Missing 'image' field"
            }), 400
        
        # Verify liveness proof
        liveness_proof = LivenessProof(
            passed_passive=liveness_data.get('passed_passive', False),
            passed_blink=liveness_data.get('passed_blink', False),
            passed_head_movement=liveness_data.get('passed_head_movement', False),
            passed_smile=liveness_data.get('passed_smile', False),
            timestamp=liveness_data.get('timestamp')
        )
        
        liveness_service = get_liveness_service()
        if not liveness_service.verify_liveness_proof(liveness_proof):
            return jsonify({
                "success": False,
                "message": "Liveness verification failed. Please complete all required checks."
            }), 400
        
        # Face quality check (coverage, landmarks, glasses detection)
        quality_service = get_face_quality_service()
        quality_result = quality_service.check_quality(image)
        
        if not quality_result.get("passed", True):
            logger.warning(f"Face quality check failed for user {user_id}: {quality_result.get('errors')}")
            return jsonify({
                "success": False,
                "quality_errors": quality_result.get("errors", []),
                "message": quality_result.get("message", "Chất lượng ảnh không đạt yêu cầu.")
            }), 400
        
        # Anti-spoofing check (deep learning model)
        anti_spoof_service = get_anti_spoof_service()
        spoof_result = anti_spoof_service.predict(image)
        
        if not spoof_result.get("is_real", True) and not spoof_result.get("skipped", False):
            logger.warning(f"Anti-spoof check failed for user {user_id}: {spoof_result.get('message')}")
            return jsonify({
                "success": False,
                "message": f"Phát hiện ảnh giả mạo. Vui lòng sử dụng khuôn mặt thật. ({spoof_result.get('message', 'Spoofing detected')})"
            }), 400
        
        # Extract face encoding
        face_service = get_face_service()
        encoding, error = face_service.encode_face(image)
        
        if error:
            return jsonify({
                "success": False,
                "message": f"Face registration failed: {error}"
            }), 400
        
        # Note: In production, save encoding to database here
        # For now, just return the encoding for the backend to store
        
        return jsonify({
            "success": True,
            "user_id": user_id,
            "encoding": encoding,
            "liveness_verified": True,
            "anti_spoof_score": spoof_result.get("score", 1.0),
            "message": "Face registered successfully"
        })
        
    except Exception as e:
        logger.error(f"Face registration error: {e}")
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500


@face_bp.route('/liveness/passive', methods=['POST'])
def passive_liveness():
    """
    Perform passive liveness check (texture/quality analysis).
    
    Request Body:
        {
            "image": "base64-encoded-image"
        }
        
    Response:
        {
            "success": true,
            "passed": true,
            "score": 0.85,
            "message": "Passed"
        }
    """
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({
                "success": False,
                "message": "Missing 'image' field"
            }), 400
        
        liveness_service = get_liveness_service()
        result = liveness_service.passive_liveness_check(data['image'])
        
        return jsonify({
            "success": True,
            "passed": result['passed'],
            "score": result['score'],
            "message": result['reason']
        })
        
    except Exception as e:
        logger.error(f"Passive liveness error: {e}")
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500


@face_bp.route('/liveness/blink', methods=['POST'])
def detect_blink():
    """
    Detect if eyes are closed (blink) in the image.
    
    Request Body:
        {
            "image": "base64-encoded-image"
        }
        
    Response:
        {
            "success": true,
            "blink_detected": true,
            "left_eye_ratio": 0.15,
            "right_eye_ratio": 0.18,
            "message": "Blink detected"
        }
    """
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({
                "success": False,
                "message": "Missing 'image' field"
            }), 400
        
        liveness_service = get_liveness_service()
        result = liveness_service.detect_blink(data['image'])
        
        return jsonify({
            "success": True,
            "blink_detected": result.blink_detected,
            "left_eye_ratio": result.left_eye_ratio,
            "right_eye_ratio": result.right_eye_ratio,
            "message": result.message
        })
        
    except Exception as e:
        logger.error(f"Blink detection error: {e}")
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500


@face_bp.route('/liveness/head-pose', methods=['POST'])
def head_pose():
    """
    Estimate head pose (yaw, pitch, roll).
    
    Request Body:
        {
            "image": "base64-encoded-image"
        }
        
    Response:
        {
            "success": true,
            "yaw": 25.5,
            "pitch": 5.2,
            "roll": -2.1,
            "turned_left": true,
            "turned_right": false
        }
    """
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({
                "success": False,
                "message": "Missing 'image' field"
            }), 400
        
        liveness_service = get_liveness_service()
        result = liveness_service.estimate_head_pose(data['image'])
        
        return jsonify({
            "success": True,
            "yaw": result.yaw,
            "pitch": result.pitch,
            "roll": result.roll,
            "turned_left": bool(result.yaw > 15),
            "turned_right": bool(result.yaw < -15)
        })
        
    except Exception as e:
        logger.error(f"Head pose error: {e}")
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500


@face_bp.route('/status/<int:user_id>', methods=['GET'])
def face_status(user_id: int):
    """
    Check if a user has registered face data.
    
    Note: This endpoint requires backend integration to check database.
    For now, returns a placeholder response.
    
    Response:
        {
            "user_id": 123,
            "has_face_data": true,
            "registered_at": "2024-01-15T10:30:00Z"
        }
    """
    # In production, query database for face encoding
    # This is a placeholder
    return jsonify({
        "user_id": user_id,
        "has_face_data": False,
        "message": "Face status check - requires database integration"
    })


@face_bp.route('/anti-spoof', methods=['POST'])
def anti_spoof_check():
    """
    Check if face image is real or fake (photo/video/mask attack).
    
    Request Body:
        {
            "image": "base64-encoded-image"
        }
        
    Response:
        {
            "success": true,
            "is_real": true,
            "score": 0.95,
            "message": "Real face detected (confidence: 95%)"
        }
    """
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({
                "success": False,
                "message": "Missing 'image' field"
            }), 400
        
        anti_spoof_service = get_anti_spoof_service()
        result = anti_spoof_service.predict(data['image'])
        
        return jsonify({
            "success": True,
            "is_real": result.get("is_real", False),
            "score": result.get("score", 0.0),
            "message": result.get("message", ""),
            "skipped": result.get("skipped", False)
        })
        
    except Exception as e:
        logger.error(f"Anti-spoof check error: {e}")
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500


@face_bp.route('/quality-check', methods=['POST'])
def quality_check():
    """
    Check face image quality before registration.
    
    Request Body:
        {
            "image": "base64-encoded-image"
        }
        
    Response:
        {
            "success": true,
            "passed": true,
            "warnings": ["glasses_detected"],
            "errors": [],
            "details": {"face_coverage": 0.35, ...},
            "message": "Cảnh báo: đang đeo kính. Có thể ảnh hưởng độ chính xác."
        }
    """
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({
                "success": False,
                "message": "Missing 'image' field"
            }), 400
        
        quality_service = get_face_quality_service()
        result = quality_service.check_quality(data['image'])
        
        return jsonify({
            "success": True,
            "passed": result.get("passed", False),
            "warnings": result.get("warnings", []),
            "errors": result.get("errors", []),
            "details": result.get("details", {}),
            "message": result.get("message", "")
        })
        
    except Exception as e:
        logger.error(f"Quality check error: {e}")
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500


@face_bp.route('/check-duplicate', methods=['POST'])
def check_duplicate():
    """
    Check if a face encoding matches any existing user in the database.
    This prevents one person from registering under multiple accounts.
    
    Request Body:
        {
            "encoding": [...],  # 128-dim face encoding
            "existing_encodings": [  # All encodings from DB
                {"user_id": 1, "encoding_data": [...]},
                ...
            ],
            "exclude_user_id": 123  # Optional, for update scenarios
        }
        
    Response:
        {
            "success": true,
            "is_duplicate": true,
            "matched_user_id": 456,
            "similarity_score": 0.85,
            "message": "Khuôn mặt này đã được đăng ký bởi người dùng khác"
        }
    """
    try:
        data = request.get_json()
        if not data or 'encoding' not in data:
            return jsonify({
                "success": False,
                "message": "Missing 'encoding' field"
            }), 400
        
        if 'existing_encodings' not in data:
            return jsonify({
                "success": False,
                "message": "Missing 'existing_encodings' field"
            }), 400
        
        duplicate_service = get_face_duplicate_service()
        result = duplicate_service.check_duplicate(
            new_encoding=data['encoding'],
            existing_encodings=data['existing_encodings'],
            exclude_user_id=data.get('exclude_user_id')
        )
        
        return jsonify({
            "success": True,
            "is_duplicate": result.get("is_duplicate", False),
            "matched_user_id": result.get("matched_user_id"),
            "similarity_score": result.get("similarity_score", 0.0),
            "message": result.get("message", "")
        })
        
    except Exception as e:
        logger.error(f"Duplicate check error: {e}")
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500
