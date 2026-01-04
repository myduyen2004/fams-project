package com.fams.backend.repository;

import com.fams.backend.entity.AcademicRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AcademicRequestRepository extends JpaRepository<AcademicRequest, Long> {
    List<AcademicRequest> findTop5ByOrderByCreatedAtDesc();

    long countByStatus(String status);
}
