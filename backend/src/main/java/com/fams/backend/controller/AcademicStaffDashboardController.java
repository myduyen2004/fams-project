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
@RequestMapping("/api/academic-staff")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
@Tag(name = "Academic Staff", description = "API cho cán bộ đào tạo")
@PreAuthorize("hasRole('ACADEMIC_STAFF')")
public class AcademicStaffDashboardController {

    private final AcademicStaffDashboardService dashboardService;
    private final UserService userService;
    private final LecturerService lecturerService;

    @GetMapping("/dashboard")
    @Operation(summary = "Lấy dữ liệu dashboard")
    public ResponseEntity<AcademicStaffDashboardResponse> getDashboardData() {
        log.info("GET /api/academic-staff/dashboard");
        return ResponseEntity.ok(dashboardService.getDashboardData());
    }

    @PostMapping(value = "/lecturers", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Tạo giảng viên mới")
    public ResponseEntity<UserResponse> createLecturer(
            @RequestPart("user") @Valid UserRequest request,
            @RequestPart(value = "avatar", required = false) MultipartFile avatar) {
        log.info("POST /academic-staff/lecturers | code={}", request.getCode());
        request.setRole(User.UserRole.LECTURER);
        return ResponseEntity.ok(userService.createUser(request, avatar));
    }

    @GetMapping("/lecturers")
    @Operation(summary = "Lấy danh sách giảng viên", description = "Lấy danh sách giảng viên với phân trang, tìm kiếm và lọc")
    public ResponseEntity<Page<LecturerResponse>> getLecturers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) Boolean hasProfile,
            Pageable pageable) {
        log.info("GET /academic-staff/lecturers | search={}, status={}, department={}, hasProfile={}", search, status,
                department, hasProfile);
        return ResponseEntity.ok(lecturerService.getAllLecturers(search, status, department, hasProfile, pageable));
    }

    @GetMapping("/lecturers/{id}")
    @Operation(summary = "Lấy thông tin chi tiết giảng viên")
    public ResponseEntity<LecturerResponse> getLecturerById(@PathVariable Long id) {
        log.info("GET /academic-staff/lecturers/{}", id);
        return ResponseEntity.ok(lecturerService.getLecturerById(id));
    }

    @GetMapping("/lecturers/departments")
    @Operation(summary = "Lấy danh sách các khoa/bộ môn")
    public ResponseEntity<List<String>> getAllDepartments() {
        return ResponseEntity.ok(lecturerService.getAllDepartments());
    }

    @DeleteMapping("/lecturers/{id}")
    @Operation(summary = "Xóa giảng viên")
    public ResponseEntity<Void> deleteLecturer(@PathVariable Long id) {
        log.info("DELETE /academic-staff/lecturers/{}", id);
        lecturerService.deleteLecturer(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/lecturers")
    @Operation(summary = "Xóa nhiều giảng viên")
    public ResponseEntity<Void> deleteLecturers(@RequestBody List<Long> ids) {
        log.info("DELETE /academic-staff/lecturers | ids={}", ids);
        lecturerService.deleteLecturers(ids);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/lecturers/{id}/profile")
    @Operation(summary = "Đăng ký thông tin giảng viên", description = "Tạo LecturerProfile cho giảng viên chưa có profile")
    public ResponseEntity<LecturerResponse> registerLecturerProfile(
            @PathVariable Long id,
            @RequestBody LecturerProfileRequest request) {
        log.info("POST /academic-staff/lecturers/{}/profile | department={}", id, request.getDepartment());
        return ResponseEntity.ok(lecturerService.registerLecturerProfile(id, request));
    }

    @GetMapping("/students")
    @Operation(summary = "Lấy danh sách sinh viên", description = "Lấy danh sách sinh viên với phân trang và tìm kiếm")
    public ResponseEntity<Page<UserResponse>> getStudents(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            Pageable pageable) {
        log.info("GET /academic-staff/students | search={}, status={}", search, status);
        return ResponseEntity.ok(userService.getAllUsers(search, "STUDENT", status, pageable));
    }

    @GetMapping("/students/{id}")
    @Operation(summary = "Lấy thông tin chi tiết sinh viên")
    public ResponseEntity<UserResponse> getStudentById(@PathVariable Long id) {
        log.info("GET /academic-staff/students/{}", id);
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @PutMapping(value = "/lecturers/{id}", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Cập nhật thông tin giảng viên")
    public ResponseEntity<LecturerResponse> updateLecturer(
            @PathVariable Long id,
            @RequestPart("user") @Valid LecturerUpdateRequest request,
            @RequestPart(value = "avatar", required = false) MultipartFile avatar) {
        log.info("PUT /academic-staff/lecturers/{} | Updating profile only", id);
        return ResponseEntity.ok(lecturerService.updateLecturer(id, request, avatar));
    }

    @PostMapping("/lecturers/import")
    @Operation(summary = "Import giảng viên từ file Excel")
    public ResponseEntity<java.util.Map<String, Object>> importLecturers(@RequestParam("file") MultipartFile file) {
        log.info("POST /academic-staff/lecturers/import | filename={}", file.getOriginalFilename());
        java.util.Map<String, Object> result = lecturerService.importLecturers(file);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/lecturers/import/preview")
    @Operation(summary = "Xem trước import giảng viên từ file Excel")
    public ResponseEntity<List<LecturerImportDTO>> previewImportLecturers(@RequestParam("file") MultipartFile file) {
        log.info("POST /academic-staff/lecturers/import/preview | filename={}", file.getOriginalFilename());
        return ResponseEntity.ok(lecturerService.previewImportLecturers(file));
    }

    @PostMapping("/lecturers/import/save")
    @Operation(summary = "Lưu danh sách giảng viên đã import")
    public ResponseEntity<java.util.Map<String, Object>> saveImportedLecturers(
            @RequestBody List<LecturerImportDTO> dtos) {
        log.info("POST /academic-staff/lecturers/import/save | count={}", dtos.size());
        return ResponseEntity.ok(lecturerService.saveImportedLecturers(dtos));
    }

    @GetMapping("/lecturers/export")
    @Operation(summary = "Xuất danh sách giảng viên ra Excel")
    public ResponseEntity<byte[]> exportLecturers(
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String status) {
        log.info("GET /academic-staff/lecturers/export | department={}, status={}", department, status);
        byte[] data = lecturerService.exportLecturers(department, status);
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=lecturers.xlsx")
                .header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                .body(data);
    }
}
