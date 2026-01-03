package com.fams.backend.config;

import com.fams.backend.entity.*;
import com.fams.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

import com.fams.backend.entity.User;
import com.fams.backend.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.time.LocalDate;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

        private final AlertRepository alertRepository;
        private final NotificationRepository notificationRepository;
        private final SystemLogRepository systemLogRepository;
        private final UserRepository userRepository;
        private final AcademicRequestRepository requestRepository;
        private final AttendanceRepository attendanceRepository;
        private final RoomRequestRepository roomRequestRepository;
        private final PasswordEncoder passwordEncoder;

        @Override
        public void run(String... args) throws Exception {
                log.info("DataInitializer is running. Preparing test accounts and dashboard data...");

                seedAdminUser();
                seedAcademicStaffUser();

                if (userRepository.countByRole(User.UserRole.STUDENT) < 10) {
                        seedStudents();
                }
                if (userRepository.countByRole(User.UserRole.LECTURER) < 3) {
                        seedLecturers();
                }

                if (alertRepository.count() == 0)
                        seedAlerts();
                if (notificationRepository.count() == 0)
                        seedNotifications();
                if (systemLogRepository.count() == 0)
                        seedSystemLogs();
                if (requestRepository.count() == 0)
                        seedAcademicRequests();
                if (roomRequestRepository.count() == 0)
                        seedRoomRequests();
                if (attendanceRepository.count() == 0)
                        seedAttendance();

                log.info("Data initialization checks completed.");
        }

        private void seedAdminUser() {
                userRepository.findByUsername("admin").ifPresentOrElse(
                                admin -> {
                                        admin.setPassword(passwordEncoder.encode("admin123"));
                                        admin.setRole(User.UserRole.ADMIN);
                                        admin.setStatus(User.UserStatus.ACTIVE);
                                        userRepository.save(admin);
                                        log.info("Admin user password reset: admin/admin123");
                                },
                                () -> {
                                        User admin = User.builder()
                                                        .code("ADMIN001")
                                                        .username("admin")
                                                        .password(passwordEncoder.encode("admin123"))
                                                        .fullName("Administrator")
                                                        .email("admin@fams.com")
                                                        .phone("0123456789")
                                                        .dob(LocalDate.of(2000, 1, 1))
                                                        .role(User.UserRole.ADMIN)
                                                        .status(User.UserStatus.ACTIVE)
                                                        .faceDataStatus(User.FaceDataStatus.NOT_REGISTERED)
                                                        .build();
                                        userRepository.save(admin);
                                        log.info("Default admin user created: admin/admin123");
                                });
        }

        private void seedAcademicStaffUser() {
                userRepository.findByUsername("academic").ifPresentOrElse(
                                staff -> {
                                        staff.setPassword(passwordEncoder.encode("staff123"));
                                        staff.setRole(User.UserRole.ACADEMIC_STAFF);
                                        staff.setStatus(User.UserStatus.ACTIVE);
                                        staff.setIsPasswordChanged(true);
                                        userRepository.save(staff);
                                        log.info("Academic staff password reset: academic/staff123");
                                },
                                () -> {
                                        User staff = User.builder()
                                                        .code("STAFF001")
                                                        .username("academic")
                                                        .password(passwordEncoder.encode("staff123"))
                                                        .fullName("Phòng Đào Tạo")
                                                        .email("staff@fams.com")
                                                        .phone("0987654321")
                                                        .dob(LocalDate.of(1995, 5, 15))
                                                        .role(User.UserRole.ACADEMIC_STAFF)
                                                        .status(User.UserStatus.ACTIVE)
                                                        .faceDataStatus(User.FaceDataStatus.NOT_REGISTERED)
                                                        .isPasswordChanged(true)
                                                        .build();
                                        userRepository.save(staff);
                                        log.info("Default academic staff user created: academic/staff123");
                                });
        }

        private void seedStudents() {
                log.info("Seeding 20 students with profiles...");
                for (int i = 1; i <= 20; i++) {
                        String fullName = "Sinh viên " + (char) ('A' + (i % 26)) + i;
                        User student = User.builder()
                                        .code("SE" + String.format("%06d", i))
                                        .username("student" + i)
                                        .password(passwordEncoder.encode("student123"))
                                        .fullName(fullName)
                                        .email("student" + i + "@fpt.edu.vn")
                                        .phone("09" + String.format("%08d", i))
                                        .dob(LocalDate.of(2004, 1, 1))
                                        .role(User.UserRole.STUDENT)
                                        .status(User.UserStatus.ACTIVE)
                                        .build();

                        StudentProfile profile = StudentProfile.builder()
                                        .user(student)
                                        .studentClass("SE1805-NJ")
                                        .course("K" + (18 - (i % 2)))
                                        .avgMark(7.0 + (Math.random() * 3.0))
                                        .gpa(3.0 + (Math.random() * 1.0))
                                        .major("Software Engineering")
                                        .build();

                        student.setStudentProfile(profile);
                        userRepository.save(student);
                }
        }

        private void seedLecturers() {
                log.info("Seeding 5 lecturers with profiles...");
                for (int i = 1; i <= 5; i++) {
                        User lecturer = User.builder()
                                        .code("GV" + String.format("%06d", i))
                                        .username("lecturer" + i)
                                        .password(passwordEncoder.encode("lecturer123"))
                                        .fullName("Giảng viên " + i)
                                        .email("lecturer" + i + "@fpt.edu.vn")
                                        .role(User.UserRole.LECTURER)
                                        .status(User.UserStatus.ACTIVE)
                                        .build();

                        LecturerProfile profile = LecturerProfile.builder()
                                        .user(lecturer)
                                        .department("Computing")
                                        .expertise("Java Development")
                                        .bio("Experienced lecturer in software engineering.")
                                        .build();

                        lecturer.setLecturerProfile(profile);
                        userRepository.save(lecturer);
                }
        }

        private void seedAcademicRequests() {
                User student = userRepository.findByUsername("student1").orElse(null);
                if (student == null)
                        return;

                String[] types = { "Đề nghị miễn điểm danh", "Đơn xin nghỉ học tạm thời", "Đơn xin chuyển lớp" };
                for (int i = 1; i <= 5; i++) {
                        requestRepository.save(com.fams.backend.entity.AcademicRequest.builder()
                                        .user(student)
                                        .type(types[i % 3])
                                        .status(i % 2 == 0 ? "APPROVED" : "PENDING")
                                        .createdAt(LocalDateTime.now().minusDays(i))
                                        .build());
                }
        }

        private void seedRoomRequests() {
                User staff = userRepository.findByUsername("academic").orElse(null);
                if (staff == null)
                        return;

                for (int i = 1; i <= 5; i++) {
                        roomRequestRepository.save(com.fams.backend.entity.RoomRequest.builder()
                                        .requester(staff)
                                        .room("P" + (200 + i))
                                        .slot("Slot " + (1 + (i % 6)))
                                        .createdAt(LocalDateTime.now().minusHours(i * 2))
                                        .build());
                }
        }

        private void seedAttendance() {
                User student = userRepository.findByUsername("student1").orElse(null);
                if (student == null)
                        return;

                for (int i = 1; i <= 20; i++) {
                        attendanceRepository.save(com.fams.backend.entity.Attendance.builder()
                                        .student(student)
                                        .isPresent(Math.random() > 0.1)
                                        .session("Slot 1")
                                        .createdAt(LocalDateTime.now().minusDays(i))
                                        .build());
                }
        }

        private void seedAlerts() {
                alertRepository.save(Alert.builder()
                                .title("Cảnh báo bảo mật")
                                .description("Phát hiện nhiều lượt đăng nhập thất bại từ IP: 192.168.1.50")
                                .level(Alert.AlertLevel.ERROR)
                                .isResolved(false)
                                .createdAt(LocalDateTime.now().minusHours(2))
                                .build());

                alertRepository.save(Alert.builder()
                                .title("Hệ thống quá tải")
                                .description("CPU usage vượt ngưỡng 90% trong 5 phút qua")
                                .level(Alert.AlertLevel.WARNING)
                                .isResolved(false)
                                .createdAt(LocalDateTime.now().minusHours(5))
                                .build());

                alertRepository.save(Alert.builder()
                                .title("Bộ nhớ sắp đầy")
                                .description("Dung lượng ổ đĩa còn lại dưới 10GB")
                                .level(Alert.AlertLevel.INFO)
                                .isResolved(false)
                                .createdAt(LocalDateTime.now().minusDays(1))
                                .build());
        }

        private void seedNotifications() {
                notificationRepository.save(Notification.builder()
                                .title("Bản cập nhật mới")
                                .description("Phiên bản v2.1.0 đã được triển khai thành công")
                                .isRead(false)
                                .createdAt(LocalDateTime.now().minusMinutes(30))
                                .build());

                notificationRepository.save(Notification.builder()
                                .title("Bảo trì hệ thống")
                                .description("Hệ thống sẽ được bảo trì vào lúc 01:00 AM ngày 01/01/2026")
                                .isRead(false)
                                .createdAt(LocalDateTime.now().minusHours(10))
                                .build());

                notificationRepository.save(Notification.builder()
                                .title("Chào mừng")
                                .description("Chào mừng bạn đã gia nhập hệ thống FAMS")
                                .isRead(true)
                                .createdAt(LocalDateTime.now().minusDays(2))
                                .build());
        }

        private void seedSystemLogs() {
                systemLogRepository.save(SystemLog.builder()
                                .title("Sao lưu dữ liệu")
                                .description("Tự động sao lưu database hoàn tất thành công")
                                .type(SystemLog.LogType.INFO)
                                .createdAt(LocalDateTime.now().minusHours(1))
                                .build());

                systemLogRepository.save(SystemLog.builder()
                                .title("Lỗi đồng bộ")
                                .description("Không thể đồng bộ dữ liệu với AI Service (timeout)")
                                .type(SystemLog.LogType.ERROR)
                                .createdAt(LocalDateTime.now().minusHours(4))
                                .build());

                systemLogRepository.save(SystemLog.builder()
                                .title("Thay đổi cấu hình")
                                .description("Cấu hình bảo mật JWT đã được cập nhật bởi Admin")
                                .type(SystemLog.LogType.WARNING)
                                .createdAt(LocalDateTime.now().minusDays(1))
                                .build());
        }
}
