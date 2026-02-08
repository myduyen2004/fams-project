package com.fams.backend.service;

import com.fams.backend.dto.face.FaceDTO;

/**
 * Service interface for face recognition attendance operations
 */
public interface FaceAttendanceService {

    FaceDTO.RegisterFaceResponse registerFace(Long userId, FaceDTO.RegisterFaceRequest request);

    FaceDTO.FaceCheckInResponse checkInWithFace(Long studentId, FaceDTO.FaceCheckInRequest request);

    FaceDTO.FaceStatusResponse getFaceStatus(Long userId);

    FaceDTO.PendingVerificationsResponse getPendingVerifications(Long lecturerId);

    void manualVerify(Long lecturerId, FaceDTO.ManualVerifyRequest request);

    boolean isValidWiFiLocation(Long roomId, String bssid, Integer rssi);

    FaceDTO.FaceImagesResponse getFaceImage(Long userId);

    FaceDTO.FaceQualityResponse checkQuality(FaceDTO.FaceQualityRequest request);
}
