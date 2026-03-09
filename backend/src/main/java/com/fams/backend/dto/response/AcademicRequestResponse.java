package com.fams.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Response DTO for academic request
 */
@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class AcademicRequestResponse {

    private Long id;

    // Student info
    private Long studentId;
    private String studentCode;
    private String studentName;
    private String studentEmail;
    private String studentAvatar;
    private String studentMajor;
    private String studentSpecialization;
    private String studentSubSpecialization;

    // Request type
    private String requestType;
    private String requestTypeLabel; // Tiếng Việt

    // Request title
    private String requestTitle;

    // Related entities
    private Long semesterId;
    private String semesterCode;
    private String semesterName;

    private Long courseId;
    private String courseCode;
    private String courseName;

    private String classSectionId;
    private String className;

    // Target fields (for change requests)
    private String toClassName;
    private String toMajor;
    private String toSpecialization;
    private String toSubSpecialization;

    // Content
    private String reason;
    private String note;
    private String fileUrl;

    // Status
    private String status;
    private String statusLabel; // Tiếng Việt

    // Deadline info
    private LocalDate startDate;
    private LocalDate dueDate;
    private Boolean isWithinDeadline;

    // Approval info
    private Long approverId;
    private String approverName;
    private LocalDateTime approvedAt;
    private String approverNote;
    private String approverAvatar;

    private Boolean isTransferPossible;
    private String transferError;

    // Universal validation
    private Boolean isApprovable;
    private String validationMessage;

    // Timestamps
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
