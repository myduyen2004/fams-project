# ========================================
# Face Recognition API Routes
# ========================================

from flask import Blueprint, request, jsonify
import logging
import sys
from typing import Optional, Dict, Any, Tuple

from app.services.face import get_face_service, get_liveness_service, get_anti_spoof_service, get_face_quality_service, get_face_duplicate_service, get_geometry_service
from app.services.face.replay_detection_service import get_replay_detection_service
from app.services.face.decision_engine import get_decision_engine
from app.services.face.motion_consistency_service import get_motion_service, clear_motion_service
from app.models.face_recognition import LivenessProof
from concurrent.futures import ThreadPoolExecutor
import time

logger = logging.getLogger(__name__)

face_bp = Blueprint('face', __name__, url_prefix='/api/face')

# Thread pool for parallel liveness processing
executor = ThreadPoolExecutor(max_workers=10)

def _perform_unified_liveness_check(image_base64: str, mode: str = "attendance") -> Tuple[bool, str, Dict[str, Any]]:
    """
    Multi-Signal Anti-Spoofing with Tiered Decision Logic.
    
    Tier 1: FAS Hard Reject (MiniFASNet says fake → always reject)
    Tier 2: Decision Engine aggregate (weighted score + veto)
    Tier 3: Multi-signal voting (2+ moderate suspicious signals → reject)
            Prevents single-sensor false positives on real faces
            while catching screens that FAS misses.
    Tier 4: Single extreme signal (overwhelming evidence from one sensor)
    
    Returns: (is_spoof, message, debug_data)
    """
    print(f"DEBUG: _perform_unified_liveness_check starting for image...")
    sys.stdout.flush()
    
    replay_service = get_replay_detection_service()
    geometry_service = get_geometry_service()
    anti_spoof_service = get_anti_spoof_service()
    motion_service = get_motion_service()
    quality_service = get_face_quality_service()
    liveness_service = get_liveness_service()
    decision_engine = get_decision_engine()

    # 1. Gather all signals in parallel
    start_time = time.time()
    
    # Run quality check synchronously first, as its result is needed for geometry
    quality_result = quality_service.check_quality(image_base64, mode=mode)
    has_glasses = "glasses_detected" in quality_result.get("errors", [])

    # Run 3D geometry synchronously, passing has_glasses and mode
    geo_result = geometry_service.analyze_3d_geometry(image_base64, has_glasses=has_glasses, mode=mode)
    
    futures = {
        "replay": executor.submit(replay_service.detect, image_base64),
        "fas": executor.submit(anti_spoof_service.predict, image_base64),
        "motion": executor.submit(motion_service.quick_check, image_base64),
        "texture": executor.submit(liveness_service.passive_liveness_check, image_base64)
    }

    # Wait for all results
    replay_result = futures["replay"].result()
    fas_result = futures["fas"].result()
    fft_result = futures["motion"].result()
    texture_result = futures["texture"].result()
    
    # Decision engine (lightweight, runs synchronously)
    # Extract necessary values for the decision engine call
    replay_score = replay_result.get("score", 0)
    fas_is_real = fas_result.get("is_real", True)
    fas_score = fas_result.get("score", 0.5)
    fas_skipped = fas_result.get("skipped", False)
    geo_score = geo_result.get("score", 1.0)
    active_passed = True # Assuming active liveness is passed if not explicitly failed
    
    # [SMART FEEDBACK] Detailed Replay Signals
    replay_details = replay_result.get("details", {})
    grid_score = replay_details.get("pixel_grid", {}).get("score", 0.0)
    specular_score = replay_details.get("glassy_specular", {}).get("score", 0.0) # Fixed key
    moire_score = replay_details.get("moire", {}).get("score", 0.0)
    bezel_score = replay_details.get("bezel_edges", {}).get("score", 0.0) # Fixed path
    laplacian = replay_details.get("laplacian", 100.0)
    face_coverage = quality_result.get("details", {}).get("face_coverage", 0.40)
    # Calculate absolute face width in pixels (width * sqrt(face_coverage / aspect_ratio))
    # Or just return it from QualityService. Let's assume we can get it or use coverage.
    face_width_px = int(quality_result.get("details", {}).get("face_width_px", 160)) 
    glare_score = quality_result.get("details", {}).get("glare_score", 0.0)
    has_glasses = "glasses_detected" in quality_result.get("errors", [])
    
    decision = decision_engine.calculate_score(
        active_liveness_passed=active_passed,
        passive_liveness_score=fas_score,
        passive_liveness_passed=fas_is_real,
        replay_detection_score=replay_score,
        geometry_liveness_score=geo_score,
        grid_score=grid_score,
        specular_score=specular_score,
        moire_score=moire_score,
        bezel_score=bezel_score,
        laplacian=laplacian,
        face_coverage=face_coverage,
        has_glasses=has_glasses,
        glare_score=glare_score,
        mode=mode, # Pass the mode here
        fas_skipped=fas_skipped,
        face_width_px=face_width_px
    )
    
    elapsed = (time.time() - start_time) * 1000
    print(f"DEBUG: Parallel signals gathered in {elapsed:.2f}ms")

    # ===================================================================
    # 2. UNIFIED DECISION
    # ===================================================================
    # The DecisionEngine is now the single source of truth. 
    # It incorporates: 
    # - Weighted aggregate scoring
    # - Consensus Override (AI trusts skin texture over physical noise)
    # - Glasses Lenience (Reduces penalties for eyewear artifacts)
    # - Cross-Veto & Multi-Signal Reject
    
    is_spoof = decision["decision"] == "SPOOFING_DETECTED"
    message = decision["message"]

    # Diagnostic logging (always print for Docker logs)
    fft_peak = fft_result.get("peak_ratio", 0)
    print(
        f"LIVENESS_CHECK: fas_real={fas_is_real} fas_score={fas_score:.2%} "
        f"geo={geo_score:.2%} fft={fft_peak:.1f} lap={laplacian:.1f} "
        f"replay={replay_score:.2%} decision={decision['decision']} "
        f"final_spoof={is_spoof}"
    )
    sys.stdout.flush()

    if is_spoof:
        logger.warning(f"SPOOF TRIGGERS: {decision.get('decision')} - {message}")
        print(f"SPOOF_BLOCK: {message}")
        sys.stdout.flush()

    debug_data = {
        "geo_score": geo_score,
        "fas_real": fas_is_real,
        "fas_score": fas_score,
        "fft_peak": fft_peak,
        "laplacian": laplacian,
        "is_replay": replay_result.get("is_replay", False),
        "replay_score": replay_score,
        "decision": decision["decision"]
    }
    
    return is_spoof, message, debug_data



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
        mode = data.get('mode', 'attendance')
        
        # [UNIFIED LIVENESS GATE]
        is_spoof, message, debug_data = _perform_unified_liveness_check(image_base64, mode=mode)
        
        # [DIAGNOSTIC LOGGING]
        diag_msg = (
            f"Spoof Check: is_spoof={is_spoof}, "
            f"geo={debug_data['geo_score']:.4f}, "
            f"fft={debug_data['fft_peak']:.2f}, "
            f"rep={debug_data['replay_score']:.4f}"
        )
        print(diag_msg)
        sys.stdout.flush()
        
        if is_spoof:
            print(f"Detection blocked: {message}")
            return jsonify({
                "success": False,
                "face_found": False, 
                "is_replay": True,
                "message": message
            }), 400

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
        
        # [ANTI-SPOOFING GATE] Run liveness check before face matching
        print(f"VERIFY_REQUEST: processing image for face matching...")
        sys.stdout.flush()
        
        try:
            mode = data.get('mode', 'attendance')
            is_spoof, spoof_message, debug_data = _perform_unified_liveness_check(captured_image, mode=mode)
            if is_spoof:
                logger.warning(f"Verify blocked by anti-spoofing: {spoof_message}")
                return jsonify({
                    "success": True,
                    "is_match": False,
                    "confidence": 0.0,
                    "message": spoof_message
                })
        except Exception as e:
            logger.error(f"Liveness check CRASHED in verify: {e}")
            print(f"LIVENESS_CRASH: {e}")
            sys.stdout.flush()
            # If liveness crashes, we might want to fail safe or fail closed. 
            # For now, let's block the verification to be safe.
            return jsonify({
                "success": False,
                "message": f"Security check error: {str(e)}"
            }), 500
        
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
        quality_result = quality_service.check_quality(image, mode="registration")
        
        if not quality_result.get("passed", True):
            logger.warning(f"Face quality check failed for user {user_id}: {quality_result.get('errors')}")
            return jsonify({
                "success": False,
                "quality_errors": quality_result.get("errors", []),
                "message": quality_result.get("message", "Chất lượng ảnh không đạt yêu cầu.")
            }), 400
        
        # [UNIFIED LIVENESS GATE]
        # Registration mode is STRICT on quality, PATIENT on environmental noise
        is_spoof, message, debug_data = _perform_unified_liveness_check(image, mode="registration")
        
        if is_spoof:
            logger.warning(f"Registration blocked for user {user_id}: {message}")
            return jsonify({
                "success": False,
                "message": f"Phát hiện giả mạo: {message}"
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
            "anti_spoof_score": debug_data.get("fas_score", 1.0),
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
        
        image_base64 = data['image']
        mode = data.get('mode', 'attendance')
        
        # [UNIFIED LIVENESS GATE]
        is_spoof, message, debug_data = _perform_unified_liveness_check(image_base64, mode=mode)
        
        return jsonify({
            "success": True,
            "passed": not is_spoof,
            "score": debug_data["geo_score"],
            "texture_score": debug_data.get("laplacian", 0) / 100.0,
            "spoof_score": 1.0 if debug_data["fas_real"] else 0.0,
            "replay_score": debug_data["replay_score"],
            "is_replay": is_spoof,
            "laplacian_var": debug_data["laplacian"],
            "message": message if is_spoof else "Passed"
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
        mode = data.get('mode', 'attendance')
        result = quality_service.check_quality(data['image'], mode=mode)
        
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


@face_bp.route('/liveness/comprehensive', methods=['POST'])
def comprehensive_liveness_check():
    """
    Comprehensive liveness check combining all detection layers.
    
    Request Body:
        {
            "image": "base64-encoded-image",
            "active_liveness_passed": true  // From mobile app challenge completion
        }
        
    Response:
        {
            "success": true,
            "decision": "PASS" | "MANUAL_REVIEW" | "SPOOFING_DETECTED",
            "score": 0.85,
            "message": "Liveness verified successfully",
            "breakdown": {
                "active_liveness": {...},
                "passive_liveness": {...},
                "replay_detection": {...},
                ...
            }
        }
    """
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({
                "success": False,
                "message": "Missing 'image' field"
            }), 400
        
        image_base64 = data['image']
        active_passed = data.get('active_liveness_passed', False)
        mode = data.get('mode', 'attendance')
        
        # Get services
        liveness_service = get_liveness_service()
        anti_spoof_service = get_anti_spoof_service()
        replay_service = get_replay_detection_service()
        decision_engine = get_decision_engine()
        
        # Layer 1: Video Replay Detection (Fail Fast)
        replay_result = replay_service.detect(image_base64)
        
        if replay_result.get("is_replay", False):
            logger.warning(f"Comprehensive Check - Replay detected (Fast Fail): {replay_result['message']}")
            return jsonify({
                "success": True,
                "decision": "SPOOFING_DETECTED",
                "passed": False,
                "score": 0.0,
                "message": replay_result['message'],
                "breakdown": {}, # Skipped
                "weakest_component": "replay_detection",
                "details": {
                    "texture_result": {},
                    "spoof_result": {},
                    "replay_result": replay_result
                }
            })

        # Layer 2: Passive Liveness AI (MiniFASNet)
        texture_result = liveness_service.passive_liveness_check(image_base64)
        spoof_result = anti_spoof_service.predict(image_base64)
        
        # Layer 3: Motion Consistency (Quick Check)
        
        # Layer 5: Motion Consistency (Quick Check)
        # Even single frame has some motion cues (blur, artifacts)
        motion_service = get_motion_service("quick_check")
        motion_result = motion_service.quick_check(image_base64)
        
        # Layer 7: Decision Engine
        decision_result = decision_engine.quick_decision(
            active_liveness_passed=active_passed,
            anti_spoof_result=spoof_result,
            replay_result=replay_result,
            motion_result=motion_result
        )
        
        logger.info(
            f"Comprehensive check: decision={decision_result['decision']}, "
            f"score={decision_result['score']:.4f}, active={active_passed}, "
            f"spoof_real={spoof_result.get('is_real')}, replay={replay_result.get('is_replay')}"
        )
        
        return jsonify({
            "success": True,
            "decision": decision_result['decision'],
            "passed": decision_result['decision'] == "PASS",
            "score": decision_result['score'],
            "message": decision_result['message'],
            "breakdown": decision_result['breakdown'],
            "weakest_component": decision_result['weakest_component'],
            "details": {
                "texture_result": texture_result,
                "spoof_result": spoof_result,
                "replay_result": replay_result
            }
        })
        
    except Exception as e:
        logger.error(f"Comprehensive liveness error: {e}")
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500


@face_bp.route('/motion/add-frame', methods=['POST'])
def add_motion_frame():
    """
    Add a frame to the motion analysis buffer.
    Call this multiple times to collect frames for analysis.
    
    Request Body:
        {
            "image": "base64-encoded-image",
            "session_id": "optional-session-id"
        }
    """
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({
                "success": False,
                "message": "Missing 'image' field"
            }), 400
        
        session_id = data.get('session_id', 'default')
        motion_service = get_motion_service(session_id)
        
        result = motion_service.add_frame(data['image'])
        
        return jsonify({
            "success": True,
            **result
        })
        
    except Exception as e:
        logger.error(f"Add motion frame error: {e}")
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500


@face_bp.route('/motion/analyze', methods=['POST'])
def analyze_motion():
    """
    Analyze collected frames for motion consistency.
    Must have at least 3 frames added via /motion/add-frame.
    
    Request Body:
        {
            "session_id": "optional-session-id"
        }
    """
    try:
        data = request.get_json() or {}
        session_id = data.get('session_id', 'default')
        
        motion_service = get_motion_service(session_id)
        result = motion_service.analyze()
        
        # Clear session after analysis
        if result.get('success'):
            clear_motion_service(session_id)
        
        logger.info(f"Motion analysis: is_natural={result.get('is_natural')}, score={result.get('consistency_score', 0):.4f}")
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Motion analysis error: {e}")
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500


@face_bp.route('/motion/quick-check', methods=['POST'])
def quick_motion_check():
    """
    Quick single-frame motion/display detection.
    Less accurate but faster than multi-frame analysis.
    
    Request Body:
        {
            "image": "base64-encoded-image"
        }
    """
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({
                "success": False,
                "message": "Missing 'image' field"
            }), 400
        
        motion_service = get_motion_service()
        result = motion_service.quick_check(data['image'])
        
        return jsonify({
            "success": True,
            **result
        })
        
    except Exception as e:
        logger.error(f"Quick motion check error: {e}")
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500
