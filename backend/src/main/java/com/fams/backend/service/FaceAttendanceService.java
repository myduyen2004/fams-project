package com.fams.backend.service;

import com.fams.backend.dto.face.FaceDTO;

/**
 * Service interface for face recognition attendance operations
 */
public interface FaceAttendanceService {

    FaceDTO.RegisterFaceResponse registerFace(Long userId, FaceDTO.RegisterFaceRequest request);

    FaceDTO.FaceCheckInResponse checkInWithFace(Long studentId, FaceDTO.FaceCheckInRequest request);

    FaceDTO.FaceStatusResponse getFaceStatus(Long userId);

    FaceDTO.FaceStatusResponse getFaceAttendanceStatus(Long userId, Long slotId);

    FaceDTO.FacePreCheckResponse preCheckFace(Long userId, FaceDTO.FacePreCheckRequest request);

    FaceDTO.PendingVerificationsResponse getPendingVerifications(Long lecturerId);

    void manualVerify(Long lecturerId, FaceDTO.ManualVerifyRequest request);

    boolean isValidWiFiLocation(Long roomId, String ssid, String bssid, Integer rssi);

    FaceDTO.FaceImagesResponse getFaceImage(Long userId);

    java.util.List<FaceDTO.FaceImagesResponse> getStudentFaceImagesByAdmin(Long studentId);

    void resetStudentFaceDataByAdmin(Long studentId);
    FaceDTO.FaceQualityResponse checkQuality(FaceDTO.FaceQualityRequest request);

    com.fams.backend.client.FaceRecognitionClient.FaceDetectResponse detectFace(String image);
}
