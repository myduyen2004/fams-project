"""
Security middleware for AI Service.
Validates API key on all requests except health check.
The API key is shared between backend (Spring Boot) and AI service via environment variable.
"""
import os
import logging
from functools import wraps
from flask import request, jsonify

logger = logging.getLogger(__name__)

# Load API key from environment (shared secret between backend and AI service)
AI_SERVICE_API_KEY = os.getenv('AI_SERVICE_API_KEY', '')


def require_api_key(f):
    """
    Decorator to require API key for Flask route functions.
    Checks the X-API-Key header against the configured AI_SERVICE_API_KEY.
    If AI_SERVICE_API_KEY is not configured (empty), the check is skipped
    to maintain backward compatibility in development.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        # Skip check if API key is not configured (dev/backward compatibility)
        if not AI_SERVICE_API_KEY:
            return f(*args, **kwargs)

        api_key = request.headers.get('X-API-Key', '')
        if not api_key or api_key != AI_SERVICE_API_KEY:
            logger.warning(
                "Unauthorized AI service access attempt from %s to %s",
                request.remote_addr, request.path
            )
            return jsonify({
                'error': 'Unauthorized',
                'message': 'Valid API key required'
            }), 401

        return f(*args, **kwargs)
    return decorated


def init_api_key_middleware(app):
    """
    Register a before_request hook that validates the API key
    on all endpoints except /health.
    """
    @app.before_request
    def check_api_key():
        # Always allow health check without authentication
        if request.path == '/health':
            return None

        # Skip check if API key is not configured (dev/backward compatibility)
        if not AI_SERVICE_API_KEY:
            return None

        api_key = request.headers.get('X-API-Key', '')
        if not api_key or api_key != AI_SERVICE_API_KEY:
            logger.warning(
                "Unauthorized access attempt from %s to %s",
                request.remote_addr, request.path
            )
            return jsonify({
                'error': 'Unauthorized',
                'message': 'Valid API key required in X-API-Key header'
            }), 401

        return None
