package com.fams.backend.service;

import com.fams.backend.dto.response.UserPermissionResponse;
import com.fams.backend.entity.UserPermission;
import com.fams.backend.entity.User;
import com.fams.backend.repository.UserPermissionRepository;
import com.fams.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserPermissionService {

    private final UserPermissionRepository userPermissionRepository;
    private final UserRepository userRepository;

    private static final Map<UserPermission.Permission, String> PERMISSION_LABELS = Map.of(
            UserPermission.Permission.MANAGE_MAJORS, "Quản lý ngành",
            UserPermission.Permission.MANAGE_COURSES, "Quản lý môn học",
            UserPermission.Permission.MANAGE_USERS, "Quản lý người dùng",
            UserPermission.Permission.MANAGE_SEMESTERS, "Quản lý kỳ học",
            UserPermission.Permission.VIEW_SYSTEM_LOGS, "Xem nhật ký hệ thống",
            UserPermission.Permission.MANAGE_SCHEDULE, "Quản lý thời khóa biểu",
            UserPermission.Permission.MANAGE_NOTIFICATIONS, "Quản lý thông báo"
    );

    /**
     * Get all permissions for a user
     */
    @Transactional(readOnly = true)
    public List<UserPermissionResponse> getUserPermissions(Long userId) {
        return userPermissionRepository.findByUserId(userId).stream()
                .map(this::toResponse)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toList());
    }

    /**
     * Get all permission keys for a user (for auth checks)
     */
    public List<String> getUserPermissionKeys(Long userId) {
        return userPermissionRepository.findPermissionsByUserId(userId).stream()
                .map(Enum::name)
                .collect(Collectors.toList());
    }

    /**
     * Get my permissions (for the logged-in user)
     */
    public List<String> getMyPermissions() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return getUserPermissionKeys(user.getId());
    }

    /**
     * Grant a permission to a user
     */
    @Transactional
    public UserPermissionResponse grantPermission(Long userId, String permissionStr) {
        UserPermission.Permission permission = UserPermission.Permission.valueOf(permissionStr);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        // Check user is LECTURER
        if (user.getRole() != User.UserRole.LECTURER) {
            throw new RuntimeException("Only LECTURER accounts can be granted permissions");
        }

        // Check if already exists
        if (userPermissionRepository.existsByUserIdAndPermission(userId, permission)) {
            throw new RuntimeException("Permission already granted to this user");
        }

        // Get admin (current user)
        String adminUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User admin = userRepository.findByUsername(adminUsername)
                .orElseThrow(() -> new RuntimeException("Admin user not found"));

        UserPermission up = UserPermission.builder()
                .user(user)
                .permission(permission)
                .grantedBy(admin)
                .build();

        up = userPermissionRepository.save(up);
        log.info("Permission {} granted to user {} by admin {}",
                permission, user.getCode(), admin.getUsername());

        return toResponse(up);
    }

    /**
     * Revoke a permission from a user
     */
    @Transactional
    public void revokePermission(Long userId, String permissionStr) {
        UserPermission.Permission permission = UserPermission.Permission.valueOf(permissionStr);

        if (!userPermissionRepository.existsByUserIdAndPermission(userId, permission)) {
            throw new RuntimeException("Permission not found for this user");
        }

        userPermissionRepository.deleteByUserIdAndPermission(userId, permission);

        log.info("Permission {} revoked from user {}", permission, userId);
    }

    /**
     * Get all available permissions
     */
    public List<Map<String, String>> getAllAvailablePermissions() {
        return Arrays.stream(UserPermission.Permission.values())
                .map(p -> {
                    Map<String, String> map = new java.util.HashMap<>();
                    map.put("key", p.name());
                    map.put("label", PERMISSION_LABELS.getOrDefault(p, p.name()));
                    return map;
                })
                .collect(Collectors.toList());
    }

    /**
     * Get all users with their permissions (for admin view)
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAllLecturersWithPermissions() {
        try {
            List<User> lecturers = userRepository.findByRoleAndStatus(
                    User.UserRole.LECTURER, User.UserStatus.ACTIVE);

            log.info("Fetching permissions for {} active lecturers", lecturers.size());

            return lecturers.stream().map(lecturer -> {
                try {
                    List<UserPermissionResponse> perms = getUserPermissions(lecturer.getId());
                    Map<String, Object> map = new java.util.HashMap<>();
                    map.put("userId", lecturer.getId());
                    map.put("fullName", lecturer.getFullName() != null ? lecturer.getFullName() : "N/A");
                    map.put("code", lecturer.getCode() != null ? lecturer.getCode() : "");
                    map.put("email", lecturer.getEmail() != null ? lecturer.getEmail() : "");
                    map.put("avatar", lecturer.getAvatar() != null ? lecturer.getAvatar() : "");
                    map.put("permissions", perms);
                    return map;
                } catch (Exception e) {
                    log.error("Error processing permissions for lecturer ID {}: {}", lecturer.getId(), e.getMessage());
                    return null;
                }
            })
            .filter(java.util.Objects::nonNull)
            .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Error in getAllLecturersWithPermissions: ", e);
            throw e;
        }
    }

    private UserPermissionResponse toResponse(UserPermission up) {
        try {
            return UserPermissionResponse.builder()
                    .id(up.getId())
                    .userId(up.getUser().getId())
                    .userFullName(up.getUser().getFullName() != null ? up.getUser().getFullName() : "N/A")
                    .userCode(up.getUser().getCode() != null ? up.getUser().getCode() : "")
                    .permission(up.getPermission().name())
                    .permissionLabel(PERMISSION_LABELS.getOrDefault(up.getPermission(), up.getPermission().name()))
                    .grantedByName(up.getGrantedBy() != null ? up.getGrantedBy().getFullName() : "System")
                    .grantedAt(up.getGrantedAt())
                    .build();
        } catch (Exception e) {
            log.error("Error mapping UserPermission to response: {}", e.getMessage());
            return null;
        }
    }
}
