package com.fams.backend.repository;

import com.fams.backend.entity.Course;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CourseRepository extends JpaRepository<Course, Long> {

        Optional<Course> findByCode(String code);

        Optional<Course> findByName(String name);

        // Batch fetch all courses by codes (for import optimization)
        @Query("SELECT c FROM Course c WHERE c.code IN :codes")
        List<Course> findByCodeIn(@Param("codes") java.util.Collection<String> codes);

        boolean existsByCode(String code);

        boolean existsByName(String name);

        @Query("SELECT c FROM Course c WHERE " +
                        "(:keyword IS NULL OR :keyword = '' OR LOWER(c.code) LIKE LOWER(CONCAT('%', CAST(:keyword AS string), '%')) OR LOWER(c.name) LIKE LOWER(CONCAT('%', CAST(:keyword AS string), '%'))) "
                        +
                        "AND (:status IS NULL OR c.status = :status) " +
                        "ORDER BY c.code ASC")
        Page<Course> findBySearch(@Param("keyword") String keyword,
                        @Param("status") Course.CourseStatus status,
                        Pageable pageable);

        @Query("SELECT c FROM Course c WHERE " +
                        "(:keyword IS NULL OR :keyword = '' OR LOWER(c.code) LIKE LOWER(CONCAT('%', CAST(:keyword AS string), '%')) OR LOWER(c.name) LIKE LOWER(CONCAT('%', CAST(:keyword AS string), '%'))) "
                        +
                        "AND c.status = 'ACTIVE' " +
                        "ORDER BY c.code ASC")
        List<Course> searchCourses(@Param("keyword") String keyword, Pageable pageable);

        @Query("SELECT c FROM Course c WHERE c.id NOT IN " +
                        "(SELECT sc.course.id FROM SpecializationCourse sc WHERE sc.specialization.id = :specId) " +
                        "AND c.id NOT IN " +
                        "(SELECT ssc.course.id FROM SubSpecializationCourse ssc WHERE ssc.subSpecialization.specialization.id = :specId) "
                        +
                        "AND c.status = 'ACTIVE' " +
                        "AND (:keyword IS NULL OR :keyword = '' OR LOWER(c.code) LIKE LOWER(CONCAT('%', CAST(:keyword AS string), '%')) OR LOWER(c.name) LIKE LOWER(CONCAT('%', CAST(:keyword AS string), '%'))) "
                        +
                        "ORDER BY c.code ASC")
        List<Course> searchCoursesNotInSpecialization(@Param("specId") Long specId,
                        @Param("keyword") String keyword,
                        Pageable pageable);

        @Query("SELECT c FROM Course c WHERE c.id NOT IN " +
                        "(SELECT ssc.course.id FROM SubSpecializationCourse ssc WHERE ssc.subSpecialization.id = :subSpecId) "
                        +
                        "AND c.id NOT IN " +
                        "(SELECT sc.course.id FROM SpecializationCourse sc WHERE sc.specialization.id = :specId) " +
                        "AND c.status = 'ACTIVE' " +
                        "AND (:keyword IS NULL OR :keyword = '' OR LOWER(c.code) LIKE LOWER(CONCAT('%', CAST(:keyword AS string), '%')) OR LOWER(c.name) LIKE LOWER(CONCAT('%', CAST(:keyword AS string), '%'))) "
                        +
                        "ORDER BY c.code ASC")
        List<Course> searchCoursesNotInSubSpecialization(@Param("subSpecId") Long subSpecId,
                        @Param("specId") Long specId,
                        @Param("keyword") String keyword,
                        Pageable pageable);
}
