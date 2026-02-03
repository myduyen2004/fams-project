package com.fams.backend.repository;

import com.fams.backend.entity.GradeComponent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GradeComponentRepository extends JpaRepository<GradeComponent, Long> {

    /**
     * Find all grade components for a course, ordered by id
     */
    List<GradeComponent> findByCourseIdOrderById(Long courseId);

    /**
     * Find main (non-resit) grade components for a course
     */
    List<GradeComponent> findByCourseIdAndIsResitFalseOrderById(Long courseId);

    /**
     * Find resit grade components for a course
     */
    List<GradeComponent> findByCourseIdAndIsResitTrueOrderById(Long courseId);

    /**
     * Calculate total weight of main (non-resit) components for a course
     */
    @Query("SELECT COALESCE(SUM(gc.weight), 0) FROM GradeComponent gc WHERE gc.course.id = :courseId AND gc.isResit = false")
    Double sumWeightByCourseIdAndIsResitFalse(@Param("courseId") Long courseId);

    /**
     * Check if component exists for a course
     */
    boolean existsByCourseIdAndName(Long courseId, String name);

    /**
     * Count components by course
     */
    long countByCourseId(Long courseId);

    /**
     * Find component by course and type
     */
    java.util.Optional<GradeComponent> findByCourseIdAndType(Long courseId,
            GradeComponent.GradeType type);

    /**
     * Check if a component of a specific type exists for a course
     */
    boolean existsByCourseIdAndType(Long courseId, GradeComponent.GradeType type);

    /**
     * Find Resit component linked to a reference component (FE)
     */
    java.util.Optional<GradeComponent> findByReferenceComponentId(Long referenceComponentId);
}
