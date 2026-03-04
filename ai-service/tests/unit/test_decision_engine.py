
import pytest
import sys
import os

# Robust path handling
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, '../../'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from app.services.face.decision_engine import DecisionEngine

class TestDecisionEngine:
    def setup_method(self):
        self.engine = DecisionEngine()

    # ===== GOLDEN TRIANGLE: PASS SCENARIOS =====

    def test_all_three_agree_pass(self):
        """3/3 agree REAL + high score = PASS"""
        result = self.engine.calculate_score(
            active_liveness_passed=True,
            passive_liveness_score=0.98,     # AI votes REAL (>0.90)
            passive_liveness_passed=True,
            replay_detection_score=0.05,     # Physical votes REAL (<0.30)
            geometry_liveness_score=1.0      # 3D votes REAL (>0.40)
        )
        assert result['decision'] == 'PASS'
        assert result['score'] >= 0.75

    def test_real_face_with_glasses(self):
        """Real face + glasses: AI+Physical agree, 3D borderline but above glasses threshold"""
        result = self.engine.calculate_score(
            active_liveness_passed=True,
            passive_liveness_score=0.9525,   # AI votes REAL (>0.90)
            passive_liveness_passed=True,
            replay_detection_score=0.24,     # Physical votes REAL (<0.30)
            geometry_liveness_score=0.40,    # 3D votes REAL (>0.25 glasses threshold)
            has_glasses=True,
            glare_score=0.268,
            grid_score=0.08,
            moire_score=0.15
        )
        # AI=REAL, 3D=REAL (glasses threshold 0.25), Physical=REAL -> 3/3
        assert result['decision'] == 'PASS'

    def test_two_of_three_pass(self):
        """AI + 3D agree REAL, Physical disagrees (noise) -> 2/3 = PASS"""
        result = self.engine.calculate_score(
            active_liveness_passed=True,
            passive_liveness_score=0.98,     # AI votes REAL
            passive_liveness_passed=True,
            replay_detection_score=0.35,     # Physical votes FAKE (>0.30)
            geometry_liveness_score=0.60     # 3D votes REAL (>0.40)
        )
        assert result['decision'] == 'PASS'

    # ===== GOLDEN TRIANGLE: BLOCK SCENARIOS =====

    def test_retina_spoof_ai_tricked_but_flat(self):
        """Retina spoof: AI fooled but surface is flat -> AI only 1/3 -> Block"""
        result = self.engine.calculate_score(
            active_liveness_passed=True,
            passive_liveness_score=0.96,     # AI votes REAL (tricked)
            passive_liveness_passed=True,
            replay_detection_score=0.35,     # Physical votes FAKE (>0.30)
            geometry_liveness_score=0.15     # 3D votes FAKE (<0.40) - FLAT
        )
        # Only AI agrees -> 1/3 -> Not enough for PASS
        assert result['decision'] != 'PASS'

    def test_suspiciously_clean_spoof(self):
        """Pristine video: All physical=0, flat surface -> Digital source"""
        result = self.engine.calculate_score(
            active_liveness_passed=True,
            passive_liveness_score=0.96,     # AI tricked
            passive_liveness_passed=True,
            replay_detection_score=0.02,     # Physical clean (votes REAL!)
            geometry_liveness_score=0.20,    # Flat (3D votes FAKE)
            grid_score=0.01,
            moire_score=0.01,
            bezel_score=0.01,
            specular_score=0.01
        )
        # SUSPICIOUSLY CLEAN veto should trigger
        assert result['decision'] == 'SPOOFING_DETECTED'
        assert "Quá sạch" in result['message']

    def test_absolute_veto_flat(self):
        """Absolute flat surface veto (geo < 0.10)"""
        result = self.engine.calculate_score(
            active_liveness_passed=True,
            passive_liveness_score=0.98,
            passive_liveness_passed=True,
            replay_detection_score=0.05,
            geometry_liveness_score=0.08     # Below 0.10 absolute floor
        )
        assert result['decision'] == 'SPOOFING_DETECTED'
        assert "Bề mặt phẳng" in result['message']

    def test_absolute_veto_replay(self):
        """Absolute replay veto (score > 0.85)"""
        result = self.engine.calculate_score(
            active_liveness_passed=True,
            passive_liveness_score=0.98,
            passive_liveness_passed=True,
            replay_detection_score=0.90,     # Overwhelming screen evidence
            geometry_liveness_score=0.60
        )
        assert result['decision'] == 'SPOOFING_DETECTED'
        assert "Dấu hiệu màn hình" in result['message']

    def test_demoted_to_review(self):
        """High score but only 1/3 votes -> Demoted to MANUAL_REVIEW"""
        result = self.engine.calculate_score(
            active_liveness_passed=True,
            passive_liveness_score=0.98,     # AI votes REAL
            passive_liveness_passed=True,
            replay_detection_score=0.40,     # Physical votes FAKE (>0.30)
            geometry_liveness_score=0.30     # 3D votes FAKE (<0.40)
        )
        # Only AI agrees -> 1/3
        # Weighted score might be high, but demoted because subsystems disagree
        assert result['decision'] in ('MANUAL_REVIEW', 'SPOOFING_DETECTED')

    def test_low_score_fail(self):
        """Low overall score -> SPOOFING_DETECTED"""
        result = self.engine.calculate_score(
            active_liveness_passed=False,    # 0.0
            passive_liveness_score=0.50,     # AI votes FAKE (<0.90)
            passive_liveness_passed=True,
            replay_detection_score=0.60,     # Physical votes FAKE
            geometry_liveness_score=0.40     # 3D votes REAL
        )
        # Only 3D agrees -> 1/3, low weighted score
        assert result['decision'] == 'SPOOFING_DETECTED'
        assert result['score'] < 0.60
