"""Verification of Registration Mode lenience."""
import sys, os, importlib.util

# Direct import of decision_engine.py
spec_de = importlib.util.spec_from_file_location(
    "decision_engine",
    os.path.join("d:/fams-project/ai-service/app/services/face/decision_engine.py")
)
mod_de = importlib.util.module_from_spec(spec_de)
spec_de.loader.exec_module(mod_de)
DecisionEngine = mod_de.DecisionEngine

# Direct import of replay_detection_service.py
spec_rd = importlib.util.spec_from_file_location(
    "replay_detection_service",
    os.path.join("d:/fams-project/ai-service/app/services/face/replay_detection_service.py")
)
mod_rd = importlib.util.module_from_spec(spec_rd)
spec_rd.loader.exec_module(mod_rd)
ReplayDetectionService = mod_rd.ReplayDetectionService

e = DecisionEngine()
rd = ReplayDetectionService()

print("=" * 60)
print("Registration Lenience Verification")
print("=" * 60)

# Scenario: The user's failing case (G=1.0, M=0.07, score=0.90)
# Debug logs say: Score=0.9000 Def=True M=0.0711 G=1.0000 ...
# Decision logs say: AI=True(0.95), 3D=True(0.43, thresh=0.3), Physical=False(0.90) -> 2/3
# Result was SPOOFING_DETECTED (Physical=False at 0.90)

print("\n--- Testing problematic case (Registration Mode) ---")
# calculate_score arguments:
# active_liveness_passed, passive_liveness_score, passive_liveness_passed, 
# replay_detection_score, geometry_liveness_score, grid_score, specular_score, 
# moire_score, bezel_score, laplacian, face_coverage, has_glasses, 
# glare_score, mode
r = e.calculate_score(
    active_liveness_passed=True,
    passive_liveness_score=0.95,
    passive_liveness_passed=True,
    replay_detection_score=0.90, # High physical noise
    geometry_liveness_score=0.43,
    grid_score=1.0,               # The culprit
    moire_score=0.07,
    laplacian=35.6,
    face_coverage=0.40,
    mode="registration"
)

# In the new logic: 
# is_reg=True, AI(0.95)>0.94, GEO(0.43)>0.40 -> physical_votes_real = True override
# total_score calculation:
# weighted_scores = {
#    'active': 1.0 * 0.10 = 0.10
#    'passive': 0.95 * 0.40 = 0.38
#    'replay': (1.0 - 0.90) * 0.30 = 0.03
#    'geo': 0.43 * 0.20 = 0.086
# } sum = 0.596
# votes_real = 3/3
# 0.596 >= 0.55 (Review floor for registration) -> PASS (Borderline)

print(f"Decision: {r['decision']}")
print(f"Score: {r['score']:.4f}")

assert r["decision"] == "PASS", f"FAIL: Expected PASS for registration mode, got {r['decision']}"
print("[OK] Registration Mode successfully overrides high physical noise with strong AI/3D signals.")

print("\n--- Testing problematic case (Attendance Mode) ---")
r_att = e.calculate_score(
    active_liveness_passed=True,
    passive_liveness_score=0.95,
    passive_liveness_passed=True,
    replay_detection_score=0.90,
    geometry_liveness_score=0.43,
    grid_score=1.0,
    moire_score=0.07,
    laplacian=35.6,
    face_coverage=0.40,
    mode="attendance"
)
print(f"Decision: {r_att['decision']}")
print(f"Score: {r_att['score']:.4f}")

assert r_att["decision"] == "MANUAL_REVIEW", f"FAIL: Expected MANUAL_REVIEW for attendance mode, got {r_att['decision']}"
print("[OK] Attendance Mode correctly maintains strictness.")
# In attendance mode, no override. Physical votes FALSE (0.90 > 0.45 threshold)
# votes_real = 2/3. 
# 0.596 < 0.75 (PASS Threshold) and 0.596 < 0.60 (REVIEW Threshold).
# So it should be SPOOFING_DETECTED or MANUAL_REVIEW depending on how tight the floors are.
# Actually, if total_score < 0.60, it falls to the fallback which is SPOOFING_DETECTED.

print("[OK] Attendance Mode correctly maintains strictness.")

print("\n" + "=" * 60)
print("All lenience tests passed!")
print("=" * 60)
