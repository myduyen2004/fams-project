package com.fams.backend.controller;

import com.fams.backend.dto.request.LecturerProfileRequest;
import com.fams.backend.dto.LecturerImportDTO;
import com.fams.backend.dto.request.LecturerUpdateRequest;
import com.fams.backend.dto.request.UserRequest;
import com.fams.backend.dto.response.AcademicStaffDashboardResponse;
import com.fams.backend.dto.response.LecturerResponse;
import com.fams.backend.dto.response.UserResponse;
import com.fams.backend.entity.User;
import com.fams.backend.service.AcademicStaffDashboardService;
import com.fams.backend.service.LecturerService;
import com.fams.backend.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/academic-staff")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Academic Staff", description = "API cho cán bộ đào tạo")
public class AcademicStaffDashboardController {

    private final AcademicStaffDashboardService dashboardService;
    private final UserService userService;
    private final LecturerService lecturerService;
    private final com.fams.backend.service.StudentService studentService;
    private final com.fams.backend.repository.SystemLogRepository systemLogRepository;

    @GetMapping("/dashboard")
    @PreAuthorize("hasRole('ACADEMIC_STAFF')")
    @Operation(summary = "Lấy dữ liệu dashboard")
    public ResponseEntity<AcademicStaffDashboardResponse> getDashboardData(
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate startDate) {
        log.info("GET /api/academic-staff/dashboard | startDate={}", startDate);
        return ResponseEntity.ok(dashboardService.getDashboardData(startDate));
    }

    @GetMapping("/dashboard/weekly-attendance")
    @PreAuthorize("hasRole('ACADEMIC_STAFF')")
    @Operation(summary = "Lấy dữ liệu tỷ lệ nghỉ học theo tuần (lightweight)")
    public ResponseEntity<java.util.List<AcademicStaffDashboardResponse.WeeklyAttendanceDTO>> getWeeklyAttendance(
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate startDate) {
        log.info("GET /api/academic-staff/dashboard/weekly-attendance | startDate={}", startDate);
        return ResponseEntity.ok(dashboardService.getWeeklyAttendanceData(startDate));
    }

    @GetMapping("/dashboard/daily-attendance")
    @PreAuthorize("hasRole('ACADEMIC_STAFF')")
    @Operation(summary = "Lấy dữ liệu chuyên cần theo ngày (lightweight)")
    public ResponseEntity<AcademicStaffDashboardResponse.AttendanceStatsDTO> getDailyAttendance(
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate date) {
        log.info("GET /api/academic-staff/dashboard/daily-attendance | date={}", date);
        return ResponseEntity.ok(dashboardService.getAttendanceStatsForDate(date));
    }

    @GetMapping("/dashboard/system-logs")
    @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('VIEW_SYSTEM_LOGS')")
    @Operation(summary = "Lấy nhật ký hệ thống (phân trang)")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<org.springframework.data.domain.Page<com.fams.backend.dto.response.SystemLogResponse>> getSystemLogs(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) com.fams.backend.entity.SystemLog.LogType type,
            @RequestParam(required = false) com.fams.backend.entity.User.UserRole role,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.LocalDateTime startDate,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.LocalDateTime endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {
        log.info("GET /api/academic-staff/dashboard/system-logs | search={}, type={}, role={}, page={}, size={}", search, type, role, page, size);
        
        String searchParam = (search != null && !search.trim().isEmpty()) 
            ? "%" + search.trim().toLowerCase() + "%" 
            : null;

        org.springframework.data.domain.Page<com.fams.backend.entity.SystemLog> logs = systemLogRepository.findAllByFilters(
                searchParam, 
                type, 
                role, 
                startDate, 
                endDate,
                org.springframework.data.domain.PageRequest.of(page, size, org.springframework.data.domain.Sort.by("createdAt").descending())
        );
        
        org.springframework.data.domain.Page<com.fams.backend.dto.response.SystemLogResponse> response = 
            logs.map(logEntry -> com.fams.backend.dto.response.SystemLogResponse.builder()
                .id(logEntry.getId())
                .title(logEntry.getTitle())
                .description(logEntry.getDescription())
                .timestamp(logEntry.getCreatedAt().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                .type(logEntry.getType().name().toLowerCase())
                .performerName(logEntry.getPerformer() != null ? logEntry.getPerformer().getFullName() : "Hệ thống")
                .performerAvatar(logEntry.getPerformer() != null ? logEntry.getPerformer().getAvatar() : null)
                .ipAddress(logEntry.getIpAddress())
                .userAgent(logEntry.getUserAgent())
                .oldValue(logEntry.getOldValue())
                .newValue(logEntry.getNewValue())
                .build());
        
        return ResponseEntity.ok(response);
    }

    @PostMapping(value = "/lecturers", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_USERS')")
    @Operation(summary = "Tạo giảng viên mới")
    public ResponseEntity<UserResponse> createLecturer(
            @RequestPart("user") @Valid UserRequest request,
            @RequestPart(value = "avatar", required = false) MultipartFile avatar) {
        log.info("POST /academic-staff/lecturers | code={}", request.getCode());
        request.setRole(User.UserRole.LECTURER);
        return ResponseEntity.ok(userService.createUser(request, avatar));
    }

    @GetMapping("/lecturers")
    @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_USERS')")
    @Operation(summary = "Lấy danh sách giảng viên", description = "Lấy danh sách giảng viên với phân trang, tìm kiếm và lọc")
    public ResponseEntity<Page<LecturerResponse>> getLecturers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String major,
            @RequestParam(required = false) String specialization,
            @RequestParam(required = false) Boolean hasProfile,
            Pageable pageable) {
        log.info("GET /academic-staff/lecturers | search={}, status={}, department={}, major={}, spec={}, hasProfile={}",
                search, status, department, major, specialization, hasProfile);
        return ResponseEntity.ok(lecturerService.getAllLecturers(search, status, department, major, specialization, hasProfile, pageable));
    }

    @GetMapping("/lecturers/{id}")
    @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_USERS')")
    @Operation(summary = "Lấy thông tin chi tiết giảng viên")
    public ResponseEntity<LecturerResponse> getLecturerById(@PathVariable Long id) {
        log.info("GET /academic-staff/lecturers/{}", id);
        return ResponseEntity.ok(lecturerService.getLecturerById(id));
    }

    @GetMapping("/lecturers/departments")
    @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_USERS') or hasAuthority('MANAGE_MAJORS')")
    @Operation(summary = "Lấy danh sách các khoa/bộ môn")
    public ResponseEntity<List<String>> getAllDepartments() {
        return ResponseEntity.ok(lecturerService.getAllDepartments());
    }

    @DeleteMapping("/lecturers/{id}")
    @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_USERS')")
    @Operation(summary = "Xóa giảng viên")
    public ResponseEntity<Void> deleteLecturer(@PathVariable Long id) {
        log.info("DELETE /academic-staff/lecturers/{}", id);
        lecturerService.deleteLecturer(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/lecturers")
    @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_USERS')")
    @Operation(summary = "Xóa nhiều giảng viên")
    public ResponseEntity<Void> deleteLecturers(@RequestBody List<Long> ids) {
        log.info("DELETE /academic-staff/lecturers | ids={}", ids);
        lecturerService.deleteLecturers(ids);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/lecturers/{id}/profile")
    @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_USERS')")
    @Operation(summary = "Đăng ký thông tin giảng viên", description = "Tạo LecturerProfile cho giảng viên chưa có profile")
    public ResponseEntity<LecturerResponse> registerLecturerProfile(
            @PathVariable Long id,
            @RequestBody LecturerProfileRequest request) {
        log.info("POST /academic-staff/lecturers/{}/profile | department={}", id, request.getDepartment());
        return ResponseEntity.ok(lecturerService.registerLecturerProfile(id, request));
    }

    @GetMapping("/students")
    @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_USERS')")
    @Operation(summary = "Lấy danh sách sinh viên", description = "Lấy danh sách sinh viên với phân trang và tìm kiếm")
    public ResponseEntity<Page<com.fams.backend.dto.response.StudentResponse>> getStudents(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String major,
            @RequestParam(required = false) String specialization,
            @RequestParam(required = false) String subSpecialization,
            Pageable pageable) {
        log.info("GET /academic-staff/students | search={}, status={}, major={}, spec={}, subSpec={}", search, status,
                major,
                specialization, subSpecialization);
        return ResponseEntity
                .ok(studentService.getAllStudents(search, status, major, specialization, subSpecialization, pageable));
    }

    @GetMapping("/students/{id}")
    @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_USERS')")
    @Operation(summary = "Lấy thông tin chi tiết sinh viên")
    public ResponseEntity<com.fams.backend.dto.response.StudentResponse> getStudentById(@PathVariable Long id) {
        log.info("GET /academic-staff/students/{}", id);
        return ResponseEntity.ok(studentService.getStudentById(id));
    }

    @DeleteMapping("/students/{id}")
    @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_USERS')")
    @Operation(summary = "Xóa sinh viên")
    public ResponseEntity<Void> deleteStudent(@PathVariable Long id) {
        log.info("DELETE /academic-staff/students/{}", id);
        studentService.deleteStudent(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/students")
    @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_USERS')")
    @Operation(summary = "Xóa nhiều sinh viên")
    public ResponseEntity<Void> deleteStudents(@RequestBody List<Long> ids) {
        log.info("DELETE /academic-staff/students | ids={}", ids);
        studentService.deleteStudents(ids);
        return ResponseEntity.ok().build();
    }

    @PutMapping(value = "/students/{id}", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_USERS')")
    @Operation(summary = "Cập nhật thông tin sinh viên")
    public ResponseEntity<com.fams.backend.dto.response.StudentResponse> updateStudent(
            @PathVariable Long id,
            @RequestPart("user") @Valid com.fams.backend.dto.request.StudentUpdateRequest request,
            @RequestPart(value = "avatar", required = false) MultipartFile avatar) {
        log.info("PUT /academic-staff/students/{} | Updating profile", id);
        return ResponseEntity.ok(studentService.updateStudent(id, request, avatar));
    }

    @PostMapping("/students/import")
    @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_USERS')")
    @Operation(summary = "Import sinh viên từ file Excel")
    public ResponseEntity<java.util.Map<String, Object>> importStudents(@RequestParam("file") MultipartFile file) {
        log.info("POST /academic-staff/students/import | filename={}", file.getOriginalFilename());
        return ResponseEntity.ok(studentService.importStudents(file));
    }

    @PostMapping("/students/import/preview")
    @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_USERS')")
    @Operation(summary = "Xem trước import sinh viên từ file Excel")
    public ResponseEntity<List<com.fams.backend.dto.StudentImportDTO>> previewImportStudents(
            @RequestParam("file") MultipartFile file) {
        log.info("POST /academic-staff/students/import/preview | filename={}", file.getOriginalFilename());
        return ResponseEntity.ok(studentService.previewImportStudents(file));
    }

    @PostMapping("/students/import/save")
    @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_USERS')")
    @Operation(summary = "Lưu danh sách sinh viên đã import")
    public ResponseEntity<java.util.Map<String, Object>> saveImportedStudents(
            @RequestBody List<com.fams.backend.dto.StudentImportDTO> dtos) {
        log.info("POST /academic-staff/students/import/save | count={}", dtos.size());
        return ResponseEntity.ok(studentService.saveImportedStudents(dtos));
    }

    @GetMapping("/students/export")
    @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_USERS')")
    @Operation(summary = "Xuất danh sách sinh viên ra Excel")
    public ResponseEntity<byte[]> exportStudents(
            @RequestParam(required = false) String major,
            @RequestParam(required = false) String specialization,
            @RequestParam(required = false) String subSpecialization,
            @RequestParam(required = false) String status) {
        log.info("GET /academic-staff/students/export | major={}, spec={}, subSpec={}, status={}", major,
                specialization,
                subSpecialization, status);
        byte[] data = studentService.exportStudents(major, specialization, subSpecialization, status);
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=students.xlsx")
                .header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                .body(data);
    }

    @GetMapping("/majors-list")
    @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_USERS') or hasAuthority('MANAGE_MAJORS')")
    @Operation(summary = "Lấy danh sách các ngành học (cho dropdown)")
    public ResponseEntity<List<String>> getAllMajors() {
        return ResponseEntity.ok(studentService.getAllMajors());
    }

    @GetMapping("/specializations-list")
    @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_USERS') or hasAuthority('MANAGE_MAJORS')")
    @Operation(summary = "Lấy danh sách các chuyên ngành (cho dropdown)")
    public ResponseEntity<List<String>> getAllSpecializations() {
        return ResponseEntity.ok(studentService.getAllSpecializations());
    }

    @GetMapping("/specializations-by-major")
    @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_USERS') or hasAuthority('MANAGE_MAJORS')")
    @Operation(summary = "Lấy danh sách chuyên ngành theo Major")
    public ResponseEntity<List<String>> getSpecializationsByMajor(@RequestParam String majorName) {
        return ResponseEntity.ok(studentService.getSpecializationsByMajor(majorName));
    }

    @GetMapping("/sub-specializations-by-specialization")
    @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAnyAuthority('MANAGE_USERS', 'MANAGE_MAJORS')")
    @Operation(summary = "Lấy danh sách Combo theo Specialization")
    public ResponseEntity<List<String>> getSubSpecializationsBySpecialization(@RequestParam String specializationName) {
        return ResponseEntity.ok(studentService.getSubSpecializationsBySpecialization(specializationName));
    }

    @PutMapping(value = "/lecturers/{id}", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_USERS')")
    @Operation(summary = "Cập nhật thông tin giảng viên")
    public ResponseEntity<LecturerResponse> updateLecturer(
            @PathVariable Long id,
            @RequestPart("user") @Valid LecturerUpdateRequest request,
            @RequestPart(value = "avatar", required = false) MultipartFile avatar) {
        log.info("PUT /academic-staff/lecturers/{} | Updating profile only", id);
        return ResponseEntity.ok(lecturerService.updateLecturer(id, request, avatar));
    }

    @PostMapping("/lecturers/import")
    @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_USERS')")
    @Operation(summary = "Import giảng viên từ file Excel")
    public ResponseEntity<java.util.Map<String, Object>> importLecturers(@RequestParam("file") MultipartFile file) {
        log.info("POST /academic-staff/lecturers/import | filename={}", file.getOriginalFilename());
        java.util.Map<String, Object> result = lecturerService.importLecturers(file);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/lecturers/import/preview")
    @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_USERS')")
    @Operation(summary = "Xem trước import giảng viên từ file Excel")
    public ResponseEntity<List<LecturerImportDTO>> previewImportLecturers(@RequestParam("file") MultipartFile file) {
        log.info("POST /academic-staff/lecturers/import/preview | filename={}", file.getOriginalFilename());
        return ResponseEntity.ok(lecturerService.previewImportLecturers(file));
    }

    @PostMapping("/lecturers/import/save")
    @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_USERS')")
    @Operation(summary = "Lưu danh sách giảng viên đã import")
    public ResponseEntity<java.util.Map<String, Object>> saveImportedLecturers(
            @RequestBody List<LecturerImportDTO> dtos) {
        log.info("POST /academic-staff/lecturers/import/save | count={}", dtos.size());
        return ResponseEntity.ok(lecturerService.saveImportedLecturers(dtos));
    }

    @GetMapping("/lecturers/export")
    @PreAuthorize("hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_USERS')")
    @Operation(summary = "Xuất danh sách giảng viên ra Excel")
    public ResponseEntity<byte[]> exportLecturers(
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String major,
            @RequestParam(required = false) String specialization,
            @RequestParam(required = false) String status) {
        log.info("GET /academic-staff/lecturers/export | department={}, major={}, specialization={}, status={}",
                department, major, specialization, status);
        byte[] data = lecturerService.exportLecturers(department, major, specialization, status);
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=lecturers.xlsx")
                .header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                .body(data);
    }
}
