package com.fams.backend.repository;

import com.fams.backend.entity.Assignment;
import com.fams.backend.entity.AssignmentSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AssignmentSubmissionRepository extends JpaRepository<AssignmentSubmission, Long> {

    Optional<AssignmentSubmission> findByAssignment_IdAndStudent_Id(Long assignmentId, Long studentId);

    List<AssignmentSubmission> findByAssignment_Id(Long assignmentId);

    @Query("""
            SELECT sub
            FROM AssignmentSubmission sub
            JOIN sub.assignment assignment
            JOIN assignment.classSection classSection
            JOIN classSection.course course
            WHERE course.id = :courseId
              AND sub.status = com.fams.backend.entity.AssignmentSubmission$SubmissionStatus.SUBMITTED
            """)
    List<AssignmentSubmission> findSubmittedByCourseId(@Param("courseId") Long courseId);

    List<AssignmentSubmission> findByStudent_Id(Long studentId);

    long countByAssignment_Id(Long assignmentId);

    void deleteAllByAssignment(Assignment assignment);
}
