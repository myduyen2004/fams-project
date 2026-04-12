package com.fams.backend.service.impl;

import com.fams.backend.dto.attendance.AttendanceDTO;
import com.fams.backend.entity.*;
import com.fams.backend.repository.*;
import com.fams.backend.service.AttendanceService;
import com.fams.backend.service.ExcelExportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
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
        private final EnrollmentRepository enrollmentRepository;
        private final SemesterRepository semesterRepository;
        private final ClassSectionRepository classSectionRepository;
        private final SystemLogService systemLogService;
        private final ExcelExportService excelExportService;

        @Override
        @Transactional
        public AttendanceDTO.SessionDetailResponse startSession(Long userId,
                        AttendanceDTO.StartSessionRequest request) {
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
                        session.setStatus(AttendanceSession.SessionStatus.OPEN);
                        if (session.getOpenedAt() == null) {
                                session.setOpenedAt(LocalDateTime.now());
                        }
                        return mapToDetailResponse(sessionRepository.save(session));
                } else {
                        return createNewSession(slot, userId);
                }
        }

        private AttendanceDTO.SessionDetailResponse createNewSession(TimetableSlot slot, Long userId) {
                User lecturer = userRepository.findById(userId)
                                .orElseThrow(() -> new RuntimeException("User not found"));

                AttendanceSession session = AttendanceSession.builder()
                                .timetableSlot(slot)
                                .lecturer(lecturer)
                                .openedAt(LocalDateTime.now())
                                .status(AttendanceSession.SessionStatus.OPEN)
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
                                .orElse(null);

                if (session != null) {
                        return mapToDetailResponse(session);
                }

                // No session was ever started for this slot — return empty response from slot
                // data
                TimetableSlot slot = timetableSlotRepository.findById(slotId)
                                .orElseThrow(() -> new RuntimeException("Slot not found"));

                // Determine status: past slots are CLOSED, future slots are NO_SESSION
                LocalDateTime slotEndDateTime = LocalDateTime.of(slot.getDate(), slot.getSlotType().getEndTime());
                String status = LocalDateTime.now().isAfter(slotEndDateTime) ? "CLOSED" : "NO_SESSION";

                // Get all enrolled students even if no session exists using repository for
                // reliability
                List<Enrollment> enrollments = enrollmentRepository
                                .findByClassSectionClassName(slot.getClassSection().getClassName());
                List<AttendanceDTO.StudentAttendanceResponse> studentResponses = enrollments
                                .stream()
                                .map(enrollment -> {
                                        User student = enrollment.getStudent();
                                        return AttendanceDTO.StudentAttendanceResponse.builder()
                                                        .studentId(student.getId())
                                                        .studentCode(student.getCode())
                                                        .fullName(student.getFullName())
                                                        .avatarUrl(student.getAvatar())
                                                        .status("ABSENT")
                                                        .checkInTime(null)
                                                        .capturedFaceUrl(null)
                                                        .build();
                                })
                                .sorted(java.util.Comparator
                                                .comparing(AttendanceDTO.StudentAttendanceResponse::getFullName))
                                .collect(Collectors.toList());

                return AttendanceDTO.SessionDetailResponse.builder()
                                .sessionId(0L)
                                .slotId(slot.getId())
                                .courseCode(slot.getClassSection().getCourse().getCode())
                                .courseName(slot.getClassSection().getCourse().getName())
                                .className(slot.getClassSection().getClassName())
                                .roomCode(slot.getRoom().getCode())
                                .lecturerName(slot.getClassSection().getLecturer().getFullName())
                                .status(status)
                                .openedAt(null)
                                .closedAt(null)
                                .date(slot.getDate())
                                .startTime(slot.getSlotType().getStartTime())
                                .endTime(slot.getSlotType().getEndTime())
                                .totalStudents(enrollments.size())
                                .presentCount(0)
                                .students(studentResponses)
                                .build();
        }

        @Override
        @Transactional
        public AttendanceDTO.SessionDetailResponse updateManualAttendance(Long lecturerId,
                        AttendanceDTO.ManualAttendanceRequest request) {
                AttendanceSession session;
                if (request.getSessionId() != null && request.getSessionId() > 0) {
                        session = sessionRepository.findById(request.getSessionId())
                                        .orElseThrow(() -> new RuntimeException("Session not found"));
                } else if (request.getSlotId() != null) {
                        TimetableSlot slot = timetableSlotRepository.findById(request.getSlotId())
                                        .orElseThrow(() -> new RuntimeException("Slot not found"));
                        session = sessionRepository.findByTimetableSlotId(slot.getId())
                                        .orElseGet(() -> {
                                                User lecturer = userRepository.findById(lecturerId)
                                                                .orElseThrow(() -> new RuntimeException(
                                                                                "User not found"));
                                                AttendanceSession newSession = AttendanceSession.builder()
                                                                .timetableSlot(slot)
                                                                .lecturer(lecturer)
                                                                .openedAt(LocalDateTime.now())
                                                                .status(AttendanceSession.SessionStatus.OPEN)
                                                                .build();
                                                return sessionRepository.save(newSession);
                                        });
                } else {
                        throw new RuntimeException("Either sessionId or slotId must be provided");
                }

                if (!session.getLecturer().getId().equals(lecturerId)) {
                        throw new RuntimeException("Unauthorized: You are not the lecturer for this session");
                }

                if (request.getStudentId() == null) {
                        throw new RuntimeException("Student ID must be provided");
                }
                long studentIdRes = request.getStudentId();
                User student = userRepository.findById(studentIdRes)
                                .orElseThrow(() -> new RuntimeException("Student not found"));

                StudentAttendance attendance = studentAttendanceRepository
                                .findBySessionIdAndStudentId(session.getId(), student.getId())
                                .orElse(StudentAttendance.builder()
                                                .session(session)
                                                .student(student)
                                                .build());

                attendance.setStatus(StudentAttendance.AttendanceStatus.valueOf(request.getStatus()));
                attendance.setMethod(StudentAttendance.CheckInMethod.MANUAL);
                attendance.setNote(request.getNote());
                attendance.setUpdatedBy(session.getLecturer());
                if (attendance.getCheckInTime() == null) {
                        attendance.setCheckInTime(LocalDateTime.now());
                }

                studentAttendanceRepository.save(attendance);

                String performerName = session.getLecturer().getFullName();
                systemLogService.logSensitiveDataChange(performerName, student.getUsername(),
                        "Điểm danh (Manual)", "N/A", request.getStatus());

                return mapToDetailResponse(sessionRepository.findById(session.getId()).get());
        }

        private AttendanceDTO.SessionDetailResponse mapToDetailResponse(AttendanceSession session) {
                TimetableSlot slot = session.getTimetableSlot();

                // Determine effective status: if DB says OPEN but time is past, treat as CLOSED
                LocalDateTime slotEndDateTime = LocalDateTime.of(slot.getDate(), slot.getSlotType().getEndTime());
                String effectiveStatus = session.getStatus().name();
                if ("OPEN".equals(effectiveStatus) && LocalDateTime.now().isAfter(slotEndDateTime)) {
                        effectiveStatus = "CLOSED";
                }

                List<StudentAttendance> attendances = studentAttendanceRepository.findBySessionId(session.getId());

                // Map existing attendances to a map for easy lookup
                java.util.Map<Long, StudentAttendance> attendanceMap = attendances.stream()
                                .collect(Collectors.toMap(a -> a.getStudent().getId(), a -> a));

                // Get all enrolled students using the repository for reliability
                List<Enrollment> enrollments = enrollmentRepository
                                .findByClassSectionClassName(slot.getClassSection().getClassName());
                List<AttendanceDTO.StudentAttendanceResponse> studentResponses = enrollments
                                .stream()
                                .map(enrollment -> {
                                        User student = enrollment.getStudent();
                                        StudentAttendance attendance = attendanceMap.get(student.getId());

                                        return AttendanceDTO.StudentAttendanceResponse.builder()
                                                        .studentId(student.getId())
                                                        .studentCode(student.getCode())
                                                        .fullName(student.getFullName())
                                                        .avatarUrl(student.getAvatar())
                                                        .status(attendance != null ? attendance.getStatus().name()
                                                                        : "ABSENT")
                                                        .checkInMethod(attendance != null
                                                                        && attendance.getMethod() != null
                                                                                        ? attendance.getMethod().name()
                                                                                        : null)
                                                        .checkInTime(attendance != null ? attendance.getCheckInTime()
                                                                        : null)
                                                        .capturedFaceUrl(attendance != null
                                                                        ? attendance.getCapturedFaceUrl()
                                                                        : null)
                                                        .build();
                                })
                                .sorted(java.util.Comparator
                                                .comparing(AttendanceDTO.StudentAttendanceResponse::getFullName))
                                .collect(Collectors.toList());

                return AttendanceDTO.SessionDetailResponse.builder()
                                .sessionId(session.getId())
                                .slotId(slot.getId())
                                .courseCode(slot.getClassSection().getCourse().getCode())
                                .courseName(slot.getClassSection().getCourse().getName())
                                .className(slot.getClassSection().getClassName())
                                .roomCode(slot.getRoom().getCode())
                                .lecturerName(slot.getClassSection().getLecturer().getFullName())
                                .status(effectiveStatus)
                                .openedAt(session.getOpenedAt())
                                .closedAt(session.getClosedAt())
                                .date(slot.getDate())
                                .startTime(slot.getSlotType().getStartTime())
                                .endTime(slot.getSlotType().getEndTime())
                                .totalStudents(enrollments.size())
                                .presentCount((int) attendances.stream()
                                                .filter(a -> a.getStatus() == StudentAttendance.AttendanceStatus.PRESENT)
                                                .count())
                                .students(studentResponses)
                                .build();
        }

        @Override
        @Transactional(readOnly = true)
        public AttendanceDTO.ClassAttendanceReportResponse getClassAttendanceReport(String className) {
                // 1. Fetch slots ordered by date, slotNumber
                List<TimetableSlot> slots = timetableSlotRepository.findByClassName(className);
                if (slots.isEmpty()) {
                        throw new RuntimeException("No timetable slots found for class " + className);
                }

                ClassSection classSection = slots.get(0).getClassSection();

                // 2. Fetch Enrollments for students
                List<Enrollment> enrollments = enrollmentRepository.findByClassSectionClassName(className);

                // 3. Keep active enrollments or all? Usually all.
                List<User> students = enrollments.stream()
                                .map(Enrollment::getStudent)
                                .sorted(java.util.Comparator.comparing(User::getFullName))
                                .collect(Collectors.toList());

                // 4. Fetch all attendance sessions for these slots
                List<Long> slotIds = slots.stream().map(TimetableSlot::getId).collect(Collectors.toList());
                List<AttendanceSession> sessions = sessionRepository.findByTimetableSlotIdIn(slotIds);
                java.util.Map<Long, AttendanceSession> sessionMap = sessions.stream()
                                .collect(Collectors.toMap(s -> s.getTimetableSlot().getId(), s -> s));

                // 5. Fetch all student attendances for these sessions
                List<Long> sessionIds = sessions.stream().map(AttendanceSession::getId).collect(Collectors.toList());
                List<StudentAttendance> attendances = studentAttendanceRepository.findBySessionIdIn(sessionIds);

                // Map: sessionId -> (studentId -> StudentAttendance)
                java.util.Map<Long, java.util.Map<Long, StudentAttendance>> attendanceMap = new java.util.HashMap<>();
                for (StudentAttendance sa : attendances) {
                        attendanceMap
                                        .computeIfAbsent(sa.getSession().getId(), k -> new java.util.HashMap<>())
                                        .put(sa.getStudent().getId(), sa);
                }

                // 6. Build SlotInfos
                List<AttendanceDTO.SlotInfo> slotInfos = new java.util.ArrayList<>();
                for (int i = 0; i < slots.size(); i++) {
                        TimetableSlot slot = slots.get(i);
                        slotInfos.add(AttendanceDTO.SlotInfo.builder()
                                        .slotId(slot.getId())
                                        .slotIndex(i + 1)
                                        .date(slot.getDate())
                                        .build());
                }

                // 7. Calculate absent % and build student reports
                int totalClassSlots = slots.size();
                if (totalClassSlots == 0) {
                        if (classSection.getCourse() != null && classSection.getCourse().getNumberOfSlots() != null) {
                                totalClassSlots = classSection.getCourse().getNumberOfSlots();
                        } else if (classSection.getNumberOfSlots() != null) {
                                totalClassSlots = classSection.getNumberOfSlots();
                        }
                }

                if (totalClassSlots == 0)
                        totalClassSlots = 1;

                List<AttendanceDTO.StudentReport> studentReports = new java.util.ArrayList<>();
                LocalDateTime now = LocalDateTime.now();

                for (User student : students) {
                        List<AttendanceDTO.AttendanceDetail> details = new java.util.ArrayList<>();
                        int absentCount = 0;

                        for (int i = 0; i < slots.size(); i++) {
                                TimetableSlot slot = slots.get(i);
                                AttendanceSession session = sessionMap.get(slot.getId());
                                String status = null;

                                if (session != null) {
                                        StudentAttendance sa = attendanceMap
                                                        .getOrDefault(session.getId(), java.util.Collections.emptyMap())
                                                        .get(student.getId());
                                        if (sa != null) {
                                                status = sa.getStatus() == StudentAttendance.AttendanceStatus.PRESENT
                                                                ? "P"
                                                                : (sa.getStatus() == StudentAttendance.AttendanceStatus.EXCUSED
                                                                                ? "E"
                                                                                : "A");
                                        } else {
                                                status = "A"; // Session exists, but student wasn't marked, default is
                                                              // absent
                                        }
                                } else {
                                        LocalDateTime slotEndDateTime = LocalDateTime.of(slot.getDate(),
                                                        slot.getSlotType().getEndTime());
                                        if (now.isAfter(slotEndDateTime)) {
                                                // Slot passed without any session started, consider it absent
                                                status = "A";
                                        }
                                }

                                if ("A".equals(status)) {
                                        absentCount++;
                                }

                                details.add(AttendanceDTO.AttendanceDetail.builder()
                                                .slotId(slot.getId())
                                                .slotIndex(i + 1)
                                                .status(status)
                                                .build());
                        }

                        double absentPercentage = (double) absentCount / totalClassSlots * 100.0;

                        studentReports.add(AttendanceDTO.StudentReport.builder()
                                        .studentId(student.getId())
                                        .studentCode(student.getCode())
                                        .studentName(student.getFullName())
                                        .avatarUrl(student.getAvatar())
                                        .absentPercentage(absentPercentage)
                                        .attendanceDetails(details)
                                        .build());
                }

                return AttendanceDTO.ClassAttendanceReportResponse.builder()
                                .className(classSection.getClassName())
                                .courseCode(classSection.getCourse().getCode())
                                .courseName(classSection.getCourse().getName())
                                .semesterName(classSection.getSemester().getName())
                                .slots(slotInfos)
                                .studentReports(studentReports)
                                .build();
        }

        @Override
        @Transactional(readOnly = true)
        public AttendanceDTO.StudentAttendanceSummaryResponse getStudentAttendanceSummary(Long studentId,
                        String semesterCode) {
                User student = userRepository.findById(studentId)
                                .orElseThrow(() -> new RuntimeException("Sinh viên không tồn tại"));

                Semester semester;
                if (semesterCode == null || semesterCode.isEmpty()) {
                        semester = semesterRepository.findActiveSemesters().stream().findFirst()
                                        .orElseThrow(() -> new RuntimeException("Không tìm thấy học kỳ hiện tại"));
                } else {
                        semester = semesterRepository.findByCode(semesterCode)
                                        .orElseThrow(() -> new RuntimeException(
                                                        "Học kỳ không tồn tại: " + semesterCode));
                }

                List<Enrollment> enrollments = enrollmentRepository.findByStudentIdAndSemesterId(studentId,
                                semester.getId());
                List<AttendanceDTO.ClassAttendanceSummary> summaries = new ArrayList<>();
                LocalDateTime now = LocalDateTime.now();

                for (Enrollment enrollment : enrollments) {
                        ClassSection cs = enrollment.getClassSection();
                        List<TimetableSlot> allSlots = timetableSlotRepository.findByClassName(cs.getClassName());
                        List<TimetableSlot> slots = allSlots.stream()
                                        .filter(s -> s.getStatus() != TimetableSlot.TimetableSlotStatus.CANCELLED)
                                        .collect(Collectors.toList());

                        int totalSlots = slots.size();
                        if (totalSlots == 0) {
                                if (cs.getCourse() != null && cs.getCourse().getNumberOfSlots() != null) {
                                        totalSlots = cs.getCourse().getNumberOfSlots();
                                } else if (cs.getNumberOfSlots() != null) {
                                        totalSlots = cs.getNumberOfSlots();
                                }
                        }

                        if (totalSlots == 0) {
                                totalSlots = 1;
                        }

                        int sessionsHeld = 0;
                        int presentCount = 0;
                        int unexcusedAbsentCount = 0;
                        int excusedAbsentCount = 0;

                        // Fetch student attendance for this class
                        List<StudentAttendance> attendances = studentAttendanceRepository
                                        .findByStudentIdAndClassName(studentId, cs.getClassName());
                        Map<Long, StudentAttendance> attendanceMap = attendances.stream()
                                        .filter(sa -> sa.getSession() != null
                                                        && sa.getSession().getTimetableSlot() != null)
                                        .collect(Collectors.toMap(sa -> sa.getSession().getTimetableSlot().getId(),
                                                        sa -> sa, (a, b) -> a));

                        for (TimetableSlot slot : slots) {
                                LocalDateTime slotEnd = LocalDateTime.of(slot.getDate(),
                                                slot.getSlotType().getEndTime());
                                if (now.isAfter(slotEnd)) {
                                        sessionsHeld++;
                                        StudentAttendance sa = attendanceMap.get(slot.getId());
                                        if (sa != null) {
                                                if (sa.getStatus() == StudentAttendance.AttendanceStatus.PRESENT) {
                                                        presentCount++;
                                                } else if (sa.getStatus() == StudentAttendance.AttendanceStatus.EXCUSED) {
                                                        excusedAbsentCount++;
                                                } else {
                                                        unexcusedAbsentCount++;
                                                }
                                        } else {
                                                unexcusedAbsentCount++;
                                        }
                                }
                        }

                        double attendancePercentage = totalSlots > 0
                                        ? (double) (presentCount + excusedAbsentCount) / totalSlots * 100.0
                                        : 0.0;
                        double absentPercentage = (double) unexcusedAbsentCount / totalSlots * 100.0;

                        LocalDate startDate = slots.isEmpty() ? null : 
                            slots.stream().map(TimetableSlot::getDate).min(LocalDate::compareTo).orElse(null);
                        LocalDate endDate = slots.isEmpty() ? null : 
                            slots.stream().map(TimetableSlot::getDate).max(LocalDate::compareTo).orElse(null);

                        summaries.add(AttendanceDTO.ClassAttendanceSummary.builder()
                                        .className(cs.getClassName())
                                        .courseCode(cs.getCourse().getCode())
                                        .courseName(cs.getCourse().getName())
                                        .lecturerName(cs.getLecturer() != null ? cs.getLecturer().getFullName() : "N/A")
                                        .totalSlots(totalSlots)
                                        .totalSessionsHeld(sessionsHeld)
                                        .presentCount(presentCount)
                                        .unexcusedAbsentCount(unexcusedAbsentCount)
                                        .excusedAbsentCount(excusedAbsentCount)
                                        .attendancePercentage(Math.round(attendancePercentage * 100.0) / 100.0)
                                        .absentPercentage(Math.round(absentPercentage * 100.0) / 100.0)
                                        .startDate(startDate)
                                        .endDate(endDate)
                                        .build());
                }

                return AttendanceDTO.StudentAttendanceSummaryResponse.builder()
                                .studentName(student.getFullName())
                                .studentCode(student.getCode())
                                .semesterName(semester.getName())
                                .classSummaries(summaries)
                                .build();
        }

        @Override
        @Transactional(readOnly = true)
        public AttendanceDTO.IndividualAttendanceDetail getStudentAttendanceDetail(Long studentId, String className) {
                ClassSection cs = classSectionRepository.findByClassName(className)
                                .orElseThrow(() -> new RuntimeException("Lớp học không tồn tại"));

                List<TimetableSlot> allSlots = timetableSlotRepository.findByClassName(className);
                List<TimetableSlot> slots = allSlots.stream()
                                .filter(s -> s.getStatus() != TimetableSlot.TimetableSlotStatus.CANCELLED)
                                .collect(Collectors.toList());

                List<StudentAttendance> attendances = studentAttendanceRepository
                                .findByStudentIdAndClassName(studentId, className);
                Map<Long, StudentAttendance> attendanceMap = attendances.stream()
                                .filter(sa -> sa.getSession() != null && sa.getSession().getTimetableSlot() != null)
                                .collect(Collectors.toMap(sa -> sa.getSession().getTimetableSlot().getId(), sa -> sa,
                                                (a, b) -> a));

                LocalDateTime now = LocalDateTime.now();
                List<AttendanceDTO.IndividualSlotAttendance> slotAttendanceList = slots.stream().map(slot -> {
                        LocalDateTime slotEnd = LocalDateTime.of(slot.getDate(), slot.getSlotType().getEndTime());
                        String statusStr = "FUTURE";
                        if (now.isAfter(slotEnd)) {
                                StudentAttendance sa = attendanceMap.get(slot.getId());
                                if (sa != null) {
                                        statusStr = sa.getStatus().name();
                                } else {
                                        statusStr = "ABSENT";
                                }
                        }

                        return AttendanceDTO.IndividualSlotAttendance.builder()
                                        .slotId(slot.getId())
                                        .slotIndex(0)
                                        .date(slot.getDate())
                                        .startTime(slot.getSlotType().getStartTime())
                                        .endTime(slot.getSlotType().getEndTime())
                                        .roomCode(slot.getRoom().getCode())
                                        .status(statusStr)
                                        .lecturerName(cs.getLecturer() != null ? cs.getLecturer().getFullName() : "N/A")
                                        .build();
                }).collect(Collectors.toList());

                // Set slot index after sorting
                slotAttendanceList.sort(Comparator.comparing(AttendanceDTO.IndividualSlotAttendance::getDate)
                                .thenComparing(AttendanceDTO.IndividualSlotAttendance::getStartTime));
                for (int i = 0; i < slotAttendanceList.size(); i++) {
                        slotAttendanceList.get(i).setSlotIndex(i + 1);
                }

                return AttendanceDTO.IndividualAttendanceDetail.builder()
                                .className(cs.getClassName())
                                .courseCode(cs.getCourse().getCode())
                                .courseName(cs.getCourse().getName())
                                .slots(slotAttendanceList)
                                .build();
        }

        @Override
        @Transactional(readOnly = true)
        public void exportClassAttendanceReport(String className, jakarta.servlet.http.HttpServletResponse response)
                        throws java.io.IOException {
                AttendanceDTO.ClassAttendanceReportResponse report = getClassAttendanceReport(className);
                excelExportService.exportClassAttendanceReportToExcel(response, report);
        }
}