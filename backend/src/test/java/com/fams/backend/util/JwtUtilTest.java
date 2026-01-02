package com.fams.backend.util;

import com.fams.backend.security.jwt.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

class JwtUtilTest {

    private JwtUtil jwtUtil;
    private final String SECRET = "fams-super-secret-key-minimum-256-bits-for-hs256-algorithm-test";
    private final long EXPIRATION = 3600000; // 1 hour

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "jwtSecret", SECRET);
        ReflectionTestUtils.setField(jwtUtil, "jwtExpiration", EXPIRATION);
    }

    @Test
    void whenGenerateToken_thenNotNull() {
        String token = jwtUtil.generateToken("testuser");
        assertNotNull(token);
        assertFalse(token.isEmpty());
    }

    @Test
    void whenGetUsernameFromToken_thenMatch() {
        String username = "testuser";
        String token = jwtUtil.generateToken(username);
        String extractedUsername = jwtUtil.getUsernameFromToken(token);
        assertEquals(username, extractedUsername);
    }

    @Test
    void whenValidateValidToken_thenTrue() {
        String token = jwtUtil.generateToken("testuser");
        assertTrue(jwtUtil.validateToken(token));
    }

    @Test
    void whenValidateInvalidToken_thenFalse() {
        assertFalse(jwtUtil.validateToken("invalid-token"));
    }

    @Test
    void whenValidateExpiredToken_thenFalse() {
        // Set very short expiration
        ReflectionTestUtils.setField(jwtUtil, "jwtExpiration", -1000L);
        String token = jwtUtil.generateToken("testuser");
        assertFalse(jwtUtil.validateToken(token));
    }
}
