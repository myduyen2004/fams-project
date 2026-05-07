import os
import sys
import unittest


ROOT = "/Users/mac/Desktop/hello/fams-project/ai-service"
if ROOT not in sys.path:
    sys.path.append(ROOT)

os.environ.setdefault("SECRET_KEY", "test-secret")

from app.services.chat.db.queries import TEMPLATES, build_params
from app.services.chat.db.tools_loader import tools_loader
from app.services.chat.router.hard_router import hard_router
from app.services.chat.router.light_router import _ROUTE_CACHE, _ROUTE_CACHE_LOCK
from app.services.chat.router.permissions import check_permission
from app.services.chat.router.query_preprocessor import query_preprocessor
from app.services.chat.router.trend_router import trend_router
from app.services.chat.services.llm_client import llm_client


class ChatToolRegressionTest(unittest.TestCase):
    def setUp(self) -> None:
        tools_loader.tool_status.clear()
        tools_loader.inactive_tools.clear()
        tools_loader.backend_actions.clear()
        tools_loader.navigate_only.clear()
        tools_loader.role_tools = {
            "ADMIN": set(),
            "ACADEMIC_STAFF": set(),
            "LECTURER": set(),
            "STUDENT": set(),
        }
        hard_router._cache.clear()
        with _ROUTE_CACHE_LOCK:
            _ROUTE_CACHE.clear()
        self._orig_complete = llm_client.complete
        llm_client.complete = lambda *args, **kwargs: '{"intent":"general_chat","toolName":null,"entities":{},"confidence":"low"}'

    def tearDown(self) -> None:
        llm_client.complete = self._orig_complete

    def trend_flow(self, message: str, role: str, user_code: str):
        pre = query_preprocessor.process(message)
        hard = hard_router.route(pre["message"], role)
        trend = None if hard is not None else trend_router.route(pre["message"], role, user_code, history=None)
        return pre, hard, trend

    def test_classmates_is_academic_staff_only(self) -> None:
        allowed, _ = check_permission("ACADEMIC_STAFF", "get_classmates")
        denied, _ = check_permission("STUDENT", "get_classmates")
        self.assertTrue(allowed)
        self.assertFalse(denied)

    def test_query_contracts_for_fixed_tools(self) -> None:
        resolved, params = build_params("get_lecturers_by_expertise", {"expertise": "Java"}, 1, "ACADEMIC_STAFF")
        self.assertEqual(resolved, "get_lecturers_by_expertise")
        self.assertEqual(len(params), 3)

        _, workload_params = build_params("get_lecturer_workload", {"semester_name": "Spring 2026"}, 1, "ACADEMIC_STAFF")
        self.assertEqual(len(workload_params), 8)

        _, sub_spec_params = build_params(
            "get_courses_by_sub_spec",
            {"sub_specialization_code": "AI", "specialization_name": "Kỹ thuật phần mềm"},
            1,
            "STUDENT",
        )
        self.assertEqual(len(sub_spec_params), 4)

        _, attendance_params = build_params("get_my_attendance_status", {"user_code": "SE170001"}, 99, "STUDENT")
        self.assertEqual(attendance_params, (99, "SE170001"))

    def test_current_semester_guards_exist_in_templates(self) -> None:
        self.assertIn("sem.status = 'ONGOING'", TEMPLATES["get_my_schedule"])
        self.assertIn("sem.status = 'ONGOING'", TEMPLATES["get_my_schedule_targeted"])
        self.assertIn("sem.status = 'ONGOING'", TEMPLATES["get_lecturer_schedule_by_search"])
        self.assertIn("sem.status = 'ONGOING'", TEMPLATES["get_student_schedule_by_search"])
        self.assertIn("(%s = '' AND s.status = 'ONGOING')", TEMPLATES["get_classes_by_semester"])
        self.assertIn("sem.status = 'ONGOING'", TEMPLATES["get_my_attendance_status"])

    def test_stage2_trend_router_regressions(self) -> None:
        _, hard, trend = self.trend_flow("GV theo chuyên môn là IT", "ACADEMIC_STAFF", "AS001")
        self.assertIsNone(hard)
        self.assertEqual(trend["toolName"], "get_lecturers_by_expertise")
        self.assertEqual(trend["entities"].get("expertise"), "IT")

        _, _, trend = self.trend_flow("GV theo ngành CNTT", "ACADEMIC_STAFF", "AS001")
        self.assertEqual(trend["toolName"], "get_lecturers_by_major")
        self.assertEqual(trend["entities"].get("major_name"), "CNTT")

        _, _, trend = self.trend_flow("Cho tôi tất cả phòng hôm nay", "ACADEMIC_STAFF", "AS001")
        self.assertEqual(trend["toolName"], "get_all_rooms_today")
        self.assertEqual(trend["entities"].get("date"), "TODAY")

        _, _, trend = self.trend_flow("Ngày mai có những slot nào", "ACADEMIC_STAFF", "AS001")
        self.assertEqual(trend["toolName"], "get_slots_by_date")
        self.assertEqual(trend["entities"].get("date"), "TOMORROW")

        _, _, trend = self.trend_flow("Các lớp trong học kỳ này", "ACADEMIC_STAFF", "AS001")
        self.assertEqual(trend["toolName"], "get_classes_by_semester")

        _, _, trend = self.trend_flow("Tôi đang dạy những lớp nào học kỳ này?", "LECTURER", "GV115211")
        self.assertEqual(trend["toolName"], "view_teaching_classes")
        self.assertEqual(trend["intent"], "navigation")

    def test_stage1_hard_router_defers_course_by_sub_spec_query(self) -> None:
        _, hard, trend = self.trend_flow("Môn của chuyên ngành hẹp AI", "STUDENT", "SE170001")
        self.assertIsNone(hard)
        self.assertEqual(trend["toolName"], "get_courses_by_sub_spec")


if __name__ == "__main__":
    unittest.main()
