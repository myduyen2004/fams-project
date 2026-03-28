"""Isolated verification of FAS-primary architecture."""
import sys, os, importlib.util

# Direct import of just decision_engine.py, bypassing __init__.py
spec = importlib.util.spec_from_file_location(
    "decision_engine",
    os.path.join("d:/fams-project/ai-service/app/services/face/decision_engine.py")
)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
DecisionEngine = mod.DecisionEngine

e = DecisionEngine()

print("=" * 60)
print("FAS-Primary Architecture Verification")
print("=" * 60)

# Scenario 1: REAL FACE — FAS says real, low replay score, realistic depth
# Expected: PASS
r = e.calculate_score(True, 0.95, True, 0.05, 0.5)
assert r["decision"] == "PASS", f"FAIL: Expected PASS for real face, got {r['decision']}"
print(f"[OK] Real face: {r['decision']} score={r['score']:.2f}")

# Scenario 2: REAL FACE — FAS says real, moderate replay noise (0.35)
# Expected: PASS
r = e.calculate_score(True, 0.9, True, 0.35, 0.45)
assert r["decision"] == "PASS", f"FAIL: Real face with 0.35 replay got {r['decision']}"
print(f"[OK] Real face + noise (0.35 replay): {r['decision']} score={r['score']:.2f}")

# Scenario 3: SCREEN — FAS says fake
# Expected: SPOOFING_DETECTED
r = e.calculate_score(True, 0.3, False, 0.1, 0.3)
assert r["decision"] == "SPOOFING_DETECTED", f"FAIL: Expected SPOOFING for FAS fake, got {r['decision']}"
print(f"[OK] Screen (FAS fake): {r['decision']} score={r['score']:.2f}")

# Scenario 4: SCREEN — FAS says fake + high replay score 
# Expected: SPOOFING_DETECTED
r = e.calculate_score(True, 0.2, False, 0.8, 0.1)
assert r["decision"] == "SPOOFING_DETECTED", f"FAIL: Expected SPOOFING, got {r['decision']}"
print(f"[OK] Screen (FAS fake + high replay): {r['decision']} score={r['score']:.2f}")

# Scenario 5: FAS says real but very high replay (0.95)
# Expected: SPOOFING_DETECTED (veto at 0.92 for attendance)
r = e.calculate_score(True, 0.95, True, 0.95, 0.5)
assert r["decision"] == "SPOOFING_DETECTED", f"FAIL: Expected SPOOFING for 0.95 replay, got {r['decision']}"
print(f"[OK] FAS real but replay veto (0.95): {r['decision']} score={r['score']:.2f}")

# Scenario 6: Borderline — FAS real but replay at 0.45
# Expected: PASS
r = e.calculate_score(True, 0.9, True, 0.45, 0.5)
assert r["decision"] == "PASS", f"FAIL: 0.45 replay should be PASS, got {r['decision']}"
print(f"[OK] FAS real + borderline replay (0.45): {r['decision']} score={r['score']:.2f}")

print()
print("=" * 60)
print("All FAS-Primary tests passed!")
print("=" * 60)
