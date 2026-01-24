package com.fams.backend.controller;

import com.fams.backend.dto.timetable.TimetableDTO;
import com.fams.backend.entity.TimetableSlot;
import com.fams.backend.entity.StudentAttendance;
import com.fams.backend.repository.StudentAttendanceRepository;
import com.fams.backend.repository.TimetableSlotRepository;
import com.fams.backend.service.timetable.TimetableGenerationService;
import com.fams.backend.service.timetable.ga.model.GAConfig;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletResponse; // Import Response for streaming file

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
    private final ExcelExportService excelExportService;
    private final UserRepository userRepository;
    private final SemesterRepository semesterRepository;

    // ==================== GENERATION APIs ====================

    @PostMapping("/generate")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACADEMIC_STAFF')")
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

        // Wait for result (or use async approach with job tracking)
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
    @PreAuthorize("hasAnyRole('ADMIN', 'ACADEMIC_STAFF')")
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
                        "message", "Timetable generation started",
                        "status", "RUNNING"));
    }

    @GetMapping("/generate/status/{jobId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACADEMIC_STAFF')")
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
    @PreAuthorize("hasAnyRole('ADMIN', 'ACADEMIC_STAFF')")
    @Operation(summary = "Cancel running job")
    public ResponseEntity<Map<String, Object>> cancelJob(@PathVariable String jobId) {
        boolean cancelled = generationService.cancelJob(jobId);

        return ResponseEntity.ok(Map.of(
                "jobId", jobId,
                "cancelled", cancelled,
                "message", cancelled ? "Job cancelled" : "Job not found or already completed"));
    }

    // ==================== QUERY APIs ====================

    @GetMapping("/semester/{semesterCode}")
    @Operation(summary = "Get timetable by semester")
    public ResponseEntity<List<TimetableDTO.TimetableSlotDTO>> getTimetableBySemester(
            @PathVariable String semesterCode) {

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

    @GetMapping("/semester/{semesterCode}/exists")
    @Operation(summary = "Check if timetable exists for semester", description = "Returns whether the semester has any timetable slots")
    public ResponseEntity<Map<String, Object>> checkTimetableExists(@PathVariable String semesterCode) {
        long count = timetableSlotRepository.countBySemesterCode(semesterCode);
        return ResponseEntity.ok(Map.of(
                "exists", count > 0,
                "count", count));
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

    @GetMapping("/student/{studentId}")
    @Operation(summary = "Get timetable for a student")
    public ResponseEntity<TimetableDTO.WeeklyTimetableDTO> getStudentTimetable(
            @PathVariable Long studentId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        try {
            LocalDate targetDate = date != null ? date : LocalDate.now();
            LocalDate weekStart = targetDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            LocalDate weekEnd = weekStart.plusDays(6);

            log.info("Fetching timetable for student {} from {} to {}", studentId, weekStart, weekEnd);

            List<TimetableSlot> slots = timetableSlotRepository.findByStudentIdAndDateBetween(
                    studentId, weekStart, weekEnd);

            log.info("Found {} slots for student {}", slots.size(), studentId);

            TimetableDTO.WeeklyTimetableDTO response = buildWeeklyTimetable(weekStart, weekEnd, slots);

            // Enrich with attendance data
            if (!slots.isEmpty()) {
                List<Long> slotIds = slots.stream().map(TimetableSlot::getId).toList();
                List<StudentAttendance> attendances = studentAttendanceRepository.findByStudentIdAndSlotIds(studentId,
                        slotIds);
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

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error fetching timetable for student " + studentId, e);
            throw e; // Let Spring handle the 500 but now it's logged
        }
    }

    @GetMapping("/export/student/{studentId}")
    @Operation(summary = "Export student timetable to Excel")
    public void exportStudentTimetable(
            @PathVariable Long studentId,
            @RequestParam(required = true) String semesterCode,
            HttpServletResponse response) throws Exception {

        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        // Find semester by code or assume active? Better to pass semesterCode from
        // frontend
        Semester semester = semesterRepository.findByCode(semesterCode)
                .orElseThrow(() -> new RuntimeException("Semester not found"));

        // 1. Fetch ALL slots for this student in this semester context
        // Using Repository method that filters by DATE RANGE of the semester
        List<TimetableSlot> slots = timetableSlotRepository.findByStudentIdAndDateBetween(
                studentId, semester.getStartDate(), semester.getEndDate());

        // 2. Map to DTOs
        List<TimetableDTO.TimetableSlotDTO> slotDTOs = slots.stream()
                .map(this::convertToDTO)
                .sorted(Comparator.comparing(TimetableDTO.TimetableSlotDTO::getDate)
                        .thenComparing(TimetableDTO.TimetableSlotDTO::getSlotNumber))
                .collect(Collectors.toList());

        // 3. Enrich with Attendance
        if (!slotDTOs.isEmpty()) {
            List<Long> slotIds = slots.stream().map(TimetableSlot::getId).toList();
            List<StudentAttendance> attendances = studentAttendanceRepository.findByStudentIdAndSlotIds(studentId,
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
        String headerValue = "attachment; filename=schedule_" + student.getUsername() + "_" + student.getId() + "_"
                + semester.getName().replaceAll(" ", "_") + ".xlsx";
        response.setHeader(headerKey, headerValue);

        // 5. Generate Excel
        excelExportService.exportStudentScheduleToExcel(response, slotDTOs, student.getFullName(), semester.getName());
    }

    @GetMapping("/lecturer/{lecturerId}")
    @Operation(summary = "Get timetable for a lecturer")
    public ResponseEntity<TimetableDTO.WeeklyTimetableDTO> getLecturerTimetable(
            @PathVariable Long lecturerId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        LocalDate targetDate = date != null ? date : LocalDate.now();
        LocalDate weekStart = targetDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate weekEnd = weekStart.plusDays(6);

        List<TimetableSlot> slots = timetableSlotRepository.findByLecturerIdAndDateBetween(
                lecturerId, weekStart, weekEnd);

        return ResponseEntity.ok(buildWeeklyTimetable(weekStart, weekEnd, slots));
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
    @PreAuthorize("hasAnyRole('ADMIN', 'ACADEMIC_STAFF')")
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
                .className(cs != null ? cs.getClassName() : null)
                .courseCode(course != null ? course.getCode() : null)
                .courseName(course != null ? course.getName() : null)
                .lecturerName(lecturer != null ? lecturer.getFullName() : null)
                .roomCode(room != null ? room.getCode() : null)
                .roomName(room != null ? room.getName() : null)
                .date(slot.getDate())
                .dayOfWeek(slot.getDayOfWeek())
                .slotNumber(slot.getSlotNumber())
                .startTime(slotType != null ? slotType.getStartTime() : null)
                .endTime(slotType != null ? slotType.getEndTime() : null)
                .status(slot.getStatus() != null ? slot.getStatus().name() : null)
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
