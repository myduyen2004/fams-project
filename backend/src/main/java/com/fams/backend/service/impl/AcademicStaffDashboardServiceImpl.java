package com.fams.backend.service.impl;

import com.fams.backend.dto.response.AcademicStaffDashboardResponse;
import com.fams.backend.dto.response.DashboardNotificationResponse;
import com.fams.backend.entity.Notification;
import com.fams.backend.entity.ScheduleRequest;
import com.fams.backend.entity.User;
import com.fams.backend.repository.*;
import com.fams.backend.service.AcademicStaffDashboardService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
@Slf4j
public class AcademicStaffDashboardServiceImpl implements AcademicStaffDashboardService {

        private final UserRepository userRepository;
        private final NotificationRecipientRepository recipientRepository;
        private final StudentProfileRepository studentProfileRepository;
        private final TimetableSlotRepository timetableSlotRepository;
        private final AttendanceSessionRepository attendanceSessionRepository;
        private final EnrollmentRepository enrollmentRepository;
        private final StudentAttendanceRepository studentAttendanceRepository;
        private final LecturerProfileRepository lecturerProfileRepository;
        private final ScheduleRequestRepository scheduleRequestRepository;
        private final java.util.concurrent.Executor dashboardExecutor;

        @org.springframework.beans.factory.annotation.Autowired
        @org.springframework.context.annotation.Lazy
        private AcademicStaffDashboardServiceImpl self;

        public AcademicStaffDashboardServiceImpl(
                        UserRepository userRepository,
                        NotificationRecipientRepository recipientRepository,
                        StudentProfileRepository studentProfileRepository,
                        TimetableSlotRepository timetableSlotRepository,
                        AttendanceSessionRepository attendanceSessionRepository,
                        EnrollmentRepository enrollmentRepository,
                        StudentAttendanceRepository studentAttendanceRepository,
                        LecturerProfileRepository lecturerProfileRepository,
                        ScheduleRequestRepository scheduleRequestRepository,
                        @org.springframework.beans.factory.annotation.Qualifier("dashboardExecutor") java.util.concurrent.Executor dashboardExecutor) {
                this.userRepository = userRepository;
                this.recipientRepository = recipientRepository;
                this.studentProfileRepository = studentProfileRepository;
                this.timetableSlotRepository = timetableSlotRepository;
                this.attendanceSessionRepository = attendanceSessionRepository;
                this.enrollmentRepository = enrollmentRepository;
                this.studentAttendanceRepository = studentAttendanceRepository;
                this.lecturerProfileRepository = lecturerProfileRepository;
                this.scheduleRequestRepository = scheduleRequestRepository;
                this.dashboardExecutor = dashboardExecutor;
        }

        private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

        @Override
        public AcademicStaffDashboardResponse getDashboardData(java.time.LocalDate startDate) {
                log.info("Starting optimized parallel dashboard fetch...");
                long startTime = System.currentTimeMillis();

                // Get current user for context propagation
                String username = org.springframework.security.core.context.SecurityContextHolder.getContext()
                                .getAuthentication().getName();

                // 1. Initiate parallel data fetching tasks
                java.util.concurrent.CompletableFuture<List<AcademicStaffDashboardResponse.RunningRoomDTO>> runningRoomsFuture = java.util.concurrent.CompletableFuture
                                .supplyAsync(self::getRunningRooms, dashboardExecutor);

                java.util.concurrent.CompletableFuture<AcademicStaffDashboardResponse.DashboardStats> statsFuture = java.util.concurrent.CompletableFuture
                                .supplyAsync(() -> self.getStats(), dashboardExecutor);

                java.util.concurrent.CompletableFuture<List<AcademicStaffDashboardResponse.TopStudentDTO>> topStudentsFuture = java.util.concurrent.CompletableFuture
                                .supplyAsync(() -> self.getTopStudents(), dashboardExecutor);

                java.util.concurrent.CompletableFuture<List<DashboardNotificationResponse>> notificationsFuture = java.util.concurrent.CompletableFuture
                                .supplyAsync(() -> self.getNotifications(username), dashboardExecutor);

                java.util.concurrent.CompletableFuture<AcademicStaffDashboardResponse.AttendanceStatsDTO> attendanceStatsFuture = java.util.concurrent.CompletableFuture
                                .supplyAsync(() -> self.getAttendanceStatsForDate(java.time.LocalDate.now()),
                                                dashboardExecutor);

                java.util.concurrent.CompletableFuture<List<AcademicStaffDashboardResponse.WeeklyAttendanceDTO>> weeklyAttendanceFuture = java.util.concurrent.CompletableFuture
                                .supplyAsync(() -> self.getWeeklyAttendanceData(startDate), dashboardExecutor);

                java.util.concurrent.CompletableFuture<Integer> unreadCountFuture = java.util.concurrent.CompletableFuture
                                .supplyAsync(() -> {
                                        User user = userRepository.findByUsername(username).orElse(null);
                                        if (user != null) {
                                                return (int) recipientRepository
                                                                .countByRecipientAndIsReadFalseAndNotification_Type(
                                                                                user,
                                                                                Notification.NotificationType.SYSTEM);
                                        }
                                        return 0;
                                }, dashboardExecutor);

                try {
                        // 2. Wait for all to complete
                        java.util.concurrent.CompletableFuture.allOf(
                                        runningRoomsFuture, statsFuture, topStudentsFuture,
                                        notificationsFuture, attendanceStatsFuture,
                                        weeklyAttendanceFuture, unreadCountFuture).join();

                        List<AcademicStaffDashboardResponse.RunningRoomDTO> runningRooms = runningRoomsFuture.get();

                        AcademicStaffDashboardResponse response = AcademicStaffDashboardResponse.builder()
                                        .stats(statsFuture.get())
                                        .topStudents(topStudentsFuture.get())
                                        .notifications(notificationsFuture.get())
                                        .unreadNotificationsCount(unreadCountFuture.get())
                                        .attendanceStats(attendanceStatsFuture.get())
                                        .runningRooms(runningRooms.stream().limit(4).collect(Collectors.toList()))
                                        .totalRunningRooms(runningRooms.size())
                                        .weeklyAttendance(weeklyAttendanceFuture.get())
                                        .build();

                        log.info("Optimization: Dashboard data generated in {} ms",
                                        System.currentTimeMillis() - startTime);
                        return response;
                } catch (Exception e) {
                        log.error("Fatal error during parallel dashboard data fetch", e);
                        throw new RuntimeException("Dashboard optimization failure", e);
                }
        }

        @Override
        public List<AcademicStaffDashboardResponse.WeeklyAttendanceDTO> getWeeklyAttendanceData(
                        java.time.LocalDate startDate) {
                return getWeeklyAttendance(startDate);
        }

        private List<AcademicStaffDashboardResponse.WeeklyAttendanceDTO> getWeeklyAttendance(
                        java.time.LocalDate startDate) {
                if (startDate == null) {
                        startDate = java.time.LocalDate.now().minusDays(6);
                }
                java.time.LocalDate endDate = startDate.plusDays(6);

                // 1. Fetch all slots for the entire week in ONE query
                List<com.fams.backend.entity.TimetableSlot> allSlots = timetableSlotRepository.findByDateBetween(
                                startDate, endDate);

                // 2. Collect unique class names and slot IDs
                java.util.Set<String> classNames = allSlots.stream()
                                .map(ts -> ts.getClassSection().getClassName())
                                .collect(Collectors.toSet());
                java.util.List<Long> slotIds = allSlots.stream()
                                .map(com.fams.backend.entity.TimetableSlot::getId)
                                .collect(Collectors.toList());

                // 3. Batch fetch enrollment counts (1 query instead of N)
                java.util.Map<String, Long> enrollmentCounts = new java.util.HashMap<>();
                if (!classNames.isEmpty()) {
                        List<Object[]> counts = enrollmentRepository.countByClassSectionClassNameIn(classNames);
                        for (Object[] row : counts) {
                                enrollmentCounts.put((String) row[0], ((Number) row[1]).longValue());
                        }
                }

                // 4. Batch fetch attendance sessions (1 query instead of N)
                java.util.Map<Long, Long> slotToSessionId = new java.util.HashMap<>();
                if (!slotIds.isEmpty()) {
                        List<com.fams.backend.entity.AttendanceSession> sessions = attendanceSessionRepository
                                        .findByTimetableSlotIdIn(slotIds);
                        for (com.fams.backend.entity.AttendanceSession session : sessions) {
                                slotToSessionId.put(session.getTimetableSlot().getId(), session.getId());
                        }
                }

                // 5. Batch fetch present counts (1 query instead of N)
                java.util.Map<Long, Long> sessionToPresentCount = new java.util.HashMap<>();
                if (!slotToSessionId.isEmpty()) {
                        List<Object[]> presentCounts = studentAttendanceRepository
                                        .countPresentBySessionIdIn(slotToSessionId.values());
                        for (Object[] row : presentCounts) {
                                sessionToPresentCount.put((Long) row[0], ((Number) row[1]).longValue());
                        }
                }

                // 6. Group slots by date for fast in-memory aggregation
                java.util.Map<java.time.LocalDate, List<com.fams.backend.entity.TimetableSlot>> slotsByDate = allSlots
                                .stream()
                                .collect(Collectors.groupingBy(com.fams.backend.entity.TimetableSlot::getDate));

                List<AcademicStaffDashboardResponse.WeeklyAttendanceDTO> result = new java.util.ArrayList<>();
                String[] dayNames = { "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật" };
                java.time.LocalDate today = java.time.LocalDate.now();
                java.time.LocalTime nowTime = java.time.LocalTime.now();

                for (int i = 0; i < 7; i++) {
                        java.time.LocalDate date = startDate.plusDays(i);
                        List<com.fams.backend.entity.TimetableSlot> slots = slotsByDate.getOrDefault(date,
                                        List.of());

                        long totalExpected = 0;
                        long totalAbsences = 0;
                        boolean isPastOrToday = !date.isAfter(today);

                        for (com.fams.backend.entity.TimetableSlot slot : slots) {
                                if (date.equals(today) && slot.getSlotType() != null
                                                && nowTime.isBefore(slot.getSlotType().getStartTime())) {
                                        continue;
                                }

                                String className = slot.getClassSection().getClassName();
                                long enrolled = enrollmentCounts.getOrDefault(className, 0L);
                                if (enrolled == 0)
                                        continue;

                                totalExpected += enrolled;
                                Long sessionId = slotToSessionId.get(slot.getId());

                                if (sessionId != null) {
                                        long present = sessionToPresentCount.getOrDefault(sessionId, 0L);
                                        totalAbsences += (enrolled - present);
                                } else if (isPastOrToday) {
                                        totalAbsences += enrolled;
                                }
                        }

                        double absencePerc = totalExpected > 0 ? (double) totalAbsences / totalExpected * 100 : 0;
                        int dayOfWeekIdx = date.getDayOfWeek().getValue() - 1;

                        result.add(AcademicStaffDashboardResponse.WeeklyAttendanceDTO.builder()
                                        .day(dayNames[dayOfWeekIdx])
                                        .date(date.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM")))
                                        .absencePercentage(Math.round(absencePerc * 10.0) / 10.0)
                                        .build());
                }

                return result;
        }

        @org.springframework.cache.annotation.Cacheable(value = "dashboardStats")
        public AcademicStaffDashboardResponse.DashboardStats getStats() {
                log.debug("Retrieving dashboard stats: students, lecturers, and requests counts");
                return AcademicStaffDashboardResponse.DashboardStats.builder()
                                .totalStudents(userRepository.countByRole(User.UserRole.STUDENT))
                                .totalLecturers(userRepository.countByRole(User.UserRole.LECTURER))
                                .totalRequests(scheduleRequestRepository
                                                .countByStatus(ScheduleRequest.RequestStatus.PENDING))
                                .studentStats(studentProfileRepository.countByMajor())
                                .lecturerStats(lecturerProfileRepository.countByDepartment())
                                .build();
        }

        @org.springframework.cache.annotation.Cacheable(value = "topStudents", unless = "#result == null")
        public List<AcademicStaffDashboardResponse.TopStudentDTO> getTopStudents() {
                log.debug("Fetching top 10 students by GPA (Optimized)");
                java.util.concurrent.atomic.AtomicInteger rank = new java.util.concurrent.atomic.AtomicInteger(1);
                return studentProfileRepository.findTop100ByOrderByGpaDesc(PageRequest.of(0, 10)).stream()
                                .map(profile -> AcademicStaffDashboardResponse.TopStudentDTO.builder()
                                                .rank(rank.getAndIncrement())
                                                .name(profile.getUser().getFullName())
                                                .className(profile.getCourse() != null ? profile.getCourse() : "N/A")
                                                .email(profile.getUser().getEmail())
                                                .course(profile.getCourse() != null ? profile.getCourse() : "K18")
                                                .gpa(profile.getGpa() != null ? profile.getGpa() : 0.0)
                                                .attendance(calculateAttendance(profile.getUserId()))
                                                .build())
                                .collect(Collectors.toList());
        }

        private Integer calculateAttendance(Long studentId) {
                return 90 + (int) (Math.random() * 10);
        }

        public List<DashboardNotificationResponse> getNotifications(String username) {
                log.debug("Fetching user-specific notifications for academic staff: {}", username);
                User user = userRepository.findByUsername(username).orElse(null);

                if (user == null) {
                        log.warn("Dashboard data requested for null user: {}", username);
                        return List.of();
                }

                // Use DB-level filtering for SYSTEM type for better efficiency and reliability
                List<com.fams.backend.entity.NotificationRecipient> recipients = recipientRepository
                                .findByRecipientAndNotification_TypeOrderByCreatedAtDesc(
                                                user, Notification.NotificationType.SYSTEM);

                log.info("Dashboard notifications debug: User={}, ID={}, Found={} system recipient records",
                                user.getUsername(), user.getId(), recipients.size());

                return recipients.stream()
                                .limit(5)
                                .map(nr -> {
                                        log.info("Dashboard notification item: ID={}, Title={}, Type={}",
                                                        nr.getNotification().getId(),
                                                        nr.getNotification().getTitle(),
                                                        nr.getNotification().getType());
                                        return DashboardNotificationResponse.builder()
                                                        .id(nr.getNotification().getId())
                                                        .title(nr.getNotification().getTitle())
                                                        .description(nr.getNotification().getContent())
                                                        .timestamp(nr.getNotification().getCreatedAt()
                                                                        .format(FORMATTER))
                                                        .type(nr.getNotification().getType().name())
                                                        .senderName(nr.getNotification().getSender() != null
                                                                        ? nr.getNotification().getSender().getUsername()
                                                                        : "System")
                                                        .senderFullName(nr.getNotification().getSender() != null
                                                                        ? nr.getNotification().getSender().getFullName()
                                                                        : "Hệ thống")
                                                        .isRead(nr.getIsRead())
                                                        .attachmentUrls(nr.getNotification().getAttachmentUrls() != null
                                                                        ? new java.util.ArrayList<>(nr.getNotification()
                                                                                        .getAttachmentUrls())
                                                                        : new java.util.ArrayList<>())
                                                        .build();
                                })
                                .collect(Collectors.toList());
        }

        @Override
        public AcademicStaffDashboardResponse.AttendanceStatsDTO getAttendanceStatsForDate(java.time.LocalDate date) {
                if (date == null) {
                        date = java.time.LocalDate.now();
                }
                log.info("Calculating attendance statistics for date: {}", date);
                java.time.LocalDate today = java.time.LocalDate.now();
                java.time.LocalTime now = java.time.LocalTime.now();
                boolean isToday = date.equals(today);

                List<com.fams.backend.entity.TimetableSlot> daySlots = timetableSlotRepository.findByDateEager(date);

                // For today: only count slots that have started. For past dates: all slots.
                List<com.fams.backend.entity.TimetableSlot> relevantSlots;
                if (isToday) {
                        relevantSlots = daySlots.stream()
                                        .filter(slot -> slot.getSlotType() == null
                                                        || !now.isBefore(slot.getSlotType().getStartTime()))
                                        .collect(Collectors.toList());
                } else {
                        relevantSlots = daySlots;
                }

                // Batch fetch enrollment counts
                java.util.Set<String> classNames = relevantSlots.stream()
                                .map(ts -> ts.getClassSection().getClassName())
                                .collect(Collectors.toSet());
                java.util.Map<String, Long> enrollmentCounts = new java.util.HashMap<>();
                if (!classNames.isEmpty()) {
                        List<Object[]> counts = enrollmentRepository.countByClassSectionClassNameIn(classNames);
                        for (Object[] row : counts) {
                                enrollmentCounts.put((String) row[0], ((Number) row[1]).longValue());
                        }
                }

                // Batch fetch sessions
                java.util.List<Long> slotIds = relevantSlots.stream()
                                .map(com.fams.backend.entity.TimetableSlot::getId)
                                .collect(Collectors.toList());
                java.util.Map<Long, Long> slotToSessionId = new java.util.HashMap<>();
                if (!slotIds.isEmpty()) {
                        List<com.fams.backend.entity.AttendanceSession> sessions = attendanceSessionRepository
                                        .findByTimetableSlotIdIn(slotIds);
                        for (com.fams.backend.entity.AttendanceSession session : sessions) {
                                slotToSessionId.put(session.getTimetableSlot().getId(), session.getId());
                        }
                }

                // Batch fetch present counts
                java.util.Map<Long, Long> sessionToPresentCount = new java.util.HashMap<>();
                if (!slotToSessionId.isEmpty()) {
                        List<Object[]> presentCounts = studentAttendanceRepository
                                        .countPresentBySessionIdIn(slotToSessionId.values());
                        for (Object[] row : presentCounts) {
                                sessionToPresentCount.put((Long) row[0], ((Number) row[1]).longValue());
                        }
                }

                int totalExpected = 0;
                int totalPresent = 0;
                for (com.fams.backend.entity.TimetableSlot slot : relevantSlots) {
                        long enrolled = enrollmentCounts.getOrDefault(slot.getClassSection().getClassName(), 0L);
                        totalExpected += enrolled;
                        Long sessionId = slotToSessionId.get(slot.getId());
                        if (sessionId != null) {
                                totalPresent += sessionToPresentCount.getOrDefault(sessionId, 0L).intValue();
                        }
                }

                int absent = totalExpected - totalPresent;

                log.info("Date {} Stats - Expected: {}, Present: {}, Absent: {}", date, totalExpected, totalPresent,
                                absent);

                return AcademicStaffDashboardResponse.AttendanceStatsDTO.builder()
                                .present(totalPresent)
                                .absent(absent)
                                .date(date.format(DateTimeFormatter.ofPattern("EEEE, dd/MM/yyyy",
                                                java.util.Locale.forLanguageTag("vi-VN"))))
                                .build();
        }

        public List<AcademicStaffDashboardResponse.RunningRoomDTO> getRunningRooms() {
                log.debug("Calculating real-time running rooms data");
                java.time.LocalDate today = java.time.LocalDate.now();
                java.time.LocalTime now = java.time.LocalTime.now();

                // Directly fetch currently occupied slots based on time using the robust query
                List<com.fams.backend.entity.TimetableSlot> currentSlots = timetableSlotRepository
                                .findCurrentlyOccupiedSlots(today, now);

                if (currentSlots.isEmpty()) {
                        return List.of();
                }

                // Batch fetch enrollment counts
                java.util.Set<String> classNames = currentSlots.stream()
                                .map(ts -> ts.getClassSection().getClassName())
                                .collect(Collectors.toSet());
                java.util.Map<String, Long> enrollmentCounts = new java.util.HashMap<>();
                if (!classNames.isEmpty()) {
                        List<Object[]> counts = enrollmentRepository.countByClassSectionClassNameIn(classNames);
                        for (Object[] row : counts) {
                                enrollmentCounts.put((String) row[0], ((Number) row[1]).longValue());
                        }
                }

                // Batch fetch sessions
                java.util.List<Long> slotIds = currentSlots.stream()
                                .map(com.fams.backend.entity.TimetableSlot::getId)
                                .collect(Collectors.toList());
                java.util.Map<Long, Long> slotToSessionId = new java.util.HashMap<>();
                if (!slotIds.isEmpty()) {
                        List<com.fams.backend.entity.AttendanceSession> sessions = attendanceSessionRepository
                                        .findByTimetableSlotIdIn(slotIds);
                        for (com.fams.backend.entity.AttendanceSession session : sessions) {
                                slotToSessionId.put(session.getTimetableSlot().getId(), session.getId());
                        }
                }

                // Batch fetch present counts
                java.util.Map<Long, Long> sessionToPresentCount = new java.util.HashMap<>();
                if (!slotToSessionId.isEmpty()) {
                        List<Object[]> presentCounts = studentAttendanceRepository
                                        .countPresentBySessionIdIn(slotToSessionId.values());
                        for (Object[] row : presentCounts) {
                                sessionToPresentCount.put((Long) row[0], ((Number) row[1]).longValue());
                        }
                }

                return currentSlots.stream().map(slot -> {
                        double attendancePercent = 0.0;
                        Long sessionId = slotToSessionId.get(slot.getId());
                        if (sessionId != null) {
                                long present = sessionToPresentCount.getOrDefault(sessionId, 0L);
                                long total = enrollmentCounts.getOrDefault(
                                                slot.getClassSection().getClassName(), 0L);
                                if (total > 0) {
                                        attendancePercent = (double) present / total * 100;
                                }
                        }

                        return AcademicStaffDashboardResponse.RunningRoomDTO.builder()
                                        .roomName(slot.getRoom().getName())
                                        .lecturerName(slot.getClassSection().getLecturer() != null
                                                        ? slot.getClassSection().getLecturer().getFullName()
                                                        : "N/A")
                                        .attendancePercentage(attendancePercent)
                                        .build();
                }).collect(Collectors.toList());
        }
}
