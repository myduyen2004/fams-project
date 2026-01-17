package com.fams.backend.repository;

import com.fams.backend.entity.ClassSection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ClassSectionRepository extends JpaRepository<ClassSection, String> {

        // Check if className exists (case-insensitive)
        @Query("SELECT CASE WHEN COUNT(cs) > 0 THEN true ELSE false END FROM ClassSection cs WHERE LOWER(cs.className) = LOWER(:className)")
        boolean existsByClassNameIgnoreCase(@Param("className") String className);

        // Find by semester code with eager fetch
        @Query("SELECT cs FROM ClassSection cs " +
                        "JOIN FETCH cs.course c " +
                        "JOIN FETCH cs.semester s " +
                        "LEFT JOIN FETCH cs.lecturer l " +
                        "WHERE s.code = :semesterCode")
        java.util.List<ClassSection> findBySemesterCode(@Param("semesterCode") String semesterCode);

        @Query("SELECT cs FROM ClassSection cs " +
                        "JOIN FETCH cs.course c " +
                        "JOIN FETCH cs.semester s " +
                        "LEFT JOIN FETCH cs.lecturer l " +
                        "WHERE s.code = :semesterCode " +
                        "AND (:search IS NULL OR :search = '' OR " +
                        "LOWER(cs.className) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
                        "LOWER(c.code) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
                        "LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%'))) " +
                        "AND (:status IS NULL OR :status = '' OR CAST(cs.status AS string) = :status) " +
                        "AND (:lecturerId IS NULL OR l.id = :lecturerId)")
        Page<ClassSection> findBySemesterCodeWithFilters(
                        @Param("semesterCode") String semesterCode,
                        @Param("search") String search,
                        @Param("status") String status,
                        @Param("lecturerId") Long lecturerId,
                        Pageable pageable);

        // Find by className with eager fetch for Semester and Course (to avoid
        // LazyInitializationException)
        @Query("SELECT cs FROM ClassSection cs " +
                        "JOIN FETCH cs.course c " +
                        "JOIN FETCH cs.semester s " +
                        "LEFT JOIN FETCH cs.lecturer l " +
                        "WHERE cs.className = :className")
        java.util.Optional<ClassSection> findByClassNameWithDetails(@Param("className") String className);
}
