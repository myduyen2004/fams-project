package com.fams.backend.service.impl;

import com.fams.backend.dto.request.ReorderCoursesRequest;
import com.fams.backend.dto.request.SubSpecializationRequest;
import com.fams.backend.dto.response.CourseResponse;
import com.fams.backend.dto.response.SubSpecializationResponse;
import com.fams.backend.entity.Course;
import com.fams.backend.entity.Specialization;
import com.fams.backend.entity.SubSpecialization;
import com.fams.backend.entity.SubSpecializationCourse;
import com.fams.backend.repository.CourseRepository;
import com.fams.backend.repository.SpecializationCourseRepository;
import com.fams.backend.repository.SpecializationRepository;
import com.fams.backend.repository.StudentProfileRepository;
import com.fams.backend.repository.SubSpecializationCourseRepository;
import com.fams.backend.repository.SubSpecializationRepository;
import com.fams.backend.service.SubSpecializationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class SubSpecializationServiceImpl implements SubSpecializationService {

    private final SubSpecializationRepository subSpecializationRepository;
    private final SubSpecializationCourseRepository subSpecializationCourseRepository;
    private final SpecializationRepository specializationRepository;
    private final SpecializationCourseRepository specializationCourseRepository;
    private final CourseRepository courseRepository;
    private final StudentProfileRepository studentProfileRepository;

    @Override
    public List<SubSpecializationResponse> getSubSpecializationsBySpecialization(Long specializationId) {
        return subSpecializationRepository.findBySpecializationId(specializationId)
                .stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public Page<SubSpecializationResponse> getSubSpecializationsBySpecialization(Long specializationId, String keyword,
            SubSpecialization.SubSpecializationStatus status, Pageable pageable) {
        Page<SubSpecialization> subSpecs = subSpecializationRepository.findBySpecializationIdAndSearch(
                specializationId, keyword, status, pageable);
        return subSpecs.map(this::convertToResponse);
    }

    @Override
    public SubSpecializationResponse getSubSpecialization(Long id) {
        SubSpecialization subSpec = subSpecializationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chuyên ngành hẹp"));
        return convertToResponseWithCourses(subSpec);
    }

    @Override
    @Transactional
    public SubSpecializationResponse createSubSpecialization(SubSpecializationRequest request) {
        if (subSpecializationRepository.existsByCode(request.getCode())) {
            throw new IllegalArgumentException("Mã chuyên ngành hẹp đã tồn tại: " + request.getCode());
        }

        Specialization specialization = specializationRepository.findById(request.getSpecializationId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chuyên ngành"));

        SubSpecialization subSpec = SubSpecialization.builder()
                .code(request.getCode())
                .name(request.getName())
                .description(request.getDescription())
                .specialization(specialization)
                .status(SubSpecialization.SubSpecializationStatus.ACTIVE)
                .build();

        return convertToResponse(subSpecializationRepository.save(subSpec));
    }

    @Override
    @Transactional
    public SubSpecializationResponse updateSubSpecialization(Long id, SubSpecializationRequest request) {
        SubSpecialization subSpec = subSpecializationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chuyên ngành hẹp"));

        subSpecializationRepository.findByCode(request.getCode()).ifPresent(existing -> {
            if (!existing.getId().equals(id)) {
                throw new IllegalArgumentException("Mã chuyên ngành hẹp đã tồn tại: " + request.getCode());
            }
        });

        subSpec.setCode(request.getCode());
        subSpec.setName(request.getName());
        subSpec.setDescription(request.getDescription());

        return convertToResponse(subSpecializationRepository.save(subSpec));
    }

    @Override
    @Transactional
    public SubSpecializationResponse updateStatus(Long id, SubSpecialization.SubSpecializationStatus status) {
        SubSpecialization subSpec = subSpecializationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chuyên ngành hẹp"));
        subSpec.setStatus(status);
        return convertToResponse(subSpecializationRepository.save(subSpec));
    }

    @Override
    @Transactional
    public void deleteSubSpecialization(Long id) {
        if (studentProfileRepository.existsBySubSpecializationId(id)) {
            throw new IllegalArgumentException("Không thể xóa chuyên ngành hẹp đã có sinh viên theo học");
        }
        subSpecializationRepository.deleteById(id);
    }

    @Override
    public List<CourseResponse> getCourses(Long subSpecId) {
        List<SubSpecializationCourse> courses = subSpecializationCourseRepository
                .findBySubSpecializationIdOrderByOrderIndexAsc(subSpecId);
        return courses.stream()
                .map(this::convertCourseToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public CourseResponse addCourse(Long subSpecId, Long courseId, Integer semester) {
        log.info("Request to add course {} to sub-specialization {} with semester {}", courseId, subSpecId, semester);
        try {
            SubSpecialization subSpec = subSpecializationRepository.findById(subSpecId)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chuyên ngành hẹp"));
            Course course = courseRepository.findById(courseId)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy môn học"));

            if (subSpecializationCourseRepository.existsBySubSpecializationIdAndCourseId(subSpecId, courseId)) {
                log.warn("Course {} already exists in sub-specialization {}", courseId, subSpecId);
                throw new IllegalArgumentException("Môn học đã tồn tại trong chuyên ngành hẹp");
            }

            // Check if course already exists in parent specialization
            Long specId = subSpec.getSpecialization().getId();
            if (specializationCourseRepository.existsBySpecializationIdAndCourseId(specId, courseId)) {
                log.warn("Course {} already exists in parent specialization {}", courseId, specId);
                throw new IllegalArgumentException(
                        "Môn học đã tồn tại trong chuyên ngành cha, không thể thêm vào chuyên ngành hẹp");
            }

            Integer maxOrder = subSpecializationCourseRepository.findMaxOrderIndexBySubSpecializationId(subSpecId);
            int nextOrder = (maxOrder != null) ? maxOrder + 1 : 0;

            Integer actualSemester = (semester != null) ? semester : 1;

            SubSpecializationCourse ssc = SubSpecializationCourse.builder()
                    .subSpecialization(subSpec)
                    .course(course)
                    .orderIndex(nextOrder)
                    .semester(actualSemester)
                    .build();

            subSpecializationCourseRepository.save(ssc);
            log.info("Successfully added course {} to sub-specialization {}", courseId, subSpecId);
            return convertCourseToResponse(ssc);
        } catch (Exception e) {
            log.error("Error adding course to sub-specialization: ", e);
            throw e;
        }
    }

    @Override
    @Transactional
    public void removeCourse(Long subSpecId, Long courseId) {
        subSpecializationCourseRepository.deleteBySubSpecializationIdAndCourseId(subSpecId, courseId);
    }

    @Override
    @Transactional
    public void reorderCourses(Long subSpecId, ReorderCoursesRequest request) {
        List<Long> courseIds = request.getCourseIds();
        for (int i = 0; i < courseIds.size(); i++) {
            SubSpecializationCourse ssc = subSpecializationCourseRepository
                    .findBySubSpecializationIdAndCourseId(subSpecId, courseIds.get(i))
                    .orElseThrow(() -> new IllegalArgumentException("Môn học không tồn tại trong chuyên ngành hẹp"));
            ssc.setOrderIndex(i);
            subSpecializationCourseRepository.save(ssc);
        }
    }

    private SubSpecializationResponse convertToResponse(SubSpecialization subSpec) {
        Integer totalCredits = subSpecializationCourseRepository.sumCreditsBySubSpecializationId(subSpec.getId());
        long courseCount = subSpecializationCourseRepository.countBySubSpecializationId(subSpec.getId());
        boolean hasStudents = studentProfileRepository.existsBySubSpecializationId(subSpec.getId());

        return SubSpecializationResponse.builder()
                .id(subSpec.getId())
                .code(subSpec.getCode())
                .name(subSpec.getName())
                .description(subSpec.getDescription())
                .status(subSpec.getStatus())
                .specializationId(subSpec.getSpecialization().getId())
                .totalCredits(totalCredits != null ? totalCredits : 0)
                .courseCount((int) courseCount)
                .canDelete(!hasStudents)
                .build();
    }

    private SubSpecializationResponse convertToResponseWithCourses(SubSpecialization subSpec) {
        SubSpecializationResponse response = convertToResponse(subSpec);
        response.setCourses(getCourses(subSpec.getId()));
        return response;
    }

    private CourseResponse convertCourseToResponse(SubSpecializationCourse ssc) {
        Course course = ssc.getCourse();
        return CourseResponse.builder()
                .id(course.getId())
                .code(course.getCode())
                .name(course.getName())
                .description(course.getDescription())
                .credits(course.getCredits())
                .numberOfSlots(course.getNumberOfSlots())
                .fixedSemester(course.getFixedSemester())
                .semester(ssc.getSemester())
                .status(course.getStatus())
                .orderIndex(ssc.getOrderIndex())
                .canDelete(true)
                .build();
    }
}
