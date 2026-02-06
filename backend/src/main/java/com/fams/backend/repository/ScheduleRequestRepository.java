package com.fams.backend.repository;

import com.fams.backend.entity.ScheduleRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface ScheduleRequestRepository
                extends JpaRepository<ScheduleRequest, Long>, JpaSpecificationExecutor<ScheduleRequest> {
        long countByStatus(ScheduleRequest.RequestStatus status);

        org.springframework.data.domain.Page<ScheduleRequest> findByRequesterId(Long requesterId,
                        org.springframework.data.domain.Pageable pageable);

        // Check if there's already a PENDING request for the same room/date/slot
        boolean existsByRequestedRoomIdAndRequestedDateAndRequestedSlotNumberAndStatus(
                        Long roomId,
                        java.time.LocalDate date,
                        Integer slotNumber,
                        ScheduleRequest.RequestStatus status);

        // Check if there's a pending request for a specific date and slot (any room)
        @org.springframework.data.jpa.repository.Query("SELECT CASE WHEN COUNT(sr) > 0 THEN true ELSE false END " +
                        "FROM ScheduleRequest sr " +
                        "WHERE sr.requestedDate = :date " +
                        "AND sr.requestedSlotNumber = :slotNumber " +
                        "AND sr.status = 'PENDING'")
        boolean existsPendingRequestForDateAndSlot(
                        @org.springframework.data.repository.query.Param("date") java.time.LocalDate date,
                        @org.springframework.data.repository.query.Param("slotNumber") Integer slotNumber);
}
