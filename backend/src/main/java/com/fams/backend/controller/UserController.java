package com.fams.backend.controller;

import com.fams.backend.dto.request.UserRequest;
import com.fams.backend.dto.response.UserResponse;
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
import org.springframework.data.web.PageableDefault;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "User Management", description = "API quản lý người dùng (Admin only)")
@PreAuthorize("hasRole('ADMIN')")
public class UserController {

    private final UserService userService;

    @GetMapping
    @Operation(summary = "Lấy danh sách người dùng", description = "Lấy danh sách người dùng với phân trang và lọc")
    public ResponseEntity<Page<UserResponse>> getAllUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status,
            @PageableDefault(size = 30) Pageable pageable) {
        log.info("GET /users | search={}, role={}, status={}", search, role, status);
        return ResponseEntity.ok(userService.getAllUsers(search, role, status, pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy thông tin chi tiết người dùng")
    public ResponseEntity<UserResponse> getUserById(@PathVariable Long id) {
        log.info("GET /users/{}", id);
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @PostMapping(consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Tạo người dùng mới")
    public ResponseEntity<UserResponse> createUser(
            @RequestPart("user") @Valid UserRequest request,
            @RequestPart(value = "avatar", required = false) MultipartFile avatar) {
        log.info("POST /users | code={}", request.getCode());
        return ResponseEntity.ok(userService.createUser(request, avatar));
    }

    @PutMapping(value = "/{id}", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Cập nhật người dùng")
    public ResponseEntity<UserResponse> updateUser(
            @PathVariable Long id,
            @RequestPart("user") @Valid UserRequest request,
            @RequestPart(value = "avatar", required = false) MultipartFile avatar) {
        log.info("PUT /users/{} | code={}", id, request.getCode());
        return ResponseEntity.ok(userService.updateUser(id, request, avatar));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa người dùng")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        log.info("DELETE /users/{}", id);
        userService.deleteUser(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/activate")
    @Operation(summary = "Kích hoạt hàng loạt tài khoản người dùng")
    public ResponseEntity<Void> activateUsers(@RequestBody java.util.List<Long> ids) {
        log.info("POST /users/activate | ids={}", ids);
        userService.activateUsers(ids);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/import/preview")
    @Operation(summary = "Xem trước dữ liệu import trước khi thực hiện")
    public ResponseEntity<com.fams.backend.dto.response.PreviewImportResponse> previewImport(
            @RequestParam("file") MultipartFile file) {
        log.info("POST /users/import/preview | filename={}", file.getOriginalFilename());
        return ResponseEntity.ok(userService.previewImportFile(file));
    }

    @PostMapping("/import")
    @Operation(summary = "Import người dùng từ file Excel/ZIP (auto-detect)")
    public ResponseEntity<?> importUsers(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "mode", defaultValue = "APPEND") String mode) {

        String filename = file.getOriginalFilename();
        log.info("POST /users/import | filename={}, mode={}", filename, mode);

        try {
            // Auto-detect file type and route accordingly
            if (filename != null && filename.toLowerCase().endsWith(".zip")) {
                // ZIP file -> Background async job
                // CRITICAL: Copy bytes BEFORE async call to prevent temp file deletion
                byte[] fileBytes = file.getBytes();
                String jobId = userService.importZipAsync(fileBytes, filename, mode);
                return ResponseEntity.ok(java.util.Map.of(
                        "type", "async",
                        "jobId", jobId,
                        "message", "Import job created. Processing in background."));
            } else {
                // Excel file -> Fast sync import
                userService.importExcelSync(file, mode);
                return ResponseEntity.ok(java.util.Map.of(
                        "type", "sync",
                        "message", "Import completed successfully"));
            }
        } catch (Exception e) {
            log.error("Import failed: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(java.util.Map.of(
                    "error", e.getMessage()));
        }
    }

    @GetMapping("/import-job/{jobId}")
    @Operation(summary = "Lấy trạng thái của import job")
    public ResponseEntity<com.fams.backend.dto.response.ImportJobResponse> getImportJobStatus(
            @PathVariable String jobId) {
        log.info("GET /users/import-job/{}", jobId);
        return ResponseEntity.ok(userService.getImportJobStatus(jobId));
    }

    @GetMapping("/import-job/active")
    @Operation(summary = "Lấy import job đang hoạt động (nếu có)")
    public ResponseEntity<com.fams.backend.dto.response.ImportJobResponse> getActiveImportJob() {
        log.info("GET /users/import-job/active");
        com.fams.backend.dto.response.ImportJobResponse activeJob = userService.getActiveImportJob();
        if (activeJob == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(activeJob);
    }

    @PostMapping("/import-job/cleanup")
    @Operation(summary = "Dọn dẹp các import job bị kẹt (PENDING/PROCESSING)")
    public ResponseEntity<Void> cleanupStuckJobs() {
        log.info("POST /users/import-job/cleanup");
        userService.cleanupStuckJobs();
        return ResponseEntity.ok().build();
    }

    @PostMapping("/import-job/cancel")
    @Operation(summary = "Hủy tiến trình import hiện tại của người dùng")
    public ResponseEntity<Void> cancelImportJob() {
        log.info("POST /users/import-job/cancel");
        userService.cancelMyActiveImportJob();
        return ResponseEntity.ok().build();
    }
}
