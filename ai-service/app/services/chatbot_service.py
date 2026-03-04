import os
import re
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import date, datetime
from typing import Dict, List, Any, Optional, Tuple, Union
from collections import OrderedDict
import requests
import sys
import pandas as pd
import io
from loguru import logger

# Configure logging
logger.remove()
logger.add(sys.stderr, level="DEBUG")

class DateTimeEncoder(json.JSONEncoder):
    """Custom JSON encoder to handle date/datetime objects"""
    def default(self, obj):
        if isinstance(obj, (date, datetime)):
            return obj.isoformat()
        return super().default(obj)

# === Comprehensive Universal Database Schema for Smart Reasoning ===
DB_SCHEMA_INFO = """
SYSTEM CONTEXT: You are a SQL Expert for the FAMS system.
DATABASE TABLES:
- academic_staff_profiles: bio, major_id, user_id (FK users.id)
- attendance_sessions: class_name, date, end_time, lecturer_id, room_id, start_time, status
- class_sections: class_name, course_id (FK courses.id), lecturer_id (FK users.id), semester_id (FK semesters.id)
- courses: code, credits, description, id, name, status
- enrollments: class_name, id, student_id (FK users.id)
- grade_components: course_id, id, name, type, weight
- lecturer_profiles: bio, department, expertise, major_id, user_id (FK users.id)
- majors: code, id, name, status
- semesters: code, end_date, id, name, start_date, status
- slot_types: end_time, start_time, semester_id, slot_index
- specializations: code, id, name, major_id
- sub_specializations: code, name, specialization_id
- specialization_courses: specialization_id, course_id, semester
- sub_specialization_courses: sub_specialization_id, course_id
- student_grades: attempt, enrollment_id, grade_component_id, score
- student_profiles: gpa, major_id, specialization_id, sub_specialization_id, user_id
- users: id, full_name, code, role, status
- timetable_slots: class_name, date, slot_number, room_id, slot_type_id, status

COMMON QUERIES:
- Student GPA: SELECT u.full_name, sp.gpa FROM users u JOIN student_profiles sp ON u.id = sp.user_id WHERE u.code = '...'
- Class Schedule: SELECT ts.* FROM timetable_slots ts WHERE ts.class_name = '...' AND ts.date >= CURRENT_DATE
- Lecturer Info: SELECT u.full_name, lp.expertise FROM users u JOIN lecturer_profiles lp ON u.id = lp.user_id WHERE u.full_name ILIKE '%...%'
- Course Specialization: SELECT s.name FROM specializations s JOIN specialization_courses sc ON s.id = sc.specialization_id JOIN courses c ON sc.course_id = c.id WHERE c.code = '...' OR c.name ILIKE '%...%'
- Sub Specialization: SELECT ss.name FROM sub_specializations ss JOIN specializations s ON ss.specialization_id = s.id WHERE s.name ILIKE '%...%' OR s.code = '...'
"""

class OpenRouterConfig:
    """Groq API configuration (OpenAI compatible)"""
    api_key: str = os.getenv('GROQ_API_KEY', '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')
    base_url: str = os.getenv('GROQ_BASE_URL', 'https://api.groq.com/openai/v1')
    model: str = os.getenv('GROQ_MODEL', 'llama-3.3-70b-versatile')
    fallback_models: List[str] = [
        "llama-3.1-8b-instant",
        "mistral-saba-24b",
        "qwen/qwen3-32b",
        "deepseek-r1-distill-llama-70b",
        "meta-llama/llama-4-scout-17b-16e-instruct"
    ]
    timeout: int = int(os.getenv('OPENROUTER_TIMEOUT', '60'))
    max_retries: int = int(os.getenv('OPENROUTER_MAX_RETRIES', '5'))
    retry_delay: float = float(os.getenv('OPENROUTER_RETRY_DELAY', '1.0'))
    temperature: float = 0.5
    max_tokens: int = 2048
    top_p: float = 0.9

class ChatbotService:
    def __init__(self):
        # Stage 0: LRU Cache for hard routing
        self.cache_size = 100
        self.cache = OrderedDict()
        
        # Safe SQL Templates for Tool Executor
        self.sql_templates = {
            "get_students_by_major": """
                SELECT u.full_name, u.code, sp.gpa, m.name as major
                FROM users u 
                LEFT JOIN student_profiles sp ON u.id = sp.user_id 
                LEFT JOIN majors m ON sp.major_id = m.id 
                WHERE (unaccent(m.name) ILIKE unaccent(%s) OR unaccent(m.code) ILIKE unaccent(%s) OR %s = '') 
                AND u.status = 'ACTIVE' AND u.role = 'STUDENT'
                ORDER BY sp.gpa DESC NULLS LAST
                LIMIT 20
            """,
            # NOTE: get_all_majors defined below with full version
            "get_lecturers_by_major": """
                SELECT u.full_name, u.code, lp.expertise, lp.department as major
                FROM users u 
                LEFT JOIN lecturer_profiles lp ON u.id = lp.user_id 
                WHERE (unaccent(lp.department) ILIKE unaccent(%s) OR unaccent(lp.expertise) ILIKE unaccent(%s) OR %s = '') 
                AND u.status = 'ACTIVE' AND u.role = 'LECTURER'
                ORDER BY u.full_name
                LIMIT 20
            """,
            "get_classes_by_semester": """
                SELECT cs.class_code, cs.class_name, s.name as semester 
                FROM class_sections cs 
                JOIN semesters s ON cs.semester_id = s.id 
                WHERE (unaccent(s.code) ILIKE unaccent(%s) OR unaccent(s.name) ILIKE unaccent(%s)) 
                LIMIT 20
            """,
            "count_students_by_major": """
                SELECT m.name as major_name, COUNT(sp.user_id) as total_students
                FROM majors m
                LEFT JOIN student_profiles sp ON m.id = sp.major_id
                WHERE unaccent(m.name) ILIKE unaccent(%s) OR unaccent(m.code) ILIKE unaccent(%s)
                GROUP BY m.name
            """,
            "get_courses_by_name": """
                SELECT code, name, credits, status 
                FROM courses 
                WHERE unaccent(name) ILIKE unaccent(%s) OR unaccent(code) ILIKE unaccent(%s) 
                LIMIT 20
            """,
            "get_specializations_by_major": """
                SELECT s.name, s.code, s.status 
                FROM specializations s
                JOIN majors m ON s.major_id = m.id
                WHERE (unaccent(m.name) ILIKE unaccent(%s) OR unaccent(m.code) ILIKE unaccent(%s) OR %s = '')
            """,
            "get_sub_specializations": """
                SELECT ss.name as sub_spec_name, ss.code as sub_spec_code, s.name as spec_name
                FROM sub_specializations ss
                JOIN specializations s ON ss.specialization_id = s.id
                WHERE (unaccent(s.name) ILIKE unaccent(%s) OR unaccent(s.code) ILIKE unaccent(%s) OR %s = '')
            """,
            "get_courses_by_spec": """
                SELECT c.code, c.name, sc.semester
                FROM courses c
                JOIN specialization_courses sc ON c.id = sc.course_id
                JOIN specializations s ON sc.specialization_id = s.id
                WHERE (unaccent(s.name) ILIKE unaccent(%s) OR unaccent(s.code) ILIKE unaccent(%s) OR %s = '')
                ORDER BY sc.semester
            """,
            "get_courses_by_sub_spec": """
                SELECT c.code, c.name
                FROM courses c
                JOIN sub_specialization_courses ssc ON c.id = ssc.course_id
                JOIN sub_specializations ss ON ssc.sub_specialization_id = ss.id
                WHERE (unaccent(ss.name) ILIKE unaccent(%s) OR unaccent(ss.code) ILIKE unaccent(%s) OR %s = '')
            """,
            "get_major_id_by_name": "SELECT id, name FROM majors WHERE (unaccent(name) ILIKE unaccent(%s) OR unaccent(code) ILIKE unaccent(%s)) AND status = 'ACTIVE' LIMIT 1",
            "create_major": "INSERT INTO majors (code, name, status, created_at, updated_at) VALUES (%s, %s, 'ACTIVE', NOW(), NOW()) RETURNING id",
            "create_course": "INSERT INTO courses (code, name, credits, status, created_at, updated_at) VALUES (%s, %s, %s, 'ACTIVE', NOW(), NOW()) RETURNING id",
            "get_specialization_id_by_name": "SELECT id, name FROM specializations WHERE (unaccent(name) ILIKE unaccent(%s) OR unaccent(code) ILIKE unaccent(%s)) AND status = 'ACTIVE' LIMIT 1",
            "get_semester_info": "SELECT code, name, start_date, end_date, status FROM semesters ORDER BY start_date DESC LIMIT 10",
            "get_lecturers_by_expertise": """
                SELECT u.full_name, lp.expertise, lp.department
                FROM users u
                LEFT JOIN lecturer_profiles lp ON u.id = lp.user_id
                WHERE unaccent(lp.expertise) ILIKE unaccent(%s)
                LIMIT 20
            """,
            # NOTE: get_all_lecturers and get_all_students defined below with full versions
            "get_my_schedule": """
                SELECT ts.date, ts.slot_number, cs.class_name, r.name as room, st.start_time, st.end_time
                FROM timetable_slots ts
                JOIN class_sections cs ON ts.class_name = cs.class_name
                LEFT JOIN rooms r ON ts.room_id = r.id
                LEFT JOIN slot_types st ON ts.slot_type_id = st.id
                LEFT JOIN enrollments e ON cs.class_name = e.class_name
                WHERE (e.student_id = %s OR cs.lecturer_id = %s)
                AND ts.date >= CURRENT_DATE
                ORDER BY ts.date, ts.slot_number
                LIMIT 10
            """,
            "get_my_grades": """
                SELECT c.name as course_name, sg.score, gc.name as component, sg.attempt
                FROM student_grades sg
                JOIN enrollments e ON sg.enrollment_id = e.id
                JOIN grade_components gc ON sg.grade_component_id = gc.id
                JOIN courses c ON gc.course_id = c.id
                WHERE e.student_id = %s
                ORDER BY c.name, gc.name
            """,
            "get_class_schedule": """
                SELECT ts.date, ts.slot_number, r.name as room, st.start_time, st.end_time
                FROM timetable_slots ts
                LEFT JOIN rooms r ON ts.room_id = r.id
                LEFT JOIN slot_types st ON ts.slot_type_id = st.id
                WHERE ts.class_name = %s
                AND ts.date >= CURRENT_DATE
                ORDER BY ts.date, ts.slot_number
                LIMIT 10
            """,
            "get_all_majors": "SELECT code, name, status FROM majors WHERE status = 'ACTIVE'",
            "get_top_students": """
                SELECT u.full_name, u.code, sp.gpa, m.name as major
                FROM users u
                JOIN student_profiles sp ON u.id = sp.user_id
                JOIN majors m ON sp.major_id = m.id
                WHERE u.status = 'ACTIVE'
                ORDER BY sp.gpa DESC
                LIMIT 10
            """,
            "get_my_notifications": """
                SELECT n.title, n.content, n.sent_at, nr.is_read
                FROM notifications n
                JOIN notification_recipients nr ON n.id = nr.notification_id
                WHERE nr.recipient_id = %s
                ORDER BY n.sent_at DESC
                LIMIT 10
            """,
            "get_all_notifications": """
                SELECT title, content, target_type, status, sent_at
                FROM notifications
                ORDER BY sent_at DESC
                LIMIT 20
            """,
            "get_all_lecturers": """
                SELECT u.full_name, u.code, lp.expertise, lp.department
                FROM users u
                LEFT JOIN lecturer_profiles lp ON u.id = lp.user_id
                WHERE u.status = 'ACTIVE' AND u.role = 'LECTURER'
                LIMIT 50
            """,
            "get_all_students": """
                SELECT u.full_name, u.code, sp.gpa, m.name as major
                FROM users u
                LEFT JOIN student_profiles sp ON u.id = sp.user_id
                LEFT JOIN majors m ON sp.major_id = m.id
                WHERE u.status = 'ACTIVE' AND u.role = 'STUDENT'
                LIMIT 50
            """,
            "search_user_by_name": """
                SELECT u.full_name, u.code, u.email, u.phone, u.dob, u.role, u.status, sp.gpa, lp.expertise, 
                       COALESCE(m.name, lp.department) as major
                FROM users u 
                LEFT JOIN student_profiles sp ON u.id = sp.user_id
                LEFT JOIN lecturer_profiles lp ON u.id = lp.user_id
                LEFT JOIN majors m ON sp.major_id = m.id
                WHERE unaccent(u.full_name) ILIKE unaccent(%s)
                LIMIT 10
            """,
            "get_student_by_code": """
                SELECT u.full_name, u.code, u.email, u.phone, u.dob, u.status, sp.gpa, m.name as major
                FROM users u
                LEFT JOIN student_profiles sp ON u.id = sp.user_id
                LEFT JOIN majors m ON sp.major_id = m.id
                WHERE (u.code = %s OR u.full_name ILIKE %s) AND u.role = 'STUDENT'
            """,
            "get_lecturer_by_code": """
                SELECT u.full_name, u.code, u.email, lp.expertise, lp.department
                FROM users u 
                LEFT JOIN lecturer_profiles lp ON u.id = lp.user_id 
                WHERE (u.code = %s OR u.full_name ILIKE %s) AND u.role = 'LECTURER'
            """,
            "get_students_by_class": """
                SELECT u.full_name, u.code, u.email, u.phone, e.class_name
                FROM users u
                JOIN enrollments e ON u.id = e.student_id
                JOIN class_sections cs ON e.class_name = cs.class_name
                JOIN courses c ON cs.course_id = c.id
                WHERE (unaccent(e.class_name) ILIKE unaccent(%s) OR unaccent(c.code) ILIKE unaccent(%s) OR unaccent(c.name) ILIKE unaccent(%s))
                AND (cs.lecturer_id = %s OR %s = -1)
                LIMIT 100
            """,
            "get_lecturer_schedule_by_search": """
                SELECT ts.date, ts.slot_number, cs.class_name, r.name as room, st.start_time, st.end_time, u.full_name as lecturer_name, sem.name as semester
                FROM timetable_slots ts
                JOIN class_sections cs ON ts.class_name = cs.class_name
                JOIN users u ON cs.lecturer_id = u.id
                LEFT JOIN semesters sem ON cs.semester_id = sem.id
                LEFT JOIN rooms r ON ts.room_id = r.id
                LEFT JOIN slot_types st ON ts.slot_type_id = st.id
                WHERE (unaccent(u.full_name) ILIKE unaccent(%s) OR u.code = %s)
                AND ts.date >= (CURRENT_DATE - INTERVAL '14 days')
                ORDER BY ts.date, ts.slot_number
                LIMIT 50
            """,
            "get_student_schedule_by_search": """
                SELECT ts.date, ts.slot_number, cs.class_name, r.name as room, st.start_time, st.end_time, u.full_name as student_name, sem.name as semester
                FROM timetable_slots ts
                JOIN class_sections cs ON ts.class_name = cs.class_name
                JOIN enrollments e ON cs.class_name = e.class_name
                JOIN users u ON e.student_id = u.id
                LEFT JOIN semesters sem ON cs.semester_id = sem.id
                LEFT JOIN rooms r ON ts.room_id = r.id
                LEFT JOIN slot_types st ON ts.slot_type_id = st.id
                WHERE (unaccent(u.full_name) ILIKE unaccent(%s) OR u.code = %s)
                AND ts.date >= (CURRENT_DATE - INTERVAL '14 days')
                ORDER BY ts.date, ts.slot_number
                LIMIT 50
            """,
            "get_empty_rooms": """
                SELECT r.name, r.capacity
                
                FROM rooms r
                WHERE r.id NOT IN (
                    SELECT room_id FROM timetable_slots 
                    WHERE date = CURRENT_DATE 
                    AND slot_number = (
                        SELECT slot_index FROM slot_types 
                        WHERE CURRENT_TIME BETWEEN start_time AND end_time 
                        LIMIT 1
                    )
                )
                AND r.status = 'ACTIVE'
                ORDER BY r.name
            """,
            "get_students_without_class": """
                SELECT u.full_name, u.code, u.email
                FROM users u
                WHERE u.role = 'STUDENT' AND u.status = 'ACTIVE'
                AND u.id NOT IN (SELECT student_id FROM enrollments)
                LIMIT 50    
            """,
            "create_room": "INSERT INTO rooms (name, capacity, status, created_at, updated_at) VALUES (%s, %s, 'ACTIVE', NOW(), NOW()) RETURNING id",
            "create_semester": "INSERT INTO semesters (code, name, start_date, end_date, status, created_at, updated_at) VALUES (%s, %s, %s, %s, 'UPCOMING', NOW(), NOW()) RETURNING id",
            "create_specialization": "INSERT INTO specializations (code, name, major_id, status, created_at, updated_at) VALUES (%s, %s, %s, 'ACTIVE', NOW(), NOW()) RETURNING id"
        }
        
        # Route Mapping for Navigation
        self.route_mapping = {
            # Academic Staff Routes
            "view_lecturers": "/academic-staff/lecturers",
            "view_students": "/academic-staff/students",
            "view_majors": "/academic-staff/majors",
            "view_semesters": "/academic-staff/semesters",
            "view_courses": "/academic-staff/courses",
            "view_schedule": "/academic-staff/schedule",
            "view_results": "/academic-staff/academic-results",
            "view_rooms": "/academic-staff/rooms",
            "view_requests": "/academic-staff/requests",
            "view_classes": "/academic-staff/classes",
            "view_dashboard": "/academic-staff/dashboard",
            "view_specializations": "/academic-staff/majors", # Quản lý chuyên ngành nằm trong trang Major
            "view_sub_specializations": "/academic-staff/majors", # Tạm thời về Majors, user sẽ click vào detail
            
            # Admin Routes
            "view_users": "/admin/users",
            "view_logs": "/admin/system-logs",
            "view_alerts": "/admin/alerts",
            "view_notifications": "/admin/notification-management",
            
            # Common/Legacy Mapping
            "get_all_lecturers": "/academic-staff/lecturers",
            "get_all_students": "/academic-staff/students",
            "get_all_majors": "/academic-staff/majors",
            "get_semester_info": "/academic-staff/semesters",
            "get_courses_by_name": "/academic-staff/courses",
            "get_my_schedule": "/academic-staff/schedule",
            "get_my_grades": "/academic-staff/academic-results",
            "get_my_notifications": "/notifications",
            "get_students_by_class": "/academic-staff/students",
            "view_profile": "/admin/profile",
            "get_own_schedule": "/academic-staff/schedule",
            "get_own_grades": "/academic-staff/academic-results"
        }
        
        # OpenRouter Config
        self.config = OpenRouterConfig()

    def _get_db_connection(self):
        db_name = os.getenv("DB_NAME", "fams_db")
        db_user = os.getenv("DB_USER", "postgres")
        db_password = os.getenv("DB_PASSWORD", "postgres123")
        db_host = os.getenv("DB_HOST", "postgres")
        db_port = os.getenv("DB_PORT", "5432")
        
        logger.info(f"Connecting to DB: {db_host}:{db_port}/{db_name} as {db_user}")
        
        conn = psycopg2.connect(
            dbname=db_name,
            user=db_user,
            password=db_password,
            host=db_host,
            port=db_port
        )
        conn.autocommit = True
        return conn

    def full_flow(self, user_id: int, user_role: str, user_code: str, message: str, history: List[Dict[str, str]] = None, routing_model: str = None, answer_model: str = None) -> Dict[str, Any]:
        thinking_steps = []
        
        # Stage 0: Hard Router (Regex/Cache)
        thinking_steps.append({"stage": 0, "name": "Hard Router", "status": "Checking cache/patterns..."})
        hard_res = self._stage_0_hard_router(message, user_role)
        intent_data = None
        if hard_res:
            if isinstance(hard_res, dict) and hard_res.get("intent") == "direct_response":
                # Hard router found a direct string response
                thinking_steps[0]["status"] = "Matched direct pattern"
                return {
                    "answer": hard_res["answer"],
                    "thinkingSteps": thinking_steps,
                    "redirectPath": None
                }
            else:
                # Hard router found a structured intent (Save credits/Instant)
                intent_data = hard_res
                thinking_steps[0]["status"] = f"Pattern Matched: {intent_data.get('intent')}"
        
        # Stage 1: Light Router (Only if Stage 0 didn't find an intent)
        if not intent_data:
            thinking_steps.append({"stage": 1, "name": "Light Router", "status": f"Analyzing intent using {routing_model or self.config.model} for role {user_role} ({user_code})..."})
            intent_data = self._stage_1_light_router(message, user_role, user_code, history, routing_model)
        else:
            # If intent_data was set by hard router, add a placeholder for Stage 1
            thinking_steps.append({"stage": 1, "name": "Light Router", "status": "Skipped (Intent from Hard Router)"})

        if not isinstance(intent_data, dict):
            logger.warning(f"intent_data is not a dict: {intent_data}. Falling back to general chat.")
            intent_data = {"intent": "general_chat", "toolName": None, "entities": {}}

        thinking_steps[1]["status"] = f"Intent: {intent_data.get('intent', 'unknown')}"
        thinking_steps[1]["detail"] = json.dumps(intent_data, indent=2, ensure_ascii=False, cls=DateTimeEncoder)
        
        # Stage 2: Tool Executor
        tool_res = None
        intent = intent_data.get("intent")
        tool_name_for_stage2 = intent_data.get("toolName")
        
        # Action intents (create_notification, send_email, create_user, etc.) are handled by the backend,
        # NOT by SQL. Skip Stage 2 for these and let the backend dispatch the action.
        backend_action_tools = [
            "create_notification", "send_email", "create_user", "update_user", "delete_user"
        ]
        is_backend_action = (intent == "action" and tool_name_for_stage2 in backend_action_tools)
        
        if is_backend_action:
            # Skip Stage 2 for backend-dispatched actions
            action_params = intent_data.get("action", {}).get("params", {})
            tool_res = f"Hành động {tool_name_for_stage2} sẽ được thực hiện với thông tin: {json.dumps(action_params, ensure_ascii=False)}"
            thinking_steps.append({"stage": 2, "name": "Tool Executor", "status": f"Skipped (Backend action: {tool_name_for_stage2})"})
        elif tool_name_for_stage2 or intent_data.get("dynamicSql"):
            t_name = tool_name_for_stage2 or "dynamic_sql"
            thinking_steps.append({"stage": 2, "name": "Tool Executor", "status": f"Running {t_name}..."})
            tool_res = self._stage_2_tool_executor(intent_data, user_id, user_role)
            found_count = len(tool_res) if isinstance(tool_res, list) else 0
            thinking_steps[2]["status"] = f"Finished. Found {found_count} results."
            thinking_steps[2]["detail"] = json.dumps({"count": found_count}, indent=2, ensure_ascii=False, cls=DateTimeEncoder)
        else:
            thinking_steps.append({"stage": 2, "name": "Tool Executor", "status": "Skipped (No tool needed)"})

        # Stage 3: Answer Generator
        thinking_steps.append({"stage": 3, "name": "Answer Generator", "status": f"Generating response using {answer_model or self.config.model}..."})
        answer = self._stage_3_answer_generator(message, intent_data, tool_res, history, answer_model)
        
        # Calculate dynamic redirect path based on role
        tool_name = intent_data.get("toolName")
        redirect_path = intent_data.get("redirectPath") or self.route_mapping.get(tool_name)
        
        if redirect_path:
            # Role-specific overrides
            role_prefix = user_role.lower().replace("_", "-")
            if role_prefix in ["lecturer", "student"]:
                if "/academic-staff/" in redirect_path:
                    redirect_path = redirect_path.replace("/academic-staff/", f"/{role_prefix}/")

        return {
            "answer": answer,
            "thinkingSteps": thinking_steps,
            "redirectPath": redirect_path,
            "action": intent_data.get("action")
        }

    def excel_flow(self, user_id, user_role, user_code, file_content, filename, history, routing_model=None, answer_model=None):
        """
        Special flow for Excel analysis
        """
        try:
            # 1. Analyze Excel
            excel_summary = self.analyze_excel(file_content, filename)
            
            # 2. Construct a message for the LLM that includes the excel summary
            user_message = f"Tôi đã tải lên file Excel '{filename}'. Đây là tóm tắt dữ liệu:\n\n{excel_summary}\n\nHãy phân tích dữ liệu này và cho tôi biết bạn thấy gì nổi bật hoặc trả lời các câu hỏi sau này của tôi dựa trên dữ liệu này."
            
            # 3. Use the normal flow to get an answer
            # Use stage 1 to understand intent (though it's usually just 'general_chat' or 'data_query' for Excel)
            intent_data = self._stage_1_light_router(user_message, user_role, user_code, history, routing_model)
            
            # Generate the final answer using the summary as the "tool result"
            answer = self._stage_3_answer_generator(user_message, intent_data, {"excel_summary": excel_summary}, history, answer_model)
            
            thinking_steps = [
                {"stage": 1, "name": "Excel Analysis", "status": "COMPLETED", "detail": f"Analyzed file {filename}. Summary generated."},
                {"stage": 2, "name": "Intent Recognition", "status": "COMPLETED", "detail": f"Routed to {intent_data.get('intent')}"},
                {"stage": 3, "name": "Answer Generation", "status": "COMPLETED", "detail": "Generated response based on Excel data."},
            ]
            
            return {
                "answer": answer,
                "thinkingSteps": thinking_steps,
                "excelSummary": excel_summary,
                "action": intent_data.get("action"),
                "redirectPath": intent_data.get("redirectPath")
            }
        except Exception as e:
            logger.error(f"Error in excel_flow: {e}")
            raise

    def analyze_excel(self, file_content: bytes, filename: str) -> str:
        """
        Reads Excel file and returns a structured text summary for LLM context
        """
        try:
            # Create a file-like object from bytes
            excel_file = io.BytesIO(file_content)
            
            # Read first sheet
            df = pd.read_excel(excel_file)
            
            # Basic stats
            rows, cols = df.shape
            columns = df.columns.tolist()
            
            # Get all data as a sample (rendered as markdown-like text)
            # We use to_string() and check if it's too large for the LLM context
            full_data_str = df.to_string(index=False)
            
            # If data is too large (> 100,000 characters), we might still need to truncate
            # but we'll try to provide as much as possible.
            if len(full_data_str) > 100000:
                logger.warning(f"Excel data for {filename} is too large ({len(full_data_str)} chars), truncating.")
                full_data_str = df.head(500).to_string(index=False) + "\n\n...(Dữ liệu quá lớn, đã lược bớt phần sau)..."
            
            # Numeric summary if available
            numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
            stats_summary = ""
            if numeric_cols:
                stats_summary = "\nThống kê cơ bản:\n" + df[numeric_cols].describe().to_string()
            
            summary = f"File: {filename}\n"
            summary += f"Kích thước: {rows} hàng, {cols} cột\n"
            summary += f"Các cột: {', '.join(columns)}\n"
            summary += f"\nDữ liệu chi tiết:\n{full_data_str}\n"
            if stats_summary:
                summary += stats_summary
                
            return summary
        except Exception as e:
            logger.error(f"Error analyzing Excel {filename}: {e}")
            return f"Không thể phân tích file Excel: {str(e)}"

    def _stage_0_hard_router(self, message: str, user_role: str = None) -> Optional[Union[str, Dict[str, Any]]]:
        # LRU Cache check
        if message in self.cache:
            self.cache.move_to_end(message)
            cached_val = self.cache[message]
            if isinstance(cached_val, dict):
                return cached_val
            # Migrate old string cache to dict
            return {"intent": "direct_response", "answer": cached_val}
        
        # Exact/Regex matching for Navigation & Data
        msg_clean = message.lower().strip()
        
        # 0. Strip common prefixes for clean extraction
        prefixes = ["cho tôi ", "cho xem ", "cho biết ", "hãy ", "vui lòng ", "xem ", "mở ", "vào ", "đi đến ", "ds ", "danh sách "]
        msg_core = msg_clean
        prefix_removed = True
        while prefix_removed:
            prefix_removed = False
            for p in prefixes:
                if msg_core.startswith(p):
                    msg_core = msg_core[len(p):].strip()
                    prefix_removed = True
                    break

        # 1. Hard Clarification Rules (Simple keyword match after stripping)
        clarification_map = {
            "chuyên ngành": "Bạn muốn xem chuyên ngành của **ngành học** nào? (Ví dụ: Công nghệ thông tin, Quản trị kinh doanh...)",
            "specialization": "Bạn muốn xem chuyên ngành của **ngành học** nào? (Ví dụ: Công nghệ thông tin, Quản trị kinh doanh...)",
            "chuyên ngành hẹp": "Bạn muốn xem chuyên ngành hẹp của **chuyên ngành** nào? (Ví dụ: Kỹ thuật phần mềm, Hệ thống thông tin...)",
            "sub-specialization": "Bạn muốn xem chuyên ngành hẹp của **chuyên ngành** nào? (Ví dụ: Kỹ thuật phần mềm, Hệ thống thông tin...)",
            "ngành học": "Bạn muốn xem thông tin chi tiết của **ngành học** nào?",
            "ngành": "Bạn muốn xem thông tin chi tiết của **ngành học** nào?"
        }
        
        if msg_core in clarification_map:
            return {"intent": "direct_response", "answer": clarification_map[msg_core]}

        # 2. Navigation Shortcuts (Intent Data)
        navigation_map = {
            "view_lecturers": ["giáo viên", "gv", "giảng viên", "lecturers"],
            "view_students": ["sinh viên", "sv", "học sinh", "students"],
            "view_majors": ["danh sách ngành", "majors"],
            "view_courses": ["môn học", "môn", "courses"],
            "view_rooms": ["phòng học", "phòng", "rooms"],
            "view_semesters": ["học kỳ", "semesters", "semester", "danh sách kỳ"],
            "view_schedule": ["lịch học", "lịch dạy", "lịch cá nhân", "my schedule", "thời khóa biểu"],
            "view_results": ["bảng điểm", "điểm số", "kết quả học tập", "grades", "xem điểm"],
            "view_users": ["quản lý người dùng", "danh sách tài khoản", "users", "tài khoản"],
            "view_logs": ["nhật ký hệ thống", "logs", "system logs"],
            "view_alerts": ["cảnh báo", "alerts", "system alerts"],
            "view_notifications": ["thông báo", "notifications", "quản lý thông báo"],
            "view_dashboard": ["dashboard", "bảng điều khiển", "tổng quan"],
            "view_profile": ["trang cá nhân", "hồ sơ", "profile", "thông tin của tôi"],
            "view_classes": ["lớp học", "danh sách lớp", "classes"],
        }
        
        for tool, patterns in navigation_map.items():
            if msg_core in patterns:
                return {
                    "intent": "navigation",
                    "toolName": tool,
                    "action": None,
                    "entities": {}
                }

        # 2. Priority: Detect backend-action keywords FIRST - force fallthrough to LLM Stage 1
        # These need structured params that only the LLM can extract
        action_keywords = [
            r"(?:gửi|tạo|soạn)\s+(?:thông báo|email|tin nhắn)",
            r"(?:thông báo cho|nhắn tin cho|email cho)",
            r"(?:tạo|thêm)\s+(?:người dùng|tài khoản|user|sv mới|gv mới)",
            r"(?:vô hiệu hóa|khóa|xóa)\s+(?:tài khoản|user|người dùng)",
        ]
        for pattern in action_keywords:
            if re.search(pattern, msg_clean, re.I):
                logger.info(f"Hard Router: Backend-action keyword detected, deferring to LLM Stage 1")
                return None  # Fall through to Stage 1 LLM for proper param extraction

        # 2. Advanced Data & Action Shortcuts
        shortcuts = {
            # Data Queries (SQL based)
            "get_all_majors": r"(có những ngành nào|kể tên các ngành|chi tiết ngành|danh sách ngành)",
            "get_all_lecturers": r"(giáo viên nào đang dạy|danh sách gv dạy|chi tiết giáo viên|danh sách gv)",
            "get_empty_rooms": r"(phòng nào trống|tìm phòng trống|phòng học trống|danh sách phòng trống)",
            "get_students_without_class": r"(sv chưa có lớp|sinh viên chưa có lớp|sinh viên chưa học)",
            "get_top_students": r"(top 10 sv|top sinh viên|sv xuất sắc|top 10 sinh viên|top gpa)",
            
            # Student/Lecturer code-based lookups (flexible – handles "mã", "mã số", "có mã", etc.)
            "get_student_by_code": r"(?:thông tin|chi tiết|tìm|xem|tra cứu|hỏi về)[\s]+(?:sv|sinh viên)[\s]+(?:mã số |mã |có mã |code )?([A-Z0-9]{3,})",
            "get_other_student_schedule": r"(?:lịch học|lịch|thời khóa biểu)[\s]+(?:của |cho )?(?:sv |sinh viên )?(?:mã số |mã |có mã |code )?([A-Z0-9]{3,})",
            "get_other_lecturer_schedule": r"(?:lịch dạy|lịch|thời khóa biểu)[\s]+(?:của |cho )?(?:gv |giảng viên |thầy |cô )?(?:mã số |mã |có mã |code )?([A-Z0-9]{3,})",
            
            # Name-based user search (Vietnamese names: "tìm thầy Quang", "thông tin bạn Minh", "sinh viên tên Nguyễn Văn A")
            "search_user_by_name_student": r"(?:thông tin|chi tiết|tìm|xem|tra cứu)[\s]+(?:sv|sinh viên|bạn|học sinh)[\s]+(?:tên |là )?([A-ZÀ-Ỹa-zà-ỹ\s]{2,})",
            "search_user_by_name_lecturer": r"(?:thông tin|chi tiết|tìm|xem|tra cứu)[\s]+(?:gv|giảng viên|thầy|cô|giáo viên)[\s]+(?:tên |là )?([A-ZÀ-Ỹa-zà-ỹ\s]{2,})",
            
            # Broader student lookup with "mã" keyword: "sinh viên mã SE001", "sv có mã SE001"
            "get_student_by_code_broad": r"(?:sv|sinh viên)[\s]+(?:mã số |mã |có mã |code )([A-Z0-9]{3,})",
            # Broader lecturer lookup: "giảng viên mã GV001"
            "get_lecturer_by_code_broad": r"(?:gv|giảng viên|thầy|cô)[\s]+(?:mã số |mã |có mã |code )([A-Z0-9]{3,})",
            
            "send_email": r"(?:gửi email|email cho|soạn email) (?:đến |cho )?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})",
            
            # Actions (Mutation/Side-effects)
            "send_email_general": r"(gửi email|email cho|soạn email)",
            "create_notification": r"(tạo thông báo|thông báo cho|nhắn tin cho lớp)",
            "create_user": r"(tạo người dùng|tạo tài khoản|tạo user|thêm người dùng|tạo sv|tạo gv)",
            "update_user": r"(vô hiệu hóa|khóa tài khoản|khóa user|khóa sv)",
            "delete_user": r"(xóa người dùng|xóa user|xóa tài khoản|xóa sv|xóa gv)",
            "create_major": r"(tạo ngành|thêm ngành|tạo major)",
            "create_course": r"(tạo môn học|thêm môn học|thêm course|tạo môn mới)",
            "create_room": r"(tạo phòng|thêm phòng học|thêm phòng|tạo room)",
            "create_semester": r"(tạo học kỳ|thêm học kỳ|tạo semester|thêm kỳ)",
            "create_specialization": r"(tạo chuyên ngành|thêm chuyên ngành)",
            "get_own_schedule": r"(lịch của tôi|lịch học của tôi|lịch dạy của tôi|hôm nay tôi học gì|hôm nay em học gì|lịch của em|hôm nay em học ở đâu|hôm nay tôi dạy ở đâu|hôm nay tôi dạy gì)",
            "get_own_grades": r"(điểm của tôi|bảng điểm của tôi|điểm của em|bảng điểm tôi|điểm tôi|xem điểm của em|điểm kỳ vừa rồi|điểm môn)",
            "get_my_notifications": r"(thông báo của tôi|thông báo mới|có thông báo gì|tb của em|thông báo của em|có thông báo mới nào)",
            
            # Specialization/Sub-spec data queries
            "get_specializations_by_major": r"(?:ngành|chuyên ngành)[\s]+(?:của |thuộc )?(?:ngành )?(.+?)[\s]+(?:có những|gồm|gồm có|bao gồm|có những gì|có chuyên ngành)",
            "get_specializations_by_major_v2": r"(?:chuyên ngành|specialization)[\s]+(?:của |thuộc )(?:ngành )?(.+)",
            "get_courses_by_spec": r"(?:chuyên ngành|specialization)[\s]+(.+?)[\s]+(?:học những môn|có những môn|gồm|bao gồm)",
            
            # Class schedule and student list
            "get_class_schedule": r"(?:lớp|class)[\s]+([A-Z0-9]{2,})[\s]+(?:hôm nay|học|lịch|phòng|ở đâu)",
            "get_students_by_class": r"(?:danh sách|ds|sinh viên|sv)[\s]+(?:của |trong )?(?:lớp |class )?([A-Z0-9]{2,}(?:\s*[A-Z0-9]+)?)",
            
            # Course info: "thông tin môn học X", "chi tiết môn X"
            "get_courses_by_name": r"(?:thông tin|chi tiết|tìm)[\s]+(?:môn học|môn|course)[\s]+(.+)",
            
            # Statistics
            "count_students_by_major": r"(?:bao nhiêu|số lượng|thống kê)[\s]+(?:sv|sinh viên)[\s]+(?:ngành|theo ngành|đang theo học)[\s]+(.+)",
        }
        
        for tool, pattern in shortcuts.items():
            match = re.search(pattern, msg_clean, re.I)
            if match:
                # Resolve generic tools and aliases
                actual_tool = tool.replace("_general", "")
                # Map alias tools to canonical names
                if actual_tool == "get_student_by_code_broad":
                    actual_tool = "get_student_by_code"
                elif actual_tool == "get_lecturer_by_code_broad":
                    actual_tool = "get_lecturer_by_code"
                elif actual_tool == "search_user_by_name_student":
                    actual_tool = "search_user_by_name"
                elif actual_tool == "search_user_by_name_lecturer":
                    actual_tool = "search_user_by_name"
                elif actual_tool == "get_specializations_by_major_v2":
                    actual_tool = "get_specializations_by_major"
                
                # Check permissions even in Hard Router
                if user_role == "LECTURER":
                    forbidden = ["create_user", "update_user", "delete_user", "create_major", "create_course", "create_room", "create_semester", "create_specialization"]
                    if actual_tool in forbidden:
                        return {"intent": "permission_denied", "entities": {"reason": "Giảng viên không có quyền thực hiện các thao tác quản trị tài khoản hoặc đào tạo."}}
                elif user_role == "STUDENT":
                    allowed = ["get_own_schedule", "get_own_grades", "get_my_notifications", "send_email", "create_notification", 
                               "view_schedule", "view_results", "get_my_schedule", "get_my_grades",
                               "get_student_by_code", "search_user_by_name", "get_courses_by_name", 
                               "get_specializations_by_major", "get_courses_by_spec", "get_class_schedule",
                               "get_lecturer_by_code"]
                    if actual_tool not in allowed and not actual_tool.startswith("view_") and not actual_tool.startswith("get_courses"):
                        return {"intent": "permission_denied", "entities": {"reason": "Sinh viên không có quyền thực hiện hành động này."}}
                elif user_role == "ACADEMIC_STAFF":
                    # Academic staff can create/update courses and majors
                    forbidden = ["create_user", "update_user", "delete_user"]
                    if actual_tool in forbidden:
                        return {"intent": "permission_denied", "entities": {"reason": "Nhân viên đào tạo không có quyền quản lý tài khoản người dùng."}}

                # Identify intent based on tool prefix or type
                intent = "data_query"
                if actual_tool.startswith("create_") or actual_tool.startswith("update_") or actual_tool.startswith("delete_") or actual_tool == "send_email":
                    intent = "action"
                
                # Extract entities if regex has groups
                extracted_entities = {}
                if match.groups():
                    val = match.group(1).strip()
                    if actual_tool in ["get_student_by_code", "get_other_student_schedule"]:
                        # Only treat as code if it's alphanumeric and doesn't contain spaces
                        if not re.search(r"\s", val) and val.isalnum():
                            extracted_entities["student_code"] = val.upper()
                        else:
                            # If it has spaces/accents, treat as search term
                            actual_tool = "search_user_by_name"
                            extracted_entities["full_name"] = val
                    elif actual_tool in ["get_other_lecturer_schedule", "get_lecturer_by_code"]:
                        if not re.search(r"\s", val) and val.isalnum():
                            extracted_entities["lecturer_code"] = val.upper()
                            extracted_entities["code"] = val.upper()
                        else:
                            actual_tool = "search_user_by_name"
                            extracted_entities["full_name"] = val
                    elif actual_tool == "search_user_by_name":
                        extracted_entities["full_name"] = val
                    elif actual_tool == "send_email":
                        extracted_entities["recipient_email"] = val
                    elif actual_tool == "get_specializations_by_major":
                        extracted_entities["major_name"] = val
                    elif actual_tool == "get_courses_by_spec":
                        extracted_entities["specialization_name"] = val
                    elif actual_tool in ["get_class_schedule", "get_students_by_class"]:
                        extracted_entities["class_name"] = val.upper()
                    elif actual_tool == "get_courses_by_name":
                        extracted_entities["course_name"] = val
                    elif actual_tool == "count_students_by_major":
                        extracted_entities["major_name"] = val

                return {
                    "intent": intent,
                    "toolName": actual_tool,
                    "action": {"type": actual_tool.upper(), "params": extracted_entities} if intent == "action" else None,
                    "entities": extracted_entities
                }
        
        # 2.5 Fallback Code Detector - catches any remaining message containing a user code pattern
        # This is a last resort for messages like "SE001011" or "thông tin SE001011" that didn't match specific patterns
        code_match = re.search(r'\b(SE\d{3,}|GV\d{3,}|AD\d{3,}|AS\d{3,})\b', msg_clean, re.I)
        if code_match:
            code_val = code_match.group(1).upper()
            logger.info(f"Fallback Code Detector matched: {code_val}")
            # Determine if it's a student or lecturer code
            if code_val.startswith("SE"):
                return {
                    "intent": "data_query",
                    "toolName": "get_student_by_code",
                    "action": None,
                    "entities": {"student_code": code_val, "code": code_val}
                }
            elif code_val.startswith("GV"):
                return {
                    "intent": "data_query",
                    "toolName": "get_lecturer_by_code",
                    "action": None,
                    "entities": {"lecturer_code": code_val, "code": code_val}
                }
            else:
                # Generic user search by code
                return {
                    "intent": "data_query",
                    "toolName": "search_user_by_name",
                    "action": None,
                    "entities": {"full_name": code_val}
                }
        
        # 3. Text Responses
        text_patterns = {
            r"\b(hi|hello|xin chào|chào)\b": "Xin chào! Tôi là FAMS AI Assistant. Tôi có thể giúp gì cho bạn hôm nay?",
            r"\b(tạm biệt|bye|cảm ơn|thanks)\b": "Rất sẵn lòng giúp đỡ! Hẹn gặp lại bạn sau.",
            r"\b(bạn là ai|who are you)\b": "Tôi là FAMS AI Assistant, trợ lý ảo thông minh giúp bạn tra cứu thông tin đào tạo tại FAMS.",
            r"\b(giúp tôi|help)\b": "Bạn có thể yêu cầu tôi tra cứu danh sách sinh viên, giảng viên, môn học, hoặc lớp học theo ngành và học kỳ.",
        }
    
        for pattern, response in text_patterns.items():
            if re.search(pattern, msg_clean, re.I):
                res_dict = {"intent": "direct_response", "answer": response}
                self._update_cache(message, res_dict)
                return res_dict

        return None

    def _update_cache(self, key: str, value: str):
        self.cache[key] = value
        if len(self.cache) > self.cache_size:
            self.cache.popitem(last=False)

    def _call_openrouter(self, prompt: str, model: Optional[str] = None) -> str:
        headers = {
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json"
        }
        
        # Prepare dynamic fallback list - deduplicated, primary first
        primary = model or self.config.model
        all_models = [primary] + [m for m in self.config.fallback_models if m != primary]
        
        payload = {
            "messages": [{"role": "user", "content": prompt}],
            "temperature": self.config.temperature,
            "max_tokens": self.config.max_tokens,
            "top_p": self.config.top_p
        }
        
        last_error = None
        import time
        tried_models = set()
        
        for attempt in range(self.config.max_retries + 1):
            try:
                # Pick the next untried model
                current_model = None
                for m in all_models:
                    if m not in tried_models:
                        current_model = m
                        break
                if not current_model:
                    # All models tried, cycle back
                    tried_models.clear()
                    current_model = all_models[attempt % len(all_models)]
                
                tried_models.add(current_model)
                payload["model"] = current_model
                
                if attempt > 0:
                    wait_time = self.config.retry_delay * (2 ** (attempt - 1))
                    logger.info(f"Retrying OpenRouter with model {current_model} (attempt {attempt}/{self.config.max_retries}) in {wait_time}s...")
                    time.sleep(wait_time)
                
                response = requests.post(
                    f"{self.config.base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=self.config.timeout
                )
                
                if response.status_code == 429:
                    logger.warning(f"OpenRouter 429 Too Many Requests for model {current_model} (Attempt {attempt + 1})")
                    last_error = f"HTTP 429: {response.text}"
                    continue
                
                if response.status_code != 200:
                    logger.error(f"OpenRouter HTTP {response.status_code} ({response.reason}): {response.text}")
                    last_error = f"HTTP {response.status_code}: {response.text}"
                    continue
                
                res_json = response.json()
                content = res_json['choices'][0]['message']['content']
                
                # Clean up <thought> tags
                if " <thought>" in content and "</thought>" in content:
                    content = re.sub(r"<thought>.*?</thought>", "", content, flags=re.S).strip()
                
                logger.debug(f"OpenRouter Raw Response: {content[:200]}...")
                return content
                
            except Exception as e:
                logger.error(f"OpenRouter Error on attempt {attempt + 1}: {e}")
                last_error = e
                if attempt == self.config.max_retries:
                    raise e
        
        raise Exception(f"Failed to call OpenRouter after {self.config.max_retries} retries. Last error: {last_error}")


    def _stage_1_light_router(self, message: str, user_role: str, user_code: str, history: List[Dict[str, str]] = None, model: str = None) -> Dict[str, Any]:
        history_str = ""
        if history:
            history_str = "\n".join([f"{m['role']}: {m['content']}" for m in history])

        # Define role-based constraints
        role_constraints = ""
        if user_role == "LECTURER":
            role_constraints = f"""
    QUY TẮC PHÂN QUYỀN CHO GIẢNG VIÊN (LECTURER) - MÃ SỐ: {user_code}:
    - ĐƯỢC PHÉP: Xem lịch dạy (get_my_schedule), danh sách sinh viên (view_students, get_students_by_class), lịch học của sinh viên (get_other_student_schedule), thông tin môn học, thông tin học kỳ, tìm kiếm người dùng.
    - ĐƯỢC PHÉP: Gửi thông báo cho lớp (create_notification) nhưng chỉ dành cho vai trò STUDENT hoặc USER cụ thể.
    - ĐƯỢC PHÉP: Gửi email (send_email) cho sinh viên hoặc giảng viên khác.
    - KHÔNG ĐƯỢC PHÉP: create_user, update_user, delete_user, get_all_notifications (danh sách thông báo toàn hệ thống).
    - Nếu người dùng yêu cầu hành động bị cấm, trả về intent: "permission_denied" và giải thích lý do.
    """
        elif user_role == "STUDENT":
            role_constraints = f"""
    QUY TẮC PHÂN QUYỀN CHO SINH VIÊN (STUDENT) - MÃ SỐ: {user_code}:
    - ĐƯỢC PHÉP: Xem lịch cá nhân (get_my_schedule), xem điểm (get_my_grades), xem thông báo của tôi (get_my_notifications), thông tin môn học.
    - ĐƯỢC PHÉP: Gửi email (send_email) hoặc tạo thông báo cá nhân (create_notification).
    - KHÔNG ĐƯỢC PHÉP: Truy cập bất kỳ tool nào liên quan đến người dùng khác (trừ tìm kiếm công khai), điểm của người khác, hoặc quản trị hệ thống.
    - Nếu người dùng yêu cầu hành động bị cấm, trả về intent: "permission_denied" và giải thích lý do.
    """
        else: # ADMIN, ACADEMIC_STAFF
            role_constraints = f"QUY TẮC: Bạn là {user_role} (Mã số: {user_code}). Bạn có toàn quyền truy cập vào tất cả các công cụ của hệ thống."

        # Define available tools based on role

        # Define available tools based on role
        all_tools = {
            # User Management (ADMIN only)
            "create_user": "Tạo người dùng mới (SV/GV). Cần: full_name, code, email, role, dob (YYYY-MM-DD).",
            "update_user": "Cập nhật thông tin người dùng. Cần: code, và các trường cần sửa.",
            "delete_user": "Xóa/Vô hiệu hóa người dùng. Cần: code.",
            "view_users": "Mở trang quản trị người dùng.",

            # Academic Management (ACADEMIC_STAFF, ADMIN)
            "create_course": "Tạo môn học mới. Cần: code, name, credits.",
            "update_course": "Cập nhật môn học. Cần: code.",
            "create_major": "Tạo ngành học mới. Cần: code, name.",
            "update_major": "Cập nhật ngành học. Cần: code.",
            "create_specialization": "Thêm chuyên ngành cho ngành. Cần: major_code, spec_code, spec_name.",
            "view_majors": "Mở trang quản lý ngành học.",
            "view_specializations": "Mở trang danh sách Chuyên ngành của một Ngành cụ thể. Cần: major_name (ví dụ: Công nghệ thông tin).",
            "view_sub_specializations": "Mở trang danh sách Chuyên ngành hẹp của một Chuyên ngành cụ thể. Cần: specialization_name (ví dụ: Kỹ thuật phần mềm).",
            "get_all_majors": "Xem toàn bộ danh sách và chi tiết các ngành học (trả về dữ liệu trong chat).",
            "view_courses": "Mở trang danh sách môn học.",
            "count_students_by_major": "Thống kê số lượng sinh viên theo ngành học.",
            "get_specializations_by_major": "Liệt kê các chuyên ngành thuộc một ngành học.",
            "get_sub_specializations": "Liệt kê các chuyên ngành hẹp thuộc một chuyên ngành.",
            "get_courses_by_spec": "Xem danh sách môn học thuộc một chuyên ngành.",
            "get_courses_by_sub_spec": "Xem danh sách môn học thuộc một chuyên ngành hẹp.",
            "get_top_students": "Xem danh sách 10 sinh viên có GPA cao nhất.",

            # Infrastructure (ADMIN, ACADEMIC_STAFF)
            "create_semester": "Thiết lập học kỳ mới. Cần: code, name, start_date, end_date.",
            "create_room": "Thêm phòng học mới. Cần: name, capacity.",
            "view_rooms": "Mở trang quản lý phòng học.",
            "view_semesters": "Mở trang quản lý học kỳ.",
            "view_classes": "Mở trang danh sách lớp học.",

            # General Queries & Navigation
            "view_students": "Mở trang danh sách sinh viên toàn hệ thống.",
            "view_lecturers": "Mở trang danh sách giảng viên toàn hệ thống.",
            "get_all_lecturers": "Xem toàn bộ danh sách giảng viên (trả về dữ liệu trong chat).",
            "get_all_students": "Xem toàn bộ danh sách sinh viên (trả về dữ liệu trong chat).",
            "search_user_by_name": "Tìm kiếm người dùng theo tên.",
            "get_student_by_code": "Tìm SV theo mã số.",
            "get_courses_by_name": "Tìm kiếm thông tin môn học.",
            "get_semester_info": "Thông tin các học kỳ.",
            "get_class_schedule": "Xem thời khóa biểu của một lớp cụ thể. Cần: class_name.",
            "get_students_by_class": "Xem danh sách sinh viên trong một lớp cụ thể. Cần: class_name.",
            "get_other_lecturer_schedule": "Xem lịch dạy của một giảng viên cụ thể (không phải của bạn). Cần: full_name hoặc code.",
            "get_other_student_schedule": "Xem lịch học của một sinh viên cụ thể (không phải của bạn). Cần: full_name hoặc code.",

            # Communication
            "create_notification": "Tạo thông báo hệ thống/lớp. Cần: title, content, target_type, recipient_code (nếu USER).",
            "send_email": "Gửi email trực tiếp. Cần: recipient_email/code, subject, content.",
            "get_my_notifications": "Xem thông báo của tôi.",

            # Personal Info
            "get_own_schedule": "Xem lịch dạy/học cá nhân của CHÍNH BẠN. Dùng khi hỏi 'lịch của TÔI', 'hôm nay TÔI dạy gì?'.",
            "get_own_grades": "Xem điểm cá nhân của CHÍNH BẠN.",
            "view_profile": "Mở trang thông tin cá nhân của bạn.",

            # Excel (Intent only, triggers local reasoning based on history)
            "excel_query": "Sử dụng khi người dùng hỏi về dữ liệu TRONG FILE Excel đã tải lên (ví dụ: 'trong file có ngành X không?', 'danh sách môn trong file', 'phân tích cột Y trong bản vừa tải'). TUYỆT ĐỐI không dùng database cho intent này.",
            "export_excel": "Xuất dữ liệu danh sách/báo cáo ra Excel.",
            "import_excel": "Mở trang nhập liệu từ Excel."
        }

        available_tool_names = list(all_tools.keys())
        if user_role == "LECTURER":
            forbidden = ["create_user", "update_user", "delete_user", "view_users", 
                         "create_course", "update_course", "create_major", "update_major",
                         "create_semester", "create_room", "view_semesters", "view_rooms"]
            available_tool_names = [t for t in available_tool_names if t not in forbidden]
        elif user_role == "STUDENT":
            allowed = ["get_own_schedule", "get_own_grades", "get_my_notifications", 
                       "get_courses_by_name", "get_semester_info", "view_profile", "view_courses",
                       "excel_query", "export_excel", "view_students", "view_lecturers",
                       "get_specializations_by_major", "get_sub_specializations", 
                       "get_courses_by_spec", "get_courses_by_sub_spec",
                       "send_email", "create_notification"]
            available_tool_names = [t for t in available_tool_names if t in allowed]
        elif user_role == "ACADEMIC_STAFF":
            # Academic staff can do everything except user account CRUD (Admin only)
            forbidden = ["create_user", "update_user", "delete_user", "view_users", "get_own_schedule", "get_own_grades"]
            available_tool_names = [t for t in available_tool_names if t not in forbidden]
            # Ensure they have access to the search tools
            if "get_other_lecturer_schedule" not in available_tool_names:
                available_tool_names.append("get_other_lecturer_schedule")
            if "get_other_student_schedule" not in available_tool_names:
                available_tool_names.append("get_other_student_schedule")
        elif user_role == "ADMIN":
            forbidden = ["get_own_schedule", "get_own_grades"]
            available_tool_names = [t for t in available_tool_names if t not in forbidden]
        
        # Ensure excel tools are always available for those not forbidden
        for t in ["excel_query", "export_excel"]:
            if t in all_tools and t not in available_tool_names:
                # Check if it was explicitly forbidden for some reason elsewhere
                if user_role == "LECTURER" and t in ["create_user"]: # example defensive
                    pass
                else:
                    available_tool_names.append(t)

        tools_str = "\n".join([f"- {name}: {all_tools[name]}" for name in available_tool_names])

        prompt = """
        Bạn là một router thông minh của hệ thống FAMS. 
        Vai trò người dùng hiện tại: {USER_ROLE} (Mã số: {USER_CODE}).
        Nhiệm vụ: Trích xuất intent và toolName phù hợp nhất dựa trên hội thoại và danh sách công cụ được phép.
        
        {ROLE_CONSTRAINTS}

        Hội thoại gần đây:
        {HISTORY_STR}
        
        --- HƯỚNG DẪN XỬ LÝ QUAN TRỌNG ---
        1. PHÂN QUYỀN: Nếu người dùng yêu cầu một công cụ KHÔNG có trong danh sách bên dưới hoặc vi phạm QUY TẮC PHÂN QUYỀN ở trên, bạn PHẢI trả về intent: "permission_denied" và giải thích ngắn gọn lý do trong entities.reason.
        2. TÍNH CHU TRÌNH: Nếu người dùng hỏi dựa trên thực thể của câu trước (Ví dụ: "Lịch của bạn đó?", "GPA của anh ấy"), hãy lấy thông tin từ Hội thoại gần đây.
        3. FILE EXCEL: Nếu hội thoại có nhắc đến file Excel đã tải lên, PHẢI chọn intent `excel_query`. Dữ liệu file Excel được ƯU TIÊN hơn database.
        4. CẬP NHẬT TRẠNG THÁI: "Vô hiệu hóa", "Khóa tài khoản", "Nghỉ việc" => toolName: "update_user", action.params: {"status": "INACTIVE"}.
        ----------------------------------
    
    DANH SÁCH CÔNG CỤ ĐƯỢC PHÉP TRUY CẬP (Dựa trên vai trò {USER_ROLE}):
    {TOOLS_STR}
    
    DB Schema Info:
    {DB_SCHEMA_INFO}
    Table: users
    Columns: id (PK), full_name, code, role (STUDENT, LECTURER, ADMIN), status (ACTIVE, INACTIVE)

    Table: student_profiles
    Columns: user_id (PK, FK to users.id), gpa, major_id (FK to majors.id)

    Table: lecturer_profiles
    Columns: user_id (PK, FK to users.id), expertise, department

    Table: majors
    Columns: id (PK), code, name, status (ACTIVE, INACTIVE)

    Table: courses
    Columns: id (PK), code, name, credits

    Table: class_sections
    Columns: class_name (PK), course_id (FK to courses.id), lecturer_id (FK to users.id), semester_id (FK to semesters.id)

    Table: enrollments
    Columns: id (PK), student_id (FK to users.id), class_name (FK to class_sections.class_name)

    Table: timetable_slots
    Columns: id (PK), class_name (FK to class_sections.class_name), date, slot_number, room_id (FK to rooms.id), slot_type_id (FK to slot_types.id)

    Table: rooms
    Columns: id (PK), name, capacity

    Table: slot_types
    Columns: id (PK), start_time, end_time

    Table: student_grades
    Columns: id (PK), enrollment_id (FK to enrollments.id), grade_component_id (FK to grade_components.id), score, attempt

    Table: grade_components
    Columns: id (PK), course_id (FK to courses.id), name, weight

    Table: semesters
    Columns: id (PK), code, name, start_date, end_date, status (ACTIVE, INACTIVE)

    Table: specializations
    Columns: id (PK), code, name, major_id (FK to majors.id), status (ACTIVE, INACTIVE)

    Table: specialization_courses
    Columns: specialization_id (FK to specializations.id), course_id (FK to courses.id), semester

    Table: sub_specializations
    Columns: id (PK), code, name, specialization_id (FK to specializations.id)

    Table: sub_specialization_courses
    Columns: sub_specialization_id (FK to sub_specializations.id), course_id (FK to courses.id)

    Table: notifications
    Columns: id (PK), title, content, type (SYSTEM, CLASS, PERSONAL), priority (LOW, MEDIUM, HIGH), sender_id (FK to users.id), target_type (ALL, STUDENT, LECTURER, USER), sent_at, status (DRAFT, SCHEDULED, SENT)

    Table: notification_recipients
    Columns: id (PK), notification_id (FK to notifications.id), recipient_id (FK to users.id), is_read, read_at
    
    Quy tắc `dynamicSql` (CỰC KỲ QUAN TRỌNG):
    1. Sử dụng khi tool có sẵn không đủ linh hoạt hoặc người dùng muốn xem "tất cả thông tin" (Ví dụ: "GPA của SE420591", "Top 5 sinh viên IT", "Giảng viên dạy môn AI", "Mọi thông tin về user X").
    2. LUÔN LUÔN dùng LEFT JOIN để lấy thông tin từ bảng `users` (full_name, code) kèm thông tin profile, majors, v.v. để không bỏ sót dữ liệu.
    3. LUÔN LUÔN sử dụng `unaccent(column) ILIKE unaccent('%...%')` khi tìm kiếm chuỗi văn bản.
    4. Nếu người dùng yêu cầu "tất cả thông tin", hãy SELECT nhiều trường nhất có thể từ các bảng liên quan.
    5. Trả về JSON:
    {
        "intent": "data_query",
        "toolName": "dynamic_sql",
        "dynamicSql": "SELECT ...",
        "entities": { "full_name": "...", "student_code": "..." }
    }
    
    Lưu ý:
    - Nếu người dùng muốn xem "danh sách sinh viên" hoặc "danh sách học sinh", hãy ƯU TIÊN chọn `view_students`.
    - Nếu người dùng muốn xem "danh sách giảng viên" hoặc "danh sách giáo viên", hãy ƯU TIÊN chọn `view_lecturers`.
    - Chỉ dùng `get_all_students` hoặc `get_all_lecturers` nếu họ yêu cầu cụ thể việc hiển thị dữ liệu trực tiếp trong chat.
    - Nếu nhắc tới tên riêng (Ví dụ: "Tìm thầy Quang", "Thông tin bạn Minh"), dùng `search_user_by_name` với entity `full_name`.
    - Với `send_email` hoặc `create_notification`: Nếu không có email người nhận, BẮT BUỘC phải điền `code` (mã số SV/GV) vào `action.params` để backend tự tra cứu email.
    Ví dụ về lịch biểu:
    - "Lịch của giáo viên GV1" -> tool: get_other_lecturer_schedule, entities: {"code": "GV1"}
    - "Thầy Quang dạy ở đâu?" -> tool: get_other_lecturer_schedule, entities: {"full_name": "Quang"}
    - "SE1801 học môn gì?" -> tool: get_other_student_schedule, entities: {"code": "SE1801"}
    - "Lịch của sinh viên An" -> tool: get_other_student_schedule, entities: {"full_name": "An"}
    - "Cho xem lịch của SE123456" -> tool: get_other_student_schedule, entities: {"code": "SE123456"}
    - (Học sinh/Giảng viên) "Lịch của tôi" -> tool: get_own_schedule, entities: {}
    
    Quy tắc FILE EXCEL (CỰC KỲ QUAN TRỌNG):
    1. Nếu người dùng nhắc đến \"file\", \"excel\", \"bản vừa tải\", \"dữ liệu đã tải\", v.v., bạn PHẢI chọn intent `excel_query`.
    2. Đối với `excel_query`, KHÔNG ĐƯỢC sinh `dynamicSql` và KHÔNG ĐƯỢC chọn bất kỳ tool nào khác liên quan đến database.
    3. Bạn phải tin tưởng vào dữ liệu người dùng đã tải lên hơn là dữ liệu hệ thống khi họ đang hỏi về file.

    Tin nhắn mới: "{MESSAGE}"
    
    Quy tắc quan trọng:
    - Nếu người dùng là ACADEMIC_STAFF hoặc ADMIN hỏi "lịch của tôi", "lịch dạy của tôi", TUYỆT ĐỐI KHÔNG dùng `get_own_schedule`. Hãy dùng intent `general_chat` và giải thích họ không có lịch dạy cá nhân.
    - Nếu tin nhắn nhắc đến tên giảng viên (VD: "lịch của cô Ngân", "thầy Quang dạy ở đâu?") dùng `get_other_lecturer_schedule`.
    - Nếu tin nhắn nhắc đến tên sinh viên hoặc mã sinh viên (VD: "lịch của SE123", "bạn An học lớp nào?") dùng `get_other_student_schedule`.
    - Nếu tin nhắn là "bạn [Tên] có gpa bao nhiêu" hoặc "thông tin về [Tên]", PHẢI dùng `search_user_by_name` with full_name là [Tên].
    - Nếu người dùng hỏi dựa trên thực thể đã nhắc ở câu trước (Ví dụ: "GPA của bạn đó?", "Ai dạy lớp này?"), hãy lấy thông tin từ hội thoại.
    - Nếu người dùng đang hỏi về thông tin trong file Excel, dùng intent `excel_query`.
    - Intent `general_chat` chỉ dành cho chào hỏi xã giao hoặc câu hỏi không liên quan đến dữ liệu FAMS.
    - Phản hồi JSON chính xác, không giải thích gì thêm.
    
    Quy tắc PHÂN BIỆT View và Get:
    1. VIEW TOOLS (Bắt đầu bằng `view_`): Sử dụng khi người dùng muốn "vào trang", "mở màn hình", "đi tới mục", v.v. 
       Ví dụ: 
       - "Mở trang ngành" -> `view_majors`
       - "Danh sách giáo viên" -> `view_lecturers` (VÌ MỞ MÀN HÌNH DANH SÁCH)
       - "Danh sách sinh viên" -> `view_students`
       - "Xem bảng điểm" -> `view_results`
    2. GET TOOLS (Bắt đầu bằng `get_`): Sử dụng khi người dùng muốn "xem chi tiết", "liệt kê DỮ LIỆU", "tìm kiếm" để bot trả lời ngay trong chat.
       Ví dụ:
       - "Cho xem danh sách các ngành" -> `get_all_majors`
       - "Có những giáo viên nào?" -> `get_all_lecturers`
       - "Chuyên ngành của ngành CNTT là gì?" -> `get_specializations_by_major`
       - "Lịch dạy của thầy Quang" -> `get_other_lecturer_schedule`
       - "Thông tin sinh viên Nguyễn Văn Công" -> `search_user_by_name` (entities: {"full_name": "Nguyễn Văn Công"})
    
    3. QUY TẮC ĐẶC BIỆT CHO CHUYÊN NGÀNH:
       - Nếu người dùng muốn xem chuyên ngành (specialization), bạn PHẢI dùng `view_specializations`. Nếu họ KHÔNG nói ngành nào, cứ chọn tool này và không cần entity, bot sẽ hỏi lại ở bước sau.
       - Nếu người dùng muốn xem chuyên ngành hẹp (sub-specialization), bạn PHẢI dùng `view_sub_specializations`.
    
    Quy tắc Action CRUD:
    - Nếu người dùng yêu cầu hành động (Thêm/Sửa/Xóa), bạn PHẢI điền đầy đủ thông tin vào `action.params`.
    - `CREATE_USER` cần: `role`, `dob` (YYYY-MM-DD), `code`, `full_name`, `email`.
    - `UPDATE_USER` cần: `code` và thông tin mới.
    
    Cấu trúc phản hồi JSON (BẮT BUỘC):
    {
        "intent": "string",
        "toolName": "string|null",
        "action": { "type": "string", "params": { ... } }|null,
        "dynamicSql": "string|null",
        "entities": { ... }
    }
    Lưu ý: TRẢ VỀ JSON THUẦN TÚY, KHÔNG GIẢI THÍCH, KHÔNG MARKDOWN.
"""
        prompt = prompt.replace("{USER_ROLE}", user_role) \
                      .replace("{USER_CODE}", user_code) \
                      .replace("{ROLE_CONSTRAINTS}", role_constraints or "") \
                      .replace("{HISTORY_STR}", history_str or "") \
                      .replace("{TOOLS_STR}", tools_str) \
                      .replace("{MESSAGE}", message) \
                      .replace("{DB_SCHEMA_INFO}", DB_SCHEMA_INFO)
        
        try:
            # Optimized: Use the main model (Gemini 2.0 Flash) for both to reduce overhead and latency
            text_res = self._call_openrouter(prompt, model)
            logger.info(f"Stage 1 Raw Response: {text_res}")
            json_match = re.search(r"\{.*\}", text_res, re.S)
            if json_match:
                result = json.loads(json_match.group())
                
                if not isinstance(result, dict):
                    logger.warning(f"Parsed JSON is not a dict: {result}. Returning fallback.")
                    return {"intent": "general_chat", "toolName": None, "entities": {}}
                
                # Post-processing: Inject 'code' into action params if missing but present in entities
                if result.get("action") and result["action"].get("type") in ["SEND_EMAIL", "CREATE_NOTIFICATION"]:
                    params = result["action"].get("params", {})
                    if not params.get("code") and not params.get("recipient_code"):
                         # Try to find code in entities
                         entities = result.get("entities", {})
                         found_code = entities.get("student_code") or entities.get("code") or entities.get("recipient_code")
                         if found_code:
                             # Normalize key based on action type
                             key = "recipient_code" if result["action"]["type"] == "CREATE_NOTIFICATION" else "code"
                             result["action"]["params"][key] = found_code
                             logger.info(f"Auto-injected code {found_code} into action params as {key}")

                logger.info(f"Stage 1 Parsed Result: {result}")
                return result
        except Exception as e:
            logger.error(f"Error in Stage 1 Router: {e}")
            logger.error(f"Raw response was: {text_res if 'text_res' in locals() else 'N/A'}")
        
        return {"intent": "general_chat", "toolName": None, "entities": {}}

    def _stage_2_tool_executor(self, intent_data: Dict[str, Any], user_id: int, user_role: str = None) -> Any:
        tool_name = intent_data.get('toolName')
        entities = intent_data.get('entities', {})
        dynamic_sql = intent_data.get('dynamicSql')

        if not tool_name and not dynamic_sql:
            return None
        
        # Smart Navigation Lookup
        if tool_name == "view_specializations":
            major_val = entities.get("major_name") or entities.get("major_code") or entities.get("keyword")
            if major_val:
                with self._get_db_connection() as conn:
                    with conn.cursor(cursor_factory=RealDictCursor) as cur:
                        cur.execute(self.sql_templates["get_major_id_by_name"], (f"%{major_val}%", major_val))
                        row = cur.fetchone()
                        if row:
                            intent_data["redirectPath"] = f"/academic-staff/majors/{row['id']}"
                            return {"found": True, "type": "major", "name": row['name'], "id": row['id']}
            return {"found": False, "type": "major", "requested": major_val}

        if tool_name == "view_sub_specializations":
            spec_val = entities.get("specialization_name") or entities.get("specialization_code") or entities.get("keyword")
            if spec_val:
                with self._get_db_connection() as conn:
                    with conn.cursor(cursor_factory=RealDictCursor) as cur:
                        cur.execute(self.sql_templates["get_specialization_id_by_name"], (f"%{spec_val}%", spec_val))
                        row = cur.fetchone()
                        if row:
                            intent_data["redirectPath"] = f"/academic-staff/specializations/{row['id']}"
                            return {"found": True, "type": "specialization", "name": row['name'], "id": row['id']}
            return {"found": False, "type": "specialization", "requested": spec_val}
            
        sql = self.sql_templates.get(tool_name)
        params = []

        # Logic for Dynamic SQL (Smart Mode)
        if tool_name == "dynamic_sql" and dynamic_sql:
            # Basic Safety Check
            if not dynamic_sql.strip().lower().startswith("select"):
                logger.warning(f"Rejected unsafe dynamic SQL: {dynamic_sql}")
                return None
            sql = dynamic_sql
            params = []
        elif not sql:
            return None
        
        conn = None
        try:
            conn = self._get_db_connection()
            cur = conn.cursor()
            
            # For data modification (INSERT/UPDATE), ensure it commits
            is_mutation = tool_name.startswith("create_") or tool_name.startswith("update_") or tool_name.startswith("delete_") or tool_name == "send_email"
            # Prepare params for templates
            if not dynamic_sql:
                if tool_name in ["get_students_by_major", "get_lecturers_by_major", "count_students_by_major", "get_specializations_by_major"]:
                    val = entities.get('major_name') or ''
                    if not val and tool_name == "get_lecturers_by_major":
                        sql = self.sql_templates["get_all_lecturers"]
                        params = []
                    elif not val and tool_name == "get_students_by_major":
                        sql = self.sql_templates["get_all_students"]
                        params = []
                    else:
                        # This block now correctly applies to get_specializations_by_major as well
                        params = [f"%{val}%", f"%{val}%", val]
                elif tool_name == "get_all_majors":
                    params = []
                elif tool_name == "get_sub_specializations":
                    val = entities.get('specialization_name') or entities.get('major_name') or ''
                    params = [f"%{val}%", f"%{val}%", val]
                elif tool_name == "get_courses_by_spec":
                    val = entities.get('specialization_name') or entities.get('major_name') or ''
                    params = [f"%{val}%", f"%{val}%", val]
                elif tool_name == "get_courses_by_sub_spec":
                    val = entities.get('sub_specialization_name') or entities.get('specialization_name') or ''
                    params = [f"%{val}%", f"%{val}%", val]
                elif tool_name == "get_courses_by_name":
                    val = entities.get('course_name') or entities.get('course_code') or entities.get('major_name') or ''
                    params = [f"%{val}%", f"%{val}%"]
                elif tool_name == "get_classes_by_semester":
                    val = entities.get('semester_code') or ''
                    params = [f"%{val}%", f"%{val}%"]
                elif tool_name == "get_lecturers_by_expertise":
                    val = entities.get('expertise') or ''
                    params = [f"%{val}%", f"%{val}%"]
                elif tool_name == "search_user_by_name":
                    val = entities.get('full_name') or ''
                    params = [f"%{val}%"]
                elif tool_name == "get_student_by_code":
                    val = entities.get('student_code') or entities.get('code') or ''
                    params = [val, f"%{val}%"]
                elif tool_name == "get_lecturer_by_code":
                    val = entities.get('lecturer_code') or entities.get('code') or ''
                    params = [val, f"%{val}%"]
                elif tool_name in ["get_own_schedule", "get_own_grades", "get_my_notifications"]:
                    # Map aliases to actual SQL template keys
                    if tool_name == "get_own_schedule":
                        sql = self.sql_templates["get_my_schedule"]
                        params = [user_id, user_id]
                    elif tool_name == "get_own_grades":
                        sql = self.sql_templates["get_my_grades"]
                        params = [user_id]
                    else:
                        sql = self.sql_templates["get_my_notifications"]
                        params = [user_id]
                elif tool_name == "get_class_schedule":
                    val = entities.get('class_name', '')
                    params = [val]
                elif tool_name == "get_students_by_class":
                    val = entities.get('class_name', '') or entities.get('course_code', '')
                    # If lecturer, filter by their ID. Otherwise (ADMIN/AS) use -1
                    lec_id = user_id if user_role == "LECTURER" else -1
                    params = [f"%{val}%", f"%{val}%", f"%{val}%", lec_id, lec_id]
                elif tool_name == "get_other_lecturer_schedule":
                    val = entities.get('full_name') or entities.get('code') or entities.get('lecturer_code') or entities.get('student_code') or ''
                    sql = self.sql_templates["get_lecturer_schedule_by_search"]
                    # If it looks like a code (e.g. GV...), use it for second param exactly
                    code_val = val
                    params = [f"%{val}%", code_val]
                elif tool_name == "get_other_student_schedule":
                    val = entities.get('full_name') or entities.get('code') or entities.get('student_code') or ''
                    sql = self.sql_templates["get_student_schedule_by_search"]
                    code_val = val
                    params = [f"%{val}%", code_val]
                elif tool_name == "create_major":
                    params = [entities.get("code") or entities.get("major_code"), entities.get("name") or entities.get("major_name")]
                    if not params[0] or not params[1]:
                        return "Thiếu tên ngành hoặc mã ngành để khởi tạo."
                elif tool_name == "create_course":
                    params = [entities.get("code") or entities.get("course_code"), entities.get("name") or entities.get("course_name"), entities.get("credits", 3)]
                    if not params[0] or not params[1]:
                        return "Thiếu tên môn hoặc mã môn để tạo."
                elif tool_name == "get_student_schedule_by_search":
                    val = entities.get('full_name') or entities.get('code') or entities.get('student_code') or entities.get('lecturer_code') or ''
                    sql = self.sql_templates["get_student_schedule_by_search"]
                    code_val = val
                    params = [f"%{val}%", code_val]
                elif tool_name == "create_room":
                    name = entities.get("name") or entities.get("room_name") or ''
                    capacity = entities.get("capacity", 30)
                    if not name:
                        return "Thiếu tên phòng học để tạo."
                    params = [name, capacity]
                elif tool_name == "create_semester":
                    code = entities.get("code") or entities.get("semester_code") or ''
                    name = entities.get("name") or entities.get("semester_name") or ''
                    start_date = entities.get("start_date", '')
                    end_date = entities.get("end_date", '')
                    if not code or not name:
                        return "Thiếu mã hoặc tên học kỳ để tạo."
                    params = [code, name, start_date, end_date]
                elif tool_name == "create_specialization":
                    spec_code = entities.get("spec_code") or entities.get("code") or ''
                    spec_name = entities.get("spec_name") or entities.get("name") or ''
                    major_code = entities.get("major_code") or ''
                    if not spec_code or not spec_name or not major_code:
                        return "Thiếu thông tin chuyên ngành (mã, tên) hoặc mã ngành."
                    # Lookup major_id from major_code
                    try:
                        lookup_conn = self._get_db_connection()
                        lookup_cur = lookup_conn.cursor()
                        lookup_cur.execute(self.sql_templates["get_major_id_by_name"], (f"%{major_code}%", major_code))
                        major_row = lookup_cur.fetchone()
                        lookup_cur.close()
                        lookup_conn.close()
                        if not major_row:
                            return f"Không tìm thấy ngành với mã: {major_code}"
                        major_id = major_row[0]
                    except Exception as e:
                        return f"Lỗi tra cứu ngành: {e}"
                    params = [spec_code, spec_name, major_id]
            
            if not sql:
                logger.warning(f"No SQL template for tool: {tool_name}")
                return []
                
            logger.info(f"Executing SQL: {sql} | Params: {params}")
            cur.execute(sql, tuple(params) if params else None)
            colnames = [desc[0] for desc in cur.description] if cur.description else []
            
            if is_mutation:
                conn.commit()
                if tool_name.startswith("create_"):
                    row = cur.fetchone()
                    new_id = row[0] if row else "N/A"
                    return f"Thành công! Đã tạo bản ghi mới với ID: {new_id}."
                return "Hành động đã được thực hiện thành công."
                
            rows = cur.fetchall()
            cur.close()
            return [dict(zip(colnames, row)) for row in rows]
        except Exception as e:
            logger.error(f"Error in Stage 2 Tool Executor: {e}")
            return None
        finally:
            if conn:
                conn.close()

    def _stage_3_answer_generator(self, message: str, intent_data: Dict[str, Any], tool_result: Any, history: List[Dict[str, str]] = None, model: str = None) -> str:
        # Optimization: Bypass LLM for navigation intents
        intent = intent_data.get('intent')
        tool_name = intent_data.get('toolName') or ""
        
        if intent == "navigation" or tool_name.startswith("view_"):
            tool_display_names = {
                "view_lecturers": "Danh sách Giáo viên",
                "view_students": "Danh sách Sinh viên",
                "view_majors": "Danh sách Ngành học",
                "view_courses": "Danh sách Môn học",
                "view_rooms": "Danh sách Phòng học",
                "view_semesters": "Danh sách Học kỳ",
                "view_classes": "Danh sách Lớp học",
                "view_specializations": "danh sách Chuyên ngành",
                "view_sub_specializations": "danh sách Chuyên ngành hẹp",
                "view_schedule": "Lịch học/dạy",
                "view_results": "Bảng điểm",
                "view_users": "Quản lý người dùng",
                "view_dashboard": "Bảng điều khiển",
                "view_notifications": "Quản lý thông báo",
                "view_logs": "Nhật ký hệ thống",
                "view_alerts": "Cảnh báo bảo mật",
                "view_profile": "Trang cá nhân",
            }
            display_name = tool_display_names.get(tool_name, "trang bạn yêu cầu")
            
            # Smart handling for missing entities in specialized views
            if isinstance(tool_result, dict) and tool_result.get("found") is False:
                target_type = "ngành học" if tool_result.get("type") == "major" else "chuyên ngành"
                if tool_name == "view_specializations":
                    return "Bạn muốn xem chuyên ngành của **ngành học** nào? (Ví dụ: Công nghệ thông tin, Quản trị kinh doanh...)"
                if tool_name == "view_sub_specializations":
                    return "Bạn muốn xem chuyên ngành hẹp của **chuyên ngành** nào? (Ví dụ: Kỹ thuật phần mềm, Hệ thống thông tin...)"
                return f"Tôi không tìm thấy {target_type} mà bạn yêu cầu. Bạn có thể nói rõ hơn không?"

            if isinstance(tool_result, dict) and tool_result.get("found") is True:
                return f"Dạ, tôi đang mở **{display_name}** của {tool_result['type']} **{tool_result['name']}** cho bạn đây!"

            return f"Tôi đang mở **{display_name}** cho bạn. Bạn có thể xem chi tiết thông tin tại đó!"

        # Nếu là permission_denied, bot trả lời trực tiếp lý do từ router (nếu có) hoặc thông báo chung
        if intent == "permission_denied":
            reason = intent_data.get("entities", {}).get("reason", "Bạn không có quyền thực hiện hành động này trong hệ thống FAMS.")
            return f"🚫 **Truy cập bị từ chối**: {reason}"

        # ... logic for real LLM call ...
        history_str = ""
        if history:
            normalized_history = []
            for m in history:
                role_val = m.get('role', '').upper()
                role = "Người dùng" if role_val == "USER" else "Trợ lý"
                normalized_history.append(f"{role}: {m['content']}")
            history_str = "\n".join(normalized_history)

        # Nếu không có dữ liệu hoặc cần phản hồi tự nhiên, gọi OpenRouter
        prompt = """
        Bạn là FAMS AI Assistant chuyên nghiệp, thông minh và tận tâm.
        Yêu cầu: Trả lời tự nhiên, thân thiện, tập trung vào dữ liệu thực tế được cung cấp.
        
        Hội thoại:
        {HISTORY_STR}
        
    - Tin nhắn hiện tại: {MESSAGE}
    - Ý định đã xác định: {INTENT}
    - Công cụ đã sử dụng: {TOOL_NAME}
    - Dữ liệu từ hệ thống (BẮT BUỘC SỬ DỤNG): {TOOL_RESULT}
    
    QUY TẮC PHẢN HỒI:
    1. Nếu có DỮ LIỆU: Phải dựa vào đó để trả lời. Liệt kê danh sách (nếu có) dưới dạng bullet points rõ ràng với các thông tin như Tên, Mã số, Chuyên môn.
    2. Nếu có Ý ĐỊNH HÀNH ĐỘNG (intent=action): Hãy thông báo rằng bạn đang thực hiện yêu cầu đó (ví dụ: "Dạ, em đang gửi thông báo cho bạn đây...").
    3. Nếu KHÔNG CÓ DỮ LIỆU (Null/Empty List) và không phải hành động: Hãy thông báo lịch sự là không tìm thấy thông tin phù hợp, gợi ý người dùng kiểm tra lại mã số hoặc tên.
    4. EXCEL: Nếu ý định là `excel_query`, tuyệt đối chỉ dùng dữ liệu trong file. Nếu không thấy, nói "Thông tin này không có trong file Excel".
    5. ĐIỀU HƯỚNG: Nếu là các lệnh `view_*`, hãy nói "Dạ, tôi đang mở trang [Tên trang] cho bạn đây. Bạn có thể xem chi tiết tại đó!".
    6. CÁ NHÂN HÓA: Xưng hô phù hợp ("Dạ", "Bạn", "Em", "Tôi").
    7. TRẢ LỜI BẰNG TIẾNG VIỆT.
        """
        prompt = prompt.replace("{HISTORY_STR}", history_str) \
                       .replace("{MESSAGE}", message) \
                       .replace("{INTENT}", intent) \
                       .replace("{TOOL_NAME}", tool_name) \
                       .replace("{TOOL_RESULT}", json.dumps(tool_result, ensure_ascii=False, cls=DateTimeEncoder) if tool_result else "Không có dữ liệu")
        
        logger.info(f"Stage 3 Data sent to LLM: {tool_result}")
        
        try:
            res = self._call_openrouter(prompt, model)
            logger.info(f"Stage 3 Full Response: {res}")
            return res
        except Exception as e:
            logger.error(f"Error in Stage 3 Answer Generator: {e}")
            detail = f" (INTENT: {intent}, TOOL: {tool_name})"
            return f"Xin lỗi, tôi gặp sự cố khi tạo câu trả lời. Vui lòng thử lại sau"
