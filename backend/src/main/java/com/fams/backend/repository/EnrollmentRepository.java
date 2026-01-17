package com.fams.backend.repository;

import com.fams.backend.entity.Enrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {

    @Query("SELECT e FROM Enrollment e " +
            "JOIN FETCH e.student s " +
            "JOIN FETCH e.classSection cs " +
            "WHERE cs.className = :className " +
            "ORDER BY e.studentCode ASC")
    List<Enrollment> findByClassSectionClassName(@Param("className") String className);

    @Query("SELECT COUNT(e) FROM Enrollment e WHERE e.classSection.className = :className")
    long countByClassSectionClassName(@Param("className") String className);

    @Query("SELECT CASE WHEN COUNT(e) > 0 THEN true ELSE false END FROM Enrollment e " +
            "WHERE LOWER(e.classSection.className) = LOWER(:className) " +
            "AND LOWER(e.studentCode) = LOWER(:studentCode)")
    boolean existsByClassNameAndStudentCodeIgnoreCase(
            @Param("className") String className,
            @Param("studentCode") String studentCode);

    Optional<Enrollment> findByClassSection_ClassNameAndStudentCode(String className, String studentCode);
}
