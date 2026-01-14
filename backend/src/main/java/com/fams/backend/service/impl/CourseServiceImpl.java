package com.fams.backend.service.impl;

import com.fams.backend.dto.request.CourseRequest;
import com.fams.backend.dto.response.CourseResponse;
import com.fams.backend.entity.Course;
import com.fams.backend.repository.CourseRepository;
import com.fams.backend.repository.SpecializationCourseRepository;
import com.fams.backend.repository.SubSpecializationCourseRepository;
import com.fams.backend.repository.SubSpecializationRepository;
import com.fams.backend.service.CourseService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CourseServiceImpl implements CourseService {

    private final CourseRepository courseRepository;
    private final SpecializationCourseRepository specializationCourseRepository;
    private final SubSpecializationCourseRepository subSpecializationCourseRepository;
    private final SubSpecializationRepository subSpecializationRepository;

    @Override
    public Page<CourseResponse> getCourses(String keyword, Course.CourseStatus status, Pageable pageable) {
        Page<Course> courses = courseRepository.findBySearch(keyword, status, pageable);
        return courses.map(this::convertToResponse);
    }

    @Override
    public CourseResponse getCourse(Long id) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy môn học"));
        return convertToResponse(course);
    }

    @Override
    @Transactional
    public CourseResponse createCourse(CourseRequest request) {
        String code = request.getCode().toUpperCase();
        if (courseRepository.existsByCode(code)) {
            throw new IllegalArgumentException("Mã môn học đã tồn tại: " + code);
        }

        Course course = Course.builder()
                .code(code)
                .name(request.getName())
                .description(request.getDescription())
                .credits(request.getCredits())
                .numberOfSlots(request.getNumberOfSlots())
                .status(Course.CourseStatus.ACTIVE)
                .build();

        return convertToResponse(courseRepository.save(course));
    }

    @Override
    @Transactional
    public CourseResponse updateCourse(Long id, CourseRequest request) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy môn học"));
        String code = request.getCode().toUpperCase();

        // Check code uniqueness
        courseRepository.findByCode(code).ifPresent(existing -> {
            if (!existing.getId().equals(id)) {
                throw new IllegalArgumentException("Mã môn học đã tồn tại: " + code);
            }
        });

        course.setCode(code);
        course.setName(request.getName());
        course.setDescription(request.getDescription());
        course.setCredits(request.getCredits());
        course.setNumberOfSlots(request.getNumberOfSlots());

        return convertToResponse(courseRepository.save(course));
    }

    @Override
    @Transactional
    public CourseResponse updateStatus(Long id, Course.CourseStatus status) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy môn học"));
        course.setStatus(status);
        return convertToResponse(courseRepository.save(course));
    }

    @Override
    @Transactional
    public void deleteCourse(Long id) {
        if (subSpecializationCourseRepository.existsByCourseId(id)) {
            throw new IllegalArgumentException("Không thể xóa môn học đang được sử dụng trong chương trình đào tạo");
        }
        if (specializationCourseRepository.existsByCourseId(id)) {
            throw new IllegalArgumentException("Không thể xóa môn học đang được sử dụng trong chương trình đào tạo");
        }
        courseRepository.deleteById(id);
    }

    @Override
    public List<CourseResponse> searchCourses(String keyword, int limit) {
        return courseRepository.searchCourses(keyword, PageRequest.of(0, limit))
                .stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<CourseResponse> searchCoursesNotInSpecialization(Long specId, String keyword, int limit) {
        return courseRepository.searchCoursesNotInSpecialization(specId, keyword, PageRequest.of(0, limit))
                .stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<CourseResponse> searchCoursesNotInSubSpecialization(Long subSpecId, String keyword, int limit) {
        Long specId = subSpecializationRepository.findById(subSpecId)
                .map(ss -> ss.getSpecialization().getId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chuyên ngành hẹp"));
        return courseRepository
                .searchCoursesNotInSubSpecialization(subSpecId, specId, keyword, PageRequest.of(0, limit))
                .stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    private CourseResponse convertToResponse(Course course) {
        boolean canDelete = !subSpecializationCourseRepository.existsByCourseId(course.getId());
        return CourseResponse.builder()
                .id(course.getId())
                .code(course.getCode())
                .name(course.getName())
                .description(course.getDescription())
                .credits(course.getCredits())
                .numberOfSlots(course.getNumberOfSlots())
                .status(course.getStatus())
                .canDelete(canDelete)
                .build();
    }
}
