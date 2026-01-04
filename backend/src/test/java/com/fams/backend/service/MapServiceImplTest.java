package com.fams.backend.service;

import com.fams.backend.dto.response.OnlineUsersResponse;
import com.fams.backend.entity.User;
import com.fams.backend.entity.UserSession;
import com.fams.backend.repository.UserSessionRepository;
import com.fams.backend.service.impl.MapServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MapServiceImplTest {

    @Mock
    private UserSessionRepository userSessionRepository;

    @InjectMocks
    private MapServiceImpl mapService;

    @Test
    void whenGetOnlineUsers_thenReturnGroupedData() {
        User user = new User();
        user.setFullName("Nguyen Van A");

        UserSession session = new UserSession();
        session.setUser(user);
        session.setProvince("Hanoi");
        session.setLatitude(new BigDecimal("21.0285"));
        session.setLongitude(new BigDecimal("105.8542"));

        when(userSessionRepository.findActiveSessions(any(LocalDateTime.class)))
                .thenReturn(Collections.singletonList(session));

        OnlineUsersResponse response = mapService.getOnlineUsers();

        assertEquals(1, response.getTotalOnline());
        assertFalse(response.getProvinces().isEmpty());
        assertEquals("Hanoi", response.getProvinces().get(0).getProvinceName());
        assertEquals(21.0285, response.getProvinces().get(0).getLatitude());
        assertTrue(response.getProvinces().get(0).getUsernames().contains("Nguyen Van A"));
    }
}
