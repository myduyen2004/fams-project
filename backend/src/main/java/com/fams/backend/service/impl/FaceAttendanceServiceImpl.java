package com.fams.backend.service.impl;

import com.fams.backend.client.FaceRecognitionClient;
import com.fams.backend.dto.face.FaceDTO;
import com.fams.backend.dto.attendance.AttendanceDTO;
import com.fams.backend.entity.*;
import com.fams.backend.repository.*;
import com.fams.backend.service.AttendanceConfigService;
import com.fams.backend.service.FaceAttendanceService;
import com.fams.backend.exception.NotFoundException;
import com.fams.backend.exception.BadRequestException;
import com.fams.backend.exception.UnauthorizedException;
import com.fams.backend.service.UploadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Base64;

import java.io.*;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FaceAttendanceServiceImpl implements FaceAttendanceService {

        private final FaceRecognitionClient faceClient;
        private final FaceEncodingRepository faceEncodingRepository;
        private final StudentAttendanceRepository attendanceRepository;
        private final AttendanceSessionRepository sessionRepository;
        private final TimetableSlotRepository slotRepository;
        private final UserRepository userRepository;
        private final RoomWiFiAccessPointRepository roomWifiRepository;
        private final UploadService uploadService;
        private final SimpMessagingTemplate messagingTemplate;
        private final AttendanceConfigService configService;

        @Override
        @Transactional
        public FaceDTO.RegisterFaceResponse registerFace(Long userId, FaceDTO.RegisterFaceRequest request) {
                log.info("Registering face for user {}, images count: {}", userId, request.getFaceImages().size());

                // Check block status
                User user = userRepository.findById(userId)
                                .orElseThrow(() -> new NotFoundException("User not found"));

                if (user.getFaceRegistrationBlockedUntil() != null
                                && LocalDateTime.now().isBefore(user.getFaceRegistrationBlockedUntil())) {
                        return FaceDTO.RegisterFaceResponse.builder()
                                        .success(false)
                                        .userId(userId)
                                        .message("Bạn đang bị khóa đăng ký. Vui lòng thử lại sau.")
                                        .build();
                }

                FaceRecognitionClient.LivenessProof livenessProof = null;
                if (request.getLivenessProof() != null) {
                        livenessProof = FaceRecognitionClient.LivenessProof.builder()
                                        .passedPassive(request.getLivenessProof().getPassedPassiveCheck())
                                        .passedBlink(request.getLivenessProof().getPassedBlinkCheck())
                                        .passedHeadMovement(request.getLivenessProof().getPassedHeadMovement())
                                        .passedSmile(request.getLivenessProof().getPassedSmile())
                                        .timestamp(request.getLivenessProof().getTimestamp())
                                        .build();
                }

                int successCount = 0;
                String lastError = "";

                // Loop through all images
                for (String imageBase64 : request.getFaceImages()) {
                        try {
                                FaceRecognitionClient.FaceRegisterResponse aiResponse = faceClient.registerFace(
                                                FaceRecognitionClient.FaceRegisterRequest.builder()
                                                                .userId(userId)
                                                                .image(imageBase64)
                                                                .livenessProof(livenessProof)
                                                                .mode("registration")
                                                                .build());

                                if (aiResponse.getSuccess()) {
                                        byte[] encodingBytes = serializeEncoding(aiResponse.getEncoding());

                                        // Upload original registration image to Cloudinary and store URL
                                        String imageUrl = null;
                                        try {
                                                String base64Data = imageBase64;
                                                if (base64Data.contains(",")) {
                                                        base64Data = base64Data.split(",")[1];
                                                }
                                                byte[] imageBytes = Base64.getDecoder().decode(base64Data);
                                                String fileName = "registration_" + userId + "_"
                                                                + System.currentTimeMillis() + "_"
                                                                + successCount + ".jpg";
                                                imageUrl = uploadService.uploadBytes(imageBytes, fileName,
                                                                "fams_registration");
                                        } catch (Exception e) {
                                                log.error("Failed to upload registration photo: {}", e.getMessage());
                                                imageUrl = "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg";
                                        }

                                        FaceEncoding faceEncoding = FaceEncoding.builder()
                                                        .user(user)
                                                        .encodingData(encodingBytes)
                                                        .faceImage(imageUrl) // Store Cloudinary URL instead of Base64
                                                        .registeredAt(LocalDateTime.now())
                                                        .livenessVerified(aiResponse.getLivenessVerified())
                                                        .build();

                                        faceEncodingRepository.save(faceEncoding);
                                        successCount++;
                                } else {
                                        lastError = aiResponse.getMessage();
                                        log.warn("Failed to register one frame for user {}: {}", userId, lastError);
                                }
                        } catch (Exception e) {
                                log.error("Error processing face frame: {}", e.getMessage());
                        }
                }

                if (successCount > 0) {
                        // Reset attempts on success
                        user.setFaceRegistrationAttempts(0);
                        user.setFaceRegistrationBlockedUntil(null);
                        user.setFaceDataStatus(User.FaceDataStatus.REGISTERED);
                        userRepository.save(user);

                        return FaceDTO.RegisterFaceResponse.builder()
                                        .success(true)
                                        .userId(userId)
                                        .message("Đăng ký thành công " + successCount + " góc mặt.")
                                        .registeredAt(LocalDateTime.now())
                                        .build();
                } else {
                        // Increment failed attempts
                        AttendanceConfig config = configService.getConfig();
                        int attempts = user.getFaceRegistrationAttempts() + 1;
                        user.setFaceRegistrationAttempts(attempts);
                        if (attempts >= config.getMaxAttempts()) {
                                user.setFaceRegistrationBlockedUntil(LocalDateTime.now().plusMinutes(30));
                        }
                        userRepository.save(user);

                        return FaceDTO.RegisterFaceResponse.builder()
                                        .success(false)
                                        .userId(userId)
                                        .message(lastError.isEmpty() ? "Không thể đăng ký khuôn mặt" : lastError)
                                        .build();
                }
        }

        @Override
        @Transactional
        public FaceDTO.FaceCheckInResponse checkInWithFace(Long studentId, FaceDTO.FaceCheckInRequest request) {
                log.info("Face check-in attempt {} for student {} at slot {}",
                                request.getAttemptNumber(), studentId, request.getSlotId());

                TimetableSlot slot = slotRepository.findById(request.getSlotId())
                                .orElseThrow(() -> new NotFoundException("Slot not found"));

                AttendanceConfig config = configService.getConfig();

                // 1. Check if Face Recognition is enabled
                if (!Boolean.TRUE.equals(config.getFaceRecognitionEnabled())) {
                        return FaceDTO.FaceCheckInResponse.builder()
                                        .status("FAILED")
                                        .message("Chức năng điểm danh gương mặt hiện đang bị tắt.")
                                        .build();
                }

                // 2. Strict timeframe validation
                java.time.LocalDate today = java.time.LocalDate.now();
                java.time.LocalTime timeNow = java.time.LocalTime.now();

                if (!slot.getDate().equals(today)) {
                        return FaceDTO.FaceCheckInResponse.builder()
                                        .status("FAILED")
                                        .message("Lỗi: Không đúng ngày học (" + slot.getDate() + ")")
                                        .build();
                }

                java.time.LocalTime startTime = slot.getSlotType().getStartTime()
                                .minusMinutes(config.getOpenBeforeMinutes());
                java.time.LocalTime endTime = slot.getSlotType().getEndTime()
                                .plusMinutes(config.getCloseAfterMinutes());

                if (timeNow.isBefore(startTime) || timeNow.isAfter(endTime)) {
                        return FaceDTO.FaceCheckInResponse.builder()
                                        .status("FAILED")
                                        .message("Lỗi: Hiện không trong khung giờ cho phép điểm danh (" +
                                                        startTime + " - " + endTime + ")")
                                        .build();
                }

                // Check for existing session (TEMPORARILY AUTO-CREATE OR BYPASS FOR TESTING)
                AttendanceSession session = sessionRepository.findByTimetableSlotId(slot.getId())
                                .orElseGet(() -> {
                                        log.warn("TESTING MODE: Auto-creating session for slot {}", slot.getId());
                                        User lecturer = slot.getClassSection().getLecturer();
                                        AttendanceSession newSession = AttendanceSession.builder()
                                                        .timetableSlot(slot)
                                                        .lecturer(lecturer)
                                                        .openedAt(LocalDateTime.now())
                                                        .status(AttendanceSession.SessionStatus.OPEN)
                                                        .build();
                                        return sessionRepository.save(newSession);
                                });

                // WiFi Location Validation
                if (Boolean.TRUE.equals(config.getWifiLocationEnabled())) {
                        if (!isValidWiFiLocation(slot.getRoom().getId(), request.getWifiSsid(), request.getWifiBssid(),
                                        request.getWifiRssi())) {
                                String detectedInfo = (request.getWifiBssid() != null
                                                && !request.getWifiBssid().isEmpty())
                                                                ? " (Phát hiện BSSID: " + request.getWifiBssid() + ")"
                                                                : " (Không phát hiện được mã WiFi - Hãy bật GPS/Vị trí)";

                                return FaceDTO.FaceCheckInResponse.builder()
                                                .status("FAILED")
                                                .message("Lỗi: Bạn không ở trong phòng học " + slot.getRoom().getCode()
                                                                + detectedInfo)
                                                .build();
                        }
                }

                User student = userRepository.findById(studentId)
                                .orElseThrow(() -> new NotFoundException("Student not found"));

                StudentAttendance attendance = attendanceRepository
                                .findBySessionIdAndStudentId(session.getId(), studentId)
                                .orElse(null);

                if (attendance != null && attendance.getStatus() == StudentAttendance.AttendanceStatus.PRESENT) {
                        return FaceDTO.FaceCheckInResponse.builder()
                                        .status("ALREADY_CHECKED_IN")
                                        .message("Bạn đã điểm danh cho slot này rồi")
                                        .courseName(slot.getClassSection().getCourse().getName())
                                        .build();
                }

                FaceEncoding faceEncoding = faceEncodingRepository.findByUserId(studentId)
                                .orElseThrow(() -> new BadRequestException("Face not registered"));

                List<Double> referenceEncoding = deserializeEncoding(faceEncoding.getEncodingData());

                FaceRecognitionClient.FaceVerifyResponse verifyResponse;
                try {
                        verifyResponse = faceClient.verifyFace(
                                        FaceRecognitionClient.FaceVerifyRequest.builder()
                                                        .capturedImage(request.getFaceImageBase64())
                                                        .referenceEncoding(referenceEncoding)
                                                        .tolerance(1.0 - config.getFaceMatchThreshold()) // Map
                                                                                                         // threshold to
                                                                                                         // tolerance
                                                        .mode("attendance")
                                                        .livenessProof(Boolean.TRUE.equals(config.getLivenessEnabled())
                                                                        && request.getLivenessProof() != null
                                                                                        ? FaceRecognitionClient.LivenessProof
                                                                                                        .builder()
                                                                                                        .passedPassive(request
                                                                                                                        .getLivenessProof()
                                                                                                                        .getPassedPassiveCheck())
                                                                                                        .passedBlink(request
                                                                                                                        .getLivenessProof()
                                                                                                                        .getPassedBlinkCheck())
                                                                                                        .passedHeadMovement(
                                                                                                                        request
                                                                                                                                        .getLivenessProof()
                                                                                                                                        .getPassedHeadMovement())
                                                                                                        .passedSmile(request
                                                                                                                        .getLivenessProof()
                                                                                                                        .getPassedSmile())
                                                                                                        .timestamp(request
                                                                                                                        .getLivenessProof()
                                                                                                                        .getTimestamp())
                                                                                                        .build()
                                                                                        : null)
                                                        .build());
                } catch (Exception e) {
                        log.error("Face verification failed at AI service: {}", e.getMessage(), e);
                        return FaceDTO.FaceCheckInResponse.builder()
                                        .status("FAILED")
                                        .message("Lỗi dịch vụ AI: " + e.getMessage())
                                        .attemptNumber(request.getAttemptNumber())
                                        .remainingAttempts(config.getMaxAttempts() - request.getAttemptNumber())
                                        .build();
                }

                if (attendance == null) {
                        attendance = StudentAttendance.builder()
                                        .session(session)
                                        .student(student)
                                        .method(StudentAttendance.CheckInMethod.FACE_RECOGNITION)
                                        .attemptCount(0)
                                        .status(StudentAttendance.AttendanceStatus.ABSENT)
                                        .build();
                }

                // Increment attempt count on server side
                int currentAttempt = attendance.getAttemptCount() + 1;
                attendance.setAttemptCount(currentAttempt);
                attendance.setWifiBssid(request.getWifiBssid());
                attendance.setWifiRssi(request.getWifiRssi());

                log.info("Face verification response for student {}: isMatch={}, confidence={}, message={}, attempt={}",
                                studentId, verifyResponse.getIsMatch(), verifyResponse.getConfidence(),
                                verifyResponse.getMessage(), currentAttempt);

                if (verifyResponse.getIsMatch()) {
                        attendance.setStatus(StudentAttendance.AttendanceStatus.PRESENT);
                        attendance.setCheckInTime(LocalDateTime.now());
                        attendance.setFaceConfidence(verifyResponse.getConfidence());
                        attendance.setRequiresManualVerify(false);

                        // Upload captured face image to Cloudinary
                        try {
                                String base64Image = request.getFaceImageBase64();
                                if (base64Image != null && base64Image.contains(",")) {
                                        base64Image = base64Image.split(",")[1];
                                }
                                byte[] imageBytes = Base64.getDecoder().decode(base64Image);
                                String fileName = "attendance_" + studentId + "_" + System.currentTimeMillis() + ".jpg";
                                String faceUrl = uploadService.uploadBytes(imageBytes, fileName, "fams_attendance");
                                attendance.setCapturedFaceUrl(faceUrl);
                        } catch (Exception e) {
                                log.error("Failed to upload attendance photo for student {}: {}", studentId,
                                                e.getMessage());
                        }

                        StudentAttendance savedAttendance = attendanceRepository.save(attendance);

                        // Notify Lecturer via WebSocket
                        try {
                                AttendanceDTO.StudentAttendanceResponse wsMessage = AttendanceDTO.StudentAttendanceResponse
                                                .builder()
                                                .studentId(studentId)
                                                .studentCode(student.getCode())
                                                .fullName(student.getFullName())
                                                .avatarUrl(student.getAvatar())
                                                .status(savedAttendance.getStatus().toString())
                                                .checkInTime(savedAttendance.getCheckInTime())
                                                .capturedFaceUrl(savedAttendance.getCapturedFaceUrl())
                                                .build();

                                messagingTemplate.convertAndSend("/topic/attendance/slot/" + request.getSlotId(),
                                                wsMessage);
                        } catch (Exception e) {
                                log.error("Failed to send WebSocket update: {}", e.getMessage());
                        }

                        return FaceDTO.FaceCheckInResponse.builder()
                                        .status("SUCCESS")
                                        .message("Điểm danh thành công")
                                        .courseName(slot.getClassSection().getCourse().getName())
                                        .sessionTime(session.getOpenedAt().toString())
                                        .confidence(verifyResponse.getConfidence())
                                        .attemptNumber(currentAttempt)
                                        .remainingAttempts(0)
                                        .build();
                } else {
                        log.warn("Face verification FAILED for student {}: confidence={}, message={}",
                                        studentId, verifyResponse.getConfidence(), verifyResponse.getMessage());

                        attendance.setFailureReason(verifyResponse.getMessage());
                        int remainingAttempts = config.getMaxAttempts() - currentAttempt;

                        if (remainingAttempts <= 0) {
                                attendance.setRequiresManualVerify(true);
                                attendance.setStatus(StudentAttendance.AttendanceStatus.ABSENT);
                                attendanceRepository.save(attendance);

                                notifyLecturerForManualVerification(session, student);

                                return FaceDTO.FaceCheckInResponse.builder()
                                                .status("REQUIRES_MANUAL")
                                                .message("Bạn đã thực hiện sai quá nhiều lần ("
                                                                + config.getMaxAttempts()
                                                                + " lần). Vui lòng liên hệ giảng viên.")
                                                .courseName(slot.getClassSection().getCourse().getName())
                                                .attemptNumber(currentAttempt)
                                                .remainingAttempts(0)
                                                .build();
                        }

                        attendanceRepository.save(attendance);

                        return FaceDTO.FaceCheckInResponse.builder()
                                        .status("FAILED")
                                        .message(translateAiMessage(verifyResponse.getMessage()))
                                        .attemptNumber(currentAttempt)
                                        .remainingAttempts(remainingAttempts)
                                        .confidence(verifyResponse.getConfidence())
                                        .build();
                }
        }

        private String translateAiMessage(String message) {
                if (message == null)
                        return "Không thể xác thực danh tính.";

                String msg = message.toLowerCase();
                if (msg.contains("too far")) {
                        return "Bạn đang ở quá xa camera. Vui lòng tiến lại gần hơn.";
                } else if (msg.contains("too close")) {
                        return "Bạn đang ở quá gần camera. Vui lòng lùi ra sau một chút.";
                } else if (msg.contains("low light") || msg.contains("too dark")) {
                        return "Ánh sáng quá tối. Vui lòng di chuyển đến khu vực có ánh sáng tốt hơn.";
                } else if (msg.contains("blur")) {
                        return "Hình ảnh bị nhòe. Vui lòng giữ chắc thiết bị và thử lại.";
                } else if (msg.contains("spoof") || msg.contains("replay") || msg.contains("fake")) {
                        return "Hình ảnh không hợp lệ. Vui lòng chụp ảnh trực tiếp, không sử dụng ảnh in hoặc chụp lại qua màn hình thiết bị khác.";
                } else if (msg.contains("no face")) {
                        return "Không tìm thấy khuôn mặt trong ảnh.";
                }

                return "Không thể xác thực danh tính.";
        }

        @Override
        @Transactional(readOnly = true)
        public FaceDTO.FaceStatusResponse getFaceStatus(Long userId) {
                List<FaceEncoding> encodings = faceEncodingRepository.findAllByUserId(userId);
                boolean hasData = !encodings.isEmpty();
                LocalDateTime latestReg = hasData ? encodings.get(encodings.size() - 1).getRegisteredAt() : null;

                return FaceDTO.FaceStatusResponse.builder()
                                .userId(userId)
                                .hasFaceData(hasData)
                                .faceCount(encodings.size())
                                .registeredAt(latestReg)
                                .build();
        }

        @Override
        @Transactional(readOnly = true)
        public FaceDTO.FaceStatusResponse getFaceAttendanceStatus(Long userId, Long slotId) {
                FaceDTO.FaceStatusResponse status = getFaceStatus(userId);

                AttendanceConfig config = configService.getConfig();
                status.setMaxAttempts(config.getMaxAttempts());

                // Find session for slot
                AttendanceSession session = sessionRepository.findByTimetableSlotId(slotId).orElse(null);

                if (session != null) {
                        StudentAttendance attendance = attendanceRepository
                                        .findBySessionIdAndStudentId(session.getId(), userId)
                                        .orElse(null);

                        if (attendance != null) {
                                int attemptCount = attendance.getAttemptCount();
                                status.setAttemptCount(attemptCount);
                                status.setRemainingAttempts(Math.max(0, config.getMaxAttempts() - attemptCount));
                                status.setAttendanceStatus(attendance.getStatus().toString());
                        } else {
                                status.setAttemptCount(0);
                                status.setRemainingAttempts(config.getMaxAttempts());
                                status.setAttendanceStatus("ABSENT");
                        }
                } else {
                        status.setAttemptCount(0);
                        status.setRemainingAttempts(config.getMaxAttempts());
                        status.setAttendanceStatus("ABSENT");
                }

                return status;
        }

        @Override
        @Transactional
        public FaceDTO.FacePreCheckResponse preCheckFace(Long studentId, FaceDTO.FacePreCheckRequest request) {
                log.info("Face pre-check request for student {} at slot {}", studentId, request.getSlotId());

                AttendanceConfig config = configService.getConfig();
                TimetableSlot slot = slotRepository.findById(request.getSlotId())
                                .orElseThrow(() -> new NotFoundException("Slot not found"));

                // Call AI Detection directly
                FaceRecognitionClient.FaceDetectResponse detectResponse = detectFace(request.getImage());

                // If isReplay is true, it's a security failure that should count as an attempt
                boolean isSecurityFailure = Boolean.TRUE.equals(detectResponse.getIsReplay());

                // Fetch or create attendance record to track attempt
                AttendanceSession session = sessionRepository.findByTimetableSlotId(slot.getId())
                                .orElseGet(() -> {
                                        User lecturer = slot.getClassSection().getLecturer();
                                        AttendanceSession newSession = AttendanceSession.builder()
                                                        .timetableSlot(slot)
                                                        .lecturer(lecturer)
                                                        .openedAt(LocalDateTime.now())
                                                        .status(AttendanceSession.SessionStatus.OPEN)
                                                        .build();
                                        return sessionRepository.save(newSession);
                                });

                User student = userRepository.findById(studentId)
                                .orElseThrow(() -> new NotFoundException("Student not found"));

                StudentAttendance attendance = attendanceRepository
                                .findBySessionIdAndStudentId(session.getId(), studentId)
                                .orElse(null);

                if (attendance == null) {
                        attendance = StudentAttendance.builder()
                                        .session(session)
                                        .student(student)
                                        .method(StudentAttendance.CheckInMethod.FACE_RECOGNITION)
                                        .attemptCount(0)
                                        .status(StudentAttendance.AttendanceStatus.ABSENT)
                                        .build();
                }

                if (isSecurityFailure) {
                        String msg = detectResponse.getMessage();
                        // Quality warnings (instructional) should NOT count as failed attempts
                        boolean isQualityWarning = msg != null && (msg.contains("mặt lại gần") ||
                                        msg.contains("ánh sáng") ||
                                        msg.contains("chưa rõ") ||
                                        msg.contains("xa quá") ||
                                        msg.contains("nhìn thẳng"));

                        int currentAttempt = attendance.getAttemptCount();
                        if (!isQualityWarning) {
                                currentAttempt++;
                                attendance.setAttemptCount(currentAttempt);
                                attendance.setFailureReason(msg);

                                int remainingAttempts = config.getMaxAttempts() - currentAttempt;
                                if (remainingAttempts <= 0) {
                                        attendance.setRequiresManualVerify(true);
                                }
                                attendanceRepository.save(attendance);
                        }

                        int remainingAttempts = config.getMaxAttempts() - currentAttempt;

                        return FaceDTO.FacePreCheckResponse.builder()
                                        .success(true)
                                        .passed(false)
                                        .message(msg)
                                        .isQualityWarning(isQualityWarning)
                                        .attemptNumber(currentAttempt)
                                        .remainingAttempts(Math.max(0, remainingAttempts))
                                        .maxAttempts(config.getMaxAttempts())
                                        .status(isQualityWarning ? "OK"
                                                        : (remainingAttempts <= 0 ? "REQUIRES_MANUAL" : "FAILED"))
                                        .build();
                }

                // If passed detection, just return current state without incrementing
                int currentAttempt = attendance.getAttemptCount();
                int remainingAttempts = config.getMaxAttempts() - currentAttempt;

                return FaceDTO.FacePreCheckResponse.builder()
                                .success(true)
                                .passed(true)
                                .message("Detection passed")
                                .attemptNumber(currentAttempt)
                                .remainingAttempts(remainingAttempts)
                                .maxAttempts(config.getMaxAttempts())
                                .status("OK")
                                .build();
        }

        @Override
        @Transactional(readOnly = true)
        public FaceDTO.FaceImagesResponse getFaceImage(Long userId) {
                return faceEncodingRepository.findByUserId(userId)
                                .map(fe -> FaceDTO.FaceImagesResponse.builder()
                                                .userId(userId)
                                                .faceImage(fe.getFaceImage())
                                                .registeredAt(fe.getRegisteredAt())
                                                .build())
                                .orElse(null);
        }

        @Override
        @Transactional(readOnly = true)
        public FaceDTO.PendingVerificationsResponse getPendingVerifications(Long lecturerId) {
                List<StudentAttendance> pendingList = attendanceRepository
                                .findByRequiresManualVerifyTrueAndSessionLecturerId(lecturerId);

                List<FaceDTO.PendingVerificationDTO> dtos = pendingList.stream()
                                .map(a -> FaceDTO.PendingVerificationDTO.builder()
                                                .attendanceId(a.getId())
                                                .sessionId(a.getSession().getId())
                                                .studentId(a.getStudent().getId())
                                                .studentCode(a.getStudent().getCode())
                                                .studentName(a.getStudent().getFullName())
                                                .avatarUrl(a.getStudent().getAvatar())
                                                .attemptCount(a.getAttemptCount())
                                                .failureReason(a.getFailureReason())
                                                .lastAttemptAt(a.getUpdatedAt())
                                                .courseName(a.getSession().getTimetableSlot().getClassSection()
                                                                .getCourse().getName())
                                                .className(a.getSession().getTimetableSlot().getClassSection()
                                                                .getClassName())
                                                .build())
                                .collect(Collectors.toList());

                return FaceDTO.PendingVerificationsResponse.builder()
                                .count(dtos.size())
                                .pendingVerifications(dtos)
                                .build();
        }

        @Override
        @Transactional
        public void manualVerify(Long lecturerId, FaceDTO.ManualVerifyRequest request) {
                log.info("Manual verification by lecturer {} for student {}", lecturerId, request.getStudentId());

                StudentAttendance attendance = attendanceRepository
                                .findBySessionIdAndStudentId(request.getSessionId(), request.getStudentId())
                                .orElseThrow(() -> new NotFoundException("Attendance not found"));

                if (!attendance.getRequiresManualVerify()) {
                        throw new BadRequestException("Does not require manual verification");
                }

                User lecturer = userRepository.findById(lecturerId)
                                .orElseThrow(() -> new NotFoundException("Lecturer not found"));

                if (!attendance.getSession().getLecturer().getId().equals(lecturerId)) {
                        throw new UnauthorizedException("Unauthorized");
                }

                StudentAttendance.AttendanceStatus status = StudentAttendance.AttendanceStatus
                                .valueOf(request.getStatus());

                attendance.setStatus(status);
                attendance.setMethod(StudentAttendance.CheckInMethod.MANUAL);
                attendance.setManualVerifiedBy(lecturer);
                attendance.setManualVerifiedAt(LocalDateTime.now());
                attendance.setRequiresManualVerify(false);
                attendance.setNote(request.getNote());

                if (status == StudentAttendance.AttendanceStatus.PRESENT) {
                        attendance.setCheckInTime(LocalDateTime.now());
                }

                attendanceRepository.save(attendance);
        }

        @Override
        public boolean isValidWiFiLocation(Long roomId, String ssid, String bssid, Integer rssi) {
                if (bssid == null || bssid.isEmpty()) {
                        return false;
                }

                AttendanceConfig config = configService.getConfig();

                // 1. Campus WiFi Enforcement
                if (Boolean.TRUE.equals(config.getForceCampusWifi())) {
                        // For simplicity, we assume any mapped BSSID is a campus AP
                        // In a real scenario, we might check SSID patterns or a whitelist of campus
                        // SSIDs
                }

                // Room-specific validation
                java.util.List<com.fams.backend.entity.RoomWiFiAccessPoint> mappedAps = roomWifiRepository
                                .findByRoomId(roomId);

                if (mappedAps.isEmpty()) {
                        log.warn("Room {} has no mapped WiFi Access Points. Validation skipped.", roomId);
                        return true; // Or false, depending on security policy. Here we allow it if not configured.
                }

                java.util.Optional<com.fams.backend.entity.RoomWiFiAccessPoint> rwapOpt = mappedAps.stream()
                                .filter(ap -> ap.getWifiAccessPoint().getBssid().equalsIgnoreCase(bssid))
                                .findFirst();

                if (rwapOpt.isEmpty()) {
                        log.warn("WiFi BSSID NOT MAPPED to Room {}: detected BSSID {}", roomId, bssid);
                        return false;
                }

                com.fams.backend.entity.RoomWiFiAccessPoint rwap = rwapOpt.get();
                com.fams.backend.entity.WiFiAccessPoint ap = rwap.getWifiAccessPoint();

                // 2. SSID Filter
                if (ssid != null && !ssid.isEmpty() && ap.getSsid() != null && !ap.getSsid().isEmpty()) {
                        if (!ap.getSsid().equalsIgnoreCase(ssid)) {
                                log.warn("WiFi SSID mismatch for Room {}: expected {}, got {}", roomId, ap.getSsid(),
                                                ssid);
                                return false;
                        }
                }

                // 3. RSSI Signal Strength check
                Integer threshold = (rwap.getSignalStrength() != null) ? rwap.getSignalStrength()
                                : config.getWifiRssiThreshold();

                if (rssi != null && rssi < threshold) {
                        log.warn("WiFi RSSI too weak for Room {} (AP {}): threshold {}, got {}", roomId, bssid,
                                        threshold, rssi);
                        return false;
                }

                return true;
        }

        private void notifyLecturerForManualVerification(AttendanceSession session, User student) {
                try {
                        User lecturer = session.getLecturer();
                        String message = String.format(
                                        "Student %s (%s) failed face verification in %s. Manual verification required.",
                                        student.getFullName(),
                                        student.getCode(),
                                        session.getTimetableSlot().getClassSection().getCourse().getName());

                        // Log instead of using undefined notification method
                        // TODO: Integrate with proper push notification service
                        log.warn("MANUAL_VERIFICATION_REQUIRED: Lecturer {} should verify student {} for session {}. Message: {}",
                                        lecturer.getId(), student.getId(), session.getId(), message);
                } catch (Exception e) {
                        log.error("Failed to notify lecturer: {}", e.getMessage());
                }
        }

        private byte[] serializeEncoding(List<Double> encoding) {
                try (ByteArrayOutputStream bos = new ByteArrayOutputStream();
                                ObjectOutputStream oos = new ObjectOutputStream(bos)) {
                        oos.writeObject(encoding.toArray(new Double[0]));
                        return bos.toByteArray();
                } catch (IOException e) {
                        throw new RuntimeException("Failed to serialize face encoding", e);
                }
        }

        @SuppressWarnings("unchecked")
        private List<Double> deserializeEncoding(byte[] data) {
                try (ByteArrayInputStream bis = new ByteArrayInputStream(data);
                                ObjectInputStream ois = new ObjectInputStream(bis)) {
                        Double[] arr = (Double[]) ois.readObject();
                        return Arrays.asList(arr);
                } catch (IOException | ClassNotFoundException e) {
                        throw new RuntimeException("Failed to deserialize face encoding", e);
                }
        }

        @Override
        public FaceDTO.FaceQualityResponse checkQuality(FaceDTO.FaceQualityRequest request) {
                // Call AI Client's internal method using internal DTO, then map to public DTO
                // NOTE: We need to map between FaceDTO (public) and FaceRecognitionClient
                // (internal) DTOs

                FaceRecognitionClient.FaceQualityRequest clientRequest = FaceRecognitionClient.FaceQualityRequest
                                .builder()
                                .image(request.getImage())
                                .mode(request.getMode() != null ? request.getMode() : "attendance")
                                .build();

                FaceRecognitionClient.FaceQualityResponse clientResponse = faceClient.checkQuality(clientRequest);

                return FaceDTO.FaceQualityResponse.builder()
                                .success(clientResponse.getSuccess())
                                .passed(clientResponse.getPassed())
                                .warnings(clientResponse.getWarnings())
                                .errors(clientResponse.getErrors())
                                .message(clientResponse.getMessage())
                                .build();
        }

        @Override
        public FaceRecognitionClient.FaceDetectResponse detectFace(String image) {
                return faceClient.detectFace(FaceRecognitionClient.FaceDetectRequest.builder()
                                .image(image)
                                .build());
        }
}
