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

        @GetMapping("/classes/{className}/slots")
        public ResponseEntity<java.util.List<com.fams.backend.dto.response.ClassSlotResponse>> getSlotsForClass(
                        @PathVariable String className,
                        @AuthenticationPrincipal UserDetails userDetails) {
                User lecturer = userRepository.findByUsername(userDetails.getUsername())
                                .orElseThrow(() -> new RuntimeException("Logged in user not found"));
                return ResponseEntity.ok(scheduleRequestService.getSlotsForClass(className, lecturer.getId()));
        }

        private final com.fams.backend.repository.SemesterRepository semesterRepository;
        private final com.fams.backend.repository.ClassSectionRepository classSectionRepository;

        @GetMapping("/classes")
        public ResponseEntity<java.util.List<String>> getClasses(
                        @AuthenticationPrincipal UserDetails userDetails) {
                User lecturer = userRepository.findByUsername(userDetails.getUsername())
                                .orElseThrow(() -> new RuntimeException("Logged in user not found"));

                // 1. Find active semester (assumes only 1 active at a time, or takes the latest
                // start date)
                java.util.List<com.fams.backend.entity.Semester> activeSemesters = semesterRepository
                                .findActiveSemesters();
                if (activeSemesters.isEmpty()) {
                        // Fallback: try upcoming if no active
                        activeSemesters = semesterRepository.findUpcomingSemesters();
                        if (activeSemesters.isEmpty()) {
                                return ResponseEntity.ok(java.util.Collections.emptyList());
                        }
                }
                com.fams.backend.entity.Semester currentSemester = activeSemesters.get(0);

                // 2. Find classes for lecturer in this semester
                java.util.List<com.fams.backend.entity.ClassSection> classes = classSectionRepository
                                .findByLecturerIdAndSemesterCode(lecturer.getId(), currentSemester.getCode());

                // 3. Map to class names
                java.util.List<String> classNames = classes.stream()
                                .map(com.fams.backend.entity.ClassSection::getClassName)
                                .collect(java.util.stream.Collectors.toList());

                return ResponseEntity.ok(classNames);
        }

        private final com.fams.backend.repository.TimetableSlotRepository timetableSlotRepository;
        private final com.fams.backend.repository.ScheduleRequestRepository scheduleRequestRepository;

        @GetMapping("/check-conflicts")
        public ResponseEntity<java.util.Map<String, Object>> checkConflicts(
                        @RequestParam String className,
                        @RequestParam String date,
                        @RequestParam Integer slotNumber,
                        @RequestParam Long originalSlotId,
                        @AuthenticationPrincipal UserDetails userDetails) {

                User lecturer = userRepository.findByUsername(userDetails.getUsername())
                                .orElseThrow(() -> new RuntimeException("Logged in user not found"));

                java.time.LocalDate targetDate = java.time.LocalDate.parse(date);
                java.util.Map<String, Object> result = new java.util.HashMap<>();
                java.util.List<java.util.Map<String, Object>> conflicts = new java.util.ArrayList<>();

                // 1. Check Lecturer Conflict
                boolean lecturerBusy = timetableSlotRepository.existsByLecturerIdAndDateAndSlotNumberExcludingSlot(
                                lecturer.getId(), targetDate, slotNumber,
                                com.fams.backend.entity.TimetableSlot.TimetableSlotStatus.CANCELLED,
                                originalSlotId);
                if (lecturerBusy) {
                        java.util.Map<String, Object> conflict = new java.util.HashMap<>();
                        conflict.put("type", "LECTURER");
                        conflict.put("message", "Bạn đã có lịch dạy lớp khác vào khung giờ này.");
                        conflicts.add(conflict);
                }

                // 2. Check Pending Request Conflict
                boolean pendingConflict = scheduleRequestRepository
                                .existsPendingRequestForDateAndSlot(targetDate, slotNumber);
                if (pendingConflict) {
                        java.util.Map<String, Object> conflict = new java.util.HashMap<>();
                        conflict.put("type", "PENDING_REQUEST");
                        conflict.put("message", "Đã có yêu cầu thay đổi lịch đang chờ duyệt cho khung giờ này.");
                        conflicts.add(conflict);
                }

                // 3. Check Student Conflict
                long studentConflictCount = timetableSlotRepository.countStudentConflicts(
                                className, targetDate, slotNumber, originalSlotId);
                if (studentConflictCount > 0) {
                        java.util.Map<String, Object> conflict = new java.util.HashMap<>();
                        conflict.put("type", "STUDENT");
                        conflict.put("message", "Có " + studentConflictCount
                                        + " sinh viên trong lớp bị trùng lịch học vào khung giờ này.");
                        conflict.put("count", studentConflictCount);
                        conflicts.add(conflict);
                }

                result.put("conflicts", conflicts);
                result.put("hasConflict", !conflicts.isEmpty());
                return ResponseEntity.ok(result);
        }

}
