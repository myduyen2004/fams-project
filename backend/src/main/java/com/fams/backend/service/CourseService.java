package com.fams.backend.service;

import com.fams.backend.dto.CourseImportDTO;
import com.fams.backend.dto.request.CourseRequest;
import com.fams.backend.dto.response.CourseResponse;
import com.fams.backend.entity.Course;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

public interface CourseService {
    Page<CourseResponse> getCourses(String keyword, Course.CourseStatus status, Pageable pageable);

    CourseResponse getCourse(Long id);

    CourseResponse createCourse(CourseRequest request);

    CourseResponse updateCourse(Long id, CourseRequest request);

    CourseResponse updateStatus(Long id, Course.CourseStatus status);

    void deleteCourse(Long id);

    List<CourseResponse> searchCourses(String keyword, int limit);

    List<CourseResponse> searchCoursesNotInSpecialization(Long specId, String keyword, int limit);

    List<CourseResponse> searchCoursesNotInSubSpecialization(Long subSpecId, String keyword, int limit);

    // Import methods
    List<CourseImportDTO> previewImportCourses(MultipartFile file);

    Map<String, Object> saveImportedCourses(List<CourseImportDTO> dtos);

    byte[] exportCourses(String status);

    byte[] getImportTemplate();
}
