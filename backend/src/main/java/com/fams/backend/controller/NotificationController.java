package com.fams.backend.controller;

import com.fams.backend.dto.request.NotificationRequest;
import com.fams.backend.dto.response.NotificationResponse;
import com.fams.backend.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/notifications")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Notification Management", description = "API quản lý thông báo (Admin)")
@CrossOrigin(origins = "*", maxAge = 3600)
public class NotificationController {

    private final NotificationService notificationService;

    /**
     * Lấy danh sách thông báo có phân trang
     */
    @GetMapping
    @Operation(summary = "Lấy danh sách thông báo")
    @PreAuthorize("hasRole('ADMIN') or hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_NOTIFICATIONS')")
    public ResponseEntity<Page<NotificationResponse>> getNotifications(
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "ALL") String type,
            @RequestParam(defaultValue = "ALL") String targetType,
            @RequestParam(defaultValue = "ALL") String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        log.info(
                "GET /api/admin/notifications - Params: search={}, type={}, targetType={}, status={}, page={}, size={}",
                search, type, targetType, status, page, size);

        Page<NotificationResponse> result = notificationService.getNotifications(search, type, targetType, status, page,
                size);
        log.info("Returning {} notifications (total: {})", result.getContent().size(), result.getTotalElements());

        return ResponseEntity.ok(result);
    }

    /**
     * Lấy thông báo theo ID
     */
    @GetMapping("/{id}")
    @Operation(summary = "Lấy chi tiết thông báo")
    @PreAuthorize("hasRole('ADMIN') or hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_NOTIFICATIONS')")
    public ResponseEntity<NotificationResponse> getNotificationById(@PathVariable Long id) {
        return ResponseEntity.ok(notificationService.getNotificationById(id));
    }

    /**
     * Tạo thông báo mới
     */
    @PostMapping
    @Operation(summary = "Tạo thông báo mới")
    @PreAuthorize("hasRole('ADMIN') or hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_NOTIFICATIONS')")
    public ResponseEntity<NotificationResponse> createNotification(@Valid @RequestBody NotificationRequest request) {
        System.out.println("DEBUG: Entering createNotification controller");
        log.info("Creating notification: {}", request.getTitle());
        try {
            return ResponseEntity.ok(notificationService.createNotification(request));
        } catch (Exception e) {
            System.err.println("DEBUG: Exception in controller: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    /**
     * Cập nhật thông báo
     */
    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật thông báo")
    @PreAuthorize("hasRole('ADMIN') or hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_NOTIFICATIONS')")
    public ResponseEntity<NotificationResponse> updateNotification(
            @PathVariable Long id,
            @Valid @RequestBody NotificationRequest request) {
        return ResponseEntity.ok(notificationService.updateNotification(id, request));
    }

    /**
     * Xóa thông báo
     */
    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa thông báo")
    @PreAuthorize("hasRole('ADMIN') or hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_NOTIFICATIONS')")
    public ResponseEntity<Void> deleteNotification(@PathVariable Long id) {
        notificationService.deleteNotification(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Xóa nhiều thông báo
     */
    @PostMapping("/bulk-delete")
    @Operation(summary = "Xóa nhiều thông báo")
    @PreAuthorize("hasRole('ADMIN') or hasRole('ACADEMIC_STAFF') or hasAuthority('MANAGE_NOTIFICATIONS')")
    public ResponseEntity<Map<String, String>> bulkDeleteNotifications(@RequestBody Map<String, List<Long>> request) {
        List<Long> ids = request.get("ids");
        notificationService.bulkDeleteNotifications(ids);
        return ResponseEntity.ok(Map.of("message", "Đã xóa " + ids.size() + " thông báo"));
    }

}
