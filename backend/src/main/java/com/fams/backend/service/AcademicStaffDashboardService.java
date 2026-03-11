package com.fams.backend.service;

import com.fams.backend.dto.response.AcademicStaffDashboardResponse;

public interface AcademicStaffDashboardService {
    AcademicStaffDashboardResponse getDashboardData(java.time.LocalDate startDate);
    java.util.List<AcademicStaffDashboardResponse.WeeklyAttendanceDTO> getWeeklyAttendanceData(java.time.LocalDate startDate);
    AcademicStaffDashboardResponse.AttendanceStatsDTO getAttendanceStatsForDate(java.time.LocalDate date);
}
