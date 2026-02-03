package com.fams.backend.service;

import com.fams.backend.dto.request.GradeComponentRequest;
import com.fams.backend.dto.response.GradeComponentResponse;
import com.fams.backend.entity.Course;
import com.fams.backend.entity.GradeComponent;
import com.fams.backend.exception.NotFoundException;
import com.fams.backend.repository.CourseRepository;
import com.fams.backend.repository.GradeComponentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GradeComponentService {

    private final GradeComponentRepository gradeComponentRepository;
    private final CourseRepository courseRepository;

    /**
     * Get all grade components for a course
     */
    @Transactional(readOnly = true)
    public List<GradeComponentResponse> getGradeComponentsByCourse(Long courseId) {
        validateCourseExists(courseId);
        return gradeComponentRepository.findByCourseIdOrderById(courseId)
                .stream()
                .map(GradeComponentResponse::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Get main (non-resit) grade components for a course
     */
    @Transactional(readOnly = true)
    public List<GradeComponentResponse> getMainComponents(Long courseId) {
        validateCourseExists(courseId);
        return gradeComponentRepository.findByCourseIdAndIsResitFalseOrderById(courseId)
                .stream()
                .map(GradeComponentResponse::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Get resit grade components for a course
     */
    @Transactional(readOnly = true)
    public List<GradeComponentResponse> getResitComponents(Long courseId) {
        validateCourseExists(courseId);
        return gradeComponentRepository.findByCourseIdAndIsResitTrueOrderById(courseId)
                .stream()
                .map(GradeComponentResponse::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Get total weight of main components
     */
    @Transactional(readOnly = true)
    public Double getTotalWeight(Long courseId) {
        return gradeComponentRepository.sumWeightByCourseIdAndIsResitFalse(courseId);
    }

    /**
     * Get grade configuration summary for a course
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getGradeConfigSummary(Long courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new NotFoundException("Course not found with id: " + courseId));

        List<GradeComponentResponse> mainComponents = getMainComponents(courseId);
        List<GradeComponentResponse> resitComponents = getResitComponents(courseId);
        Double totalWeight = getTotalWeight(courseId);
        if (totalWeight == null) {
            totalWeight = 0.0;
        }

        Map<String, Object> result = new java.util.HashMap<>();
        result.put("courseId", course.getId());
        result.put("courseCode", course.getCode());
        result.put("courseName", course.getName());
        result.put("mainComponents", mainComponents);
        result.put("resitComponents", resitComponents);
        result.put("totalWeight", totalWeight);
        result.put("isValidConfig", Math.abs(totalWeight - 100.0) < 0.01);
        return result;
    }

    /**
     * Create a new grade component
     * - If creating FINAL_EXAM: auto-create linked RESIT with same weight
     * - Block creating RESIT directly (must be auto-created via FINAL_EXAM)
     * - Block creating duplicate FINAL_EXAM
     */
    @Transactional
    public GradeComponentResponse createGradeComponent(Long courseId, GradeComponentRequest request) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new NotFoundException("Course not found with id: " + courseId));

        // Block direct RESIT creation
        if (request.getType() == GradeComponent.GradeType.RESIT) {
            throw new IllegalArgumentException(
                    "Cannot create RESIT directly. RESIT is auto-created when FINAL_EXAM is created.");
        }

        // Block duplicate FINAL_EXAM
        if (request.getType() == GradeComponent.GradeType.FINAL_EXAM) {
            if (gradeComponentRepository.existsByCourseIdAndType(courseId, GradeComponent.GradeType.FINAL_EXAM)) {
                throw new IllegalArgumentException(
                        "Course already has a FINAL_EXAM. Only one FINAL_EXAM allowed per course.");
            }
        }

        GradeComponent component = GradeComponent.builder()
                .name(request.getName())
                .description(request.getDescription())
                .type(request.getType())
                .weight(request.getWeight())
                .isRequired(request.getIsRequired() != null ? request.getIsRequired() : true)
                .isResit(false)
                .course(course)
                .build();

        GradeComponent saved = gradeComponentRepository.save(component);
        log.info("Created grade component: {} for course: {}", saved.getName(), courseId);

        // Auto-create RESIT when FINAL_EXAM is created
        if (request.getType() == GradeComponent.GradeType.FINAL_EXAM) {
            GradeComponent resit = GradeComponent.builder()
                    .name("Resit")
                    .description("Resit for " + saved.getName())
                    .type(GradeComponent.GradeType.RESIT)
                    .weight(request.getWeight()) // Same weight as FE
                    .isRequired(true) // Resit is always required
                    .isResit(true)
                    .referenceComponent(saved) // Link to FE
                    .course(course)
                    .build();
            gradeComponentRepository.save(resit);
            log.info("Auto-created RESIT for FINAL_EXAM: {}", saved.getId());
        }

        return GradeComponentResponse.fromEntity(saved);
    }

    /**
     * Update a grade component
     * - If updating FINAL_EXAM: also update linked RESIT's weight
     * - Block editing RESIT directly (only FE can be edited)
     */
    @Transactional
    public GradeComponentResponse updateGradeComponent(Long id, GradeComponentRequest request) {
        GradeComponent component = gradeComponentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Grade component not found with id: " + id));

        // Block direct RESIT editing
        if (component.getIsResit()) {
            throw new IllegalArgumentException(
                    "Cannot edit RESIT directly. Please edit the FINAL_EXAM instead - RESIT will update automatically.");
        }

        component.setName(request.getName());
        component.setDescription(request.getDescription());
        component.setType(request.getType());
        component.setWeight(request.getWeight());
        component.setIsRequired(request.getIsRequired() != null ? request.getIsRequired() : component.getIsRequired());

        GradeComponent saved = gradeComponentRepository.save(component);
        log.info("Updated grade component: {}", saved.getId());

        // If this is FINAL_EXAM, also update linked RESIT's weight
        if (component.getType() == GradeComponent.GradeType.FINAL_EXAM) {
            gradeComponentRepository.findByReferenceComponentId(id).ifPresent(resit -> {
                resit.setWeight(request.getWeight());
                resit.setDescription("Resit for " + saved.getName());
                gradeComponentRepository.save(resit);
                log.info("Auto-updated RESIT weight for FINAL_EXAM: {}", id);
            });
        }

        return GradeComponentResponse.fromEntity(saved);
    }

    /**
     * Delete a grade component
     * - If deleting FINAL_EXAM: also delete linked RESIT
     * - Block deleting RESIT directly (only FE can be deleted)
     */
    @Transactional
    public void deleteGradeComponent(Long id) {
        GradeComponent component = gradeComponentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Grade component not found with id: " + id));

        // Block direct RESIT deletion
        if (component.getIsResit()) {
            throw new IllegalArgumentException(
                    "Cannot delete RESIT directly. Please delete the FINAL_EXAM instead - RESIT will be deleted automatically.");
        }

        // If this is FINAL_EXAM, also delete linked RESIT
        if (component.getType() == GradeComponent.GradeType.FINAL_EXAM) {
            gradeComponentRepository.findByReferenceComponentId(id).ifPresent(resit -> {
                gradeComponentRepository.delete(resit);
                log.info("Auto-deleted RESIT for FINAL_EXAM: {}", id);
            });
        }

        gradeComponentRepository.deleteById(id);
        log.info("Deleted grade component: {}", id);
    }

    /**
     * Duplicate a grade component
     */
    @Transactional
    public GradeComponentResponse duplicateGradeComponent(Long id) {
        GradeComponent original = gradeComponentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Grade component not found with id: " + id));

        GradeComponent duplicate = GradeComponent.builder()
                .name(original.getName() + " (Copy)")
                .description(original.getDescription())
                .type(original.getType())
                .weight(original.getWeight())
                .isRequired(original.getIsRequired())
                .isResit(original.getIsResit())
                .referenceComponent(original.getReferenceComponent())
                .course(original.getCourse())
                .build();

        GradeComponent saved = gradeComponentRepository.save(duplicate);
        log.info("Duplicated grade component {} to {}", id, saved.getId());
        return GradeComponentResponse.fromEntity(saved);
    }

    /**
     * Toggle isRequired for a grade component
     */
    @Transactional
    public GradeComponentResponse toggleRequired(Long id) {
        GradeComponent component = gradeComponentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Grade component not found with id: " + id));

        component.setIsRequired(!component.getIsRequired());
        GradeComponent saved = gradeComponentRepository.save(component);
        log.info("Toggled isRequired for grade component: {} to {}", id, saved.getIsRequired());
        return GradeComponentResponse.fromEntity(saved);
    }

    private void validateCourseExists(Long courseId) {
        if (!courseRepository.existsById(courseId)) {
            throw new NotFoundException("Course not found with id: " + courseId);
        }
    }
}
