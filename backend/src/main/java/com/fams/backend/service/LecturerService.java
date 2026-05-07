package com.fams.backend.service;

import com.fams.backend.dto.request.LecturerProfileRequest;
import com.fams.backend.dto.response.LecturerResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

public interface LecturerService {

    Page<LecturerResponse> getAllLecturers(String search, String status, String department,
            String major, String specialization, Boolean hasProfile, Pageable pageable);

    LecturerResponse getLecturerById(Long id);

    List<String> getAllDepartments();

    void deleteLecturer(Long id);

    void deleteLecturers(List<Long> ids);

    LecturerResponse registerLecturerProfile(Long userId, LecturerProfileRequest request);

    LecturerResponse updateLecturer(Long id, com.fams.backend.dto.request.LecturerUpdateRequest request,
            MultipartFile avatar);

    byte[] exportLecturers(String department, String major, String specialization, String status);

    Map<String, Object> importLecturers(MultipartFile file);

    java.util.List<com.fams.backend.dto.LecturerImportDTO> previewImportLecturers(MultipartFile file);

    Map<String, Object> saveImportedLecturers(java.util.List<com.fams.backend.dto.LecturerImportDTO> dtos);
}
