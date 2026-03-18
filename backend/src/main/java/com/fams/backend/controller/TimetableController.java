package com.fams.backend.controller;

import com.fams.backend.dto.timetable.TimetableDTO;
import com.fams.backend.entity.TimetableSlot;
import com.fams.backend.entity.StudentAttendance;
import com.fams.backend.repository.StudentAttendanceRepository;
import com.fams.backend.repository.TimetableSlotRepository;
import com.fams.backend.repository.AssignmentRepository;
import com.fams.backend.repository.AssignmentSubmissionRepository;
import com.fams.backend.entity.Assignment;
import com.fams.backend.entity.AssignmentSubmission;
import com.fams.backend.service.timetable.TimetableGenerationService;
import com.fams.backend.service.timetable.ga.model.GAConfig;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletResponse;

import com.fams.backend.service.ExcelExportService;
import com.fams.backend.repository.UserRepository;
import com.fams.backend.repository.SemesterRepository;
import com.fams.backend.entity.User;
import com.fams.backend.entity.Semester;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;

/**
 * TimetableController - REST API cho tạo và quản lý thời khóa biểu
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/timetable")
@RequiredArgsConstructor
@Tag(name = "Timetable", description = "Timetable generation and management APIs")
public class TimetableController {

        private final TimetableGenerationService generationService;
        private final TimetableSlotRepository timetableSlotRepository;
        private final StudentAttendanceRepository studentAttendanceRepository;
        private final AssignmentRepository assignmentRepository;
        private final AssignmentSubmissionRepository assignmentSubmissionRepository;
        private final ExcelExportService excelExportService;
        private final UserRepository userRepository;
        private final SemesterRepository semesterRepository;
        private final com.fams.backend.repository.ClassSectionRepository classSectionRepository;
        private final com.fams.backend.repository.SemesterConfigRepository semesterConfigRepository;
        private final com.fams.backend.service.timetable.TimetableSlotService timetableSlotService;
        private final com.fams.backend.service.AttendanceConfigService attendanceConfigService;

        // ==================== GENERATION APIs ====================

        @PostMapping("/generate")
        @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_SCHEDULE') or hasAuthority('MANAGE_SEMESTERS')")
        @Operation(summary = "Generate timetable", description = "Start GA-based timetable generation for a semester")
        public ResponseEntity<TimetableDTO.GenerateResponse> generateTimetable(
                        @RequestBody TimetableDTO.GenerateRequest request) {

                log.info("Starting timetable generation for semester: {}", request.getSemesterCode());

                // Convert config DTO to GAConfig
                GAConfig config = convertToGAConfig(request.getConfig());

                // Start async generation
                String jobId = UUID.randomUUID().toString();
                CompletableFuture<TimetableGenerationService.GenerationResult> future = generationService
                                .generateTimetable(jobId, request.getSemesterCode(), config, null);

                // Wait for result
                try {
                        TimetableGenerationService.GenerationResult result = future.get();
                        return ResponseEntity.ok(TimetableDTO.GenerateResponse.builder()
                                        .success(result.isSuccess())
                                        .jobId(result.getJobId())
                                        .message(result.getMessage())
                                        .fitness(result.getFitness())
                                        .totalGenerations(result.getTotalGenerations())
                                        .durationMs(result.getDurationMs())
                                        .totalSlots(result.getTotalSlots())
                                        .totalClasses(result.getTotalClasses())
                                        .build());
                } catch (Exception e) {
                        log.error("Error generating timetable", e);
                        return ResponseEntity.internalServerError()
                                        .body(TimetableDTO.GenerateResponse.builder()
                                                        .success(false)
                                                        .message("Error: " + e.getMessage())
                                                        .build());
                }
        }

        @PostMapping("/generate/async")
        @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_SCHEDULE') or hasAuthority('MANAGE_SEMESTERS')")
        @Operation(summary = "Start async generation", description = "Start timetable generation and return job ID immediately")
        public ResponseEntity<Map<String, String>> startAsyncGeneration(
                        @RequestBody TimetableDTO.GenerateRequest request) {

                String jobId = UUID.randomUUID().toString();
                GAConfig config = convertToGAConfig(request.getConfig());

                // Start async - don't wait, pass jobId for tracking
                generationService.generateTimetable(jobId, request.getSemesterCode(), config, null);

                return ResponseEntity.accepted()
                                .body(Map.of(
                                                "jobId", jobId,
                                                "message", "Quá trình tạo thời khóa biểu đã bắt đầu",
                                                "status", "RUNNING"));
        }

        @GetMapping("/generate/status/{jobId}")
        @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_MAJORS') or hasAuthority('MANAGE_COURSES') or hasAuthority('MANAGE_USERS') or hasAuthority('MANAGE_SEMESTERS') or hasAuthority('VIEW_SYSTEM_LOGS') or hasAuthority('MANAGE_SCHEDULE')")
        @Operation(summary = "Get generation job status")
        public ResponseEntity<TimetableDTO.JobStatusResponse> getJobStatus(@PathVariable String jobId) {
                TimetableGenerationService.GenerationJob job = generationService.getJobStatus(jobId);

                if (job == null) {
                        return ResponseEntity.notFound().build();
                }

                return ResponseEntity.ok(TimetableDTO.JobStatusResponse.builder()
                                .jobId(job.getJobId())
                                .semesterCode(job.getSemesterCode())
                                .status(job.getStatus().name())
                                .phase(job.getPhase())
                                .currentGeneration(job.getCurrentGeneration())
                                .bestFitness(job.getBestFitness())
                                .percentComplete(job.getPercentComplete())
                                .startTime(job.getStartTime())
                                .endTime(job.getEndTime())
                                .errorMessage(job.getErrorMessage())
                                .build());
        }

        @PostMapping("/generate/cancel/{jobId}")
        @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_SCHEDULE') or hasAuthority('MANAGE_SEMESTERS')")
        @Operation(summary = "Cancel running job")
        public ResponseEntity<Map<String, Object>> cancelJob(@PathVariable String jobId) {
                boolean cancelled = generationService.cancelJob(jobId);

                return ResponseEntity.ok(Map.of(
                                "jobId", jobId,
                                "cancelled", cancelled,
                                "message",
                                cancelled ? "Đã hủy tiến trình" : "Tiến trình không tồn tại hoặc đã hoàn tất"));
        }

        // ==================== QUERY APIs ====================

        @GetMapping("/semester/{semesterCode}")
        @Operation(summary = "Get timetable by semester")
        public ResponseEntity<List<TimetableDTO.TimetableSlotDTO>> getTimetableBySemester(
                        @PathVariable String semesterCode) {

                // Check visibility
                Semester semester = semesterRepository.findByCode(semesterCode)
                                .orElseThrow(() -> new RuntimeException("Semester not found"));
                com.fams.backend.entity.SemesterConfig config = semester.getConfig();
                boolean isPublished = config != null && Boolean.TRUE.equals(config.getIsPublished());

                if (!isPublished) {
                        // Allow if User has ROLE_ACADEMIC_STAFF or appropriate permissions
                        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder
                                        .getContext().getAuthentication();
                        boolean hasPermission = auth != null && auth.getAuthorities().stream()
                                        .anyMatch(a -> a.getAuthority().equals("ROLE_ACADEMIC_STAFF")
                                                        || a.getAuthority().equals("MANAGE_SEMESTERS")
                                                        || a.getAuthority().equals("MANAGE_SCHEDULE"));

                        if (!hasPermission) {
                                log.warn("Semester {} is not published. Access denied.", semesterCode);
                                return ResponseEntity.status(403).build();
                        }
                }

                List<TimetableSlot> slots = timetableSlotRepository.findBySemesterCode(semesterCode);
                List<TimetableDTO.TimetableSlotDTO> dtos = slots.stream()
                                .map(this::convertToDTO)
                                .toList();

                return ResponseEntity.ok(dtos);
        }

        @GetMapping("/semester/{semesterCode}/date/{date}")
        @Operation(summary = "Get timetable by semester and specific date", description = "Faster API that only loads slots for a specific date")
        public ResponseEntity<List<TimetableDTO.TimetableSlotDTO>> getTimetableBySemesterAndDate(
                        @PathVariable String semesterCode,
                        @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

                List<TimetableSlot> slots = timetableSlotRepository.findBySemesterCodeAndDate(semesterCode, date);
                List<TimetableDTO.TimetableSlotDTO> dtos = slots.stream()
                                .map(this::convertToDTO)
                                .toList();

                return ResponseEntity.ok(dtos);
        }

        @GetMapping("/semester/{semesterCode}/range")
        @Operation(summary = "Get timetable by semester and date range", description = "Optimized API for weekly view/export")
        public ResponseEntity<List<TimetableDTO.TimetableSlotDTO>> getTimetableBySemesterAndDateRange(
                        @PathVariable String semesterCode,
                        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
                        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

                List<TimetableSlot> slots = timetableSlotRepository.findBySemesterCodeAndDateBetween(semesterCode,
                                startDate,
                                endDate);
                List<TimetableDTO.TimetableSlotDTO> dtos = slots.stream()
                                .map(this::convertToDTO)
                                .toList();

                return ResponseEntity.ok(dtos);
        }

        @GetMapping("/semester/{semesterCode}/exists")
        @Operation(summary = "Check if timetable exists for semester", description = "Returns whether the semester has any timetable slots")
        public ResponseEntity<Map<String, Object>> checkTimetableExists(@PathVariable String semesterCode) {
                long count = timetableSlotRepository.countBySemesterCode(semesterCode);
                return ResponseEntity.ok(Map.of(
                                "exists", count > 0,
                                "count", count));
        }

        @GetMapping("/semester/{semesterCode}/unscheduled-count")
        @Operation(summary = "Count unscheduled class sections", description = "Returns the number of class sections that have not been scheduled yet")
        public ResponseEntity<Map<String, Object>> countUnscheduledClassSections(@PathVariable String semesterCode) {
                // Optimized query directly from DB instead of loading all objects
                long totalSchedulable = classSectionRepository.countSchedulableClassSections(semesterCode);
                long unscheduledCount = classSectionRepository.countUnscheduledClassSections(semesterCode);
                long scheduledCount = totalSchedulable - unscheduledCount;
                java.util.List<String> unscheduledClassNames = classSectionRepository
                                .findUnscheduledClassNames(semesterCode);

                return ResponseEntity.ok(Map.of(
                                "unscheduledCount", unscheduledCount,
                                "totalSchedulable", totalSchedulable,
                                "scheduledCount", scheduledCount,
                                "unscheduledClassNames", unscheduledClassNames));
        }

        @GetMapping("/semester/{semesterCode}/config-changed")
        @Operation(summary = "Check if semester config changed after timetable generation", description = "Returns whether the semester configuration was modified after the timetable was generated")
        public ResponseEntity<Map<String, Object>> checkConfigChangedAfterGeneration(
                        @PathVariable String semesterCode) {
                // Get semester config
                var configOpt = semesterConfigRepository.findBySemesterCode(semesterCode);
                if (configOpt.isEmpty()) {
                        return ResponseEntity.ok(Map.of(
                                        "configChanged", false,
                                        "hasTimetable", false,
                                        "message", "No semester config found"));
                }

                // Get earliest timetable slot creation time
                java.time.LocalDateTime timetableCreatedAt = timetableSlotRepository
                                .findEarliestCreatedAtBySemesterCode(semesterCode);
                if (timetableCreatedAt == null) {
                        return ResponseEntity.ok(Map.of(
                                        "configChanged", false,
                                        "hasTimetable", false,
                                        "message", "No timetable exists for this semester"));
                }

                // Compare timestamps
                var config = configOpt.get();
                java.time.LocalDateTime configUpdatedAt = config.getUpdatedAt();

                // If config was updated after the timetable was created, it means config
                // changed
                boolean configChanged = configUpdatedAt != null && configUpdatedAt.isAfter(timetableCreatedAt);

                return ResponseEntity.ok(Map.of(
                                "configChanged", configChanged,
                                "hasTimetable", true,
                                "timetableCreatedAt", timetableCreatedAt.toString(),
                                "configUpdatedAt", configUpdatedAt != null ? configUpdatedAt.toString() : "null",
                                "message", configChanged
                                                ? "Cấu hình học kỳ đã thay đổi. Vui lòng tạo thời khóa biểu mới."
                                                : "Cấu hình học kỳ đã được cập nhật"));
        }

        @GetMapping("/class/{className}")
        @Operation(summary = "Get timetable for a class")
        public ResponseEntity<List<TimetableDTO.TimetableSlotDTO>> getTimetableByClass(
                        @PathVariable String className) {

                List<TimetableSlot> slots = timetableSlotRepository.findByClassName(className);
                List<TimetableDTO.TimetableSlotDTO> dtos = slots.stream()
                                .map(this::convertToDTO)
                                .toList();

                return ResponseEntity.ok(dtos);
        }

        @RequestMapping(value = "/slot/{id}", method = { RequestMethod.PATCH, RequestMethod.PUT })
        @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_SCHEDULE')")
        @Operation(summary = "Update a timetable slot", description = "Reschedule a session to a different date, slot, or room")
        public ResponseEntity<TimetableDTO.TimetableSlotDTO> updateSlot(
                        @PathVariable Long id,
                        @RequestBody @jakarta.validation.Valid TimetableDTO.UpdateSlotRequest request) {
                log.info("Updating timetable slot {}: date={}, slot={}, room={}", id, request.getDate(),
                                request.getSlotNumber(), request.getRoomId());
                return ResponseEntity.ok(timetableSlotService.updateSlot(id, request));
        }

        @GetMapping("/availability")
        @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_SCHEDULE')")
        @Operation(summary = "Get available slots and rooms for a date")
        public ResponseEntity<TimetableDTO.AvailabilityResponse> getAvailability(
                        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                        @RequestParam String semesterCode) {
                log.info("[Controller] Get availability: date={}, semesterCode={}", date, semesterCode);
                return ResponseEntity.ok(timetableSlotService.getAvailability(date, semesterCode));
        }

        @GetMapping("/student/{studentId}")
        @Operation(summary = "Get timetable for a student")
        public ResponseEntity<Object> getStudentTimetable(
                        @PathVariable Long studentId,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

                log.info("Entering getStudentTimetable for studentId: {}, date: {}", studentId, date);

                try {
                        LocalDate targetDate = date != null ? date : LocalDate.now();
                        LocalDate weekStart = targetDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                        LocalDate weekEnd = weekStart.plusDays(6);

                        User student = userRepository.findById(studentId)
                                        .orElseThrow(() -> new RuntimeException("Không tìm thấy sinh viên"));

                        log.info("Fetching timetable for student {} (code: {}) from {} to {}", studentId,
                                        student.getCode(),
                                        weekStart, weekEnd);

                        // Check if semester is published for this date
                        List<Semester> semesters = semesterRepository.findSemestersByDate(targetDate);
                        log.info("Found {} semesters for date {}: {}", semesters.size(), targetDate,
                                        semesters.stream()
                                                        .map(s -> s.getCode() + "(published="
                                                                        + (s.getConfig() != null && Boolean.TRUE.equals(
                                                                                        s.getConfig().getIsPublished()))
                                                                        + ")")
                                                        .toList());
                        Semester semester = semesters.stream()
                                        .filter(s -> s.getConfig() != null
                                                        && Boolean.TRUE.equals(s.getConfig().getIsPublished()))
                                        .findFirst()
                                        .orElse(semesters.isEmpty() ? null : semesters.get(0));

                        if (semester != null) {
                                com.fams.backend.entity.SemesterConfig config = semester.getConfig();
                                boolean isPublished = config != null && Boolean.TRUE.equals(config.getIsPublished());
                                log.info("Checking visibility for date {}: Semester={}, Published={}", targetDate,
                                                semester.getCode(),
                                                isPublished);

                                if (!isPublished) {
                                        log.warn("Timetable for semester {} is not published yet. Access denied for student.",
                                                        semester.getCode());
                                        return ResponseEntity.status(403).body(Map.of(
                                                        "status", 403,
                                                        "error", "Forbidden",
                                                        "message", "Semester schedule is not published yet: "
                                                                        + semester.getCode()));
                                }
                        } else {
                                log.warn("No active semester found for date {}. Skipping visibility check (CAUTION).",
                                                targetDate);
                        }

                        List<TimetableSlot> slots = timetableSlotRepository.findByStudentCodeAndDateBetween(
                                        student.getCode(), weekStart, weekEnd);

                        // Fallback: If semester wasn't found by date, check the semester of the found
                        // slots
                        if (semester == null && !slots.isEmpty()) {
                                TimetableSlot firstSlot = slots.get(0);
                                if (firstSlot.getClassSection() != null
                                                && firstSlot.getClassSection().getSemester() != null) {
                                        // Fix LazyInitializationException: Get ID from proxy and fetch fresh entity
                                        Long semesterId = firstSlot.getClassSection().getSemester().getId();
                                        semester = semesterRepository.findById(semesterId).orElse(null);

                                        if (semester != null) {
                                                log.info("Fallback visibility check: Found semester {} from slots.",
                                                                semester.getCode());

                                                com.fams.backend.entity.SemesterConfig config = semester.getConfig();
                                                boolean isPublished = config != null
                                                                && Boolean.TRUE.equals(config.getIsPublished());

                                                if (!isPublished) {
                                                        log.warn("Timetable for semester {} (from slots) is not published. Access denied.",
                                                                        semester.getCode());
                                                        return ResponseEntity.status(403).body(Map.of(
                                                                        "status", 403,
                                                                        "error", "Forbidden",
                                                                        "message",
                                                                        "Semester schedule is not published yet: "
                                                                                        + semester.getCode()));
                                                }
                                        }
                                }
                        }

                        log.info("Found {} slots for student {}", slots.size(), studentId);

                        TimetableDTO.WeeklyTimetableDTO response = buildWeeklyTimetable(weekStart, weekEnd, slots);

                        // Enrich with attendance data
                        if (!slots.isEmpty()) {
                                List<Long> slotIds = slots.stream().map(TimetableSlot::getId).toList();
                                List<StudentAttendance> attendances = studentAttendanceRepository
                                                .findByStudentIdAndSlotIds(studentId, slotIds);
                                Map<Long, String> attendanceMap = attendances.stream()
                                                .collect(Collectors.toMap(
                                                                a -> a.getSession().getTimetableSlot().getId(),
                                                                a -> a.getStatus().name(),
                                                                (existing, replacement) -> existing));

                                response.getDays().forEach(day -> day.getSlots().forEach(slot -> {
                                        if (attendanceMap.containsKey(slot.getId())) {
                                                slot.setAttendanceStatus(attendanceMap.get(slot.getId()));
                                        }
                                }));
                        }

                        // Enrich with assignment + submission data for each slot
                        if (!slots.isEmpty()) {
                                List<Long> slotIds = slots.stream().map(TimetableSlot::getId).toList();
                                List<Assignment> assignments = assignmentRepository.findByTimetableSlotIdIn(slotIds);
                                Map<Long, Assignment> assignmentBySlotId = assignments.stream()
                                                .collect(Collectors.toMap(
                                                                a -> a.getTimetableSlot().getId(),
                                                                a -> a,
                                                                (existing, replacement) -> existing));

                                // Get student's submissions for these assignments
                                Map<Long, String> submissionStatusMap = new HashMap<>();
                                if (!assignments.isEmpty()) {
                                        List<AssignmentSubmission> submissions = assignmentSubmissionRepository
                                                        .findByStudent_Id(studentId);
                                        for (AssignmentSubmission sub : submissions) {
                                                submissionStatusMap.put(sub.getAssignment().getId(),
                                                                sub.getStatus().name());
                                        }
                                }

                                response.getDays().forEach(day -> day.getSlots().forEach(slotDto -> {
                                        Assignment assignment = assignmentBySlotId.get(slotDto.getId());
                                        if (assignment != null) {
                                                slotDto.setAssignmentId(assignment.getId());
                                                slotDto.setAssignmentTitle(assignment.getTitle());
                                                slotDto.setAssignmentDescription(assignment.getDescription());
                                                slotDto.setAssignmentStatus(assignment.getStatus().name());
                                                slotDto.setAssignmentReferenceUrl(assignment.getReferenceUrl());
                                                slotDto.setAssignmentReferenceName(assignment.getReferenceName());
                                                slotDto.setAssignmentDueDate(assignment.getDueDate());
                                                String subStatus = submissionStatusMap.get(assignment.getId());
                                                slotDto.setSubmissionStatus(
                                                                subStatus != null ? subStatus : "NOT_SUBMITTED");
                                        }
                                }));
                        }

                        return ResponseEntity.ok(response);
                } catch (Exception e) {
                        log.error("CRITICAL ERROR in getStudentTimetable for student " + studentId, e);
                        throw e;
                }
        }

        @GetMapping("/student/{studentId}/semester")
        @Operation(summary = "Get all timetable slots for a student in a semester (for calendar export)")
        public ResponseEntity<List<TimetableDTO.TimetableSlotDTO>> getSemesterSlotsForStudent(
                        @PathVariable Long studentId,
                        @RequestParam String semesterCode) {

                User student = userRepository.findById(studentId)
                                .orElseThrow(() -> new RuntimeException("Student not found"));

                Semester semester = semesterRepository.findByCode(semesterCode)
                                .orElseThrow(() -> new RuntimeException("Semester not found"));

                // Check if semester is published
                com.fams.backend.entity.SemesterConfig config = semester.getConfig();
                if (config != null && !Boolean.TRUE.equals(config.getIsPublished())) {
                        return ResponseEntity.status(403).build();
                }

                // Fetch ALL slots for this student in this semester
                List<TimetableSlot> slots = timetableSlotRepository.findByStudentCodeAndDateBetween(
                                student.getCode(), semester.getStartDate(), semester.getEndDate());

                // Map to DTOs and sort
                List<TimetableDTO.TimetableSlotDTO> slotDTOs = slots.stream()
                                .map(this::convertToDTO)
                                .sorted(Comparator.comparing(TimetableDTO.TimetableSlotDTO::getDate)
                                                .thenComparing(TimetableDTO.TimetableSlotDTO::getSlotNumber))
                                .collect(Collectors.toList());

                log.info("Returning {} slots for student {} in semester {}", slotDTOs.size(), studentId, semesterCode);
                return ResponseEntity.ok(slotDTOs);
        }

        @GetMapping("/lecturer/{lecturerId}/semester")
        @Operation(summary = "Get all timetable slots for a lecturer in a semester (for calendar export)")
        public ResponseEntity<List<TimetableDTO.TimetableSlotDTO>> getSemesterSlotsForLecturer(
                        @PathVariable Long lecturerId,
                        @RequestParam String semesterCode) {

                User lecturer = userRepository.findById(lecturerId)
                                .orElseThrow(() -> new RuntimeException("Lecturer not found"));

                Semester semester = semesterRepository.findByCode(semesterCode)
                                .orElseThrow(() -> new RuntimeException("Semester not found"));

                // Lecturers can always see their schedule
                List<TimetableSlot> slots = timetableSlotRepository.findByLecturerIdAndDateBetween(
                                lecturerId, semester.getStartDate(), semester.getEndDate());

                List<TimetableDTO.TimetableSlotDTO> slotDTOs = slots.stream()
                                .map(this::convertToDTO)
                                .sorted(Comparator.comparing(TimetableDTO.TimetableSlotDTO::getDate)
                                                .thenComparing(TimetableDTO.TimetableSlotDTO::getSlotNumber))
                                .collect(Collectors.toList());

                log.info("Returning {} slots for lecturer {} in semester {}", slotDTOs.size(), lecturerId,
                                semesterCode);
                return ResponseEntity.ok(slotDTOs);
        }

        @GetMapping("/lecturer/{lecturerId}/semester-dates")
        @Operation(summary = "Get distinct teaching dates for a lecturer in a semester")
        public ResponseEntity<List<LocalDate>> getLecturerTeachingDates(
                        @PathVariable Long lecturerId,
                        @RequestParam String semesterCode) {
                return ResponseEntity.ok(timetableSlotService.getLecturerTeachingDates(lecturerId, semesterCode));
        }

        @GetMapping("/lecturer/{lecturerId}/assignments-search")
        @Operation(summary = "Search assignments with filters and pagination")
        public ResponseEntity<Page<TimetableDTO.TimetableSlotDTO>> searchAssignments(
                        @PathVariable Long lecturerId,
                        @RequestParam String semesterCode,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                        @RequestParam(required = false) String className,
                        @RequestParam(required = false) String status,
                        @PageableDefault(size = 20, sort = "date", direction = Sort.Direction.ASC) Pageable pageable) {

                // If "all" status is passed, treat as null (no filter)
                String filterStatus = (status != null && status.equalsIgnoreCase("all")) ? null : status;

                return ResponseEntity.ok(timetableSlotService.searchAssignments(
                                lecturerId, semesterCode, date, className, filterStatus, pageable));
        }

        @GetMapping("/export/student/{studentId}")
        @Operation(summary = "Export student timetable to Excel")
        public void exportStudentTimetable(
                        @PathVariable Long studentId,
                        @RequestParam(required = true) String semesterCode,
                        HttpServletResponse response) throws Exception {

                User student = userRepository.findById(studentId)
                                .orElseThrow(() -> new RuntimeException("Student not found"));

                // Find semester by code
                Semester semester = semesterRepository.findByCode(semesterCode)
                                .orElseThrow(() -> new RuntimeException("Semester not found"));

                // Check if semester is published
                com.fams.backend.entity.SemesterConfig config = semester.getConfig();
                if (config != null && !Boolean.TRUE.equals(config.getIsPublished())) {
                        response.sendError(HttpServletResponse.SC_FORBIDDEN, "Thời khóa biểu chưa được công khai");
                        return;
                }

                // 1. Fetch ALL slots for this student in this semester
                List<TimetableSlot> slots = timetableSlotRepository.findByStudentCodeAndDateBetween(
                                student.getCode(), semester.getStartDate(), semester.getEndDate());

                // 2. Map to DTOs
                List<TimetableDTO.TimetableSlotDTO> slotDTOs = slots.stream()
                                .map(this::convertToDTO)
                                .sorted(Comparator.comparing(TimetableDTO.TimetableSlotDTO::getDate)
                                                .thenComparing(TimetableDTO.TimetableSlotDTO::getSlotNumber))
                                .collect(Collectors.toList());

                // 3. Enrich with Attendance
                if (!slotDTOs.isEmpty()) {
                        List<Long> slotIds = slots.stream().map(TimetableSlot::getId).toList();
                        List<StudentAttendance> attendances = studentAttendanceRepository.findByStudentIdAndSlotIds(
                                        studentId,
                                        slotIds);
                        Map<Long, String> attendanceMap = attendances.stream()
                                        .collect(Collectors.toMap(
                                                        a -> a.getSession().getTimetableSlot().getId(),
                                                        a -> a.getStatus().name(),
                                                        (existing, replacement) -> existing));

                        slotDTOs.forEach(dto -> {
                                if (attendanceMap.containsKey(dto.getId())) {
                                        dto.setAttendanceStatus(attendanceMap.get(dto.getId()));
                                }
                        });
                }

                // 4. Set Response Headers
                response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                String headerKey = "Content-Disposition";
                String headerValue = "attachment; filename=schedule_" + student.getUsername() + "_" + student.getId()
                                + "_"
                                + semester.getName().replaceAll(" ", "_") + ".xlsx";
                response.setHeader(headerKey, headerValue);

                // 5. Generate Excel
                excelExportService.exportStudentScheduleToExcel(response, slotDTOs, student.getFullName(),
                                semester.getName());
        }

        @GetMapping("/lecturer/{lecturerId}")
        @Operation(summary = "Get timetable for a lecturer")
        public ResponseEntity<Object> getLecturerTimetable(
                        @PathVariable Long lecturerId,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

                LocalDate targetDate = date != null ? date : LocalDate.now();
                LocalDate weekStart = targetDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                LocalDate weekEnd = weekStart.plusDays(6);

                // Check if semester is published for this date (same logic as student
                // timetable)
                List<Semester> semesters = semesterRepository.findSemestersByDate(targetDate);
                Semester semester = semesters.stream()
                                .filter(s -> s.getConfig() != null
                                                && Boolean.TRUE.equals(s.getConfig().getIsPublished()))
                                .findFirst()
                                .orElse(semesters.isEmpty() ? null : semesters.get(0));

                if (semester != null) {
                        com.fams.backend.entity.SemesterConfig config = semester.getConfig();
                        boolean isPublished = config != null && Boolean.TRUE.equals(config.getIsPublished());

                        if (!isPublished) {
                                // Allow if User has ROLE_ACADEMIC_STAFF
                                org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder
                                                .getContext().getAuthentication();
                                boolean hasPermission = auth != null && auth.getAuthorities().stream()
                                                .anyMatch(a -> a.getAuthority().equals("ROLE_ACADEMIC_STAFF")
                                                                || a.getAuthority().equals("MANAGE_SEMESTERS")
                                                                || a.getAuthority().equals("MANAGE_SCHEDULE"));

                                if (!hasPermission) {
                                        log.warn("Semester {} is not published. Access denied for lecturer {}.",
                                                        semester.getCode(), lecturerId);
                                        return ResponseEntity.status(403).body(Map.of(
                                                        "status", 403,
                                                        "error", "Forbidden",
                                                        "message", "Lịch dạy chưa được công bố: "
                                                                        + semester.getCode()));
                                }
                        }
                }

                List<TimetableSlot> slots = timetableSlotRepository.findByLecturerIdAndDateBetween(
                                lecturerId, weekStart, weekEnd);

                // Fallback: check semester from slots if not found by date
                if (semester == null && !slots.isEmpty()) {
                        TimetableSlot firstSlot = slots.get(0);
                        if (firstSlot.getClassSection() != null
                                        && firstSlot.getClassSection().getSemester() != null) {
                                Long semesterId = firstSlot.getClassSection().getSemester().getId();
                                semester = semesterRepository.findById(semesterId).orElse(null);

                                if (semester != null) {
                                        com.fams.backend.entity.SemesterConfig config = semester.getConfig();
                                        boolean isPublished = config != null
                                                        && Boolean.TRUE.equals(config.getIsPublished());

                                        if (!isPublished) {
                                                org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder
                                                                .getContext().getAuthentication();
                                                boolean hasPermission = auth != null && auth.getAuthorities().stream()
                                                                .anyMatch(a -> a.getAuthority().equals("ROLE_ACADEMIC_STAFF")
                                                                                || a.getAuthority().equals(
                                                                                                "ROLE_ACADEMIC_STAFF")
                                                                                || a.getAuthority().equals("MANAGE_SEMESTERS")
                                                                                || a.getAuthority().equals("MANAGE_SCHEDULE"));

                                                if (!hasPermission) {
                                                        log.warn("Semester {} (from slots) is not published. Access denied for lecturer {}.",
                                                                        semester.getCode(), lecturerId);
                                                        return ResponseEntity.status(403).body(Map.of(
                                                                        "status", 403,
                                                                        "error", "Forbidden",
                                                                        "message", "Lịch dạy chưa được công bố: "
                                                                                        + semester.getCode()));
                                                }
                                        }
                                }
                        }
                }

                TimetableDTO.WeeklyTimetableDTO weeklyDto = buildWeeklyTimetable(weekStart, weekEnd, slots);

                // Enrich with assignment data (optimized: single batch query)
                if (!slots.isEmpty()) {
                        List<Long> slotIds = slots.stream().map(TimetableSlot::getId).toList();
                        List<Assignment> assignments = assignmentRepository.findByTimetableSlotIdIn(slotIds);
                        Map<Long, Assignment> assignmentBySlotId = assignments.stream()
                                        .collect(Collectors.toMap(
                                                        a -> a.getTimetableSlot().getId(),
                                                        a -> a,
                                                        (existing, replacement) -> existing // keep first if duplicates
                                        ));

                        weeklyDto.getDays().forEach(day -> day.getSlots().forEach(slotDto -> {
                                Assignment assignment = assignmentBySlotId.get(slotDto.getId());
                                if (assignment != null) {
                                        slotDto.setAssignmentId(assignment.getId());
                                        slotDto.setAssignmentTitle(assignment.getTitle());
                                        slotDto.setAssignmentDescription(assignment.getDescription());
                                        slotDto.setAssignmentStatus(assignment.getStatus().name());
                                        slotDto.setAssignmentReferenceUrl(assignment.getReferenceUrl());
                                        slotDto.setAssignmentReferenceName(assignment.getReferenceName());
                                        slotDto.setAssignmentDueDate(assignment.getDueDate());
                                }
                        }));
                }

                return ResponseEntity.ok(weeklyDto);
        }

        @GetMapping("/export/lecturer/{lecturerId}")
        @Operation(summary = "Export lecturer timetable to Excel")
        public void exportLecturerTimetable(
                        @PathVariable Long lecturerId,
                        @RequestParam(required = false) String semesterCode,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                        HttpServletResponse response) throws Exception {

                User lecturer = userRepository.findById(lecturerId)
                                .orElseThrow(() -> new RuntimeException("Lecturer not found"));

                Semester semester = null;
                if (semesterCode != null && !semesterCode.isEmpty()) {
                        semester = semesterRepository.findByCode(semesterCode).orElse(null);
                }

                if (semester == null && date != null) {
                        List<Semester> semesters = semesterRepository.findSemestersByDate(date);
                        semester = semesters.isEmpty() ? null : semesters.get(0);
                }

                if (semester == null) {
                        // Fallback to current date semester if still null
                        List<Semester> semesters = semesterRepository.findSemestersByDate(LocalDate.now());
                        semester = semesters.isEmpty() ? null : semesters.get(0);

                        if (semester == null) {
                                throw new RuntimeException("Không tìm thấy học kỳ cho tiêu chí này");
                        }
                }

                // 1. Fetch ALL slots for this lecturer in this semester
                List<TimetableSlot> slots = timetableSlotRepository.findByLecturerIdAndDateBetween(
                                lecturer.getId(), semester.getStartDate(), semester.getEndDate());

                // 2. Map to DTOs
                List<TimetableDTO.TimetableSlotDTO> slotDTOs = slots.stream()
                                .map(this::convertToDTO)
                                .sorted(Comparator.comparing(TimetableDTO.TimetableSlotDTO::getDate)
                                                .thenComparing(TimetableDTO.TimetableSlotDTO::getSlotNumber))
                                .collect(Collectors.toList());

                // 3. Set Response Headers
                response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                String headerKey = "Content-Disposition";
                String headerValue = "attachment; filename=schedule_lecturer_" + lecturer.getUsername() + "_"
                                + semester.getCode() + ".xlsx";
                response.setHeader(headerKey, headerValue);

                // 4. Generate Excel
                excelExportService.exportLecturerScheduleToExcel(response, slotDTOs, lecturer.getFullName(),
                                semester.getName());
        }

        @GetMapping("/room/{roomId}")
        @Operation(summary = "Get timetable for a room")
        public ResponseEntity<TimetableDTO.WeeklyTimetableDTO> getRoomTimetable(
                        @PathVariable Long roomId,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

                LocalDate targetDate = date != null ? date : LocalDate.now();
                LocalDate weekStart = targetDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                LocalDate weekEnd = weekStart.plusDays(6);

                List<TimetableSlot> slots = timetableSlotRepository.findByRoomIdAndDateBetween(
                                roomId, weekStart, weekEnd);

                return ResponseEntity.ok(buildWeeklyTimetable(weekStart, weekEnd, slots));
        }

        @GetMapping("/stats/{semesterCode}")
        @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_SCHEDULE') or hasAuthority('MANAGE_SEMESTERS')")
        @Operation(summary = "Get timetable statistics")
        public ResponseEntity<TimetableDTO.TimetableStatsDTO> getTimetableStats(
                        @PathVariable String semesterCode) {

                long totalSlots = timetableSlotRepository.countBySemesterCode(semesterCode);
                List<TimetableSlot> slots = timetableSlotRepository.findBySemesterCode(semesterCode);

                // Count Saturday slots
                long saturdaySlots = slots.stream()
                                .filter(s -> s.getDayOfWeek() == 7) // Saturday
                                .count();

                // Calculate unique classes
                long totalClasses = slots.stream()
                                .map(s -> s.getClassSection().getClassName())
                                .distinct()
                                .count();

                return ResponseEntity.ok(TimetableDTO.TimetableStatsDTO.builder()
                                .semesterCode(semesterCode)
                                .totalSlots((int) totalSlots)
                                .totalClasses((int) totalClasses)
                                .saturdaySlots((int) saturdaySlots)
                                .build());
        }

        // ==================== HELPER METHODS ====================

        private GAConfig convertToGAConfig(TimetableDTO.GAConfigDTO dto) {
                if (dto == null) {
                        return GAConfig.defaultConfig();
                }

                GAConfig.GAConfigBuilder builder = GAConfig.builder();

                if (dto.getPopulationSize() != null)
                        builder.populationSize(dto.getPopulationSize());
                if (dto.getEliteCount() != null)
                        builder.eliteCount(dto.getEliteCount());
                if (dto.getMaxGenerations() != null)
                        builder.maxGenerations(dto.getMaxGenerations());
                if (dto.getStagnationLimit() != null)
                        builder.stagnationLimit(dto.getStagnationLimit());
                if (dto.getTargetFitness() != null)
                        builder.targetFitness(dto.getTargetFitness());
                if (dto.getCrossoverRate() != null)
                        builder.crossoverRate(dto.getCrossoverRate());
                if (dto.getMutationRate() != null)
                        builder.mutationRate(dto.getMutationRate());
                if (dto.getMinMutationRate() != null)
                        builder.minMutationRate(dto.getMinMutationRate());
                if (dto.getMaxMutationRate() != null)
                        builder.maxMutationRate(dto.getMaxMutationRate());
                if (dto.getTournamentSize() != null)
                        builder.tournamentSize(dto.getTournamentSize());
                if (dto.getSaturdayPenaltyWeight() != null)
                        builder.saturdayPenaltyWeight(dto.getSaturdayPenaltyWeight());
                if (dto.getGapPenaltyWeight() != null)
                        builder.gapPenaltyWeight(dto.getGapPenaltyWeight());
                if (dto.getOverloadPenaltyWeight() != null)
                        builder.overloadPenaltyWeight(dto.getOverloadPenaltyWeight());
                if (dto.getStudentWeeklyOverloadThreshold() != null)
                        builder.studentWeeklyOverloadThreshold(dto.getStudentWeeklyOverloadThreshold());
                if (dto.getLecturerWeeklyOverloadThreshold() != null)
                        builder.lecturerWeeklyOverloadThreshold(dto.getLecturerWeeklyOverloadThreshold());
                if (dto.getEnableLocalSearch() != null)
                        builder.enableLocalSearch(dto.getEnableLocalSearch());
                if (dto.getVerbose() != null)
                        builder.verbose(dto.getVerbose());

                if (dto.getCrossoverType() != null) {
                        try {
                                builder.crossoverType(GAConfig.CrossoverType.valueOf(dto.getCrossoverType()));
                        } catch (IllegalArgumentException ignored) {
                        }
                }

                if (dto.getSelectionType() != null) {
                        try {
                                builder.selectionType(GAConfig.SelectionType.valueOf(dto.getSelectionType()));
                        } catch (IllegalArgumentException ignored) {
                        }
                }

                return builder.build();
        }

        private TimetableDTO.TimetableSlotDTO convertToDTO(TimetableSlot slot) {
                // Defensive null checks to avoid NPE / lazy-loading issues
                var cs = slot.getClassSection();
                var course = cs != null ? cs.getCourse() : null;
                var lecturer = cs != null ? cs.getLecturer() : null;
                var room = slot.getRoom();
                var slotType = slot.getSlotType();

                return TimetableDTO.TimetableSlotDTO.builder()
                                .id(slot.getId())
                                .classSectionId(cs != null ? cs.getClassName() : null)
                                .className(cs != null ? cs.getClassName() : null)
                                .courseCode(course != null ? course.getCode() : null)
                                .courseName(course != null ? course.getName() : null)
                                .lecturerId(lecturer != null ? lecturer.getId() : null)
                                .lecturerName(lecturer != null ? lecturer.getFullName() : null)
                                .lecturerEmail(lecturer != null ? lecturer.getEmail() : null)
                                .lecturerAvatar(lecturer != null ? lecturer.getAvatar() : null)
                                .roomCode(room != null ? room.getCode() : null)
                                .roomName(room != null ? room.getName() : null)
                                .date(slot.getDate())
                                .dayOfWeek(slot.getDayOfWeek())
                                .slotNumber(slot.getSlotNumber())
                                .startTime(slotType != null ? slotType.getStartTime() : null)
                                .endTime(slotType != null ? slotType.getEndTime() : null)
                                .status(slot.getStatus() != null ? slot.getStatus().name() : null)
                                .absentThresholdMinutes(attendanceConfigService.getConfig().getAbsentThresholdMinutes())
                                .build();
        }

        private TimetableDTO.WeeklyTimetableDTO buildWeeklyTimetable(
                        LocalDate weekStart,
                        LocalDate weekEnd,
                        List<TimetableSlot> slots) {

                // Group by date
                Map<LocalDate, List<TimetableSlot>> byDate = slots.stream()
                                .collect(Collectors.groupingBy(TimetableSlot::getDate));

                List<TimetableDTO.DailyTimetableDTO> days = new ArrayList<>();

                for (LocalDate date = weekStart; !date.isAfter(weekEnd); date = date.plusDays(1)) {
                        List<TimetableSlot> daySlots = byDate.getOrDefault(date, Collections.emptyList());

                        days.add(TimetableDTO.DailyTimetableDTO.builder()
                                        .date(date)
                                        .dayOfWeek(date.getDayOfWeek().getValue())
                                        .dayName(date.getDayOfWeek().name())
                                        .slots(daySlots.stream().map(this::convertToDTO).toList())
                                        .build());
                }

                return TimetableDTO.WeeklyTimetableDTO.builder()
                                .weekStartDate(weekStart)
                                .weekEndDate(weekEnd)
                                .days(days)
                                .build();
        }
}
