package com.fams.backend.controller;

import com.fams.backend.dto.response.ScheduleRequestResponse;
import com.fams.backend.entity.ScheduleRequest;
import com.fams.backend.entity.User;
import com.fams.backend.service.ScheduleRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import lombok.extern.slf4j.Slf4j;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/academic-staff/schedule-requests")
@RequiredArgsConstructor
@CrossOrigin(origins = "*", exposedHeaders = { "Content-Disposition" })
@PreAuthorize("hasRole('ACADEMIC_STAFF')")
@Slf4j
public class ScheduleRequestController {

        private final ScheduleRequestService scheduleRequestService;
        private final com.fams.backend.repository.UserRepository userRepository;

        @GetMapping
        public ResponseEntity<Page<ScheduleRequestResponse>> getRequests(
                        @RequestParam(required = false) String search,
                        @RequestParam(required = false) String role,
                        @RequestParam(required = false) String reason,
                        @RequestParam(required = false) ScheduleRequest.RequestStatus status,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "10") int size,
                        @RequestParam(defaultValue = "createdAt,desc") String sort) {
                String[] sortParts = sort.split(",");
                Sort sortObj = Sort.by(Sort.Direction.fromString(sortParts[1]), sortParts[0]);
                return ResponseEntity.ok(scheduleRequestService.getRequests(
                                search, role, reason, status, startDate, endDate, PageRequest.of(page, size, sortObj)));
        }

        @GetMapping("/stats")
        public ResponseEntity<Map<String, Long>> getStats() {
                return ResponseEntity.ok(scheduleRequestService.getRequestStats());
        }

        @GetMapping("/{id}")
        public ResponseEntity<ScheduleRequestResponse> getRequest(@PathVariable Long id) {
                return ResponseEntity.ok(scheduleRequestService.getRequestById(id));
        }

        @PutMapping("/{id}/status")
        public ResponseEntity<ScheduleRequestResponse> updateStatus(
                        @PathVariable Long id,
                        @RequestBody Map<String, String> body,
                        @AuthenticationPrincipal UserDetails userDetails) {
                ScheduleRequest.RequestStatus status = ScheduleRequest.RequestStatus.valueOf(body.get("status"));
                String note = body.get("note");

                User approver = userRepository.findByUsername(userDetails.getUsername())
                                .orElseThrow(() -> new RuntimeException("Logged in user not found"));

                return ResponseEntity
                                .ok(scheduleRequestService.updateRequestStatus(id, status, note, approver.getId()));
        }

        @GetMapping("/export")
        public ResponseEntity<byte[]> exportRequests(
                        @RequestParam(required = false) String search,
                        @RequestParam(required = false) String role,
                        @RequestParam(required = false) String reason,
                        @RequestParam(required = false) ScheduleRequest.RequestStatus status,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
                log.info("Received export request: search={}, role={}, status={}", search, role, status);
                byte[] data = scheduleRequestService.exportRequests(search, role, reason, status, startDate, endDate);
                log.info("Export data generated, size: {}", data != null ? data.length : 0);
                return ResponseEntity.ok()
                                .header("Content-Disposition", "attachment; filename=\"schedule_requests.xlsx\"")
                                .header("Content-Type",
                                                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                                .body(data);
        }
}
