from flask import Flask, jsonify, request
from flask_cors import CORS
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Config
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'FAMS AI Service',
        'version': '1.0.0',
        'environment': os.getenv('APP_ENV', 'development')
    })

@app.route('/api/face/recognize', methods=['POST'])
def recognize_face():
    """Face recognition endpoint - Coming soon"""
    return jsonify({
        'message': 'Face recognition feature',
        'status': 'not_implemented',
        'note': 'Will be implemented with AI models later'
    }), 501

@app.route('/api/face/register', methods=['POST'])
def register_face():
    """Register new face - Coming soon"""
    return jsonify({
        'message': 'Face registration feature',
        'status': 'not_implemented'
    }), 501

@app.route('/api/face/liveness', methods=['POST'])
def liveness_detection():
    """Liveness detection - Coming soon"""
    return jsonify({
        'message': 'Liveness detection feature',
        'status': 'not_implemented'
    }), 501

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('DEBUG', 'True') == 'True'
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug
    )