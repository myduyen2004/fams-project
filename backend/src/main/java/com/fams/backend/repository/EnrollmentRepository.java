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
                        "LEFT JOIN FETCH s.studentProfile sp " +
                        "LEFT JOIN FETCH sp.major m " +
                        "LEFT JOIN FETCH sp.specialization spec " +
                        "JOIN FETCH e.classSection cs " +
                        "WHERE cs.className = :className " +
                        "ORDER BY e.studentCode ASC")
        List<Enrollment> findByClassSectionClassName(@Param("className") String className);

        // Batch fetch existing enrollment keys (className_studentCode) for import
        // optimization
        @Query("SELECT CONCAT(LOWER(e.classSection.className), '_', LOWER(e.studentCode)) FROM Enrollment e " +
                        "WHERE e.classSection.className IN :classNames")
        java.util.Set<String> findExistingEnrollmentKeys(@Param("classNames") java.util.Collection<String> classNames);

        // Count enrollments grouped by className for batch processing
        @Query("SELECT e.classSection.className, COUNT(e) FROM Enrollment e " +
                        "WHERE e.classSection.className IN :classNames GROUP BY e.classSection.className")
        List<Object[]> countByClassSectionClassNameIn(@Param("classNames") java.util.Collection<String> classNames);

        @Query("SELECT COUNT(e) FROM Enrollment e WHERE e.classSection.className = :className")
        long countByClassSectionClassName(@Param("className") String className);

        @Query("SELECT CASE WHEN COUNT(e) > 0 THEN true ELSE false END FROM Enrollment e " +
                        "WHERE LOWER(e.classSection.className) = LOWER(:className) " +
                        "AND LOWER(e.studentCode) = LOWER(:studentCode)")
        boolean existsByClassNameAndStudentCodeIgnoreCase(
                        @Param("className") String className,
                        @Param("studentCode") String studentCode);

        Optional<Enrollment> findByClassSection_ClassNameAndStudentCode(String className, String studentCode);

        Optional<Enrollment> findByClassSection_ClassNameAndStudent_Id(String className, Long studentId);

        List<Enrollment> findByStudent_Id(Long studentId);

        // ==================== QUERIES FOR GA TIMETABLE GENERATION ====================

        /**
         * Find all students enrolled in a specific class (ENROLLED status only)
         */
        @Query("SELECT e.student.id FROM Enrollment e " +
                        "WHERE e.classSection.className = :className " +
                        "AND e.status = 'ENROLLED'")
        List<Long> findEnrolledStudentIdsByClassName(@Param("className") String className);

        /**
         * Find all class names a student is enrolled in (for conflict checking)
         */
        @Query("SELECT e.classSection.className FROM Enrollment e " +
                        "WHERE e.student.id = :studentId " +
                        "AND e.status = 'ENROLLED'")
        List<String> findEnrolledClassNamesByStudentId(@Param("studentId") Long studentId);

        /**
         * Find all enrollments for a semester (for building student-class mapping)
         */
        @Query("SELECT e FROM Enrollment e " +
                        "JOIN FETCH e.student s " +
                        "JOIN FETCH e.classSection cs " +
                        "WHERE cs.semester.code = :semesterCode " +
                        "AND e.status = 'ENROLLED'")
        List<Enrollment> findAllEnrolledBySemesterCode(@Param("semesterCode") String semesterCode);

        /**
         * Get student-class pairs for bitmasking (returns studentId, className pairs)
         */
        @Query("SELECT e.student.id, e.classSection.className FROM Enrollment e " +
                        "WHERE e.classSection.semester.code = :semesterCode " +
                        "AND e.status = 'ENROLLED'")
        List<Object[]> findStudentClassPairsBySemester(@Param("semesterCode") String semesterCode);

        /**
         * Count students per class section (for capacity validation)
         */
        @Query("SELECT e.classSection.className, COUNT(e) FROM Enrollment e " +
                        "WHERE e.classSection.semester.code = :semesterCode " +
                        "AND e.status = 'ENROLLED' " +
                        "GROUP BY e.classSection.className")
        List<Object[]> countEnrollmentsPerClassBySemester(@Param("semesterCode") String semesterCode);

        /**
         * Find common students between two classes (for conflict detection)
         */
        @Query("SELECT e1.student.id FROM Enrollment e1, Enrollment e2 " +
                        "WHERE e1.classSection.className = :class1 " +
                        "AND e2.classSection.className = :class2 " +
                        "AND e1.student.id = e2.student.id " +
                        "AND e1.status = 'ENROLLED' AND e2.status = 'ENROLLED'")
        List<Long> findCommonStudentIds(
                        @Param("class1") String class1,
                        @Param("class2") String class2);

        /**
         * Check if two classes have common students (returns true if conflict exists)
         */
        @Query("SELECT CASE WHEN COUNT(*) > 0 THEN true ELSE false END " +
                        "FROM Enrollment e1, Enrollment e2 " +
                        "WHERE e1.classSection.className = :class1 " +
                        "AND e2.classSection.className = :class2 " +
                        "AND e1.student.id = e2.student.id " +
                        "AND e1.status = 'ENROLLED' AND e2.status = 'ENROLLED'")
        boolean hasCommonStudents(
                        @Param("class1") String class1,
                        @Param("class2") String class2);

        /**
         * Find all enrollments for a course in a semester (across all class sections)
         */
        @Query("SELECT e FROM Enrollment e " +
                        "JOIN FETCH e.student s " +
                        "JOIN FETCH e.classSection cs " +
                        "WHERE cs.course.code = :courseCode " +
                        "AND cs.semester.code = :semesterCode " +
                        "AND e.status = 'ENROLLED' " +
                        "ORDER BY e.studentCode ASC")
        List<Enrollment> findByCourseAndSemester(
                        @Param("courseCode") String courseCode,
                        @Param("semesterCode") String semesterCode);

        /**
         * Find all enrollments for a student
         */
        @Query("SELECT e FROM Enrollment e " +
                        "JOIN FETCH e.student s " +
                        "JOIN FETCH e.classSection cs " +
                        "JOIN FETCH cs.course c " +
                        "JOIN FETCH cs.semester sem " +
                        "WHERE s.id = :studentId " +
                        "AND e.status = 'ENROLLED' " +
                        "ORDER BY sem.startDate DESC, c.name ASC")
        List<Enrollment> findByStudentId(@Param("studentId") Long studentId);

        /**
         * Find all enrollments for a student in a specific semester
         */
        @Query("SELECT e FROM Enrollment e " +
                        "JOIN FETCH e.student s " +
                        "JOIN FETCH e.classSection cs " +
                        "JOIN FETCH cs.course c " +
                        "JOIN FETCH cs.semester sem " +
                        "WHERE s.id = :studentId " +
                        "AND sem.id = :semesterId " +
                        "AND e.status = 'ENROLLED' " +
                        "ORDER BY c.name ASC")
        List<Enrollment> findByStudentIdAndSemesterId(
                        @Param("studentId") Long studentId,
                        @Param("semesterId") Long semesterId);
}
