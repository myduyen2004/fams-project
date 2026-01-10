package com.fams.backend.dto.response;

import com.fams.backend.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {

    private String token;
    private String type; // "Bearer"
    private UserInfo user;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserInfo {
        private Long id;
        private String username;
        private String fullName;
        private String email;
        private String role;
        private String avatar;
        private Boolean isPasswordChanged;
        private String phone;
        private java.time.LocalDate dob;

        // Profile Info
        private String major;
        private String specialization;
        private String department;
        private String expertise;
    }

    // Helper method để tạo UserInfo từ User entity
    public static UserInfo fromUser(User user) {
        var builder = UserInfo.builder()
                .id(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .avatar(user.getAvatar())
                .isPasswordChanged(user.getIsPasswordChanged())
                .phone(user.getPhone())
                .dob(user.getDob());

        if (user.getStudentProfile() != null) {
            if (user.getStudentProfile().getMajor() != null) {
                builder.major(user.getStudentProfile().getMajor().getName());
            }
            if (user.getStudentProfile().getSpecialization() != null) {
                builder.specialization(user.getStudentProfile().getSpecialization().getName());
            }
        }

        if (user.getLecturerProfile() != null) {
            builder.department(user.getLecturerProfile().getDepartment());
            builder.expertise(user.getLecturerProfile().getExpertise());
        }

        return builder.build();
    }
}