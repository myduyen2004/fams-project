package com.fams.backend.repository;

import com.fams.backend.entity.Assignment;
import com.fams.backend.entity.AssignmentSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AssignmentSubmissionRepository extends JpaRepository<AssignmentSubmission, Long> {

    Optional<AssignmentSubmission> findByAssignment_IdAndStudent_Id(Long assignmentId, Long studentId);

    List<AssignmentSubmission> findByAssignment_Id(Long assignmentId);

    List<AssignmentSubmission> findByStudent_Id(Long studentId);

    long countByAssignment_Id(Long assignmentId);

    void deleteAllByAssignment(Assignment assignment);
}
