package com.fams.backend.repository;

import com.fams.backend.entity.StudentGrade;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentGradeRepository extends JpaRepository<StudentGrade, Long> {

        /**
         * Find all grades for a specific enrollment
         */
        List<StudentGrade> findByEnrollmentId(Long enrollmentId);

        /**
         * Find all grades for a specific grade component
         */
        List<StudentGrade> findByGradeComponentId(Long gradeComponentId);

        /**
         * Find all grades for a list of enrollments
         */
        List<StudentGrade> findByEnrollmentIdIn(java.util.Collection<Long> enrollmentIds);

        /**
         * Find grade by enrollment and grade component
         */
        Optional<StudentGrade> findByEnrollmentIdAndGradeComponentId(Long enrollmentId, Long gradeComponentId);

        /**
         * Find all grades for a class section
         */
        @Query("SELECT sg FROM StudentGrade sg " +
                        "JOIN sg.enrollment e " +
                        "WHERE e.classSection.className = :className " +
                        "ORDER BY e.student.fullName, sg.gradeComponent.name")
        List<StudentGrade> findByClassName(@Param("className") String className);

        /**
         * Find all grades for a student in a class
         */
        @Query("SELECT sg FROM StudentGrade sg " +
                        "JOIN sg.enrollment e " +
                        "WHERE e.classSection.className = :className " +
                        "AND e.student.code = :studentCode " +
                        "ORDER BY sg.gradeComponent.name")
        List<StudentGrade> findByClassNameAndStudentCode(
                        @Param("className") String className,
                        @Param("studentCode") String studentCode);

        /**
         * Check if grade exists for enrollment and component
         */
        boolean existsByEnrollmentIdAndGradeComponentId(Long enrollmentId, Long gradeComponentId);

        /**
         * Check if any grade exists for a given grade component
         */
        boolean existsByGradeComponentId(Long gradeComponentId);

        /**
         * Delete all grades for an enrollment
         */
        void deleteByEnrollmentId(Long enrollmentId);

        /**
         * Find all grades for a course in a semester (across all class sections)
         */
        @Query("SELECT sg FROM StudentGrade sg " +
                        "JOIN sg.enrollment e " +
                        "JOIN e.classSection cs " +
                        "WHERE cs.course.code = :courseCode " +
                        "AND cs.semester.code = :semesterCode " +
                        "ORDER BY e.studentCode, sg.gradeComponent.name")
        List<StudentGrade> findByCourseAndSemester(
                        @Param("courseCode") String courseCode,
                        @Param("semesterCode") String semesterCode);

        /**
         * Find grades by course, semester and specific grade types
         */
        @Query("SELECT sg FROM StudentGrade sg " +
                        "JOIN sg.enrollment e " +
                        "JOIN e.classSection cs " +
                        "WHERE cs.course.code = :courseCode " +
                        "AND cs.semester.code = :semesterCode " +
                        "AND sg.gradeComponent.type IN :types " +
                        "ORDER BY e.studentCode, sg.gradeComponent.name")
        List<StudentGrade> findByCourseAndSemesterAndTypes(
                        @Param("courseCode") String courseCode,
                        @Param("semesterCode") String semesterCode,
                        @Param("types") List<com.fams.backend.entity.GradeComponent.GradeType> types);
}
