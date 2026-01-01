package com.fams.backend.security.jwt;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

class JwtUtilTest {

    private JwtUtil jwtUtil;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil();
        // Inject values using ReflectionTestUtils because @Value won't work in unit
        // tests
        ReflectionTestUtils.setField(jwtUtil, "jwtSecret", "ThisIsASecretKeyForTestingPurposesOnly123456");
        ReflectionTestUtils.setField(jwtUtil, "jwtExpiration", 3600000L); // 1 hour
    }

    @Test
    @DisplayName("UTCID-JWT01 (Normal): Generate and Validate Token")
    void generateAndValidateToken() {
        String username = "admin";
        String token = jwtUtil.generateToken(username);

        assertNotNull(token);
        assertTrue(jwtUtil.validateToken(token));
        assertEquals(username, jwtUtil.getUsernameFromToken(token));
    }

    @Test
    @DisplayName("UTCID-JWT02 (Abnormal): Invalid Token")
    void validateInvalidToken() {
        String invalidToken = "eyJhbGciOiJIUzI1NiJ9.INVALID_PAYLOAD.SIGNATURE";
        assertFalse(jwtUtil.validateToken(invalidToken));
    }

    @Test
    @DisplayName("UTCID-JWT03 (Abnormal): Expired Token")
    void validateExpiredToken() {
        // Set very short expiration
        ReflectionTestUtils.setField(jwtUtil, "jwtExpiration", -1000L); // Expired 1 second ago
        String token = jwtUtil.generateToken("admin");

        assertFalse(jwtUtil.validateToken(token));
    }
}
