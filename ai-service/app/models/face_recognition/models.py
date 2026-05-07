# ========================================
# Face Recognition Models
# ========================================

from dataclasses import dataclass
from typing import Optional, List
from enum import Enum


class LivenessCheckType(str, Enum):
    """Types of liveness checks performed"""
    PASSIVE = "passive"           # AI-based texture/depth analysis
    BLINK = "blink"               # Eye blink detection
    HEAD_MOVEMENT = "head_movement"  # Head turn left/right
    SMILE = "smile"               # Smile detection


@dataclass
class LivenessProof:
    """Proof that liveness checks were passed"""
    passed_passive: bool = False
    passed_blink: bool = False
    passed_head_movement: bool = False
    passed_smile: bool = False
    timestamp: Optional[int] = None  # Unix timestamp
    
    @property
    def is_valid(self) -> bool:
        """Check if minimum liveness requirements are met"""
        # Require at least passive + one active check
        return self.passed_passive and (self.passed_blink or self.passed_head_movement)


@dataclass
class FaceVerificationResult:
    """Result of face verification"""
    is_match: bool
    confidence: float  # 0.0 - 1.0
    encoding: Optional[List[float]] = None
    error_message: Optional[str] = None
    
    @classmethod
    def success(cls, confidence: float, encoding: List[float] = None):
        return cls(is_match=True, confidence=confidence, encoding=encoding)
    
    @classmethod
    def failure(cls, message: str):
        return cls(is_match=False, confidence=0.0, error_message=message)


@dataclass
class FaceRegistrationResult:
    """Result of face registration"""
    success: bool
    user_id: int
    message: str
    encoding: Optional[List[float]] = None


@dataclass
class FaceDetectionResult:
    """Result of face detection in an image"""
    face_found: bool
    face_count: int = 0
    face_location: Optional[tuple] = None  # (top, right, bottom, left)
    face_encoding: Optional[List[float]] = None
    error_message: Optional[str] = None
