from __future__ import annotations

import json
import time
from typing import Any, Dict, List, Optional

from loguru import logger

from app.services.chat.db.pool import db_pool
from app.services.chat.db.queries import TEMPLATES, build_params, normalize_entities
from app.services.chat.router.tool_catalog import (
    build_missing_fields,
    has_enough_required_entities,
    infer_required_fields,
    validate_required_entities,
)
from app.services.chat.services.llm_client import llm_client


class EvaluatorService:
    """
    Test tool theo luồng gần với runtime thật:
    - chuẩn hóa entities
    - kiểm tra required fields
    - build params bằng build_params()
    - chạy SQL thật với DB cho các SELECT tool
    """

    def test_tool(self, tool_data: Dict[str, Any]) -> Dict[str, Any]:
        start_time = time.time()
        logs: List[str] = []

        tool_name = str(tool_data.get("toolName", "Unknown Tool"))
        tool_type = str(tool_data.get("toolType", "SQL_TEMPLATE"))
        sql_template = tool_data.get("sqlTemplate")
        required_fields = tool_data.get("requiredFields")
        required_resp_fields = tool_data.get("requiredRespFields")
        provided_params = tool_data.get("params")

        logs.append(f"[REQUEST] Testing tool: {tool_name} ({tool_type})")
        logger.info(f"[Evaluator] Testing tool: {tool_name} ({tool_type})")

        try:
            manual_mode = bool(provided_params and isinstance(provided_params, dict) and len(provided_params) > 0)

            if manual_mode:
                logs.append("[PROCESS] Using manual parameters from Workbench.")
                raw_params = dict(provided_params)
            else:
                logs.append("[PROCESS] No manual parameters provided. Generating fallback mock data.")
                raw_params = self._generate_mock_params(tool_name, required_fields)

            logs.append(f"[PROCESS] Raw params: {json.dumps(raw_params, ensure_ascii=False)}")

            if tool_type != "SQL_TEMPLATE":
                return self._finalize(
                    {
                        "passed": True,
                        "message": f"Tool '{tool_name}' không phải SQL_TEMPLATE. Test hiện chỉ kiểm tra schema đầu vào.",
                    },
                    logs,
                    start_time,
                )

            normalized = normalize_entities(raw_params, user_code="ADMIN001", tool_name=tool_name)
            normalized = validate_required_entities(tool_name, normalized)
            logs.append(f"[PROCESS] Normalized params: {json.dumps(normalized, ensure_ascii=False)}")
            invalid_fields = list(normalized.get("__invalid_required_fields__", []) or [])
            if invalid_fields:
                logs.append(f"[PROCESS] Invalid required fields removed: {invalid_fields}")

            if not has_enough_required_entities(tool_name, normalized):
                missing = build_missing_fields(tool_name, normalized)
                missing_labels = [field.get("name") or "" for field in missing]
                return self._finalize(
                    {
                        "passed": False,
                        "message": (
                            f"Thiếu hoặc sai tham số bắt buộc. "
                            f"Cần bổ sung một trong các trường: {', '.join(missing_labels)}"
                        ),
                    },
                    logs + [f"[ERROR] Missing/invalid fields: {missing_labels}"],
                    start_time,
                )

            resolved_key, params = build_params(tool_name, normalized, user_id=1, user_role="ADMIN")
            logs.append(f"[PROCESS] build_params -> resolved_key={resolved_key}, params={params}")

            sql = TEMPLATES.get(resolved_key) or sql_template
            if not sql:
                return self._finalize(
                    {"passed": False, "message": f"Không tìm thấy SQL template cho tool '{resolved_key}'."},
                    logs,
                    start_time,
                )

            sql_preview = str(sql).strip().replace("\n", " ")[:180]
            logs.append(f"[PROCESS] SQL preview: {sql_preview}")

            if not str(sql).lstrip().lower().startswith("select"):
                return self._finalize(
                    {
                        "passed": True,
                        "message": (
                            f"Tool '{tool_name}' build_params hợp lệ. "
                            "Mutation SQL không được execute trong chế độ test an toàn."
                        ),
                    },
                    logs + ["[PROCESS] Mutation tool detected. Execution skipped for safety."],
                    start_time,
                )

            row_count, sample = self._execute_select(sql, tuple(params or ()))
            sample_preview = json.dumps(sample[:2], ensure_ascii=False, default=str)
            logs.append(f"[PROCESS] Query executed successfully. rows={row_count}")
            logs.append(f"[PROCESS] Sample rows: {sample_preview}")

            # Contract Validation (Output Schema)
            if required_resp_fields and row_count > 0:
                expected = [f.strip() for f in str(required_resp_fields).split(",") if f.strip()]
                actual_keys = list(sample[0].keys())
                missing_resp = [f for f in expected if f not in actual_keys]
                
                if missing_resp:
                    logs.append(f"[ERROR] Contract validation failed. Missing fields: {missing_resp}")
                    return self._finalize(
                        {
                            "passed": False, 
                            "message": f"Dữ liệu trả về thiếu các trường bắt buộc theo giao kèo: {', '.join(missing_resp)}"
                        }, 
                        logs, 
                        start_time
                    )
                logs.append("[PROCESS] Contract validation passed.")

            message = f"SQL chạy thành công. Trả về {row_count} dòng."
            if row_count == 0:
                message = "SQL chạy được nhưng không tìm thấy dữ liệu khớp với tham số test."
                if manual_mode:
                    if invalid_fields:
                        message += f" Các trường sai định dạng: {', '.join(invalid_fields)}."
                    return self._finalize({"passed": False, "message": message}, logs, start_time)

            if manual_mode and invalid_fields:
                message += f" Có trường sai định dạng đã bị bỏ qua: {', '.join(invalid_fields)}."

            return self._finalize({"passed": True, "message": message}, logs, start_time)

        except Exception as e:
            logger.error(f"[Evaluator] Error testing tool {tool_name}: {e}")
            logs.append(f"[ERROR] {str(e)}")
            return self._finalize(
                {"passed": False, "message": f"Evaluation failed: {str(e)}"},
                logs,
                start_time,
            )

    def _execute_select(self, sql: str, params: tuple) -> tuple[int, List[Dict[str, Any]]]:
        with db_pool.get_cursor() as cur:
            cur.execute(sql, params or None)
            rows = cur.fetchall()
            data = [dict(row) for row in rows]
            return len(data), data

    def _generate_mock_params(self, tool_name: str, required_fields: Optional[str]) -> Dict[str, Any]:
        fields = [f.strip() for f in str(required_fields or "").split(",") if f.strip()]
        if not fields:
            fields = infer_required_fields(tool_name)
        if not fields:
            return {}

        prompt = f"""
        Bạn là một chuyên gia giả lập dữ liệu.
        Hãy tạo JSON cho tool '{tool_name}' với các trường: {", ".join(fields)}.
        Ví dụ:
        - student_code: SE170001
        - lecturer_code: GV001
        - class_name: PRF192_SE1
        - date: 2026-03-17
        - role: LECTURER
        - status: ACTIVE
        Chỉ trả về JSON.
        """

        try:
            response = llm_client.call(prompt, model="llama-3.1-8b-instant")
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0].strip()
            elif "```" in response:
                response = response.split("```")[1].split("```")[0].strip()
            return json.loads(response)
        except Exception as e:
            logger.warning(f"Failed to generate mock params via LLM: {e}. Using defaults.")
            defaults = {
                "student_code": "SE170001",
                "lecturer_code": "GV001",
                "full_name": "Nguyen Van A",
                "class_name": "PRF192_SE1",
                "course_code": "PRF192",
                "course_name": "Programming Fundamentals",
                "semester_code": "SP26",
                "major_code": "SE",
                "major_name": "Cong nghe thong tin",
                "date": "2026-03-17",
                "slot_number": 1,
                "role": "LECTURER",
                "status": "ACTIVE",
            }
            return {field: defaults.get(field, "mock_value") for field in fields}

    def _finalize(self, result: Dict[str, Any], logs: List[str], start_time: float) -> Dict[str, Any]:
        execution_time_ms = int((time.time() - start_time) * 1000)
        logs.append(f"[RESPONSE] Completed in {execution_time_ms}ms")
        result["logs"] = "\n".join(logs)
        result["executionTimeMs"] = execution_time_ms
        return result


evaluator_service = EvaluatorService()
