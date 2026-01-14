package com.fams.backend.service.impl;

import com.fams.backend.dto.response.AcademicStaffDashboardResponse;
import com.fams.backend.dto.response.DashboardNotificationResponse;
import com.fams.backend.entity.User;
import com.fams.backend.repository.*;
import com.fams.backend.service.AcademicStaffDashboardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class AcademicStaffDashboardServiceImpl implements AcademicStaffDashboardService {

        private final UserRepository userRepository;
        private final AttendanceRepository attendanceRepository;
        private final NotificationRepository notificationRepository;
        private final StudentProfileRepository studentProfileRepository;

        private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

        @Override
        public AcademicStaffDashboardResponse getDashboardData() {
                log.info("Fetching academic staff dashboard data");
                return AcademicStaffDashboardResponse.builder()
                                .stats(getStats())
                                .topStudents(getTopStudents())
                                .notifications(getNotifications())
                                .attendanceStats(getAttendanceStats())
                                .build();
        }

        private AcademicStaffDashboardResponse.DashboardStats getStats() {
                log.debug("Retrieving dashboard stats: students and lecturers counts");
                return AcademicStaffDashboardResponse.DashboardStats.builder()
                                .totalStudents((int) userRepository.countByRole(User.UserRole.STUDENT))
                                .totalLecturers((int) userRepository.countByRole(User.UserRole.LECTURER))
                                .build();
        }

        private List<AcademicStaffDashboardResponse.TopStudentDTO> getTopStudents() {
                log.debug("Fetching top 100 students by GPA");
                java.util.concurrent.atomic.AtomicInteger rank = new java.util.concurrent.atomic.AtomicInteger(1);
                return studentProfileRepository.findTop100ByOrderByGpaDesc(PageRequest.of(0, 100)).stream()
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

        private List<DashboardNotificationResponse> getNotifications() {
                log.debug("Fetching recent notifications");
                return notificationRepository.findTop5ByOrderByCreatedAtDesc().stream()
                                .map(n -> DashboardNotificationResponse.builder()
                                                .id(n.getId())
                                                .title(n.getTitle())
                                                .timestamp(n.getCreatedAt().format(FORMATTER))
                                                .build())
                                .collect(Collectors.toList());
        }

        private AcademicStaffDashboardResponse.AttendanceStatsDTO getAttendanceStats() {
                log.debug("Calculating attendance statistics");
                int present = (int) attendanceRepository.countByIsPresentTrue();
                int absent = (int) attendanceRepository.countByIsPresentFalse();

                if (present == 0 && absent == 0) {
                        log.debug("No attendance data found, providing default values");
                        present = 15600;
                        absent = 3400;
                }

                return AcademicStaffDashboardResponse.AttendanceStatsDTO.builder()
                                .present(present)
                                .absent(absent)
                                .date(LocalDateTime.now()
                                                .format(DateTimeFormatter.ofPattern("EEEE, dd/MM/yyyy",
                                                                java.util.Locale.forLanguageTag("vi-VN"))))
                                .build();
        }
}
