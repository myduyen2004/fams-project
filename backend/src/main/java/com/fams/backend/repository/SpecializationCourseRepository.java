package com.fams.backend.repository;

import com.fams.backend.entity.SpecializationCourse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SpecializationCourseRepository extends JpaRepository<SpecializationCourse, Long> {

    List<SpecializationCourse> findBySpecializationIdOrderByOrderIndexAsc(Long specializationId);

    Optional<SpecializationCourse> findBySpecializationIdAndCourseId(Long specializationId, Long courseId);

    boolean existsBySpecializationIdAndCourseId(Long specializationId, Long courseId);

    @Modifying
    @Query("DELETE FROM SpecializationCourse sc WHERE sc.specialization.id = :specId AND sc.course.id = :courseId")
    void deleteBySpecializationIdAndCourseId(@Param("specId") Long specId, @Param("courseId") Long courseId);

    @Query("SELECT COALESCE(MAX(sc.orderIndex), 0) FROM SpecializationCourse sc WHERE sc.specialization.id = :specId")
    Integer findMaxOrderIndexBySpecializationId(@Param("specId") Long specId);

    long countBySpecializationId(Long specializationId);

    @Query("SELECT SUM(sc.course.credits) FROM SpecializationCourse sc WHERE sc.specialization.id = :specId")
    Integer sumCreditsBySpecializationId(@Param("specId") Long specId);

    boolean existsByCourseId(Long courseId);
}
