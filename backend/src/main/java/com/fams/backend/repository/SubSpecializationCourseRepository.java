package com.fams.backend.repository;

import com.fams.backend.entity.SubSpecializationCourse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SubSpecializationCourseRepository extends JpaRepository<SubSpecializationCourse, Long> {

    List<SubSpecializationCourse> findBySubSpecializationIdOrderByOrderIndexAsc(Long subSpecializationId);

    Optional<SubSpecializationCourse> findBySubSpecializationIdAndCourseId(Long subSpecializationId, Long courseId);

    boolean existsBySubSpecializationIdAndCourseId(Long subSpecializationId, Long courseId);

    @Modifying
    @Query("DELETE FROM SubSpecializationCourse ssc WHERE ssc.subSpecialization.id = :subSpecId AND ssc.course.id = :courseId")
    void deleteBySubSpecializationIdAndCourseId(@Param("subSpecId") Long subSpecId, @Param("courseId") Long courseId);

    @Query("SELECT COALESCE(MAX(ssc.orderIndex), 0) FROM SubSpecializationCourse ssc WHERE ssc.subSpecialization.id = :subSpecId")
    Integer findMaxOrderIndexBySubSpecializationId(@Param("subSpecId") Long subSpecId);

    long countBySubSpecializationId(Long subSpecializationId);

    @Query("SELECT SUM(ssc.course.credits) FROM SubSpecializationCourse ssc WHERE ssc.subSpecialization.id = :subSpecId")
    Integer sumCreditsBySubSpecializationId(@Param("subSpecId") Long subSpecId);

    boolean existsByCourseId(Long courseId);

    @Query("SELECT COUNT(ssc) > 0 FROM SubSpecializationCourse ssc WHERE ssc.subSpecialization.specialization.id = :specId AND ssc.course.id = :courseId")
    boolean existsBySpecializationIdAndCourseId(@Param("specId") Long specId, @Param("courseId") Long courseId);
}
