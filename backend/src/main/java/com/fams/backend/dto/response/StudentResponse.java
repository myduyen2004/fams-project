package com.fams.backend.dto.response;

import com.fams.backend.entity.StudentProfile;
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
public class StudentResponse implements Serializable {
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
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // StudentProfile fields
    private String major;
    private String specialization;
    private String subSpecialization;
    private String course;
    private Double gpa;

    public static StudentResponse fromUserAndProfile(User user, StudentProfile profile) {
        StudentResponseBuilder builder = StudentResponse.builder()
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
            builder.course(profile.getCourse())
                    .gpa(profile.getGpa());

            if (profile.getMajor() != null) {
                builder.major(profile.getMajor().getName());
            }
            if (profile.getSpecialization() != null) {
                builder.specialization(profile.getSpecialization().getName());
            }
            if (profile.getSubSpecialization() != null) {
                builder.subSpecialization(profile.getSubSpecialization().getName());
            }
        }

        return builder.build();
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
