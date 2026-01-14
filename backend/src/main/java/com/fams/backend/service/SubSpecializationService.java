package com.fams.backend.service;

import com.fams.backend.dto.request.ReorderCoursesRequest;
import com.fams.backend.dto.request.SubSpecializationRequest;
import com.fams.backend.dto.response.CourseResponse;
import com.fams.backend.dto.response.SubSpecializationResponse;
import com.fams.backend.entity.SubSpecialization;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface SubSpecializationService {
    List<SubSpecializationResponse> getSubSpecializationsBySpecialization(Long specializationId);

    Page<SubSpecializationResponse> getSubSpecializationsBySpecialization(Long specializationId, String keyword,
            SubSpecialization.SubSpecializationStatus status, Pageable pageable);

    SubSpecializationResponse getSubSpecialization(Long id);

    SubSpecializationResponse createSubSpecialization(SubSpecializationRequest request);

    SubSpecializationResponse updateSubSpecialization(Long id, SubSpecializationRequest request);

    SubSpecializationResponse updateStatus(Long id, SubSpecialization.SubSpecializationStatus status);

    void deleteSubSpecialization(Long id);

    // Course management
    List<CourseResponse> getCourses(Long subSpecId);

    CourseResponse addCourse(Long subSpecId, Long courseId, Integer semester);

    void removeCourse(Long subSpecId, Long courseId);

    void reorderCourses(Long subSpecId, ReorderCoursesRequest request);
}
