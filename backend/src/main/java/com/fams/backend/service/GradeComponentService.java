package com.fams.backend.service;

import com.fams.backend.dto.request.GradeComponentRequest;
import com.fams.backend.dto.response.GradeComponentResponse;
import com.fams.backend.entity.Course;
import com.fams.backend.entity.GradeComponent;
import com.fams.backend.exception.NotFoundException;
import com.fams.backend.repository.CourseRepository;
import com.fams.backend.repository.GradeComponentRepository;
import com.fams.backend.repository.StudentGradeRepository;
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
    private final StudentGradeRepository studentGradeRepository;

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

        // Block deletion if student grades already exist for this component
        if (studentGradeRepository.existsByGradeComponentId(id)) {
            throw new IllegalArgumentException(
                    "Không thể xóa thành phần điểm này vì đã có điểm của sinh viên được ghi nhận.");
        }

        // If this is FINAL_EXAM, also check and delete linked RESIT
        if (component.getType() == GradeComponent.GradeType.FINAL_EXAM) {
            gradeComponentRepository.findByReferenceComponentId(id).ifPresent(resit -> {
                // Also block if the linked RESIT has student grades
                if (studentGradeRepository.existsByGradeComponentId(resit.getId())) {
                    throw new IllegalArgumentException(
                            "Không thể xóa Final Exam vì đã có điểm thi lại (Resit) của sinh viên được ghi nhận.");
                }
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
                .isResit(original.getIsResit())
                .referenceComponent(original.getReferenceComponent())
                .course(original.getCourse())
                .build();

        GradeComponent saved = gradeComponentRepository.save(duplicate);
        log.info("Duplicated grade component {} to {}", id, saved.getId());
        return GradeComponentResponse.fromEntity(saved);
    }

    /**
     * @deprecated toggleRequired has been removed as isRequired field no longer
     *             exists
     */
    @Transactional
    @Deprecated
    public GradeComponentResponse toggleRequired(Long id) {
        throw new UnsupportedOperationException("isRequired field has been removed from GradeComponent");
    }

    private void validateCourseExists(Long courseId) {
        if (!courseRepository.existsById(courseId)) {
            throw new NotFoundException("Course not found with id: " + courseId);
        }
    }

    /**
     * Import grade components for all courses from Excel
     * Expected format: courseCode, componentName, type
     * (PROGRESS_TEST/MID_TERM/FINAL_EXAM/PRACTICAL_EXAM), weight, description,
     * isRequired
     */
    @Transactional
    public Map<String, Object> importGradeComponents(List<Map<String, Object>> rows) {
        int created = 0;
        int updated = 0;
        int failed = 0;
        List<String> errors = new java.util.ArrayList<>();

        for (int i = 0; i < rows.size(); i++) {
            Map<String, Object> row = rows.get(i);
            int rowNum = i + 2; // Excel row number (header is row 1)
            try {
                String courseCode = getString(row, "courseCode");
                String name = getString(row, "name");
                String typeStr = getString(row, "type");
                Double weight = getDouble(row, "weight");

                if (courseCode == null || name == null || typeStr == null || weight == null) {
                    errors.add("Row " + rowNum + ": Missing required fields (courseCode, name, type, weight)");
                    failed++;
                    continue;
                }

                Course course = courseRepository.findByCode(courseCode)
                        .orElse(null);
                if (course == null) {
                    errors.add("Row " + rowNum + ": Course not found: " + courseCode);
                    failed++;
                    continue;
                }

                GradeComponent.GradeType type;
                try {
                    type = GradeComponent.GradeType.valueOf(typeStr.toUpperCase().replace(" ", "_"));
                } catch (IllegalArgumentException e) {
                    errors.add("Row " + rowNum + ": Invalid type: " + typeStr);
                    failed++;
                    continue;
                }

                // Block RESIT import
                if (type == GradeComponent.GradeType.RESIT) {
                    errors.add("Row " + rowNum + ": Cannot import RESIT directly. It's auto-created with FINAL_EXAM.");
                    failed++;
                    continue;
                }

                // Check if component exists
                var existing = gradeComponentRepository.findByCourseIdAndNameAndType(course.getId(), name, type);
                if (existing.isPresent()) {
                    // Update existing
                    GradeComponent component = existing.get();
                    component.setWeight(weight);
                    String desc = getString(row, "description");
                    if (desc != null)
                        component.setDescription(desc);
                    gradeComponentRepository.save(component);

                    // If FINAL_EXAM, also update linked RESIT
                    if (type == GradeComponent.GradeType.FINAL_EXAM) {
                        gradeComponentRepository.findByReferenceComponentId(component.getId()).ifPresent(resit -> {
                            resit.setWeight(weight);
                            gradeComponentRepository.save(resit);
                        });
                    }
                    updated++;
                } else {
                    // Check duplicate FINAL_EXAM
                    if (type == GradeComponent.GradeType.FINAL_EXAM) {
                        if (gradeComponentRepository.existsByCourseIdAndType(course.getId(),
                                GradeComponent.GradeType.FINAL_EXAM)) {
                            errors.add("Row " + rowNum + ": Course " + courseCode + " already has a FINAL_EXAM");
                            failed++;
                            continue;
                        }
                    }

                    GradeComponent component = GradeComponent.builder()
                            .name(name)
                            .description(getString(row, "description"))
                            .type(type)
                            .weight(weight)
                            .isResit(false)
                            .course(course)
                            .build();
                    GradeComponent saved = gradeComponentRepository.save(component);

                    // Auto-create RESIT for FINAL_EXAM
                    if (type == GradeComponent.GradeType.FINAL_EXAM) {
                        GradeComponent resit = GradeComponent.builder()
                                .name("Resit")
                                .description("Resit for " + saved.getName())
                                .type(GradeComponent.GradeType.RESIT)
                                .weight(weight)
                                .isResit(true)
                                .referenceComponent(saved)
                                .course(course)
                                .build();
                        gradeComponentRepository.save(resit);
                    }
                    created++;
                }
            } catch (Exception e) {
                errors.add("Row " + rowNum + ": " + e.getMessage());
                failed++;
            }
        }

        log.info("Import grade components: created={}, updated={}, failed={}", created, updated, failed);
        return Map.of(
                "created", created,
                "updated", updated,
                "failed", failed,
                "errors", errors);
    }

    private String getString(Map<String, Object> row, String key) {
        Object val = row.get(key);
        return val != null ? val.toString().trim() : null;
    }

    private Double getDouble(Map<String, Object> row, String key) {
        Object val = row.get(key);
        if (val == null)
            return null;
        if (val instanceof Number)
            return ((Number) val).doubleValue();
        try {
            return Double.parseDouble(val.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

}
