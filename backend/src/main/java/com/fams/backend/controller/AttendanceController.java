package com.fams.backend.controller;

import com.fams.backend.dto.attendance.AttendanceDTO;
import com.fams.backend.entity.User;
import com.fams.backend.repository.UserRepository;
import com.fams.backend.service.AttendanceService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;
    private final UserRepository userRepository;

    @PostMapping("/session/start")
    @PreAuthorize("hasRole('LECTURER')")
    @Operation(summary = "Start attendance session", description = "For lecturer to start check-in session")
    public ResponseEntity<AttendanceDTO.SessionDetailResponse> startSession(
            @RequestBody AttendanceDTO.StartSessionRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        return ResponseEntity.ok(attendanceService.startSession(user.getId(), request));
    }

    @GetMapping("/session/{sessionId}")
    @PreAuthorize("hasAnyRole('LECTURER', 'STUDENT', 'ACADEMIC_STAFF')")
    @Operation(summary = "Get session detail")
    public ResponseEntity<AttendanceDTO.SessionDetailResponse> getSession(@PathVariable Long sessionId) {
        return ResponseEntity.ok(attendanceService.getSessionDetail(sessionId));
    }

    @GetMapping("/session/slot/{slotId}")
    @PreAuthorize("hasAnyRole('LECTURER', 'ACADEMIC_STAFF')")
    @Operation(summary = "Get session by slot")
    public ResponseEntity<AttendanceDTO.SessionDetailResponse> getSessionBySlot(@PathVariable Long slotId) {
        return ResponseEntity.ok(attendanceService.getSessionBySlot(slotId));
    }

    @PostMapping("/session/manual")
    @PreAuthorize("hasRole('LECTURER')")
    @Operation(summary = "Update manual attendance", description = "For lecturer to manually update student attendance status")
    public ResponseEntity<AttendanceDTO.SessionDetailResponse> updateManualAttendance(
            @RequestBody AttendanceDTO.ManualAttendanceRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        User lecturer = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Lecturer not found"));

        return ResponseEntity.ok(attendanceService.updateManualAttendance(lecturer.getId(), request));
    }

    @GetMapping("/class/{className}/report")
    @PreAuthorize("hasAnyRole('LECTURER', 'ACADEMIC_STAFF')")
    @Operation(summary = "Get class attendance report")
    public ResponseEntity<AttendanceDTO.ClassAttendanceReportResponse> getClassAttendanceReport(
            @PathVariable String className) {
        return ResponseEntity.ok(attendanceService.getClassAttendanceReport(className));
    }

    @GetMapping("/student/report")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Get current student attendance summary")
    public ResponseEntity<AttendanceDTO.StudentAttendanceSummaryResponse> getStudentAttendanceSummary(
            @RequestParam(required = false) String semesterCode,
            @AuthenticationPrincipal UserDetails userDetails) {
        User student = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Student not found"));
        return ResponseEntity.ok(attendanceService.getStudentAttendanceSummary(student.getId(), semesterCode));
    }

    @GetMapping("/student/class/{className}/detail")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Get student detailed attendance for a class")
    public ResponseEntity<AttendanceDTO.IndividualAttendanceDetail> getStudentAttendanceDetail(
            @PathVariable String className,
            @AuthenticationPrincipal UserDetails userDetails) {
        User student = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Student not found"));
        return ResponseEntity.ok(attendanceService.getStudentAttendanceDetail(student.getId(), className));
    }
}
