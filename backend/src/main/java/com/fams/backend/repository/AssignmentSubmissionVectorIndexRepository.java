package com.fams.backend.repository;

import com.fams.backend.entity.AssignmentSubmissionVectorIndex;
import com.fams.backend.entity.AssignmentSubmissionVectorIndex.VectorIndexStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.Optional;

public interface AssignmentSubmissionVectorIndexRepository extends JpaRepository<AssignmentSubmissionVectorIndex, Long> {

    Optional<AssignmentSubmissionVectorIndex> findBySubmission_Id(Long submissionId);

    long countByCourseIdAndStatus(Long courseId, VectorIndexStatus status);

    long countByCourseIdAndStatusIn(Long courseId, Collection<VectorIndexStatus> statuses);

    @Query("""
            SELECT COUNT(v)
            FROM AssignmentSubmissionVectorIndex v
            WHERE v.courseId = :courseId
              AND v.submission.id <> :excludedSubmissionId
              AND v.status = com.fams.backend.entity.AssignmentSubmissionVectorIndex$VectorIndexStatus.INDEXED
            """)
    long countIndexedInCourseExcludingSubmission(
            @Param("courseId") Long courseId,
            @Param("excludedSubmissionId") Long excludedSubmissionId);
}

