from flask import Flask, jsonify, request
from flask_cors import CORS
import os
from dotenv import load_dotenv
import logging

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Config
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max for image uploads

# Register blueprints
from app.api.v1 import v1_bp, face_bp

# Register v1 API blueprints
app.register_blueprint(v1_bp)

# Also register face_bp at root level for backward compatibility
app.register_blueprint(face_bp)


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'FAMS AI Service',
        'version': '1.1.0',
        'environment': os.getenv('APP_ENV', 'development'),
        'features': {
            'face_recognition': True,
            'liveness_detection': True,
            'face_registration': True
        }
    })


@app.route('/api/face/recognize', methods=['POST'])
def recognize_face():
    """
    Face recognition endpoint - Alias for /api/face/verify
    Kept for backward compatibility
    """
    # Forward to the new verify endpoint
    from app.api.v1.face_routes import verify_face
    return verify_face()


@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(413)
def request_too_large(error):
    return jsonify({'error': 'Request too large. Maximum file size is 16MB'}), 413


@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {error}")
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('DEBUG', 'True') == 'True'
    
    logger.info(f"Starting FAMS AI Service on port {port}")
    logger.info("Available endpoints:")
    logger.info("  - GET  /health")
    logger.info("  - POST /api/face/detect")
    logger.info("  - POST /api/face/verify")
    logger.info("  - POST /api/face/register")
    logger.info("  - POST /api/face/liveness/passive")
    logger.info("  - POST /api/face/liveness/blink")
    logger.info("  - POST /api/face/liveness/head-pose")
    logger.info("  - GET  /api/face/status/<user_id>")
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug
    )