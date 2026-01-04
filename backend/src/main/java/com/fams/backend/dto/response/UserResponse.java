package com.fams.backend.dto.response;

import com.fams.backend.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String code;
    private String username;
    private String fullName;
    private String email;
    private String phone;
    private LocalDate dob;
    private User.UserRole role;
    private String roleName;
    private User.UserStatus status;
    private User.FaceDataStatus faceDataStatus;
    private String avatar;
    private Boolean isPasswordChanged;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static UserResponse fromUser(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .code(user.getCode())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .dob(user.getDob())
                .role(user.getRole())
                .roleName(getRoleDisplayName(user.getRole()))
                .status(user.getStatus())
                .faceDataStatus(user.getFaceDataStatus())
                .avatar(user.getAvatar())
                .isPasswordChanged(user.getIsPasswordChanged())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }

    private static String getRoleDisplayName(User.UserRole role) {
        if (role == null)
            return "";
        switch (role) {
            case ADMIN:
                return "Quản trị viên";
            case ACADEMIC_STAFF:
                return "Phòng đào tạo";
            case LECTURER:
                return "Giảng viên";
            case STUDENT:
                return "Sinh viên";
            default:
                return role.name();
        }
    }
}
