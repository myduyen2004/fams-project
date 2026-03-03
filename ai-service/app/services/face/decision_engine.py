# ========================================
# Decision Engine Service
# ========================================
# Combines results from multiple anti-spoofing layers
# to produce a final decision with scoring.

from typing import Dict, Any, Optional
import logging
import sys

logger = logging.getLogger(__name__)


class DecisionEngine:
    """
    Decision Engine for anti-spoofing.
    Combines scores from multiple detection layers to produce
    a final PASS/REVIEW/FAIL decision.
    """
    
    # Score thresholds
    PASS_THRESHOLD = 0.75    # Tightened from 0.80 for Round 3
    REVIEW_THRESHOLD = 0.60  # Manual review floor
    
    def __init__(self):
        """Initialize the decision engine."""
        # [ANTI-PARANOID]: AI-Physical Balance weights
        # Passive liveness slightly increased to allow AI consensus to override technical noise
        self.WEIGHTS = {
            'active_liveness': 0.10,
            'passive_liveness': 0.40,  # Increased from 0.35
            'replay_detection': 0.30,  # Decreased from 0.35
            'geometry_liveness': 0.20,
            'motion_consistency': 0.00, 
            'light_analysis': 0.00,     
            'screen_artifacts': 0.00,   
        }
        logger.info("DecisionEngine (Level 8 - Physical Priority Hardened) initialized")
    
    def calculate_score(
        self,
        active_liveness_passed: bool,
        passive_liveness_score: float = 1.0,
        passive_liveness_passed: bool = True,
        replay_detection_score: float = 0.0,
        geometry_liveness_score: float = 1.0,
        # Granular signals for Smart Feedback
        grid_score: float = 0.0,
        specular_score: float = 0.0,
        moire_score: float = 0.0,
        bezel_score: float = 0.0,
        laplacian: float = 100.0,
        face_coverage: float = 0.40,
        has_glasses: bool = False,
        glare_score: float = 0.0,
        mode: str = "attendance", # "registration" or "attendance"
        fas_skipped: bool = False,
        face_width_px: int = 160
    ) -> Dict[str, Any]:
        """
        Calculate the overall anti-spoofing score based on weighted components.
        Implements Context-Aware (Registration vs Attendance) logic.
        """
        # [CONTEXT CONFIG]: Adjust strictness based on mode
        is_reg = mode == "registration"
        
        # 1. Image Quality (Registration wants perfection, Attendance wants speed)
        quality_passed = True
        if is_reg:
            # Ultra-lenient for registration to ensure a face is captured
            # Relaxed from 15.0 to 10.0 for better usability on all devices
            if laplacian < 10.0: quality_passed = False 
            if face_coverage < 0.20: quality_passed = False 
        else:
            if laplacian < 60.0: quality_passed = False 
        
        # 2. Security Vetoes (Attendance is Paranoid, Registration is Patient)
        rej_moire = 0.85 if is_reg else 0.60    # Stricter for daily attendance
        rej_bezel = 0.85 if is_reg else 0.55    # Stricter for daily attendance
        rej_replay = 0.95 if is_reg else 0.92   # LOOSENED from 0.85 for attendance
        rej_geo = 0.05 if is_reg else 0.12     # Stricter for daily attendance
        # [SECURITY HARDENING]: Glare Penalty for Screen Reflections
        # If glare is high but the surface is flat, it's a screen, not curved glasses.
        actual_replay_score = replay_detection_score
        if glare_score > 0.20 and geometry_liveness_score < 0.50:
            actual_replay_score = min(actual_replay_score + 0.15, 1.0) # Reduced from 0.30
            logger.warning(f"GLARE-VETO: High glare ({glare_score:.2f}) on flat surface. Possible screen reflection.")

        # [ANTI-PARANOID]: Glasses Lenience
        effective_grid = grid_score
        effective_bezel = bezel_score
        effective_specular = specular_score
        effective_geo = geometry_liveness_score
        
        if has_glasses:
            effective_grid *= 0.6  # Reduce penalty for grid-like frames
            effective_bezel *= 0.5 # Reduce penalty for frame edges
            effective_specular *= 0.4 # Reduce penalty for lens glare
            # Glasses can artifacts landmarks; loosen 3D Veto slightly
            effective_geo = max(geometry_liveness_score, 0.12) if geometry_liveness_score > 0.0 else 0.0
            logger.info("DecisionEngine: Applying Glasses Lenience (reducing physical penalties)")

        # Convert inputs to normalized scores (higher is better/Real)
        active_score = 1.0 if active_liveness_passed else 0.0
        replay_score_norm = 1.0 - actual_replay_score
        
        # Calculate weighted scores
        weighted_scores = {
            'active_liveness': active_score * self.WEIGHTS.get('active_liveness', 0),
            'passive_liveness': passive_liveness_score * self.WEIGHTS.get('passive_liveness', 0),
            'replay_detection': replay_score_norm * self.WEIGHTS.get('replay_detection', 0),
            'geometry_liveness': geometry_liveness_score * self.WEIGHTS.get('geometry_liveness', 0),
        }
        
        total_score = sum(weighted_scores.values())
        
        # ================================================================
        # [GOLDEN TRIANGLE]: 2/3 Consensus Decision (FAS + 3D + Physical)
        # Each system casts an independent vote. Need 2/3 to PASS.
        # ================================================================
        
        # Vote 1: AI (MiniFASNet) - Does the texture look like real skin?
        ai_votes_real = (passive_liveness_score > 0.90 and passive_liveness_passed) or (passive_liveness_score > 0.96)
        
        # Vote 2: 3D Geometry - Does the face have real depth?
        # Registration is more lenient on 3D depth to accommodate different angles
        geo_threshold = 0.30 if is_reg else (0.25 if has_glasses else 0.40)
        geo_votes_real = effective_geo >= geo_threshold
        
        # Vote 3: Physical Replay - Is the surface clean of screen artifacts?
        # Low replay score = clean physical surface = votes REAL
        phys_thresh = 0.70 if is_reg else 0.45 # RELAXED from 0.35
        physical_votes_real = actual_replay_score <= phys_thresh
        
        votes_real = sum([ai_votes_real, geo_votes_real, physical_votes_real])
        
        # [ANTI-PARANOID]: AI-Physical override for Registration
        # If AI says real with very high confidence and 3D is solid, 
        # we treat the Physical signal as noise unless it's strictly definitive (>0.92).
        if is_reg and ai_votes_real and effective_geo > 0.40:
            if passive_liveness_score > 0.94 and actual_replay_score < 0.92:
                logger.info(f"DecisionEngine [REG]: AI ({passive_liveness_score:.2f}) + 3D ({effective_geo:.2f}) OVERRIDE. Ignoring Physical ({actual_replay_score:.2f})")
                physical_votes_real = True
                votes_real = sum([ai_votes_real, geo_votes_real, physical_votes_real])

        logger.info(f"GOLDEN TRIANGLE: AI={ai_votes_real}({passive_liveness_score:.2f}), "
                     f"3D={geo_votes_real}({effective_geo:.2f}, thresh={geo_threshold}), "
                     f"Physical={physical_votes_real}({actual_replay_score:.2f}) -> {votes_real}/3")
        
        # --- ABSOLUTE VETOES (non-negotiable, regardless of votes) ---
        veto_triggered = False
        veto_reason = ""
        
        if not passive_liveness_passed and not fas_skipped and passive_liveness_score < 0.85:
            # AI is CERTAIN it's fake (score below its own threshold)
            # Registration is more lenient on absolute FAS vetoes
            if not is_reg or passive_liveness_score < 0.70:
                veto_triggered = True
                veto_reason = f"Silent-FAS (Phát hiện đặc điểm giả mạo) - Score: {passive_liveness_score:.2%}"
        elif actual_replay_score > rej_replay and physical_votes_real != "OVERRIDDEN":
            # Overwhelming physical evidence of a screen
            veto_triggered = True
            veto_reason = "Dấu hiệu màn hình điện tử (Physical Replay)"
        elif effective_geo == 0.0:
            # Definitively flat surface - no real face is this flat.
            # We use exactly 0.0 to distinguish from "Too Deep" veto (which returns 0.01)
            veto_triggered = True
            veto_reason = "Bề mặt phẳng (Thiếu chiều sâu hình học)"
        elif moire_score > rej_moire or bezel_score > rej_bezel:
            # Strong single-sensor evidence of a physical screen device
            veto_triggered = True
            veto_reason = "Phát hiện thiết bị trình chiếu"
        
        # [QUALITY GATE] For Registration only
        if is_reg and not quality_passed:
            veto_triggered = True
            veto_reason = "Chất lượng ảnh không đủ tốt cho bộ khuôn mặt gốc. Vui lòng giữ yên và đủ sáng."
        
        # --- SUSPICIOUSLY CLEAN CHECK ---
        # High-quality screens produce ZERO noise (G≈0, M≈0, B≈0)
        # Real cameras ALWAYS have some sensor noise. If everything is pristine
        # but the surface is flat, it's a digital source.
        # [ANTI-PARANOID]: Only Veto if AI confidence is not very high.
        is_too_clean = (grid_score < 0.05 and moire_score < 0.05 and 
                        bezel_score < 0.05 and specular_score < 0.05)
        if is_too_clean and not geo_votes_real and not veto_triggered and passive_liveness_score < 0.95:
            veto_triggered = True
            veto_reason = "Nguồn ảnh kỹ thuật số (Quá sạch + Phẳng)"
            logger.warning(f"SUSPICIOUSLY-CLEAN: All physical=0, geo_flat. Digital source detected.")
        
        # --- RESOLUTION GATE ---
        # If the image is too small, we can't trust the physical sensor (moire/grid).
        # We demote to MANUAL_REVIEW if everything else passes.
        is_low_res = face_width_px < 155 and not is_reg
        if is_low_res and not veto_triggered:
            logger.warning(f"RESOLUTION-GATE: Face width {face_width_px}px is too low for attendance scan.")
            # We don't Veto, but we don't PASS.
            pass # We'll handle this in the final PASS logic
        
        # --- GOLDEN TRIANGLE DECISION ---
        if veto_triggered:
            decision = "SPOOFING_DETECTED"
            total_score = min(total_score, 0.49)
            
            # Special message for glasses
            if has_glasses and (effective_bezel > 0.3 or effective_specular > 0.3):
                message = "TỪ CHỐI: Kính của bạn gây ra phản chiếu hoặc tạo ra các cạnh nhiễu vật lý. Vui lòng tháo kính và thử lại."
            else:
                message = f"TỪ CHỐI: {veto_reason}"
        elif votes_real >= 2 and total_score >= self.PASS_THRESHOLD:
            # Golden Triangle: 2/3 agree REAL + weighted score is high enough
            if is_low_res:
                 decision = "MANUAL_REVIEW"
                 message = "Vui lòng đưa mặt lại gần hơn để đảm bảo độ chính xác (Cần ít nhất 160px)."
            else:
                 decision = "PASS"
                 message = f"Xác thực thành công ({total_score:.0%})"
        elif votes_real >= 2:
            score_thresh = 0.55 if is_reg else self.REVIEW_THRESHOLD
            if total_score >= score_thresh:
                # 2/3 agree but score is borderline
                decision = "PASS"
                message = f"Xác thực thành công - Điểm biên ({total_score:.0%})"
                logger.info(f"GOLDEN TRIANGLE: 2/3 agree, borderline score {total_score:.2f}. Granting PASS (Mode: {mode}).")
            else:
                decision = "MANUAL_REVIEW"
                message = f"Cần xác thực thủ công - Hệ thống chưa đồng thuận ({total_score:.0%})"
        elif votes_real <= 1 and total_score >= self.PASS_THRESHOLD:
            # Score is high but subsystems disagree - demote to REVIEW
            decision = "MANUAL_REVIEW"
            message = f"Cần xác thực thủ công - Hệ thống chưa đồng thuận ({votes_real}/3)"
            logger.warning(f"GOLDEN TRIANGLE: Only {votes_real}/3 votes despite high score {total_score:.2f}. Demoting to REVIEW.")
        elif total_score >= self.REVIEW_THRESHOLD:
            decision = "MANUAL_REVIEW"
            message = f"Cần xác thực thủ công ({total_score:.0%})"
        else:
            decision = "SPOOFING_DETECTED"
            
            # ===============================================================
            # [SMART FEEDBACK]: Environmental vs Fraud Categorization
            # ===============================================================
            
            # --- Nhóm B: Chặn ngay (Phát hiện thiết bị ảo/Emulator) ---
            # Dấu hiệu: Mặt phẳng (geometry < 0.15) và ảnh quá "sạch" (không có nhiễu vật lý)
            # Refined < 0.05 floor to catch near-perfect digital streams
            is_too_clean = (specular_score < 0.05 and moire_score < 0.05 and 
                           grid_score < 0.05 and bezel_score < 0.05)
            
            if geometry_liveness_score < 0.15 and is_too_clean:
                message = "Thiết bị không hợp lệ. Vui lòng sử dụng camera vật lý trên điện thoại để điểm danh."
            
            # --- Nhóm A: Lối môi trường (Hướng dẫn khắc phục) ---
            elif specular_score > 0.8:
                message = "Mặt bị lóa sáng, vui lòng di chuyển chỗ khác."
            elif grid_score > 0.5 and moire_score < 0.05:
                message = "Camera bị nhiễu do thiếu sáng, hãy bật thêm đèn."
            elif face_coverage < 0.25:
                message = "Hãy đưa mặt lại gần camera hơn."
            else:
                message = f"Hệ thống phát hiện dấu hiệu giả mạo ({total_score:.0%})"
            
        return {
            "decision": decision,
            "score": float(total_score),
            "message": message,
            "breakdown": {
                "active_liveness": {"passed": active_liveness_passed, "score": float(active_score)},
                "passive_liveness": {"passed": passive_liveness_passed, "score": float(passive_liveness_score)},
                "replay_detection": {"raw_score": float(replay_detection_score), "score": float(replay_score_norm)},
                "geometry_liveness": {"score": float(geometry_liveness_score)}
            }
        }
    
    def quick_decision(
        self,
        active_liveness_passed: bool,
        anti_spoof_result: Dict[str, Any],
        replay_result: Optional[Dict[str, Any]] = None,
        motion_result: Optional[Dict[str, Any]] = None,
        geometry_result: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Provides compatibility with services expecting a quick result."""
        fas_score = anti_spoof_result.get("score", 0.5)
        fas_passed = anti_spoof_result.get("is_real", True)
        replay_score = replay_result.get("score", 0.0) if replay_result else 0.0
        geo_score = geometry_result.get("score", 1.0) if geometry_result else 1.0
        
        return self.calculate_score(
            active_liveness_passed=active_liveness_passed,
            passive_liveness_score=fas_score,
            passive_liveness_passed=fas_passed,
            replay_detection_score=replay_score,
            geometry_liveness_score=geo_score
        )


# Singleton instance
_decision_engine: Optional[DecisionEngine] = None


def get_decision_engine() -> DecisionEngine:
    """Get the singleton DecisionEngine instance."""
    global _decision_engine
    if _decision_engine is None:
        _decision_engine = DecisionEngine()
    return _decision_engine
