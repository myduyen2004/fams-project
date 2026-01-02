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

@RestController
@RequestMapping("/users")
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
            Pageable pageable) {
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

    @PostMapping("/import")
    @Operation(summary = "Import người dùng từ file Excel/CSV")
    public ResponseEntity<Void> importUsers(@RequestParam("file") MultipartFile file) {
        log.info("POST /users/import | filename={}", file.getOriginalFilename());
        userService.importUsers(file);
        return ResponseEntity.ok().build();
    }
}
