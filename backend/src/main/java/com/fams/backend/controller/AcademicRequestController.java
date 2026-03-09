package com.fams.backend.controller;

import com.fams.backend.dto.request.CreateAcademicRequestDTO;
import com.fams.backend.dto.response.AcademicRequestResponse;
import com.fams.backend.entity.AcademicRequest.AcademicRequestType;
import com.fams.backend.entity.AcademicRequest.RequestStatus;
import com.fams.backend.entity.User;
import com.fams.backend.service.AcademicRequestService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/academic-requests")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class AcademicRequestController {

        private final AcademicRequestService academicRequestService;
        private final com.fams.backend.repository.UserRepository userRepository;

        /**
         * Create a new academic request (Student only)
         */
        @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
        @PreAuthorize("hasRole('STUDENT')")
        public ResponseEntity<AcademicRequestResponse> createRequest(
                        @RequestPart("request") CreateAcademicRequestDTO request,
                        @RequestPart(value = "file", required = false) MultipartFile file,
                        @AuthenticationPrincipal UserDetails userDetails) {

                User student = userRepository.findByUsername(userDetails.getUsername())
                                .orElseThrow(() -> new RuntimeException("Student not found"));

                log.info("Creating academic request for student: {}, type: {}", student.getCode(),
                                request.getRequestType());

                return ResponseEntity.ok(academicRequestService.createRequest(request, file, student.getId()));
        }

        /**
         * Get all request types with deadline info (Student)
         */
        @GetMapping("/types")
        @PreAuthorize("hasRole('STUDENT')")
        public ResponseEntity<List<Map<String, Object>>> getRequestTypes(
                        @AuthenticationPrincipal UserDetails userDetails) {

                User student = userRepository.findByUsername(userDetails.getUsername())
                                .orElseThrow(() -> new RuntimeException("Student not found"));

                return ResponseEntity.ok(academicRequestService.getRequestTypes(student.getId()));
        }

        /**
         * Check deadline for a specific request type (Student)
         */
        @GetMapping("/check-deadline")
        @PreAuthorize("hasRole('STUDENT')")
        public ResponseEntity<Map<String, Object>> checkDeadline(
                        @RequestParam AcademicRequestType requestType,
                        @RequestParam(required = false) String classSectionId) {

                return ResponseEntity.ok(academicRequestService.checkDeadline(requestType, classSectionId));
        }

        /**
         * Get my requests (Student only)
         */
        @GetMapping("/my-requests")
        @PreAuthorize("hasRole('STUDENT')")
        public ResponseEntity<Page<AcademicRequestResponse>> getMyRequests(
                        @AuthenticationPrincipal UserDetails userDetails,
                        @RequestParam(required = false) RequestStatus status,
                        @RequestParam(required = false) AcademicRequestType requestType,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "10") int size,
                        @RequestParam(defaultValue = "createdAt,desc") String sort) {

                User student = userRepository.findByUsername(userDetails.getUsername())
                                .orElseThrow(() -> new RuntimeException("Student not found"));

                String[] sortParts = sort.split(",");
                Sort sortObj = Sort.by(Sort.Direction.fromString(sortParts[1]), sortParts[0]);

                return ResponseEntity.ok(academicRequestService.getRequestsByStudent(
                                student.getId(), status, requestType, PageRequest.of(page, size, sortObj)));
        }

        /**
         * Cancel my request (Student only)
         */
        @PutMapping("/my-requests/{id}/cancel")
        @PreAuthorize("hasRole('STUDENT')")
        public ResponseEntity<AcademicRequestResponse> cancelMyRequest(
                        @PathVariable Long id,
                        @AuthenticationPrincipal UserDetails userDetails) {

                User student = userRepository.findByUsername(userDetails.getUsername())
                                .orElseThrow(() -> new RuntimeException("Student not found"));

                return ResponseEntity.ok(academicRequestService.cancelRequest(id, student.getId()));
        }

        /**
         * Get all requests with filters (Academic Staff only)
         */
        @GetMapping
        @PreAuthorize("hasRole('ACADEMIC_STAFF')")
        public ResponseEntity<Page<AcademicRequestResponse>> getRequests(
                        @RequestParam(required = false) String search,
                        @RequestParam(required = false) RequestStatus status,
                        @RequestParam(required = false) AcademicRequestType requestType,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "10") int size,
                        @RequestParam(defaultValue = "createdAt,desc") String sort) {

                String[] sortParts = sort.split(",");
                Sort sortObj = Sort.by(Sort.Direction.fromString(sortParts[1]), sortParts[0]);

                return ResponseEntity.ok(academicRequestService.getRequests(
                                search, status, requestType, PageRequest.of(page, size, sortObj)));
        }

        /**
         * Get request statistics (Academic Staff only)
         */
        @GetMapping("/stats")
        @PreAuthorize("hasRole('ACADEMIC_STAFF')")
        public ResponseEntity<Map<String, Long>> getStats() {
                return ResponseEntity.ok(academicRequestService.getRequestStats());
        }

        /**
         * Get request by ID (Academic Staff or owner Student)
         */
        @GetMapping("/{id}")
        @PreAuthorize("hasAnyRole('ACADEMIC_STAFF', 'STUDENT')")
        public ResponseEntity<AcademicRequestResponse> getRequest(@PathVariable Long id) {
                return ResponseEntity.ok(academicRequestService.getRequestById(id));
        }

        /**
         * Update request status - approve/reject (Academic Staff only)
         */
        @PutMapping("/{id}/status")
        @PreAuthorize("hasRole('ACADEMIC_STAFF')")
        public ResponseEntity<AcademicRequestResponse> updateStatus(
                        @PathVariable Long id,
                        @RequestBody Map<String, String> body,
                        @AuthenticationPrincipal UserDetails userDetails) {

                RequestStatus status = RequestStatus.valueOf(body.get("status"));
                String note = body.get("note");

                User approver = userRepository.findByUsername(userDetails.getUsername())
                                .orElseThrow(() -> new RuntimeException("Approver not found"));

                return ResponseEntity
                                .ok(academicRequestService.updateRequestStatus(id, status, note, approver.getId()));
        }
}
