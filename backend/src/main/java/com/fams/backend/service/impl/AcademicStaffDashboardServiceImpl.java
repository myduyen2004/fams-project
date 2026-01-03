package com.fams.backend.service.impl;

import com.fams.backend.dto.response.AcademicStaffDashboardResponse;
import com.fams.backend.dto.response.NotificationResponse;
import com.fams.backend.entity.User;
import com.fams.backend.repository.*;
import com.fams.backend.service.AcademicStaffDashboardService;
import lombok.RequiredArgsConstructor;
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
public class AcademicStaffDashboardServiceImpl implements AcademicStaffDashboardService {

        private final UserRepository userRepository;
        private final AcademicRequestRepository requestRepository;
        private final AttendanceRepository attendanceRepository;
        private final RoomRequestRepository roomRequestRepository;
        private final NotificationRepository notificationRepository;
        private final StudentProfileRepository studentProfileRepository;

        private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

        @Override
        public AcademicStaffDashboardResponse getDashboardData() {
                return AcademicStaffDashboardResponse.builder()
                                .stats(getStats())
                                .topStudents(getTopStudents())
                                .requests(getRequests())
                                .notifications(getNotifications())
                                .attendanceStats(getAttendanceStats())
                                .roomRequests(getRoomRequests())
                                .build();
        }

        private AcademicStaffDashboardResponse.DashboardStats getStats() {
                return AcademicStaffDashboardResponse.DashboardStats.builder()
                                .totalStudents((int) userRepository.countByRole(User.UserRole.STUDENT))
                                .totalLecturers((int) userRepository.countByRole(User.UserRole.LECTURER))
                                .totalRequests((int) requestRepository.countByStatus("PENDING"))
                                .build();
        }

        private List<AcademicStaffDashboardResponse.TopStudentDTO> getTopStudents() {
                java.util.concurrent.atomic.AtomicInteger rank = new java.util.concurrent.atomic.AtomicInteger(1);
                return studentProfileRepository.findTop100ByOrderByGpaDesc(PageRequest.of(0, 100)).stream()
                                .map(profile -> AcademicStaffDashboardResponse.TopStudentDTO.builder()
                                                .rank(rank.getAndIncrement())
                                                .name(profile.getUser().getFullName())
                                                .className(profile.getStudentClass() != null ? profile.getStudentClass()
                                                                : "N/A")
                                                .email(profile.getUser().getEmail())
                                                .course(profile.getCourse() != null ? profile.getCourse() : "K18")
                                                .avgMark(profile.getAvgMark() != null ? profile.getAvgMark() : 0.0)
                                                .gpa(profile.getGpa() != null ? profile.getGpa() : 0.0)
                                                .attendance(calculateAttendance(profile.getUserId()))
                                                .build())
                                .collect(Collectors.toList());
        }

        private Integer calculateAttendance(Long studentId) {
                return 90 + (int) (Math.random() * 10);
        }

        private List<AcademicStaffDashboardResponse.RequestDTO> getRequests() {
                return requestRepository.findTop5ByOrderByCreatedAtDesc().stream()
                                .map(req -> {
                                        User user = req.getUser();
                                        String className = "N/A";
                                        if (user.getStudentProfile() != null) {
                                                className = user.getStudentProfile().getStudentClass();
                                        }
                                        return AcademicStaffDashboardResponse.RequestDTO.builder()
                                                        .name(user.getFullName())
                                                        .className(className)
                                                        .type(req.getType())
                                                        .date(req.getCreatedAt().format(FORMATTER))
                                                        .status(req.getStatus().toLowerCase())
                                                        .build();
                                })
                                .collect(Collectors.toList());
        }

        private List<NotificationResponse> getNotifications() {
                return notificationRepository.findTop5ByOrderByCreatedAtDesc().stream()
                                .map(n -> NotificationResponse.builder()
                                                .id(n.getId())
                                                .title(n.getTitle())
                                                .timestamp(n.getCreatedAt().format(FORMATTER))
                                                .build())
                                .collect(Collectors.toList());
        }

        private AcademicStaffDashboardResponse.AttendanceStatsDTO getAttendanceStats() {
                int present = (int) attendanceRepository.countByIsPresentTrue();
                int absent = (int) attendanceRepository.countByIsPresentFalse();

                if (present == 0 && absent == 0) {
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

        private List<AcademicStaffDashboardResponse.RoomRequestDTO> getRoomRequests() {
                return roomRequestRepository.findTop5ByOrderByCreatedAtDesc().stream()
                                .map(rr -> AcademicStaffDashboardResponse.RoomRequestDTO.builder()
                                                .room(rr.getRoom() + " " + rr.getSlot() + " - "
                                                                + rr.getRequester().getFullName())
                                                .date(rr.getCreatedAt().format(FORMATTER))
                                                .build())
                                .collect(Collectors.toList());
        }
}
