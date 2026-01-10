package com.fams.backend.controller;

import com.fams.backend.dto.response.OnlineUsersResponse;
import com.fams.backend.dto.response.ProvinceOnlineData;
import com.fams.backend.entity.UserSession;
import com.fams.backend.repository.UserSessionRepository;
import com.fams.backend.service.MapService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/map")
@RequiredArgsConstructor
@Slf4j
public class MapController {
        private final MapService mapService;
        private final UserSessionRepository userSessionRepository;

        // Consider a session active if activity within last 60 minutes
        private static final int ACTIVE_THRESHOLD_MINUTES = 60;

        @GetMapping("/online-users")
        public ResponseEntity<OnlineUsersResponse> getOnlineUsers() {
                log.info("GET /api/map/online-users");
                return ResponseEntity.ok(mapService.getOnlineUsers());
        }

        @GetMapping("/user-sessions")
        @Transactional(readOnly = true)
        public ResponseEntity<List<UserSession>> getAllActiveSessions() {
                log.info("GET /api/map/user-sessions");
                LocalDateTime threshold = LocalDateTime.now().minusMinutes(ACTIVE_THRESHOLD_MINUTES);
                List<UserSession> activeSessions = userSessionRepository.findActiveSessions(threshold);
                return ResponseEntity.ok(activeSessions);
        }
}
