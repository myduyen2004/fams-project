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

        // Batch fetch existing classNames (for import optimization)
        @Query("SELECT LOWER(cs.className) FROM ClassSection cs WHERE LOWER(cs.className) IN :classNames")
        java.util.Set<String> findExistingClassNames(@Param("classNames") java.util.Collection<String> classNames);

        // Batch fetch class sections by classNames with details
        @Query("SELECT cs FROM ClassSection cs " +
                        "JOIN FETCH cs.course c " +
                        "JOIN FETCH cs.semester s " +
                        "LEFT JOIN FETCH cs.lecturer l " +
                        "WHERE cs.className IN :classNames")
        java.util.List<ClassSection> findByClassNameInWithDetails(
                        @Param("classNames") java.util.Collection<String> classNames);

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

        // ==================== QUERIES FOR GA TIMETABLE GENERATION ====================

        /**
         * Find all class sections for a semester that need scheduling
         * (UPCOMING or ONGOING status, with lecturer assigned)
         */
        @Query("SELECT cs FROM ClassSection cs " +
                        "JOIN FETCH cs.course c " +
                        "JOIN FETCH cs.semester s " +
                        "LEFT JOIN FETCH cs.lecturer l " +
                        "WHERE s.code = :semesterCode " +
                        "AND cs.status IN ('UPCOMING', 'ONGOING') " +
                        "AND cs.lecturer IS NOT NULL")
        java.util.List<ClassSection> findSchedulableClassSections(@Param("semesterCode") String semesterCode);

        /**
         * Count schedulable class sections for a semester
         */
        @Query("SELECT COUNT(cs) FROM ClassSection cs " +
                        "WHERE cs.semester.code = :semesterCode " +
                        "AND cs.status IN ('UPCOMING', 'ONGOING') " +
                        "AND cs.lecturer IS NOT NULL")
        long countSchedulableClassSections(@Param("semesterCode") String semesterCode);

        /**
         * Find class sections by lecturer
         */
        @Query("SELECT cs FROM ClassSection cs " +
                        "JOIN FETCH cs.course c " +
                        "JOIN FETCH cs.semester s " +
                        "WHERE cs.lecturer.id = :lecturerId " +
                        "AND s.code = :semesterCode")
        java.util.List<ClassSection> findByLecturerIdAndSemesterCode(
                        @Param("lecturerId") Long lecturerId,
                        @Param("semesterCode") String semesterCode);

        /**
         * Get all unique lecturer IDs for a semester
         */
        @Query("SELECT DISTINCT cs.lecturer.id FROM ClassSection cs " +
                        "WHERE cs.semester.code = :semesterCode " +
                        "AND cs.lecturer IS NOT NULL")
        java.util.List<Long> findDistinctLecturerIdsBySemesterCode(@Param("semesterCode") String semesterCode);
}
