package com.fams.backend.repository;

import com.fams.backend.entity.ScheduleRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface ScheduleRequestRepository
        extends JpaRepository<ScheduleRequest, Long>, JpaSpecificationExecutor<ScheduleRequest> {
    long countByStatus(ScheduleRequest.RequestStatus status);
}
