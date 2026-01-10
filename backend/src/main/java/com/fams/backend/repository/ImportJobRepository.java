package com.fams.backend.repository;

import com.fams.backend.entity.ImportJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ImportJobRepository extends JpaRepository<ImportJob, Long> {

    Optional<ImportJob> findByJobId(String jobId);

    List<ImportJob> findByCreatedByOrderByCreatedAtDesc(String createdBy);

    List<ImportJob> findByStatusOrderByCreatedAtDesc(ImportJob.JobStatus status);
}
