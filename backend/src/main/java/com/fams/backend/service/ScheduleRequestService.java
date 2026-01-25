package com.fams.backend.service;

import com.fams.backend.dto.response.ScheduleRequestResponse;
import com.fams.backend.entity.ScheduleRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.Map;

public interface ScheduleRequestService {
        Page<ScheduleRequestResponse> getRequests(
                        String search,
                        String role,
                        String reason,
                        ScheduleRequest.RequestStatus status,
                        LocalDate startDate,
                        LocalDate endDate,
                        Pageable pageable);

        ScheduleRequestResponse updateRequestStatus(Long id, ScheduleRequest.RequestStatus status, String note,
                        Long approverId);

        Map<String, Long> getRequestStats();

        ScheduleRequestResponse getRequestById(Long id);

        byte[] exportRequests(String search, String role, String reason, ScheduleRequest.RequestStatus status,
                        LocalDate startDate, LocalDate endDate);
}
