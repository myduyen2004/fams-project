package com.fams.backend.service.impl;

import com.fams.backend.dto.attendance.AttendanceDTO;
import com.fams.backend.entity.*;
import com.fams.backend.repository.*;
import com.fams.backend.service.AttendanceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AttendanceServiceImpl implements AttendanceService {

    private final AttendanceSessionRepository sessionRepository;
    private final TimetableSlotRepository timetableSlotRepository;
    private final AttendanceConfigRepository configRepository;
    private final StudentAttendanceRepository studentAttendanceRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public AttendanceDTO.SessionDetailResponse startSession(Long userId, AttendanceDTO.StartSessionRequest request) {
        log.info("Request to start session for slot {} by user {}", request.getSlotId(), userId);

        TimetableSlot slot = timetableSlotRepository.findById(request.getSlotId())
                .orElseThrow(() -> new RuntimeException("Slot not found"));

        if (!slot.getClassSection().getLecturer().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized: You are not the lecturer for this slot");
        }

        // Check for existing session
        AttendanceSession session = sessionRepository.findByTimetableSlotId(slot.getId())
                .orElse(null);

        if (session != null) {
            // Refresh existing session
            session.setQrCodeData(UUID.randomUUID().toString());
            session.setQrExpiresAt(LocalDateTime.now().plusMinutes(5));
            session.setStatus(AttendanceSession.SessionStatus.OPEN);
            if (session.getOpenedAt() == null) {
                session.setOpenedAt(LocalDateTime.now());
            }
            // We do NOT reset student attendances to keep records of those who checked in
            // already
            return mapToDetailResponse(sessionRepository.save(session));
        } else {
            return createNewSession(slot, userId);
        }
    }

    private AttendanceDTO.SessionDetailResponse createNewSession(TimetableSlot slot, Long userId) {
        User lecturer = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Get config - though we override explicitly to 5 minutes as requested
        // AttendanceConfig config = configRepository.findByConfigKey("SYSTEM_CONFIG")
        // .orElse(AttendanceConfig.builder().build());

        AttendanceSession session = AttendanceSession.builder()
                .timetableSlot(slot)
                .lecturer(lecturer)
                .openedAt(LocalDateTime.now())
                .status(AttendanceSession.SessionStatus.OPEN)
                .qrCodeData(UUID.randomUUID().toString())
                .qrExpiresAt(LocalDateTime.now().plusMinutes(5)) // 5 minutes validity
                .build();

        session = sessionRepository.save(session);
        return mapToDetailResponse(session);
    }

    @Override
    @Transactional(readOnly = true)
    public AttendanceDTO.SessionDetailResponse getSessionDetail(Long sessionId) {
        AttendanceSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));
        return mapToDetailResponse(session);
    }

    @Override
    @Transactional(readOnly = true)
    public AttendanceDTO.SessionDetailResponse getSessionBySlot(Long slotId) {
        AttendanceSession session = sessionRepository.findByTimetableSlotId(slotId)
                .orElseThrow(() -> new RuntimeException("Session not found for this slot"));
        return mapToDetailResponse(session);
    }

    private AttendanceDTO.SessionDetailResponse mapToDetailResponse(AttendanceSession session) {
        TimetableSlot slot = session.getTimetableSlot();

        List<StudentAttendance> attendances = studentAttendanceRepository.findBySessionId(session.getId());

        List<AttendanceDTO.StudentAttendanceResponse> studentResponses = attendances.stream()
                .filter(a -> a.getStatus() == StudentAttendance.AttendanceStatus.PRESENT) // Show all or just present?
                                                                                          // Usually all is better but
                                                                                          // UI asked for "Success list"
                .map(a -> AttendanceDTO.StudentAttendanceResponse.builder()
                        .studentId(a.getStudent().getId())
                        .studentCode(a.getStudent().getCode())
                        .fullName(a.getStudent().getFullName())
                        .status(a.getStatus().name())
                        .checkInTime(a.getCheckInTime())
                        .build())
                .collect(Collectors.toList());

        return AttendanceDTO.SessionDetailResponse.builder()
                .sessionId(session.getId())
                .slotId(slot.getId())
                .courseCode(slot.getClassSection().getCourse().getCode())
                .courseName(slot.getClassSection().getCourse().getName())
                .className(slot.getClassSection().getClassName())
                .roomCode(slot.getRoom().getCode())
                .lecturerName(slot.getClassSection().getLecturer().getFullName())
                .status(session.getStatus().name())
                .qrCodeData(session.getQrCodeData())
                .qrExpiresAt(session.getQrExpiresAt())
                .openedAt(session.getOpenedAt())
                .closedAt(session.getClosedAt())
                .totalStudents(slot.getClassSection().getEnrollments().size()) // This might be wrong if enrollments
                                                                               // includes dropped, but for now ok
                .presentCount((int) attendances.stream()
                        .filter(a -> a.getStatus() == StudentAttendance.AttendanceStatus.PRESENT).count())
                .students(studentResponses)
                .build();
    }

    @Override
    @Transactional
    public AttendanceDTO.CheckInResponse checkIn(Long studentId, AttendanceDTO.CheckInRequest request) {
        AttendanceSession session = sessionRepository.findByQrCodeData(request.getQrCode())
                .orElseThrow(() -> new RuntimeException("Invalid QR Code"));

        if (session.getQrExpiresAt().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("QR Code has expired");
        }

        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        StudentAttendance attendance = studentAttendanceRepository
                .findBySessionIdAndStudentId(session.getId(), studentId)
                .orElse(null);

        if (attendance != null && attendance.getStatus() == StudentAttendance.AttendanceStatus.PRESENT) {
            return AttendanceDTO.CheckInResponse.builder()
                    .status("ALREADY_CHECKED_IN")
                    .message("Bạn đã điểm danh rồi")
                    .courseName(session.getTimetableSlot().getClassSection().getCourse().getName())
                    .sessionTime(session.getOpenedAt().toString())
                    .build();
        }

        if (attendance == null) {
            attendance = StudentAttendance.builder()
                    .session(session)
                    .student(student)
                    .method(StudentAttendance.CheckInMethod.QR_CODE)
                    .build();
        }

        attendance.setStatus(StudentAttendance.AttendanceStatus.PRESENT);
        attendance.setCheckInTime(LocalDateTime.now());
        attendance.setFaceConfidence(1.0);

        studentAttendanceRepository.save(attendance);

        return AttendanceDTO.CheckInResponse.builder()
                .status("SUCCESS")
                .message("Điểm danh thành công")
                .courseName(session.getTimetableSlot().getClassSection().getCourse().getName())
                .sessionTime(LocalDateTime.now().toString())
                .build();
    }
}
