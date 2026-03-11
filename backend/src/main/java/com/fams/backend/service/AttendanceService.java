package com.fams.backend.service;

import com.fams.backend.dto.attendance.AttendanceDTO;

public interface AttendanceService {
    AttendanceDTO.SessionDetailResponse startSession(Long userId, AttendanceDTO.StartSessionRequest request);

    AttendanceDTO.SessionDetailResponse getSessionDetail(Long sessionId);

    AttendanceDTO.SessionDetailResponse getSessionBySlot(Long slotId);

    AttendanceDTO.SessionDetailResponse updateManualAttendance(Long lecturerId,
            AttendanceDTO.ManualAttendanceRequest request);

    AttendanceDTO.ClassAttendanceReportResponse getClassAttendanceReport(String className);

    AttendanceDTO.StudentAttendanceSummaryResponse getStudentAttendanceSummary(Long studentId, String semesterCode);

    AttendanceDTO.IndividualAttendanceDetail getStudentAttendanceDetail(Long studentId, String className);
}
