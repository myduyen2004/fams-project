package com.fams.backend.service;

import com.fams.backend.dto.request.CreateGradeOtpRequest;
import com.fams.backend.dto.request.VerifyGradeOtpRequest;
import com.fams.backend.dto.response.LecturerOtpStatusResponse;
import com.fams.backend.entity.LecturerGradeOtp;
import com.fams.backend.entity.User;
import com.fams.backend.exception.BadRequestException;
import com.fams.backend.repository.LecturerGradeOtpRepository;
import com.fams.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class LecturerGradeOtpService {

    private final LecturerGradeOtpRepository lecturerGradeOtpRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final StringRedisTemplate redisTemplate;

    private static final String GRADE_OTP_SESSION_PREFIX = "grade_otp_session:";
    private static final long SESSION_EXPIRY_MINUTES = 30;

    /**
     * Check if lecturer has an OTP set up
     */
    public LecturerOtpStatusResponse getOtpStatus(Long userId) {
        return lecturerGradeOtpRepository.findByUserId(userId)
                .map(otp -> LecturerOtpStatusResponse.builder()
                        .hasOtp(true)
                        .lastUsedAt(otp.getLastUsedAt())
                        .build())
                .orElse(LecturerOtpStatusResponse.builder()
                        .hasOtp(false)
                        .lastUsedAt(null)
                        .build());
    }

    /**
     * Create new OTP for lecturer
     */
    @Transactional
    public void createOtp(Long userId, CreateGradeOtpRequest request) {
        // Check if already has OTP
        if (lecturerGradeOtpRepository.existsByUserId(userId)) {
            throw new BadRequestException("Bạn đã có mã OTP. Vui lòng sử dụng chức năng đổi OTP nếu muốn thay đổi.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy người dùng"));

        // Only lecturers can create grade OTP
        if (user.getRole() != User.UserRole.LECTURER) {
            throw new BadRequestException("Chỉ giảng viên mới có thể tạo mã OTP điểm");
        }

        // Hash the OTP
        String hashedOtp = passwordEncoder.encode(request.getOtp());

        LecturerGradeOtp gradeOtp = LecturerGradeOtp.builder()
                .user(user)
                .otpHash(hashedOtp)
                .build();

        lecturerGradeOtpRepository.save(gradeOtp);
        log.info("Created grade OTP for lecturer userId={}", userId);
    }

    /**
     * Verify OTP and create session in Redis
     */
    @Transactional
    public boolean verifyOtp(Long userId, VerifyGradeOtpRequest request) {
        LecturerGradeOtp gradeOtp = lecturerGradeOtpRepository.findByUserId(userId)
                .orElseThrow(() -> new BadRequestException("Bạn chưa tạo mã OTP. Vui lòng tạo mã OTP trước."));

        boolean matches = passwordEncoder.matches(request.getOtp(), gradeOtp.getOtpHash());

        if (!matches) {
            log.warn("Invalid grade OTP attempt for userId={}", userId);
            throw new BadRequestException("Mã OTP không chính xác");
        }

        // Update last used time
        gradeOtp.setLastUsedAt(LocalDateTime.now());
        lecturerGradeOtpRepository.save(gradeOtp);

        // Create session in Redis
        String sessionKey = GRADE_OTP_SESSION_PREFIX + userId;
        redisTemplate.opsForValue().set(sessionKey, "verified", SESSION_EXPIRY_MINUTES, TimeUnit.MINUTES);

        log.info("Grade OTP verified for userId={}", userId);
        return true;
    }

    /**
     * Check if user has valid OTP session
     */
    public boolean hasValidSession(Long userId) {
        String sessionKey = GRADE_OTP_SESSION_PREFIX + userId;
        return Boolean.TRUE.equals(redisTemplate.hasKey(sessionKey));
    }

    /**
     * Regenerate (change) OTP
     */
    @Transactional
    public void regenerateOtp(Long userId, CreateGradeOtpRequest request) {
        LecturerGradeOtp gradeOtp = lecturerGradeOtpRepository.findByUserId(userId)
                .orElseThrow(() -> new BadRequestException("Bạn chưa tạo mã OTP."));

        // Hash new OTP
        String hashedOtp = passwordEncoder.encode(request.getOtp());
        gradeOtp.setOtpHash(hashedOtp);

        lecturerGradeOtpRepository.save(gradeOtp);

        // Invalidate old session
        String sessionKey = GRADE_OTP_SESSION_PREFIX + userId;
        redisTemplate.delete(sessionKey);

        log.info("Regenerated grade OTP for userId={}", userId);
    }

    /**
     * Invalidate OTP session (logout from grade management)
     */
    public void invalidateSession(Long userId) {
        String sessionKey = GRADE_OTP_SESSION_PREFIX + userId;
        redisTemplate.delete(sessionKey);
        log.info("Invalidated grade OTP session for userId={}", userId);
    }
}
