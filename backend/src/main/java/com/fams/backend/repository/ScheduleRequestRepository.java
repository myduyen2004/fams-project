package com.fams.backend.repository;

import com.fams.backend.entity.ScheduleRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

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

        // Find room IDs that have PENDING or APPROVED schedule requests for a given
        // date and slot
        @Query("SELECT DISTINCT sr.requestedRoom.id FROM ScheduleRequest sr " +
                        "WHERE sr.requestedDate = :date " +
                        "AND sr.requestedSlotNumber = :slotNumber " +
                        "AND sr.status IN :statuses " +
                        "AND sr.requestedRoom IS NOT NULL")
        List<Long> findBusyRoomIdsByDateAndSlotAndStatuses(
                        @Param("date") LocalDate date,
                        @Param("slotNumber") Integer slotNumber,
                        @Param("statuses") List<ScheduleRequest.RequestStatus> statuses);
}
