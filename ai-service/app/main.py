import os
import sys

# [STABILITY]: Force MediaPipe to CPU-only mode for Docker/Server environments.
# This must be set before libraries are imported.
os.environ['MEDIAPIPE_DISABLE_GPU'] = '1'
os.environ['CUDA_VISIBLE_DEVICES'] = '-1'
os.environ['PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION'] = 'python'

from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import logging
from loguru import logger
from app.services.chatbot_service import ChatbotService

load_dotenv()

# Configure logging
log_dir = "app/logs"
if not os.path.exists(log_dir):
    os.makedirs(log_dir)

log_formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# Stream Handler (Standard Output)
stream_handler = logging.StreamHandler()
stream_handler.setFormatter(log_formatter)

# File Handler (Persistent log)
file_handler = logging.FileHandler(os.path.join(log_dir, "app.log"))
file_handler.setFormatter(log_formatter)

logger = logging.getLogger()
logger.setLevel(logging.INFO)
logger.addHandler(stream_handler)
logger.addHandler(file_handler)

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

@app.before_request
def log_request_info():
    print(f"REQUEST: {request.method} {request.path} from {request.remote_addr}")
    sys.stdout.flush()

chatbot_service = ChatbotService()

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


@app.route('/api/chat/full-flow', methods=['POST'])
def chat_full_flow():
    """
    Direct Chatbot endpoint with 4-stage reasoning pipeline
    Payload: { "userId": int, "message": str, "routingModel": str, "answerModel": str }
    """
    data = request.json
    user_id = data.get('userId')
    user_role = data.get('userRole', 'STUDENT')
    user_code = data.get('userCode', 'N/A')
    message = data.get('message')
    history = data.get('history', [])
    routing_model = data.get('routingModel')
    answer_model = data.get('answerModel')
    
    if not message:
        return jsonify({'error': 'Message is required'}), 400
    if user_id is None:
        return jsonify({'error': 'userId is required'}), 400
        
    try:
        result = chatbot_service.full_flow(user_id, user_role, user_code, message, history, routing_model, answer_model)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/chat/analyze-excel', methods=['POST'])
def analyze_excel():
    """
    Endpoint to analyze Excel files
    Expects multipart/form-data:
    - file: The Excel file
    - data: JSON string containing userId, userRole, userCode, history, etc.
    """
    logger.debug(f"Received analyze-excel request. Files: {list(request.files.keys())}, Form: {list(request.form.keys())}")
    
    if 'file' not in request.files:
        logger.error("No file part in request")
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        logger.error("No selected file")
        return jsonify({'error': 'No selected file'}), 400

    # Get metadata from 'data' field
    metadata_raw = request.form.get('data')
    logger.debug(f"Metadata raw (from form): {metadata_raw}")
    
    data = {}
    if metadata_raw:
        try:
            if isinstance(metadata_raw, str):
                data = json.loads(metadata_raw)
            else:
                data = metadata_raw # Already dict maybe?
        except Exception as e:
            logger.error(f"Invalid metadata JSON: {e}. Raw: {metadata_raw}")
            return jsonify({'error': f'Invalid metadata JSON: {str(e)}'}), 400
    else:
        # Check if it was sent as a json part but not with a filename
        # Some clients send it as application/json part which Flask doesn't put in form
        # We can try to get it from request.json if it was sent that way as a part?
        # Actually, in Flask, if it's multipart, and a part is application/json
        # we might need to look in request.files or iterate through parts
        logger.debug("Data not in request.form, checking other sources...")
        # For now, let's assume it should be in form if passed correctly from RestTemplate
    
    # If data is still empty, let's check one more place
    if not data and request.json:
        data = request.json
        logger.debug(f"Found data in request.json: {data}")

    user_id = data.get('userId')
    user_role = data.get('userRole', 'STUDENT')
    user_code = data.get('userCode', 'N/A')
    history = data.get('history', [])
    routing_model = data.get('routingModel')
    answer_model = data.get('answerModel')

    if user_id is None:
        logger.error(f"userId is missing in data: {data}")
        return jsonify({'error': 'userId is required'}), 400

    try:
        file_content = file.read()
        result = chatbot_service.excel_flow(
            user_id, user_role, user_code, 
            file_content, file.filename, 
            history, 
            routing_model, answer_model
        )
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error analyzing Excel: {e}")
        return jsonify({'error': str(e)}), 500


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