package com.fams.backend.security.jwt;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for JWT token validation in Create Major API (FE-04)
 * Test Cases:
 * - UTCID01: Valid Token - expects TRUE return
 * - UTCID02: Expired Token - expects FALSE return with "Expired JWT" log
 * - UTCID03: Tampered Token - expects FALSE return with "Invalid JWT" log
 */
class JwtUtilCreateMajorTest {

    private JwtUtil jwtUtil;

    private static final String VALID_SECRET = "fams-super-secret-key-minimum-256-bits-for-hs256-algorithm-change-this-in-production";
    private static final String DIFFERENT_SECRET = "different-secret-key-minimum-256-bits-for-hs256-algorithm-tampered-key";
    private static final long EXPIRATION = 86400000L; // 24 hours

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "jwtSecret", VALID_SECRET);
        ReflectionTestUtils.setField(jwtUtil, "jwtExpiration", EXPIRATION);
    }

    // ============================================
    // UTCID01: Valid Token Test
    // ============================================
    @Test
    @DisplayName("UTCID01 - Create Major with Valid Token: Returns TRUE")
    void createMajor_WithValidToken_ReturnsTrue() {
        // Arrange: Create a valid token with correct secret and non-expired date
        String validToken = jwtUtil.generateToken("admin@fams.edu.vn");

        // Act: Validate the token
        boolean result = jwtUtil.validateToken(validToken);

        // Assert: Token should be valid
        assertTrue(result, "Valid token should return TRUE");

        // Additional assertion: can extract username
        String username = jwtUtil.getUsernameFromToken(validToken);
        assertEquals("admin@fams.edu.vn", username);
    }

    // ============================================
    // UTCID02: Expired Token Test
    // ============================================
    @Test
    @DisplayName("UTCID02 - Create Major with Expired Token: Returns FALSE with 'Expired JWT' log")
    void createMajor_WithExpiredToken_ReturnsFalse() {
        // Arrange: Create an expired token (issued in the past, already expired)
        SecretKey key = Keys.hmacShaKeyFor(VALID_SECRET.getBytes(StandardCharsets.UTF_8));
        Date pastDate = new Date(System.currentTimeMillis() - 10000); // 10 seconds ago
        Date expiredDate = new Date(System.currentTimeMillis() - 5000); // 5 seconds ago

        String expiredToken = Jwts.builder()
                .setSubject("admin@fams.edu.vn")
                .setIssuedAt(pastDate)
                .setExpiration(expiredDate)
                .signWith(key)
                .compact();

        // Act: Validate the expired token
        boolean result = jwtUtil.validateToken(expiredToken);

        // Assert: Token should be invalid (expired)
        assertFalse(result, "Expired token should return FALSE");
    }

    // ============================================
    // UTCID03: Tampered Token Test (Invalid Signature)
    // ============================================
    @Test
    @DisplayName("UTCID03 - Create Major with Tampered Token: Returns FALSE with 'Invalid JWT' log")
    void createMajor_WithTamperedToken_ReturnsFalse() {
        // Arrange: Create a token with a DIFFERENT secret key (simulating a tampered
        // token)
        SecretKey tamperedKey = Keys.hmacShaKeyFor(DIFFERENT_SECRET.getBytes(StandardCharsets.UTF_8));
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + EXPIRATION);

        String tamperedToken = Jwts.builder()
                .setSubject("admin@fams.edu.vn")
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(tamperedKey) // Signed with DIFFERENT key
                .compact();

        // Act: Validate the tampered token (using the original secret)
        boolean result = jwtUtil.validateToken(tamperedToken);

        // Assert: Token should be invalid (signature mismatch)
        assertFalse(result, "Tampered token should return FALSE");
    }

    // ============================================
    // Additional Test: Missing Token Test
    // ============================================
    @Test
    @DisplayName("Create Major without Token: Returns FALSE")
    void createMajor_WithNullToken_ReturnsFalse() {
        // Act & Assert
        assertFalse(jwtUtil.validateToken(null), "Null token should return FALSE");
    }

    // ============================================
    // Additional Test: Malformed Token Test
    // ============================================
    @Test
    @DisplayName("Create Major with Malformed Token: Returns FALSE")
    void createMajor_WithMalformedToken_ReturnsFalse() {
        // Arrange: A completely invalid token format
        String malformedToken = "not-a-valid-jwt-token";

        // Act
        boolean result = jwtUtil.validateToken(malformedToken);

        // Assert
        assertFalse(result, "Malformed token should return FALSE");
    }

    // ============================================
    // Additional Test: Empty Token Test
    // ============================================
    @Test
    @DisplayName("Create Major with Empty Token: Returns FALSE")
    void createMajor_WithEmptyToken_ReturnsFalse() {
        // Act & Assert
        assertFalse(jwtUtil.validateToken(""), "Empty token should return FALSE");
    }
}
