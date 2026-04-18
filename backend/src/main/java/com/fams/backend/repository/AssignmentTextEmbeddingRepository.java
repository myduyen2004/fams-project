package com.fams.backend.repository;

import com.fams.backend.entity.AssignmentTextEmbedding;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AssignmentTextEmbeddingRepository extends JpaRepository<AssignmentTextEmbedding, Long> {
    void deleteBySubmissionId(Long submissionId);

    List<AssignmentTextEmbedding> findBySubmissionId(Long submissionId);
}

