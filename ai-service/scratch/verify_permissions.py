import sys
import os

# Add project root to sys.path
project_root = "/Users/mac/Desktop/hello/fams-project/ai-service"
sys.path.append(project_root)

from app.services.chat.router.permissions import check_permission, Role
from app.services.chat.db.tools_loader import tools_loader

def test_permissions():
    print("--- 🔐 VERIFYING PERMISSIONS FIX 🔐 ---")
    
    # 1. Test ACADEMIC_STAFF with count_students_by_major (New hardcoded)
    print("\n[Test 1] Testing ACADEMIC_STAFF with 'count_students_by_major' (Hardcoded update)")
    allowed, reason = check_permission("ACADEMIC_STAFF", "count_students_by_major")
    print(f"Result: {allowed}, Reason: '{reason}'")
    assert allowed is True, "ACADEMIC_STAFF should now have access to count_students_by_major"

    # 2. Test ACADEMIC_STAFF with 'count_students' (Alias check)
    print("\n[Test 2] Testing ACADEMIC_STAFF with 'count_students' (Alias check)")
    allowed, reason = check_permission("ACADEMIC_STAFF", "count_students")
    print(f"Result: {allowed}, Reason: '{reason}'")
    assert allowed is True, "ACADEMIC_STAFF should have access via 'count_students' alias"

    # 3. Test ACADEMIC_STAFF with 'count_student' (Alias check 2)
    print("\n[Test 3] Testing ACADEMIC_STAFF with 'count_student' (Alias check 2)")
    allowed, reason = check_permission("ACADEMIC_STAFF", "count_student")
    print(f"Result: {allowed}, Reason: '{reason}'")
    assert allowed is True, "ACADEMIC_STAFF should have access via 'count_student' alias"

    # 4. Test ACADEMIC_STAFF with 'count_attendance' (Alias check 3)
    print("\n[Test 4] Testing ACADEMIC_STAFF with 'count_attendance' (Alias check 3)")
    allowed, reason = check_permission("ACADEMIC_STAFF", "count_attendance")
    print(f"Result: {allowed}, Reason: '{reason}'")
    assert allowed is True, "ACADEMIC_STAFF should have access via 'count_attendance' alias"

    # 5. Test Dynamic Fallback
    print("\n[Test 5] Testing Dynamic Fallback (Mocking tools_loader.role_tools)")
    # Inject a mock dynamic permission
    tools_loader.role_tools["STUDENT"].add("some_custom_tool")
    
    allowed, reason = check_permission("STUDENT", "some_custom_tool")
    print(f"Result: {allowed}, Reason: '{reason}'")
    assert allowed is True, "Dynamic fallback should work for tools not in hardcoded list"

    print("\n✅ ALL PERMISSION TESTS PASSED!")

if __name__ == "__main__":
    try:
        test_permissions()
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        sys.exit(1)
