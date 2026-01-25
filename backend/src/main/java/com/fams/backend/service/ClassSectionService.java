package com.fams.backend.service;

import com.fams.backend.dto.response.ClassDetailResponse;
import com.fams.backend.dto.response.ClassSectionResponse;
import com.fams.backend.dto.response.EnrollmentResponse;
import com.fams.backend.dto.response.LecturerOptionResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

/**
 * Service interface for class section operations.
 * 
 * Note: Import functionality has been moved to StagingImportService
 * for better performance with large files (streaming + staging tables).
 */
public interface ClassSectionService {

    /**
     * Get paginated class sections by semester with optional filters.
     */
    Page<ClassSectionResponse> getClassSectionsBySemester(
            String semesterCode,
            String search,
            String status,
            Long lecturerId,
            Pageable pageable);

    /**
     * Get list of lecturers who have class sections in a semester.
     */
    List<LecturerOptionResponse> getLecturersBySemester(String semesterCode);

    /**
     * Get enrollments for a specific class section.
     */
    List<EnrollmentResponse> getEnrollmentsByClassName(String className);

    /**
     * Generate Excel template for importing class sections.
     */
    byte[] getImportTemplate();

    /**
     * Generate Excel template for importing enrollments.
     */
    byte[] getEnrollmentImportTemplate(String semesterCode);

    /**
     * Get detailed information for a specific class section.
     */
    ClassDetailResponse getClassDetail(String className);

    /**
     * Get list of unique courses taught by a lecturer in a semester.
     */
    List<com.fams.backend.dto.response.CourseOptionResponse> getCourseOptionsByLecturerAndSemester(String semesterCode,
            Long lecturerId);
}
