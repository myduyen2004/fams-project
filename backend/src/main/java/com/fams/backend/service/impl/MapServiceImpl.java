package com.fams.backend.service.impl;

import com.fams.backend.dto.response.OnlineUsersResponse;
import com.fams.backend.dto.response.ProvinceOnlineData;
import com.fams.backend.entity.UserSession;
import com.fams.backend.repository.UserSessionRepository;
import com.fams.backend.service.MapService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MapServiceImpl implements MapService {

        private final UserSessionRepository userSessionRepository;
        private static final int ACTIVE_THRESHOLD_MINUTES = 60;

        @Override
        @Transactional(readOnly = true)
        public OnlineUsersResponse getOnlineUsers() {
                LocalDateTime threshold = LocalDateTime.now().minusMinutes(ACTIVE_THRESHOLD_MINUTES);
                List<UserSession> activeSessions = userSessionRepository.findActiveSessions(threshold);

                Map<String, List<UserSession>> sessionsByProvince = activeSessions.stream()
                                .filter(session -> session.getProvince() != null)
                                .collect(Collectors.groupingBy(UserSession::getProvince));

                List<ProvinceOnlineData> provinceDataList = new ArrayList<>();

                for (Map.Entry<String, List<UserSession>> entry : sessionsByProvince.entrySet()) {
                        String province = entry.getKey();
                        List<UserSession> sessions = entry.getValue();

                        List<String> usernames = sessions.stream()
                                        .map(session -> session.getUser().getFullName())
                                        .distinct()
                                        .collect(Collectors.toList());

                        Double avgLat = sessions.stream()
                                        .filter(s -> s.getLatitude() != null)
                                        .mapToDouble(s -> s.getLatitude().doubleValue())
                                        .average()
                                        .orElse(0.0);

                        Double avgLon = sessions.stream()
                                        .filter(s -> s.getLongitude() != null)
                                        .mapToDouble(s -> s.getLongitude().doubleValue())
                                        .average()
                                        .orElse(0.0);

                        ProvinceOnlineData data = ProvinceOnlineData.builder()
                                        .provinceName(province)
                                        .onlineCount(sessions.size())
                                        .latitude(avgLat)
                                        .longitude(avgLon)
                                        .usernames(usernames)
                                        .build();

                        provinceDataList.add(data);
                }

                return OnlineUsersResponse.builder()
                                .totalOnline(activeSessions.size())
                                .provinces(provinceDataList)
                                .build();
        }
}
