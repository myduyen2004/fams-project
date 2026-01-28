package com.fams.backend.service;

import com.fams.backend.dto.attendance.AttendanceDTO;

public interface AttendanceService {
    AttendanceDTO.SessionDetailResponse startSession(Long userId, AttendanceDTO.StartSessionRequest request);

    AttendanceDTO.SessionDetailResponse getSessionDetail(Long sessionId);

    AttendanceDTO.SessionDetailResponse getSessionBySlot(Long slotId);

    AttendanceDTO.CheckInResponse checkIn(Long studentId, AttendanceDTO.CheckInRequest request);
}
