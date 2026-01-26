package com.fams.backend.controller;

import com.fams.backend.dto.response.ScheduleRequestResponse;
import com.fams.backend.entity.User;
import com.fams.backend.service.ScheduleRequestService;
import com.fams.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/lecturer")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('LECTURER')")
public class LecturerController {

        private final ScheduleRequestService scheduleRequestService;
        private final UserRepository userRepository;

        @GetMapping("/requests")
        public ResponseEntity<Page<ScheduleRequestResponse>> getMyRequests(
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "10") int size,
                        @RequestParam(defaultValue = "createdAt,desc") String sort,
                        @AuthenticationPrincipal UserDetails userDetails) {

                User lecturer = userRepository.findByUsername(userDetails.getUsername())
                                .orElseThrow(() -> new RuntimeException("Logged in user not found"));

                String[] sortParts = sort.split(",");
                Sort sortObj = Sort.by(Sort.Direction.fromString(sortParts[1]), sortParts[0]);

                return ResponseEntity.ok(scheduleRequestService.getRequestsByRequester(
                                lecturer.getId(),
                                PageRequest.of(page, size, sortObj)));
        }

        @GetMapping("/requests/{id}")
        public ResponseEntity<ScheduleRequestResponse> getRequestById(
                        @PathVariable Long id,
                        @AuthenticationPrincipal UserDetails userDetails) {

                User lecturer = userRepository.findByUsername(userDetails.getUsername())
                                .orElseThrow(() -> new RuntimeException("Logged in user not found"));

                ScheduleRequestResponse response = scheduleRequestService.getRequestById(id);
                return ResponseEntity.ok(response);
        }

        @PostMapping("/requests")
        public ResponseEntity<ScheduleRequestResponse> createRequest(
                        @RequestBody com.fams.backend.dto.request.CreateScheduleRequest request,
                        @AuthenticationPrincipal UserDetails userDetails) {

                User lecturer = userRepository.findByUsername(userDetails.getUsername())
                                .orElseThrow(() -> new RuntimeException("Logged in user not found"));

                return ResponseEntity.ok(scheduleRequestService.createRequest(request, lecturer.getId()));
        }

}
