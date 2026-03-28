package com.fams.backend.controller;

import com.fams.backend.dto.request.UserPermissionRequest;
import com.fams.backend.dto.response.UserPermissionResponse;
import com.fams.backend.service.UserPermissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/permissions")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Permission Management", description = "API quản lý phân quyền người dùng")
public class UserPermissionController {

    private final UserPermissionService userPermissionService;

    @GetMapping("/available")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACADEMIC_STAFF')")
    @Operation(summary = "Lấy danh sách tất cả các quyền có thể cấp")
    public ResponseEntity<List<Map<String, String>>> getAvailablePermissions() {
        return ResponseEntity.ok(userPermissionService.getAllAvailablePermissions());
    }

    @GetMapping("/lecturers")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACADEMIC_STAFF')")
    @Operation(summary = "Lấy danh sách giảng viên với quyền đã cấp")
    public ResponseEntity<List<Map<String, Object>>> getLecturersWithPermissions() {
        return ResponseEntity.ok(userPermissionService.getAllLecturersWithPermissions());
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACADEMIC_STAFF')")
    @Operation(summary = "Lấy quyền đã cấp cho người dùng cụ thể")
    public ResponseEntity<List<UserPermissionResponse>> getUserPermissions(
            @PathVariable Long userId) {
        return ResponseEntity.ok(userPermissionService.getUserPermissions(userId));
    }

    @PostMapping("/grant")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACADEMIC_STAFF')")
    @Operation(summary = "Cấp quyền cho người dùng")
    public ResponseEntity<UserPermissionResponse> grantPermission(
            @RequestBody UserPermissionRequest request) {
        log.info("POST /permissions/grant | userId={}, permission={}",
                request.getUserId(), request.getPermission());
        return ResponseEntity.ok(
                userPermissionService.grantPermission(request.getUserId(), request.getPermission()));
    }

    @DeleteMapping("/revoke")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACADEMIC_STAFF')")
    @Operation(summary = "Thu hồi quyền từ người dùng")
    public ResponseEntity<Void> revokePermission(
            @RequestBody UserPermissionRequest request) {
        log.info("DELETE /permissions/revoke | userId={}, permission={}",
                request.getUserId(), request.getPermission());
        userPermissionService.revokePermission(request.getUserId(), request.getPermission());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Lấy quyền của tài khoản đang đăng nhập")
    public ResponseEntity<List<String>> getMyPermissions() {
        return ResponseEntity.ok(userPermissionService.getMyPermissions());
    }
}
