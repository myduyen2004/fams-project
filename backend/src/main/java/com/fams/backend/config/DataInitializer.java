package com.fams.backend.config;

import com.fams.backend.entity.*;
import com.fams.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

        private final UserRepository userRepository;
        private final PasswordEncoder passwordEncoder;
        private final AttendanceConfigRepository attendanceConfigRepository;

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
                // Find existing admin by username, email, or code
                Optional<User> existingAdmin = userRepository.findByUsername("admin");
                if (existingAdmin.isEmpty()) {
                        existingAdmin = userRepository.findByEmail("admin@fams.com");
                }
                if (existingAdmin.isEmpty()) {
                        existingAdmin = userRepository.findByCode("ADMIN001");
                }

                if (existingAdmin.isEmpty()) {
                        // Only create admin on FIRST run — never overwrite existing credentials
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
                                        .avatar("/assets/images/fams-logo.png")
                                        .faceDataStatus(User.FaceDataStatus.NOT_REGISTERED)
                                        .isPasswordChanged(false)
                                        .build();
                        userRepository.save(admin);
                        log.info("Default admin user created (first-time seed): admin/admin123");
                } else {
                        log.info("Admin user already exists (id={}), skipping password reset.", existingAdmin.get().getId());
                }
        }

        private void seedAcademicStaffUser() {
                // Find existing staff by username, email, or code
                Optional<User> existingStaff = userRepository.findByUsername("academic");
                if (existingStaff.isEmpty()) {
                        existingStaff = userRepository.findByEmail("staff@fams.com");
                }
                if (existingStaff.isEmpty()) {
                        existingStaff = userRepository.findByCode("STAFF001");
                }

                if (existingStaff.isEmpty()) {
                        // Only create staff on FIRST run — never overwrite existing credentials
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
                                        .avatar("/assets/images/fams-logo.png")
                                        .faceDataStatus(User.FaceDataStatus.NOT_REGISTERED)
                                        .isPasswordChanged(false)
                                        .build();
                        userRepository.save(staff);
                        log.info("Default academic staff user created (first-time seed): academic/staff123");
                } else {
                        log.info("Academic staff user already exists (id={}), skipping password reset.", existingStaff.get().getId());
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
