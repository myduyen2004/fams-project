from flask import Blueprint

from .face_routes import face_bp
from .plagiarism_routes import plagiarism_bp

# Create main v1 blueprint
v1_bp = Blueprint('v1', __name__, url_prefix='/v1')

# Register sub-blueprints
v1_bp.register_blueprint(face_bp)
__all__ = ['v1_bp', 'face_bp', 'plagiarism_bp']
