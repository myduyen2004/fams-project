package com.fams.backend.service;

import com.fams.backend.dto.request.ClassSectionRequest;
import com.fams.backend.dto.request.EnrollmentRequest;
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
        List<com.fams.backend.dto.response.CourseOptionResponse> getCourseOptionsByLecturerAndSemester(
                        String semesterCode,
                        Long lecturerId);

        // ==================== CRUD OPERATIONS ====================

        /**
         * Create a new class section.
         * Only allowed when semester has not started (status = UPCOMING).
         */
        ClassSectionResponse createClassSection(ClassSectionRequest request);

        /**
         * Update an existing class section.
         * Only allowed when semester has not started (status = UPCOMING).
         */
        ClassSectionResponse updateClassSection(String className, ClassSectionRequest request);

        /**
         * Delete a class section.
         * Only allowed when semester has not started (status = UPCOMING).
         */
        void deleteClassSection(String className);

        /**
         * Delete multiple class sections.
         * Only allowed when semester has not started (status = UPCOMING).
         */
        void deleteClassSections(List<String> classNames);

        /**
         * Get all lecturers (for dropdown in create/update form).
         */
        List<LecturerOptionResponse> getAllLecturers();

        // ==================== ENROLLMENT CRUD ====================

        /**
         * Create a new enrollment.
         * Only allowed when semester has not started (status = UPCOMING).
         */
        EnrollmentResponse createEnrollment(EnrollmentRequest request);

        /**
         * Update an enrollment status.
         * Only allowed when semester has not started (status = UPCOMING).
         */
        EnrollmentResponse updateEnrollment(Long enrollmentId, EnrollmentRequest request);

        /**
         * Delete an enrollment.
         * Only allowed when semester has not started (status = UPCOMING).
         */
        void deleteEnrollment(Long enrollmentId);

        /**
         * Delete multiple enrollments.
         * Only allowed when semester has not started (status = UPCOMING).
         */
        void deleteEnrollments(List<Long> enrollmentIds);

        /**
         * Get all students (for dropdown in enrollment form).
         */
        List<com.fams.backend.dto.response.StudentOptionResponse> getAvailableStudentsForClassSection(String className);

        /**
         * Get available class sections with same course for enrollment transfer.
         * Only returns class sections that have available slots.
         */
        List<ClassSectionResponse> getAvailableClassSectionsForTransfer(String currentClassName);

        /**
         * Transfer enrollments to a different class section.
         * Only allowed when semester has not started (status = UPCOMING).
         */
        void transferEnrollments(List<Long> enrollmentIds, String targetClassName);
}
