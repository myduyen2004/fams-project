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

        // Find request with all associations needed for approval processing
        @Query("SELECT sr FROM ScheduleRequest sr " +
                        "LEFT JOIN FETCH sr.originalSlot os " +
                        "LEFT JOIN FETCH os.slotType " +
                        "LEFT JOIN FETCH sr.classSection " +
                        "LEFT JOIN FETCH sr.requestedRoom " +
                        "WHERE sr.id = :id")
        java.util.Optional<ScheduleRequest> findByIdWithSlots(@Param("id") Long id);

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
