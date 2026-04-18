package com.fams.backend.repository;

import com.fams.backend.entity.AssignmentImageEmbedding;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AssignmentImageEmbeddingRepository extends JpaRepository<AssignmentImageEmbedding, Long> {
    void deleteBySubmissionId(Long submissionId);

    List<AssignmentImageEmbedding> findBySubmissionId(Long submissionId);
}

