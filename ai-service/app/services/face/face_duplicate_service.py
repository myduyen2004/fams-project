"""
Face Duplicate Detection Service

Checks if a new face encoding matches any existing user in the database.
This prevents one person from registering under multiple accounts.
"""

import logging
import numpy as np
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger(__name__)


class FaceDuplicateService:
    """Service to detect duplicate face registrations"""
    
    # Cosine similarity threshold - above this means same person
    SIMILARITY_THRESHOLD = 0.6
    
    def __init__(self):
        logger.info("FaceDuplicateService initialized")
    
    def check_duplicate(
        self, 
        new_encoding: List[float], 
        existing_encodings: List[Dict[str, Any]],
        exclude_user_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Check if new face encoding matches any existing user.
        
        Args:
            new_encoding: 128-dim face encoding vector
            existing_encodings: List of {user_id, encoding_data} from database
            exclude_user_id: User ID to exclude (for update scenarios)
            
        Returns:
            {
                "is_duplicate": bool,
                "matched_user_id": int or None,
                "similarity_score": float,
                "message": str
            }
        """
        try:
            if not existing_encodings:
                return {
                    "is_duplicate": False,
                    "matched_user_id": None,
                    "similarity_score": 0.0,
                    "message": "No existing encodings to compare"
                }
            
            new_vec = np.array(new_encoding)
            
            highest_similarity = 0.0
            matched_user_id = None
            
            for entry in existing_encodings:
                user_id = entry.get("user_id")
                
                # Skip excluded user (for update flow)
                if exclude_user_id and user_id == exclude_user_id:
                    continue
                
                encoding_data = entry.get("encoding_data")
                if encoding_data is None:
                    continue
                
                # Decode encoding
                existing_vec = self._decode_encoding(encoding_data)
                if existing_vec is None:
                    continue
                
                # Calculate cosine similarity
                similarity = self._cosine_similarity(new_vec, existing_vec)
                
                if similarity > highest_similarity:
                    highest_similarity = similarity
                    matched_user_id = user_id
            
            is_duplicate = highest_similarity >= self.SIMILARITY_THRESHOLD
            
            if is_duplicate:
                logger.warning(
                    f"Duplicate face detected! Similarity: {highest_similarity:.3f}, "
                    f"Matched user: {matched_user_id}"
                )
                message = f"Khuôn mặt này đã được đăng ký bởi người dùng khác (ID: {matched_user_id})"
            else:
                message = "Không phát hiện trùng lặp"
            
            return {
                "is_duplicate": is_duplicate,
                "matched_user_id": matched_user_id if is_duplicate else None,
                "similarity_score": round(highest_similarity, 4),
                "message": message
            }
            
        except Exception as e:
            logger.error(f"Duplicate check error: {e}")
            return {
                "is_duplicate": False,
                "matched_user_id": None,
                "similarity_score": 0.0,
                "message": f"Error during duplicate check: {str(e)}"
            }
    
    def _decode_encoding(self, encoding_data) -> Optional[np.ndarray]:
        """Decode encoding data from various formats"""
        try:
            if isinstance(encoding_data, bytes):
                # Deserialize from bytes (numpy format)
                return np.frombuffer(encoding_data, dtype=np.float64)
            elif isinstance(encoding_data, list):
                return np.array(encoding_data)
            elif isinstance(encoding_data, np.ndarray):
                return encoding_data
            else:
                logger.warning(f"Unknown encoding format: {type(encoding_data)}")
                return None
        except Exception as e:
            logger.error(f"Encoding decode error: {e}")
            return None
    
    def _cosine_similarity(self, vec1: np.ndarray, vec2: np.ndarray) -> float:
        """Calculate cosine similarity between two vectors"""
        try:
            # Normalize vectors
            norm1 = np.linalg.norm(vec1)
            norm2 = np.linalg.norm(vec2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            return float(np.dot(vec1, vec2) / (norm1 * norm2))
        except Exception as e:
            logger.error(f"Cosine similarity error: {e}")
            return 0.0


# Singleton instance
_face_duplicate_service = None

def get_face_duplicate_service() -> FaceDuplicateService:
    """Get or create singleton instance"""
    global _face_duplicate_service
    if _face_duplicate_service is None:
        _face_duplicate_service = FaceDuplicateService()
    return _face_duplicate_service
