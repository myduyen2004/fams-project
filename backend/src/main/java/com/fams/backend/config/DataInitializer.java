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
                log.info("DataInitializer is running. Preparing admin and staff accounts...");

                seedAdminUser();
                seedAcademicStaffUser();

                log.info("Data initialization completed. Created admin and academic staff accounts.");
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
}
