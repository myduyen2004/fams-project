package com.fams.backend.config;

import com.fams.backend.entity.Alert;
import com.fams.backend.entity.Notification;
import com.fams.backend.entity.SystemLog;
import com.fams.backend.entity.User;
import com.fams.backend.repository.AlertRepository;
import com.fams.backend.repository.NotificationRepository;
import com.fams.backend.repository.SystemLogRepository;
import com.fams.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

        private final AlertRepository alertRepository;
        private final NotificationRepository notificationRepository;
        private final SystemLogRepository systemLogRepository;
        private final UserRepository userRepository;
        private final PasswordEncoder passwordEncoder;

        @Override
        public void run(String... args) throws Exception {
                if (userRepository.count() == 0) {
                        log.info("Database is empty. Starting data seeding...");
                        seedUsers();
                        seedAlerts();
                        seedNotifications();
                        seedSystemLogs();
                        log.info("Data seeding completed successfully.");
                }
        }

        private void seedUsers() {
                log.info("Seeding default admin user...");
                User admin = User.builder()
                                .username("admin")
                                .password(passwordEncoder.encode("admin123"))
                                .fullName("System Administrator")
                                .email("admin@fams.com")
                                .phone("0123456789")
                                .role(User.UserRole.ADMIN)
                                .status(User.UserStatus.ACTIVE)
                                .build();
                userRepository.save(admin);
                log.info("Default admin created: admin / admin123");
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
