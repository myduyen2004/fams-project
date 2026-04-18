package com.fams.backend.config;

import com.fams.backend.entity.*;
import com.fams.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

        private final UserRepository userRepository;
        private final PasswordEncoder passwordEncoder;
        private final AttendanceConfigRepository attendanceConfigRepository;
        private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

        @Override
        public void run(String... args) throws Exception {
                log.info("DataInitializer is running. Preparing default accounts...");
                try {
                        seedAdminUser();
                        seedAcademicStaffUser();
                        seedAttendanceConfig();
                        log.info("Data initialization process completed.");
                } catch (Exception e) {
                        log.warn("Data initialization encountered issues: {}. Continuing startup...", e.getMessage());
                }
        }

        private void seedAdminUser() {
                // Determine if we should update or insert
                User admin = userRepository.findById(1L).orElse(null);
                
                if (admin == null) {
                        // Not found by ID 1, check by username/email/code as fallback
                        admin = userRepository.findByUsernameIgnoreCase("admin")
                                .orElseGet(() -> userRepository.findByCode("ADMIN001").orElse(null));
                }

                if (admin != null) {
                        log.info("Updating existing admin user (ID: {})...", admin.getId());
                        admin.setUsername("admin");
                        admin.setEmail("admin@fams.com");
                        admin.setCode("ADMIN001");
                        admin.setPassword(passwordEncoder.encode("admin123"));
                        admin.setStatus(User.UserStatus.ACTIVE);
                        admin.setRole(User.UserRole.ADMIN);
                        admin.setIsPasswordChanged(true);
                        userRepository.save(admin);
                } else {
                        log.info("Creating new admin user...");
                        admin = User.builder()
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
                                        .isPasswordChanged(true)
                                        .build();
                        userRepository.save(admin);
                }
        }

        private void seedAcademicStaffUser() {
                // Update or insert
                User staff = userRepository.findById(2L).orElse(null);
                
                if (staff == null) {
                        staff = userRepository.findByUsernameIgnoreCase("academic")
                                .orElseGet(() -> userRepository.findByCode("STAFF001").orElse(null));
                }

                if (staff != null) {
                        log.info("Updating existing academic staff user (ID: {})...", staff.getId());
                        staff.setUsername("academic");
                        staff.setEmail("staff@fams.com");
                        staff.setCode("STAFF001");
                        staff.setPassword(passwordEncoder.encode("staff123"));
                        staff.setStatus(User.UserStatus.ACTIVE);
                        staff.setRole(User.UserRole.ACADEMIC_STAFF);
                        staff.setIsPasswordChanged(true);
                        userRepository.save(staff);
                } else {
                        log.info("Creating new academic staff user...");
                        staff = User.builder()
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
                }
        }

        private void seedAttendanceConfig() {
                if (attendanceConfigRepository.findByConfigKey("SYSTEM_CONFIG").isEmpty()) {
                        AttendanceConfig config = AttendanceConfig.builder()
                                        .configKey("SYSTEM_CONFIG")
                                        .manualEnabled(true)
                                        .absentThresholdMinutes(30)
                                        .minAttendancePercentage(80.0)
                                        .faceRecognitionEnabled(true)
                                        .maxAttempts(5)
                                        .wifiLocationEnabled(true)
                                        .build();
                        attendanceConfigRepository.save(config);
                        log.info("Default attendance configuration seeded.");
                } else {
                        log.info("Attendance configuration already exists, skipping seeding.");
                }
        }
}
