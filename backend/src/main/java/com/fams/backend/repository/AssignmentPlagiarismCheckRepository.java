package com.fams.backend.repository;

import com.fams.backend.entity.AssignmentPlagiarismCheck;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AssignmentPlagiarismCheckRepository extends JpaRepository<AssignmentPlagiarismCheck, Long> {
}
