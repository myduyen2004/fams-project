package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * AITool (Công cụ AI)
 * Quản lý các tool được sử dụng bởi AI Chatbot
 */
@Entity
@Table(name = "ai_tools")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AITool {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Tên tool (phải duy nhất, ví dụ: get_own_schedule)
    @Column(nullable = false, unique = true, length = 100)
    private String name;

    // Loại tool (SQL_TEMPLATE, BACKEND_ACTION, NAVIGATE_ONLY)
    @Column(nullable = false, length = 50)
    private String type;

    // Mô tả tool
    @Column(columnDefinition = "TEXT")
    private String description;

    // Template truy vấn SQL (nếu loại là SQL_TEMPLATE)
    @Column(name = "sql_template", columnDefinition = "TEXT")
    private String sqlTemplate;

    // Độ chính xác dự kiến (%)
    @Column(name = "accuracy_percentage")
    private Double accuracyPercentage;

    @Builder.Default
    @Column(name = "is_active")
    private Boolean isActive = true;

    // Vai trò được phép sử dụng (comma-separated: ADMIN, STUDENT, LECTURER)
    @Column(name = "allowed_roles", columnDefinition = "TEXT")
    @Builder.Default
    private String allowedRoles = "ADMIN,STUDENT,LECTURER";

    // Các trường bắt buộc phải có cho tool này (ví dụ: student_code)
    @Column(name = "required_fields", columnDefinition = "TEXT")
    private String requiredFields;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
