package com.fams.backend.dto.response;

import com.fams.backend.entity.LecturerProfile;
import com.fams.backend.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDate;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonFormat;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LecturerResponse implements Serializable {
    private static final long serialVersionUID = 1L;

    // User fields
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
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updatedAt;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime lastLogin;

    // LecturerProfile fields
    private String department;
    private String major;
    private String specialization;
    private String expertise;
    private String bio;
    private LocalDate startDate;
    private Integer yearsOfExperience;

    public static LecturerResponse fromUserAndProfile(User user, LecturerProfile profile) {
        LecturerResponseBuilder builder = LecturerResponse.builder()
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
                .updatedAt(user.getUpdatedAt());


        if (profile != null) {
            builder.department(profile.getDepartment())
                    .major(profile.getMajor() != null ? profile.getMajor().getName() : null)
                    .specialization(profile.getSpecialization() != null ? profile.getSpecialization().getName() : null)
                    .expertise(profile.getExpertise())
                    .bio(profile.getBio());
        }

        return builder.build();
    }

    public static LecturerResponse fromUser(User user) {
        return fromUserAndProfile(user, null);
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
