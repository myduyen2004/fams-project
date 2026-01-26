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

        @Override
        public void run(String... args) throws Exception {
                log.info("DataInitializer is running. Preparing default accounts...");
                try {
                        seedAdminUser();
                        seedAcademicStaffUser();
                        log.info("Data initialization process completed.");
                } catch (Exception e) {
                        log.warn("Data initialization encountered issues: {}. Continuing startup...", e.getMessage());
                }
        }

        private void seedAdminUser() {
                // Check by both username and email to prevent unique constraint violations
                boolean existsByUsername = userRepository.findByUsername("admin").isPresent();
                boolean existsByEmail = userRepository.findByEmail("admin@fams.com").isPresent();

                if (!existsByUsername && !existsByEmail) {
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
                                        .isPasswordChanged(true)
                                        .build();
                        userRepository.save(admin);
                        log.info("Default admin user created: admin/admin123");
                } else {
                        log.info("Admin user already exists, skipping seeding.");
                }
        }

        private void seedAcademicStaffUser() {
                // Check by username, email, and code to prevent unique constraint violations
                boolean existsByUsername = userRepository.findByUsername("academic").isPresent();
                boolean existsByEmail = userRepository.findByEmail("staff@fams.com").isPresent();
                boolean existsByCode = userRepository.findByCode("STAFF001").isPresent();

                if (!existsByUsername && !existsByEmail && !existsByCode) {
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
                } else {
                        log.info("Academic staff user already exists, skipping seeding.");
                }
        }
}
