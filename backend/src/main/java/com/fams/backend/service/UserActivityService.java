package com.fams.backend.service;

import com.fams.backend.entity.AccessLog;
import com.fams.backend.entity.User;
import com.fams.backend.entity.UserSession;
import com.fams.backend.repository.AccessLogRepository;
import com.fams.backend.repository.UserSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserActivityService {

    private final UserSessionRepository userSessionRepository;
    private final AccessLogRepository accessLogRepository;
    private final GeoLocationService geoLocationService;

    /**
     * Create user session in a separate transaction
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void createUserSession(User user, String ipAddress, String userAgent) {
        try {
            GeoLocationService.LocationData location = geoLocationService.getLocationFromIP(ipAddress);

            UserSession session = UserSession.builder()
                    .user(user)
                    .ipAddress(ipAddress)
                    .province(location.getProvince())
                    .city(location.getCity())
                    .latitude(location.getLatitude())
                    .longitude(location.getLongitude())
                    .loginTime(LocalDateTime.now())
                    .lastActivityTime(LocalDateTime.now())
                    .isActive(true)
                    .userAgent(userAgent)
                    .build();

            userSessionRepository.save(session);
            log.info("User session created in new transaction | userId={} | ip={}", user.getId(), ipAddress);
        } catch (Exception e) {
            log.error("Failed to create user session in new transaction | userId={}", user.getId(), e);
            // This exception will rollback this transaction but NOT the calling one
            throw e;
        }
    }

    /**
     * Create access log in a separate transaction
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void createAccessLog(User user, String ipAddress, String userAgent) {
        try {
            GeoLocationService.LocationData location = geoLocationService.getLocationFromIP(ipAddress);

            AccessLog accessLog = AccessLog.builder()
                    .user(user)
                    .location(location.getProvince() + ", " + location.getCity())
                    .status("Đang hoạt động")
                    .ipAddress(ipAddress)
                    .userAgent(userAgent)
                    .accessTime(LocalDateTime.now())
                    .build();

            accessLogRepository.save(accessLog);
            log.info("Access log created in new transaction | userId={} | ip={}", user.getId(), ipAddress);
        } catch (Exception e) {
            log.error("Failed to create access log in new transaction | userId={}", user.getId(), e);
            // This exception will rollback this transaction but NOT the calling one
            throw e;
        }
    }
}
