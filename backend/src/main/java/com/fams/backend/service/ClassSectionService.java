package com.fams.backend.service;

import com.fams.backend.dto.ClassSectionImportDTO;
import com.fams.backend.dto.EnrollmentImportDTO;
import com.fams.backend.dto.response.ClassSectionResponse;
import com.fams.backend.dto.response.EnrollmentResponse;
import com.fams.backend.dto.response.LecturerOptionResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

public interface ClassSectionService {
    Page<ClassSectionResponse> getClassSectionsBySemester(
            String semesterCode,
            String search,
            String status,
            Long lecturerId,
            Pageable pageable);

    List<LecturerOptionResponse> getLecturersBySemester(String semesterCode);

    // Enrollment methods
    List<EnrollmentResponse> getEnrollmentsByClassName(String className);

    // Import class section methods
    List<ClassSectionImportDTO> previewImportClassSections(String semesterCode, MultipartFile file);

    Map<String, Object> saveImportedClassSections(String semesterCode, List<ClassSectionImportDTO> dtos);

    byte[] getImportTemplate();

    // Import enrollment methods (support multiple class sections)
    List<EnrollmentImportDTO> previewImportEnrollments(String semesterCode, MultipartFile file);

    Map<String, Object> saveImportedEnrollments(List<EnrollmentImportDTO> dtos);

    byte[] getEnrollmentImportTemplate(String semesterCode);
}
