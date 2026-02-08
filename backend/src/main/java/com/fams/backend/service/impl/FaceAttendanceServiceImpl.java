package com.fams.backend.service.impl;

import com.fams.backend.client.FaceRecognitionClient;
import com.fams.backend.dto.face.FaceDTO;
import com.fams.backend.entity.*;
import com.fams.backend.repository.*;
import com.fams.backend.service.FaceAttendanceService;
import com.fams.backend.exception.NotFoundException;
import com.fams.backend.exception.BadRequestException;
import com.fams.backend.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

        @Value("${face.recognition.max-attempts:5}")
        private int maxAttempts;

        @Value("${face.recognition.wifi-rssi-threshold:-75}")
        private int wifiRssiThreshold;

        private static final int LATE_THRESHOLD_MINUTES = 15;

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
                                                                .build());

                                if (aiResponse.getSuccess()) {
                                        byte[] encodingBytes = serializeEncoding(aiResponse.getEncoding());

                                        FaceEncoding faceEncoding = FaceEncoding.builder()
                                                        .user(user)
                                                        .encodingData(encodingBytes)
                                                        .faceImage(imageBase64)
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
                        int attempts = user.getFaceRegistrationAttempts() + 1;
                        user.setFaceRegistrationAttempts(attempts);
                        if (attempts >= maxAttempts) {
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

                // TESTING MODE: Auto-create session if missing (User request)
                // TESTING MODE: Auto-create session if missing (User request)
                AttendanceSession session;
                try {
                        session = sessionRepository.findByTimetableSlotId(slot.getId())
                                        .orElseGet(() -> {
                                                log.warn("TESTING MODE: Auto-creating session for slot {}",
                                                                slot.getId());
                                                User lecturer = slot.getClassSection().getLecturer();
                                                // Fallback if lecturer is null (should not happen in valid data)
                                                if (lecturer == null) {
                                                        // Try to find any lecturer or just throw
                                                        throw new BadRequestException(
                                                                        "Cannot auto-create session: No lecturer assigned to class");
                                                }

                                                AttendanceSession newSession = AttendanceSession.builder()
                                                                .timetableSlot(slot)
                                                                .lecturer(lecturer)
                                                                .openedAt(LocalDateTime.now())
                                                                .status(AttendanceSession.SessionStatus.OPEN)
                                                                .build();
                                                return sessionRepository.save(newSession);
                                        });
                } catch (Exception e) {
                        log.error("Failed to auto-create session: {}", e.getMessage(), e);
                        throw new BadRequestException("Failed to auto-create session: " + e.getMessage());
                }

                // TESTING MODE: Ignore session status check
                /*
                 * if (session.getStatus() != AttendanceSession.SessionStatus.OPEN) {
                 * return FaceDTO.FaceCheckInResponse.builder()
                 * .status("FAILED")
                 * .message("Attendance session is not open")
                 * .build();
                 * }
                 */

                User student = userRepository.findById(studentId)
                                .orElseThrow(() -> new NotFoundException("Student not found"));

                StudentAttendance attendance = attendanceRepository
                                .findBySessionIdAndStudentId(session.getId(), studentId)
                                .orElse(null);

                if (attendance != null && attendance.getStatus() == StudentAttendance.AttendanceStatus.PRESENT) {
                        return FaceDTO.FaceCheckInResponse.builder()
                                        .status("ALREADY_CHECKED_IN")
                                        .message("You have already checked in")
                                        .courseName(slot.getClassSection().getCourse().getName())
                                        .build();
                }

                // TESTING MODE: Ignore WiFi check
                /*
                 * if (!isValidWiFiLocation(slot.getRoom().getId(), request.getWifiBssid(),
                 * request.getWifiRssi())) {
                 * return FaceDTO.FaceCheckInResponse.builder()
                 * .status("FAILED")
                 * .message("You are not in the classroom")
                 * .attemptNumber(request.getAttemptNumber())
                 * .remainingAttempts(maxAttempts - request.getAttemptNumber())
                 * .build();
                 * }
                 */

                FaceEncoding faceEncoding = faceEncodingRepository.findByUserId(studentId)
                                .orElseThrow(() -> new BadRequestException("Face not registered"));

                // ANTI-SPOOFING CHECK (Passive Liveness)
                try {
                        FaceRecognitionClient.LivenessResponse livenessResponse = faceClient.passiveLiveness(
                                        FaceRecognitionClient.LivenessRequest.builder()
                                                        .image(request.getFaceImageBase64())
                                                        .build());

                        if (livenessResponse != null && !livenessResponse.getPassed()) {
                                log.warn("Spoofing detected for student {}: {}", studentId,
                                                livenessResponse.getMessage());
                                return FaceDTO.FaceCheckInResponse.builder()
                                                .status("FAILED")
                                                .message("Liveness check failed: " + livenessResponse.getMessage())
                                                .attemptNumber(request.getAttemptNumber())
                                                .remainingAttempts(maxAttempts - request.getAttemptNumber())
                                                .build();
                        }
                } catch (Exception e) {
                        log.error("Liveness check error: {}", e.getMessage());
                        // Fail closed for security
                        return FaceDTO.FaceCheckInResponse.builder()
                                        .status("FAILED")
                                        .message("Anti-spoofing service error")
                                        .attemptNumber(request.getAttemptNumber())
                                        .remainingAttempts(maxAttempts - request.getAttemptNumber())
                                        .build();
                }

                List<Double> referenceEncoding = deserializeEncoding(faceEncoding.getEncodingData());

                FaceRecognitionClient.FaceVerifyResponse verifyResponse;
                try {
                        verifyResponse = faceClient.verifyFace(
                                        FaceRecognitionClient.FaceVerifyRequest.builder()
                                                        .capturedImage(request.getFaceImageBase64())
                                                        .referenceEncoding(referenceEncoding)
                                                        .tolerance(0.6)
                                                        .build());
                } catch (Exception e) {
                        log.error("Face verification failed at AI service: {}", e.getMessage(), e);
                        return FaceDTO.FaceCheckInResponse.builder()
                                        .status("FAILED")
                                        .message("AI Service Error: " + e.getMessage())
                                        .attemptNumber(request.getAttemptNumber())
                                        .remainingAttempts(maxAttempts - request.getAttemptNumber())
                                        .build();
                }

                if (attendance == null) {
                        attendance = StudentAttendance.builder()
                                        .session(session)
                                        .student(student)
                                        .method(StudentAttendance.CheckInMethod.FACE_RECOGNITION)
                                        .attemptCount(0)
                                        .build();
                }

                attendance.setAttemptCount(request.getAttemptNumber());
                attendance.setWifiBssid(request.getWifiBssid());
                attendance.setWifiRssi(request.getWifiRssi());

                if (verifyResponse.getIsMatch()) {
                        boolean isLate = isLateCheckIn(session.getOpenedAt());
                        attendance.setStatus(
                                        isLate ? StudentAttendance.AttendanceStatus.LATE
                                                        : StudentAttendance.AttendanceStatus.PRESENT);
                        attendance.setCheckInTime(LocalDateTime.now());
                        attendance.setFaceConfidence(verifyResponse.getConfidence());
                        attendance.setRequiresManualVerify(false);

                        attendanceRepository.save(attendance);

                        return FaceDTO.FaceCheckInResponse.builder()
                                        .status(isLate ? "LATE" : "SUCCESS")
                                        .message(isLate ? "Checked in late" : "Check-in successful")
                                        .courseName(slot.getClassSection().getCourse().getName())
                                        .sessionTime(session.getOpenedAt().toString())
                                        .confidence(verifyResponse.getConfidence())
                                        .attemptNumber(request.getAttemptNumber())
                                        .remainingAttempts(0)
                                        .build();
                } else {
                        attendance.setFailureReason(verifyResponse.getMessage());
                        int remainingAttempts = maxAttempts - request.getAttemptNumber();

                        if (remainingAttempts <= 0) {
                                attendance.setRequiresManualVerify(true);
                                attendance.setStatus(StudentAttendance.AttendanceStatus.ABSENT);
                                attendanceRepository.save(attendance);

                                notifyLecturerForManualVerification(session, student);

                                return FaceDTO.FaceCheckInResponse.builder()
                                                .status("REQUIRES_MANUAL")
                                                .message("Maximum attempts reached")
                                                .courseName(slot.getClassSection().getCourse().getName())
                                                .attemptNumber(request.getAttemptNumber())
                                                .remainingAttempts(0)
                                                .build();
                        }

                        attendanceRepository.save(attendance);

                        return FaceDTO.FaceCheckInResponse.builder()
                                        .status("FAILED")
                                        .message("Face verification failed")
                                        .attemptNumber(request.getAttemptNumber())
                                        .remainingAttempts(remainingAttempts)
                                        .confidence(verifyResponse.getConfidence())
                                        .build();
                }
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

                if (status == StudentAttendance.AttendanceStatus.PRESENT ||
                                status == StudentAttendance.AttendanceStatus.LATE) {
                        attendance.setCheckInTime(LocalDateTime.now());
                }

                attendanceRepository.save(attendance);
        }

        @Override
        public boolean isValidWiFiLocation(Long roomId, String bssid, Integer rssi) {
                if (bssid == null || bssid.isEmpty()) {
                        return false;
                }

                boolean bssidValid = roomWifiRepository.existsByRoomIdAndWifiAccessPointBssid(roomId, bssid);
                if (!bssidValid) {
                        return false;
                }

                if (rssi != null && rssi < wifiRssiThreshold) {
                        return false;
                }

                return true;
        }

        private boolean isLateCheckIn(LocalDateTime sessionOpenedAt) {
                return LocalDateTime.now().isAfter(sessionOpenedAt.plusMinutes(LATE_THRESHOLD_MINUTES));
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
}
