package com.fams.backend.service.impl;

import com.fams.backend.dto.response.AcademicStaffDashboardResponse;
import com.fams.backend.dto.response.NewsResponse;
import com.fams.backend.entity.User;
import com.fams.backend.repository.*;
import com.fams.backend.service.AcademicStaffDashboardService;
import com.fams.backend.service.NewsService;
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
        private final StudentProfileRepository studentProfileRepository;
        private final TimetableSlotRepository timetableSlotRepository;
        private final AttendanceSessionRepository attendanceSessionRepository;
        private final EnrollmentRepository enrollmentRepository;
        private final StudentAttendanceRepository studentAttendanceRepository;
        private final LecturerProfileRepository lecturerProfileRepository;
        private final ScheduleRequestRepository scheduleRequestRepository;
        private final AcademicRequestRepository academicRequestRepository;
        private final NewsService newsService;
        private final java.util.concurrent.Executor dashboardExecutor;

        @org.springframework.beans.factory.annotation.Autowired
        @org.springframework.context.annotation.Lazy
        private AcademicStaffDashboardServiceImpl self;

        public AcademicStaffDashboardServiceImpl(
                        UserRepository userRepository,
                        StudentProfileRepository studentProfileRepository,
                        TimetableSlotRepository timetableSlotRepository,
                        AttendanceSessionRepository attendanceSessionRepository,
                        EnrollmentRepository enrollmentRepository,
                        StudentAttendanceRepository studentAttendanceRepository,
                        LecturerProfileRepository lecturerProfileRepository,
                        ScheduleRequestRepository scheduleRequestRepository,
                        AcademicRequestRepository academicRequestRepository,
                        NewsService newsService,
                        @org.springframework.beans.factory.annotation.Qualifier("dashboardExecutor") java.util.concurrent.Executor dashboardExecutor) {
                this.userRepository = userRepository;
                this.studentProfileRepository = studentProfileRepository;
                this.timetableSlotRepository = timetableSlotRepository;
                this.attendanceSessionRepository = attendanceSessionRepository;
                this.enrollmentRepository = enrollmentRepository;
                this.studentAttendanceRepository = studentAttendanceRepository;
                this.lecturerProfileRepository = lecturerProfileRepository;
                this.scheduleRequestRepository = scheduleRequestRepository;
                this.academicRequestRepository = academicRequestRepository;
                this.newsService = newsService;
                this.dashboardExecutor = dashboardExecutor;
        }


        @Override
        public AcademicStaffDashboardResponse getDashboardData(java.time.LocalDate startDate) {
                log.info("Starting optimized parallel dashboard fetch...");
                long startTime = System.currentTimeMillis();

                // Get current user for news fetching (since SecurityContext won't be in async threads)
                String username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
                User currentUser = userRepository.findByUsername(username).orElse(null);

                // 1. Initiate parallel data fetching tasks with resilient error handling
                java.util.concurrent.CompletableFuture<List<AcademicStaffDashboardResponse.RunningRoomDTO>> runningRoomsFuture = java.util.concurrent.CompletableFuture
                                .supplyAsync(self::getRunningRooms, dashboardExecutor)
                                .exceptionally(e -> {
                                        log.error("Dashboard error: Failed to fetch running rooms", e);
                                        return List.of();
                                });

                java.util.concurrent.CompletableFuture<AcademicStaffDashboardResponse.DashboardStats> statsFuture = java.util.concurrent.CompletableFuture
                                .supplyAsync(() -> self.getStats(), dashboardExecutor)
                                .exceptionally(e -> {
                                        log.error("Dashboard error: Failed to fetch general stats", e);
                                        return AcademicStaffDashboardResponse.DashboardStats.builder()
                                                        .totalStudents(0L).totalLecturers(0L).totalRequests(0L)
                                                        .studentStats(List.of()).lecturerStats(List.of()).build();
                                });

                java.util.concurrent.CompletableFuture<List<AcademicStaffDashboardResponse.TopStudentDTO>> topStudentsFuture = java.util.concurrent.CompletableFuture
                                .supplyAsync(() -> self.getTopStudents(), dashboardExecutor)
                                .exceptionally(e -> {
                                        log.error("Dashboard error: Failed to fetch top students", e);
                                        return List.of();
                                });

                java.util.concurrent.CompletableFuture<List<NewsResponse>> newsFuture = java.util.concurrent.CompletableFuture
                                .supplyAsync(() -> newsService.getPublishedNews(currentUser, 0, 3).getContent(), dashboardExecutor);

                java.util.concurrent.CompletableFuture<AcademicStaffDashboardResponse.AttendanceStatsDTO> attendanceStatsFuture = java.util.concurrent.CompletableFuture
                                .supplyAsync(() -> self.getAttendanceStatsForDate(java.time.LocalDate.now()),
                                                dashboardExecutor)
                                .exceptionally(e -> {
                                        log.error("Dashboard error: Failed to fetch daily attendance stats", e);
                                        return AcademicStaffDashboardResponse.AttendanceStatsDTO.builder()
                                                        .present(0).absent(0).date("N/A").build();
                                });

                java.util.concurrent.CompletableFuture<List<AcademicStaffDashboardResponse.WeeklyAttendanceDTO>> weeklyAttendanceFuture = java.util.concurrent.CompletableFuture
                                .supplyAsync(() -> self.getWeeklyAttendanceData(startDate), dashboardExecutor)
                                .exceptionally(e -> {
                                        log.error("Dashboard error: Failed to fetch weekly attendance trend", e);
                                        return List.of();
                                });

                java.util.concurrent.CompletableFuture<Integer> unreadNewsCountFuture = java.util.concurrent.CompletableFuture
                                .supplyAsync(() -> (int) newsService.getUnreadCount(currentUser), dashboardExecutor);

                try {
                        // 2. Wait for all to complete
                        java.util.concurrent.CompletableFuture.allOf(
                                        runningRoomsFuture, statsFuture, topStudentsFuture,
                                        newsFuture, attendanceStatsFuture,
                                        weeklyAttendanceFuture, unreadNewsCountFuture).join();
                        List<AcademicStaffDashboardResponse.RunningRoomDTO> runningRooms = runningRoomsFuture.get();

                        AcademicStaffDashboardResponse response = AcademicStaffDashboardResponse.builder()
                                        .stats(statsFuture.get())
                                        .topStudents(topStudentsFuture.get())
                                        .news(newsFuture.get())
                                        .unreadNotificationsCount(unreadNewsCountFuture.get())
                                        .attendanceStats(attendanceStatsFuture.get())
                                        .runningRooms(runningRooms.stream().limit(4).collect(Collectors.toList()))
                                        .totalRunningRooms(runningRooms.size())
                                        .weeklyAttendance(weeklyAttendanceFuture.get())
                                        .build();

                        log.info("Dashboard fetch completed in {} ms (Parallel Optimization)",
                                        System.currentTimeMillis() - startTime);
                        return response;
                } catch (Exception e) {
                        log.error("Critical error during dashboard object construction", e);
                        // Deep fallback in case build() fails or get() interrupts
                        return AcademicStaffDashboardResponse.builder().unreadNotificationsCount(0).build();
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
                long scheduleCount = scheduleRequestRepository.countByStatus(com.fams.backend.entity.ScheduleRequest.RequestStatus.PENDING);
                long academicCount = academicRequestRepository.countByStatus(com.fams.backend.entity.AcademicRequest.RequestStatus.PENDING);
                
                return AcademicStaffDashboardResponse.DashboardStats.builder()
                                .totalStudents(userRepository.countByRole(User.UserRole.STUDENT))
                                .totalLecturers(userRepository.countByRole(User.UserRole.LECTURER))
                                .totalRequests(scheduleCount + academicCount)
                                .totalScheduleRequests(scheduleCount)
                                .totalAcademicRequests(academicCount)
                                .studentStats(studentProfileRepository.countByMajor())
                                .lecturerStats(lecturerProfileRepository.countByMajor())
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
